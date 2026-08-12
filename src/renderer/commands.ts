import { useStore } from './store';
import { ipc } from './ipc';
import { Channels } from '../shared/ipc';
import { toast } from './toastStore';
import { runEditorAi, autoTagActiveNote } from './ai/editorActions';
import { getActiveEditor, flushActiveSave } from './editor/editorBridge';

export interface Command {
  id: string;
  label: string;
  hint?: string;
  shortcut?: string;
  group: 'Navegación' | 'Crear' | 'Vista' | 'Ajustes' | 'Datos' | 'IA';
  run: () => void | Promise<void>;
}

/**
 * Catálogo de comandos de la paleta. Sigue siendo asíncrono porque la paleta
 * lo espera así y porque algún comando futuro puede necesitar cargar datos.
 */
export async function buildCommandsAsync(): Promise<Command[]> {
  return buildCommands();
}

/**
 * Exporta la nota abierta. Antes de serializar se fuerza el guardado pendiente:
 * el autoguardado tiene 800 ms de espera y si no, lo último escrito no saldría
 * en el archivo.
 */
export async function exportarNota(format: 'md' | 'html' | 'pdf'): Promise<void> {
  const s = useStore.getState();
  const id = s.activeNoteId;
  if (!id) return;

  try {
    await flushActiveSave();
  } catch { /* si no hay nada pendiente, seguimos */ }

  const nombres = { md: 'Markdown', html: 'HTML', pdf: 'PDF' } as const;
  try {
    const r = await ipc(Channels.noteExport, { id, format });
    if (r.canceled) return;
    if (!r.ok) { toast({ title: 'No se pudo exportar' }); return; }
    toast({ title: `Exportada a ${nombres[format]}`, description: r.path });
  } catch {
    toast({ title: 'No se pudo exportar' });
  }
}

/** Catálogo síncrono base. */
export function buildCommands(): Command[] {
  const s = useStore.getState();
  return [
    // Crear
    {
      id: 'note.new', label: 'Nueva nota', group: 'Crear', shortcut: 'Ctrl+N',
      run: () => s.createNote(),
    },
    {
      id: 'board.new', label: 'Nueva pizarra', group: 'Crear',
      run: () => s.createBoard(),
    },
    {
      id: 'chat.new', label: 'Nueva conversación de IA', group: 'Crear',
      run: () => { s.setMode('ai'); s.startNewChat(); },
    },
    {
      id: 'folder.new', label: 'Nueva carpeta', group: 'Crear',
      run: () => s.createFolder('Nueva carpeta'),
    },
    {
      id: 'tag.new', label: 'Nueva etiqueta', group: 'Crear',
      run: () => s.createTag('nueva-etiqueta'),
    },

    // Navegación
    {
      id: 'go.notes', label: 'Modo Notas', group: 'Navegación', shortcut: 'Ctrl+1',
      run: () => s.setMode('notes'),
    },
    {
      id: 'go.boards', label: 'Modo Pizarras', group: 'Navegación', shortcut: 'Ctrl+2',
      run: () => s.setMode('boards'),
    },
    {
      id: 'go.ai', label: 'Modo IA', group: 'Navegación', shortcut: 'Ctrl+3',
      run: () => s.setMode('ai'),
    },
    {
      id: 'go.all', label: 'Ir a Todas las notas', group: 'Navegación',
      run: () => s.selectFolder(null),
    },
    {
      id: 'go.favorites', label: 'Ir a Favoritos', group: 'Navegación',
      run: () => s.setView('favorites'),
    },
    {
      id: 'go.trash', label: 'Ir a Papelera', group: 'Navegación',
      run: () => s.setView('trash'),
    },

    // Vista
    {
      id: 'view.theme.light', label: 'Tema: Claro', group: 'Vista',
      run: () => s.setTheme('light'),
    },
    {
      id: 'view.theme.dark', label: 'Tema: Oscuro', group: 'Vista',
      run: () => s.setTheme('dark'),
    },
    {
      id: 'view.theme.system', label: 'Tema: Sistema', group: 'Vista',
      run: () => s.setTheme('system'),
    },
    {
      id: 'view.sidebar', label: 'Mostrar / ocultar barra lateral', group: 'Vista', shortcut: 'Ctrl+Shift+S',
      run: () => s.toggleSidebar(),
    },
    {
      id: 'view.notes', label: 'Mostrar / ocultar lista de notas', group: 'Vista', shortcut: 'Ctrl+Shift+N',
      run: () => s.toggleNotesPane(),
    },

    // Ajustes
    {
      id: 'settings.open', label: 'Abrir ajustes', group: 'Ajustes', shortcut: 'Ctrl+,',
      run: () => s.openSettings(true),
    },

    // IA — acciones inline sobre el editor activo
    ...(getActiveEditor() ? [
      { id: 'ai.improve',   label: 'IA · Mejorar selección',  group: 'IA' as const, run: () => runEditorAi('improve') },
      { id: 'ai.shorten',   label: 'IA · Acortar selección',  group: 'IA' as const, run: () => runEditorAi('shorten') },
      { id: 'ai.expand',    label: 'IA · Expandir selección', group: 'IA' as const, run: () => runEditorAi('expand') },
      { id: 'ai.continue',  label: 'IA · Continuar escribiendo desde el cursor', group: 'IA' as const, run: () => runEditorAi('continue') },
      { id: 'ai.grammar',   label: 'IA · Corregir ortografía y gramática', group: 'IA' as const, run: () => runEditorAi('fix-grammar') },
      { id: 'ai.formal',    label: 'IA · Tono formal',  group: 'IA' as const, run: () => runEditorAi('tone-formal') },
      { id: 'ai.casual',    label: 'IA · Tono casual',  group: 'IA' as const, run: () => runEditorAi('tone-casual') },
      { id: 'ai.transEn',   label: 'IA · Traducir al inglés',  group: 'IA' as const, run: () => runEditorAi('translate-en') },
      { id: 'ai.transEs',   label: 'IA · Traducir al español', group: 'IA' as const, run: () => runEditorAi('translate-es') },
      ...(s.activeNoteId != null ? [
        { id: 'ai.autotag', label: 'IA · Etiquetar esta nota automáticamente', group: 'IA' as const, run: () => autoTagActiveNote(s.activeNoteId!) },
      ] : []),
    ] : []),

    // Exportar. Solo tienen sentido con una nota abierta.
    ...(s.activeNoteId
      ? ([
          { id: 'export.md',   label: 'Exportar nota a Markdown', group: 'Datos' as const, run: () => exportarNota('md') },
          { id: 'export.html', label: 'Exportar nota a HTML',     group: 'Datos' as const, run: () => exportarNota('html') },
          { id: 'export.pdf',  label: 'Exportar nota a PDF',      group: 'Datos' as const, run: () => exportarNota('pdf') },
        ] satisfies Command[])
      : []),

    // Datos
    {
      id: 'data.openFolder', label: 'Abrir carpeta de datos', group: 'Datos',
      run: () => { void window.markwell.invoke('shell:openUserData'); },
    },
    {
      id: 'data.openBackups', label: 'Abrir carpeta de respaldos', group: 'Datos',
      run: () => { void window.markwell.invoke('shell:openBackups'); },
    },
    {
      id: 'data.backup.create', label: 'Crear respaldo ahora', group: 'Datos',
      run: async () => {
        try {
          const b = await ipc(Channels.backupCreate);
          toast({ title: 'Respaldo creado', description: b.filename });
        } catch {
          toast({ title: 'No se pudo crear el respaldo' });
        }
      },
    },
  ];
}
