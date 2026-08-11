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
      // Ctrl+F → buscar en la nota (toggle); si no hay nota, foco al buscador global.
      if (mod && !e.shiftKey && k === 'f') {
        e.preventDefault();
        const s = useStore.getState();
        if (s.activeNoteId != null) s.openFindInNote(!s.findInNoteOpen);
        else s.focusGlobalSearch();
        return;
      }

      // === Atajos SOLO si el usuario no está escribiendo ===
      if (typing) return;

      // Ctrl+N → nueva nota / pizarra / chat según el modo
      if (mod && !e.shiftKey && k === 'n') {
        e.preventDefault();
        const s = useStore.getState();
        if (s.mode === 'boards') void s.createBoard?.();
        else if (s.mode === 'ai') s.startNewChat?.();
        else void s.createNote();
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
      // Ctrl+1/2/3 → cambiar de modo (Notas / Pizarras / IA)
      if (mod && !e.shiftKey && (k === '1' || k === '2' || k === '3')) {
        e.preventDefault();
        const s = useStore.getState();
        s.setMode(k === '1' ? 'notes' : k === '2' ? 'boards' : 'ai');
        return;
      }
      // Ctrl+B → toggle favorito de la nota activa
      if (mod && !e.shiftKey && k === 'b') {
        const s = useStore.getState();
        if (s.activeNoteId != null) {
          e.preventDefault();
          const note = s.notes.find((n) => n.id === s.activeNoteId);
          if (note) void s.setFavorite(note.id, !note.isFavorite);
        }
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
