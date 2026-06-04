import type { Editor } from '@tiptap/react';

/**
 * Puente para acceder al editor TipTap activo desde fuera de su árbol React
 * (p. ej. la barra "Buscar en la nota" — vive en App, fuera del ContentPane).
 */
let _editor: Editor | null = null;
const listeners = new Set<(editor: Editor | null) => void>();

export function setActiveEditor(editor: Editor | null): void {
  _editor = editor;
  listeners.forEach((l) => l(editor));
}

export function getActiveEditor(): Editor | null {
  return _editor;
}

export function subscribeActiveEditor(cb: (editor: Editor | null) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
