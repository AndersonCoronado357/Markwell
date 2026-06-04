import { useEffect } from 'react';
import { useStore } from './store';

/** Decide si un evento de teclado debería ignorarse por estar el foco
 *  en un input / textarea / editor (donde escribe el usuario). */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  if (el.closest && el.closest('.mw-editor')) return true;
  return false;
}

/** Atajos globales de Markwell. */
export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      const typing = isTypingTarget(e.target);

      // === Atajos SIEMPRE activos (incluso escribiendo) ===
      // Ctrl+K → paleta de comandos
      if (mod && !e.shiftKey && k === 'k') {
        e.preventDefault();
        useStore.getState().openPalette(true);
        return;
      }
      // Ctrl+, → ajustes
      if (mod && k === ',') {
        e.preventDefault();
        useStore.getState().openSettings(true);
        return;
      }
      // Ctrl+F → buscar en la nota si hay una abierta, si no, foco al buscador global
      if (mod && !e.shiftKey && k === 'f') {
        e.preventDefault();
        const s = useStore.getState();
        if (s.activeNoteId != null) s.openFindInNote(true);
        else s.focusGlobalSearch();
        return;
      }

      // === Atajos SOLO si el usuario no está escribiendo ===
      if (typing) return;

      // Ctrl+N → nueva nota
      if (mod && !e.shiftKey && k === 'n') {
        e.preventDefault();
        void useStore.getState().createNote();
        return;
      }
      // Ctrl+Shift+S → toggle sidebar
      if (mod && e.shiftKey && k === 's') {
        e.preventDefault();
        useStore.getState().toggleSidebar();
        return;
      }
      // Ctrl+Shift+N → toggle notes pane
      if (mod && e.shiftKey && k === 'n') {
        e.preventDefault();
        useStore.getState().toggleNotesPane();
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
