import fs from 'node:fs/promises';

/**
 * Exportación de una nota a Markdown, HTML o PDF.
 *
 * El documento de TipTap ya es un árbol JSON, así que no hace falta arrastrar
 * un serializador de ProseMirror al proceso principal: se recorre a mano. Solo
 * se contemplan los nodos y marcas que el editor de Markwell puede producir
 * (ver `src/renderer/editor/extensions.ts`); cualquier otro se ignora en vez de
 * romper la exportación.
 */

export type ExportFormat = 'md' | 'html' | 'pdf';

interface Nodo {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: Nodo[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

const escaparHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Solo se escapa lo que rompe Markdown en mitad de una línea. Los caracteres
 * que únicamente son especiales al principio (`#`, `-`, `+`, `>`) o dentro de
 * un enlace (paréntesis) se dejan tal cual: escaparlos llenaba el archivo de
 * barras invertidas sin ganar nada.
 */
const escaparMd = (s: string): string => s.replace(/([\\`*_[\]])/g, '\\$1');

// ===================== Markdown =====================

function marcasMd(texto: string, marks: Nodo['marks']): string {
  let out = texto;
  for (const m of marks ?? []) {
    switch (m.type) {
      case 'bold': out = `**${out}**`; break;
      case 'italic': out = `*${out}*`; break;
      case 'strike': out = `~~${out}~~`; break;
      case 'code': out = `\`${out}\``; break;
      case 'link': out = `[${out}](${String(m.attrs?.href ?? '')})`; break;
      // Subrayado, resaltado, color y tipografía no existen en Markdown: se
      // pierden a propósito en vez de ensuciar el archivo con HTML suelto.
      default: break;
    }
  }
  return out;
}

function enLineaMd(nodos: Nodo[] | undefined): string {
  return (nodos ?? [])
    .map((n) => {
      if (n.type === 'hardBreak') return '  \n';
      if (n.type === 'image') return `![${String(n.attrs?.alt ?? '')}](${String(n.attrs?.src ?? '')})`;
      if (typeof n.text !== 'string') return '';
      // Dentro de `code` no se escapa: lo que hay es literal.
      const crudo = n.marks?.some((m) => m.type === 'code') ? n.text : escaparMd(n.text);
      return marcasMd(crudo, n.marks);
    })
    .join('');
}

function bloqueMd(n: Nodo, sangria = ''): string {
  switch (n.type) {
    case 'paragraph': {
      const t = enLineaMd(n.content);
      // Un párrafo que empieza por `#`, `-`, `>` o similar se convertiría en
      // otro bloque al releerlo: ahí sí hace falta la barra.
      const seguro = /^\s*([#>+*-]|\d+[.)])\s/.test(t) ? t.replace(/^(\s*)/, '$1\\') : t;
      return sangria + seguro + '\n';
    }

    case 'heading': {
      const nivel = Number(n.attrs?.level ?? 1);
      return '#'.repeat(Math.min(Math.max(nivel, 1), 6)) + ' ' + enLineaMd(n.content) + '\n';
    }

    case 'bulletList':
      return (n.content ?? [])
        .map((li) => sangria + '- ' + hijosDeItemMd(li, sangria + '  '))
        .join('');

    case 'orderedList': {
      const inicio = Number(n.attrs?.start ?? 1);
      return (n.content ?? [])
        .map((li, i) => sangria + `${inicio + i}. ` + hijosDeItemMd(li, sangria + '   '))
        .join('');
    }

    case 'taskList':
      return (n.content ?? [])
        .map((it) => sangria + (it.attrs?.checked ? '- [x] ' : '- [ ] ') + hijosDeItemMd(it, sangria + '  '))
        .join('');

    case 'blockquote':
      return (n.content ?? [])
        .map((h) => bloqueMd(h, ''))
        .join('')
        .trimEnd()
        .split('\n')
        .map((l) => sangria + '> ' + l)
        .join('\n') + '\n';

    case 'callout':
      // No hay callout en Markdown estándar: se degrada a cita, que es lo que
      // más se le parece y sigue siendo legible en cualquier visor.
      return bloqueMd({ ...n, type: 'blockquote' }, sangria);

    case 'codeBlock': {
      const lengua = String(n.attrs?.language ?? '');
      const cuerpo = (n.content ?? []).map((c) => c.text ?? '').join('');
      return '```' + lengua + '\n' + cuerpo + '\n```\n';
    }

    case 'horizontalRule':
      return '---\n';

    case 'image':
      return `![${String(n.attrs?.alt ?? '')}](${String(n.attrs?.src ?? '')})\n`;

    case 'table':
      return tablaMd(n);

    default:
      // Contenedor desconocido: se baja un nivel en lugar de perder el texto.
      return (n.content ?? []).map((h) => bloqueMd(h, sangria)).join('');
  }
}

/** El primer párrafo va en la misma línea de la viñeta; el resto, sangrado. */
function hijosDeItemMd(item: Nodo, sangria: string): string {
  const hijos = item.content ?? [];
  if (hijos.length === 0) return '\n';
  const primero = enLineaMd(hijos[0]?.content) + '\n';
  const resto = hijos.slice(1).map((h) => bloqueMd(h, sangria)).join('');
  return primero + resto;
}

function tablaMd(tabla: Nodo): string {
  const filas = (tabla.content ?? []).map((fila) =>
    (fila.content ?? []).map((celda) =>
      (celda.content ?? []).map((p) => enLineaMd(p.content)).join(' ').replace(/\|/g, '\\|'),
    ),
  );
  if (filas.length === 0) return '';
  const columnas = Math.max(...filas.map((f) => f.length));
  const linea = (c: string[]) =>
    '| ' + Array.from({ length: columnas }, (_, i) => c[i] ?? '').join(' | ') + ' |\n';
  return linea(filas[0]) + '|' + ' --- |'.repeat(columnas) + '\n' + filas.slice(1).map(linea).join('');
}

export function docAMarkdown(doc: unknown, titulo: string): string {
  const raiz = (doc ?? {}) as Nodo;
  const cuerpo = (raiz.content ?? []).map((n) => bloqueMd(n)).join('\n');
  return `# ${titulo}\n\n${cuerpo}`.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

// ===================== HTML =====================

function marcasHtml(texto: string, marks: Nodo['marks']): string {
  let out = texto;
  for (const m of marks ?? []) {
    switch (m.type) {
      case 'bold': out = `<strong>${out}</strong>`; break;
      case 'italic': out = `<em>${out}</em>`; break;
      case 'underline': out = `<u>${out}</u>`; break;
      case 'strike': out = `<s>${out}</s>`; break;
      case 'code': out = `<code>${out}</code>`; break;
      case 'highlight': {
        const c = m.attrs?.color;
        out = c ? `<mark style="background:${escaparHtml(String(c))}">${out}</mark>` : `<mark>${out}</mark>`;
        break;
      }
      case 'textStyle': {
        const estilos: string[] = [];
        if (m.attrs?.color) estilos.push(`color:${escaparHtml(String(m.attrs.color))}`);
        if (m.attrs?.fontFamily) estilos.push(`font-family:${escaparHtml(String(m.attrs.fontFamily))}`);
        if (estilos.length) out = `<span style="${estilos.join(';')}">${out}</span>`;
        break;
      }
      case 'link': {
        const href = escaparHtml(String(m.attrs?.href ?? ''));
        out = `<a href="${href}" rel="noopener noreferrer">${out}</a>`;
        break;
      }
      default: break;
    }
  }
  return out;
}

function enLineaHtml(nodos: Nodo[] | undefined): string {
  return (nodos ?? [])
    .map((n) => {
      if (n.type === 'hardBreak') return '<br>';
      if (n.type === 'image') return imagenHtml(n);
      if (typeof n.text !== 'string') return '';
      return marcasHtml(escaparHtml(n.text), n.marks);
    })
    .join('');
}

function imagenHtml(n: Nodo): string {
  const src = escaparHtml(String(n.attrs?.src ?? ''));
  const alt = escaparHtml(String(n.attrs?.alt ?? ''));
  const ancho = n.attrs?.width ? ` width="${Number(n.attrs.width)}"` : '';
  return `<img src="${src}" alt="${alt}"${ancho}>`;
}

function alineacion(n: Nodo): string {
  const a = n.attrs?.textAlign;
  return a && a !== 'left' ? ` style="text-align:${escaparHtml(String(a))}"` : '';
}

function bloqueHtml(n: Nodo): string {
  switch (n.type) {
    case 'paragraph': {
      const dentro = enLineaHtml(n.content);
      return `<p${alineacion(n)}>${dentro || '<br>'}</p>`;
    }
    case 'heading': {
      const nivel = Math.min(Math.max(Number(n.attrs?.level ?? 1), 1), 6);
      return `<h${nivel}${alineacion(n)}>${enLineaHtml(n.content)}</h${nivel}>`;
    }
    case 'bulletList':
      return `<ul>${(n.content ?? []).map((li) => `<li>${(li.content ?? []).map(bloqueHtml).join('')}</li>`).join('')}</ul>`;
    case 'orderedList': {
      const inicio = Number(n.attrs?.start ?? 1);
      const attr = inicio !== 1 ? ` start="${inicio}"` : '';
      return `<ol${attr}>${(n.content ?? []).map((li) => `<li>${(li.content ?? []).map(bloqueHtml).join('')}</li>`).join('')}</ol>`;
    }
    case 'taskList':
      return `<ul class="tareas">${(n.content ?? [])
        .map((it) => {
          const marcada = it.attrs?.checked ? ' checked' : '';
          const clase = it.attrs?.checked ? ' class="hecha"' : '';
          return `<li${clase}><input type="checkbox" disabled${marcada}><div>${(it.content ?? []).map(bloqueHtml).join('')}</div></li>`;
        })
        .join('')}</ul>`;
    case 'blockquote':
      return `<blockquote>${(n.content ?? []).map(bloqueHtml).join('')}</blockquote>`;
    case 'callout':
      return `<aside class="callout">${(n.content ?? []).map(bloqueHtml).join('')}</aside>`;
    case 'codeBlock': {
      const lengua = n.attrs?.language ? ` class="language-${escaparHtml(String(n.attrs.language))}"` : '';
      const cuerpo = escaparHtml((n.content ?? []).map((c) => c.text ?? '').join(''));
      return `<pre><code${lengua}>${cuerpo}</code></pre>`;
    }
    case 'horizontalRule':
      return '<hr>';
    case 'image':
      return `<figure>${imagenHtml(n)}</figure>`;
    case 'table':
      return `<table>${(n.content ?? [])
        .map((fila) => `<tr>${(fila.content ?? [])
          .map((celda) => {
            const eti = celda.type === 'tableHeader' ? 'th' : 'td';
            const cs = Number(celda.attrs?.colspan ?? 1);
            const rs = Number(celda.attrs?.rowspan ?? 1);
            const extra = (cs > 1 ? ` colspan="${cs}"` : '') + (rs > 1 ? ` rowspan="${rs}"` : '');
            return `<${eti}${extra}>${(celda.content ?? []).map(bloqueHtml).join('')}</${eti}>`;
          })
          .join('')}</tr>`)
        .join('')}</table>`;
    default:
      return (n.content ?? []).map(bloqueHtml).join('');
  }
}

/** Hoja de estilos embebida: el HTML exportado tiene que verse bien solo. */
const ESTILOS = `
  :root { color-scheme: light; }
  body {
    margin: 0 auto; padding: 56px 28px; max-width: 46rem;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    font-size: 16px; line-height: 1.7; color: #2a2f3a; background: #fff;
  }
  h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 1.2em; letter-spacing: -0.02em; }
  h2 { font-size: 1.5rem; line-height: 1.3; margin: 1.6em 0 0.4em; letter-spacing: -0.01em; }
  h3 { font-size: 1.2rem; margin: 1.4em 0 0.3em; }
  p { margin: 0 0 0.9em; }
  ul, ol { padding-left: 1.4em; margin: 0 0 0.9em; }
  li { margin: 0.2em 0; }
  li p { margin: 0; }
  blockquote {
    margin: 1.2em 0; padding: 0.1em 0 0.1em 1.1em;
    border-left: 3px solid #c6b8f0; color: #565d70; font-style: italic;
  }
  .callout { margin: 1.2em 0; padding: 1em 1.2em; border-radius: 12px; background: #f1eefc; }
  code { font-family: Consolas, "SF Mono", ui-monospace, monospace; font-size: 0.9em;
         background: #eef0f6; padding: 0.15em 0.4em; border-radius: 5px; }
  pre { background: #f7f8fb; padding: 1em 1.2em; border-radius: 12px; overflow-x: auto; }
  pre code { background: none; padding: 0; font-size: 0.86em; line-height: 1.6; }
  hr { border: 0; border-top: 1px solid #e6e9f0; margin: 2em 0; }
  img { max-width: 100%; height: auto; border-radius: 8px; }
  table { border-collapse: collapse; width: 100%; margin: 1.2em 0; font-size: 0.95em; }
  th, td { border: 1px solid #e6e9f0; padding: 0.5em 0.7em; text-align: left; vertical-align: top; }
  th { background: #f7f8fb; font-weight: 600; }
  ul.tareas { list-style: none; padding-left: 0; }
  ul.tareas li { display: flex; gap: 0.6em; align-items: flex-start; }
  ul.tareas li.hecha > div { color: #7c83a0; text-decoration: line-through; }
  mark { padding: 0.05em 0.15em; border-radius: 3px; }
  @media print { body { padding: 0; max-width: none; } }
`;

export function docAHtml(doc: unknown, titulo: string): string {
  const raiz = (doc ?? {}) as Nodo;
  const cuerpo = (raiz.content ?? []).map(bloqueHtml).join('\n');
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escaparHtml(titulo)}</title>
<style>${ESTILOS}</style>
</head>
<body>
<h1>${escaparHtml(titulo)}</h1>
${cuerpo}
</body>
</html>
`;
}

// ===================== PDF =====================

/**
 * Imprime el HTML en una ventana oculta. Se usa `data:` en vez de un archivo
 * temporal para no dejar basura en el disco si algo falla a mitad.
 */
async function htmlAPdf(html: string): Promise<Buffer> {
  // Importación diferida: así este módulo se puede cargar (y probar) fuera de
  // Electron, que es donde viven los serializadores puros de arriba.
  const { BrowserWindow } = await import('electron');
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, javascript: false, offscreen: true },
  });
  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    // Un respiro para que tipografías e imágenes terminen de asentarse.
    await new Promise((r) => setTimeout(r, 350));
    return await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { top: 0.6, bottom: 0.6, left: 0.6, right: 0.6 },
    });
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

export class ExportService {
  /** Serializa y escribe la nota. Devuelve la ruta escrita. */
  async escribir(
    destino: string,
    formato: ExportFormat,
    nota: { title: string; contentJson: unknown },
  ): Promise<string> {
    const titulo = nota.title?.trim() || 'Nota sin título';

    if (formato === 'md') {
      await fs.writeFile(destino, docAMarkdown(nota.contentJson, titulo), 'utf8');
    } else if (formato === 'html') {
      await fs.writeFile(destino, docAHtml(nota.contentJson, titulo), 'utf8');
    } else {
      await fs.writeFile(destino, await htmlAPdf(docAHtml(nota.contentJson, titulo)));
    }
    return destino;
  }
}
