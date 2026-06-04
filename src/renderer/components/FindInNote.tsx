import { useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { useStore } from '../store';

declare global {
  interface Window {
    find(
      query: string,
      caseSensitive?: boolean,
      backward?: boolean,
      wrapAround?: boolean,
      wholeWord?: boolean,
      searchInFrames?: boolean,
      showDialog?: boolean,
    ): boolean;
  }
}

/**
 * Buscador dentro de la nota actual. Usa la API nativa window.find() del
 * navegador (soportada en Chromium / Electron), que ya resalta los matches
 * y permite navegar entre ellos.
 */
export function FindInNote() {
  const open = useStore((s) => s.findInNoteOpen);
  const setOpen = useStore((s) => s.openFindInNote);
  const query = useStore((s) => s.findInNoteQuery);
  const setQuery = useStore((s) => s.setFindInNoteQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cada vez que se abre el panel, le devolvemos el foco al input.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [open]);

  // Cuando se cierra el panel, limpiamos selección de búsqueda activa.
  useEffect(() => {
    if (!open) window.getSelection()?.removeAllRanges();
  }, [open]);

  // Busca el primer match al escribir; resetea la selección antes para que
  // cada query empiece desde el principio del documento.
  useEffect(() => {
    if (!open || !query) return;
    window.getSelection()?.removeAllRanges();
    window.find(query, false, false, true, false, false, false);
  }, [query, open]);

  if (!open) return null;

  const find = (backward: boolean) => {
    if (!query) return;
    window.find(query, false, backward, true, false, false, false);
  };

  return (
    <div className="fixed right-8 top-14 z-40 flex items-center gap-1 rounded-card bg-surface px-2 py-1.5 shadow-xl ring-1 ring-black/[0.08]">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            find(e.shiftKey);
          }
        }}
        placeholder="Buscar en la nota…"
        className="w-[220px] rounded-control bg-surface-alt px-2.5 py-1 text-[13px] text-text placeholder:text-text-muted focus:outline-none"
      />
      <button
        onClick={() => find(true)}
        title="Anterior"
        className="rounded-control p-1.5 text-text-muted hover:bg-surface-alt hover:text-text"
      >
        <ChevronUp size={14} />
      </button>
      <button
        onClick={() => find(false)}
        title="Siguiente"
        className="rounded-control p-1.5 text-text-muted hover:bg-surface-alt hover:text-text"
      >
        <ChevronDown size={14} />
      </button>
      <button
        onClick={() => setOpen(false)}
        title="Cerrar (Esc)"
        className="rounded-control p-1.5 text-text-muted hover:bg-surface-alt hover:text-text"
      >
        <X size={13} />
      </button>
    </div>
  );
}
