/**
 * Acciones de IA que operan sobre el editor activo (TipTap). Diseñadas para
 * invocarse desde la paleta de comandos (Ctrl+K) o atajos. Si hay selección,
 * reemplazan la selección; si no la hay, operan sobre el párrafo actual o
 * todo el documento según la acción.
 */
import { ipc } from '../ipc';
import { Channels } from '../../shared/ipc';
import { getActiveEditor } from '../editor/editorBridge';
import { toast } from '../toastStore';

type Mode = 'improve' | 'shorten' | 'expand' | 'continue' | 'translate-en' | 'translate-es' | 'tone-formal' | 'tone-casual' | 'fix-grammar';

const SYSTEM = 'Eres un asistente de escritura. Devuelve SOLO el texto resultante, sin saludos, sin explicaciones, sin comillas externas. Conserva el idioma del texto original a menos que se indique lo contrario.';

const INSTRUCTIONS: Record<Mode, string> = {
  improve: 'Mejora la redacción del siguiente texto: claridad, fluidez y precisión. No cambies el significado. Devuelve solo el texto reescrito.',
  shorten: 'Acorta el siguiente texto sin perder ninguna idea principal. Devuelve solo el texto reducido.',
  expand: 'Expande el siguiente texto añadiendo más detalle y ejemplos donde aporten valor. No te repitas. Devuelve solo el texto expandido.',
  continue: 'Continúa escribiendo a partir del siguiente texto en el mismo estilo y tono. Añade 1-3 frases coherentes. Devuelve SOLO la continuación, sin repetir el texto previo.',
  'translate-en': 'Traduce el siguiente texto al inglés natural y fluido. Devuelve solo la traducción.',
  'translate-es': 'Traduce el siguiente texto al español natural y fluido. Devuelve solo la traducción.',
  'tone-formal': 'Reescribe el siguiente texto en un tono más formal y profesional. Devuelve solo el texto reescrito.',
  'tone-casual': 'Reescribe el siguiente texto en un tono más casual y cercano. Devuelve solo el texto reescrito.',
  'fix-grammar': 'Corrige la ortografía, la gramática y la puntuación del siguiente texto. NO cambies el estilo ni el contenido — solo errores. Devuelve solo el texto corregido.',
};

/** Ejecuta una acción IA sobre la selección actual del editor. */
export async function runEditorAi(mode: Mode): Promise<void> {
  const editor = getActiveEditor();
  if (!editor) { toast({ title: 'No hay editor activo' }); return; }

  const { from, to, empty } = editor.state.selection;
  // Si hay selección, usamos ese rango; si no:
  //  - continue → usamos los últimos 600 chars antes del cursor.
  //  - resto → usamos todo el bloque actual.
  let rangeFrom = from, rangeTo = to;
  let inputText = '';
  if (!empty) {
    inputText = editor.state.doc.textBetween(from, to, '\n\n').trim();
  } else if (mode === 'continue') {
    const cursor = from;
    const tail = editor.state.doc.textBetween(Math.max(0, cursor - 600), cursor, '\n\n').trim();
    inputText = tail;
    rangeFrom = cursor; rangeTo = cursor;
  } else {
    // bloque actual (todo el párrafo donde está el cursor)
    const $pos = editor.state.doc.resolve(from);
    const blockStart = $pos.start($pos.depth);
    const blockEnd = $pos.end($pos.depth);
    rangeFrom = blockStart; rangeTo = blockEnd;
    inputText = editor.state.doc.textBetween(blockStart, blockEnd, '\n\n').trim();
  }

  if (!inputText) { toast({ title: 'Selecciona el texto primero' }); return; }

  const placeholder = mode === 'continue' ? '' : '⌛ generando…';
  // Pre-feedback visual: reemplaza por placeholder durante la espera.
  editor.commands.command(({ tr, dispatch }) => {
    if (mode === 'continue') return true;
    if (dispatch) dispatch(tr.replaceRangeWith(rangeFrom, rangeTo, editor.schema.text(placeholder)));
    return true;
  });

  try {
    const out = await ipc(Channels.aiGenerate, {
      system: SYSTEM,
      prompt: `${INSTRUCTIONS[mode]}\n\n--- TEXTO ---\n${inputText}\n--- FIN ---`,
      maxTokens: 2000,
    });
    const cleaned = out.trim().replace(/^["'`]+|["'`]+$/g, '');

    // Recalcula posiciones: si pusimos un placeholder, su longitud cambió el doc.
    const placeholderLen = mode === 'continue' ? 0 : placeholder.length;
    const insertFrom = rangeFrom;
    const insertTo = mode === 'continue' ? rangeFrom : rangeFrom + placeholderLen;

    editor
      .chain()
      .focus()
      .insertContentAt({ from: insertFrom, to: insertTo }, mode === 'continue' ? ' ' + cleaned : cleaned)
      .run();
    toast({ title: 'Listo', description: labelFor(mode) });
  } catch (e) {
    // Revertir placeholder en caso de error.
    if (mode !== 'continue') {
      editor.chain().focus().insertContentAt({ from: rangeFrom, to: rangeFrom + placeholder.length }, inputText).run();
    }
    toast({ title: 'Error de IA', description: (e as Error).message });
  }
}

/**
 * Sugiere y aplica etiquetas a la nota activa. Pide al modelo 1-5 etiquetas
 * cortas en español (slug-like), las crea si no existen y las asigna.
 */
export async function autoTagActiveNote(noteId: number): Promise<void> {
  try {
    const note = await ipc(Channels.noteGet, { id: noteId });
    const text = (note?.plaintext ?? '').trim();
    if (!text) { toast({ title: 'La nota está vacía' }); return; }

    const out = await ipc(Channels.aiGenerate, {
      system: 'Devuelves SOLO etiquetas separadas por comas. Sin frases, sin explicaciones.',
      prompt: `Sugiere de 1 a 5 etiquetas cortas (1-2 palabras cada una, en minúsculas, sin acentos, sin tildes) para esta nota. Sé temático y conciso. Formato: tag1, tag2, tag3\n\n--- NOTA ---\n${(note?.title || '')}\n${text.slice(0, 6000)}\n--- FIN ---`,
      maxTokens: 80,
    });
    const tags = out
      .split(/[,\n]/)
      .map((t) => t.trim().toLowerCase().replace(/^[#·\-•]\s*/, '').replace(/['".]/g, ''))
      .filter((t) => t.length >= 2 && t.length <= 30)
      .slice(0, 5);
    if (tags.length === 0) { toast({ title: 'No se sugirieron etiquetas' }); return; }

    // Tags existentes (para reusar IDs cuando sea posible)
    const existing = await ipc(Channels.tagList);
    const tagIds: number[] = [];
    for (const name of tags) {
      const match = existing.find((t) => t.name.toLowerCase() === name);
      if (match) { tagIds.push(match.id); continue; }
      // Crea etiqueta nueva con color pastel rotativo.
      const pastels = ['lavanda', 'cielo', 'menta', 'durazno', 'lima', 'agua', 'malva', 'rosa', 'coral'];
      const color = pastels[(existing.length + tagIds.length) % pastels.length];
      const created = await ipc(Channels.tagCreate, { name, color, icon: null });
      tagIds.push(created.id);
    }
    // Combinar con etiquetas existentes de la nota.
    const current = await ipc(Channels.noteTags, { noteId });
    const merged = Array.from(new Set([...current.map((t) => t.id), ...tagIds]));
    await ipc(Channels.noteSetTags, { noteId, tagIds: merged });
    toast({ title: 'Etiquetas aplicadas', description: tags.join(', ') });
  } catch (e) {
    toast({ title: 'No se pudo auto-etiquetar', description: (e as Error).message });
  }
}

function labelFor(mode: Mode): string {
  switch (mode) {
    case 'improve': return 'Texto mejorado';
    case 'shorten': return 'Texto acortado';
    case 'expand':  return 'Texto expandido';
    case 'continue':return 'Texto continuado';
    case 'translate-en': return 'Traducido al inglés';
    case 'translate-es': return 'Traducido al español';
    case 'tone-formal':  return 'Tono formal';
    case 'tone-casual':  return 'Tono casual';
    case 'fix-grammar':  return 'Ortografía corregida';
  }
}
