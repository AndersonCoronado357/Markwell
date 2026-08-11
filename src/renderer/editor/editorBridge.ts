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

/**
 * Volcado del autoguardado pendiente. Lo registra `useAutosave`, y lo usa quien
 * necesite el contenido ya escrito en la base: al exportar, por ejemplo, si no
 * se esperan los 800 ms de debounce el archivo sale sin lo último tecleado.
 */
let _flush: (() => Promise<void>) | null = null;

export function setSaveFlusher(fn: (() => Promise<void>) | null): void {
  _flush = fn;
}

export function flushActiveSave(): Promise<void> {
  return _flush ? _flush() : Promise.resolve();
}
