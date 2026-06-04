import { useEffect, useRef, useState } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { useStore } from '../store';
import { subscribeActiveEditor, getActiveEditor } from '../editor/editorBridge';
import { findHighlightKey } from '../editor/FindHighlight';
import type { Editor } from '@tiptap/react';

interface FindStateView { total: number; currentIndex: number; }

/** Lee el estado del plugin findHighlight para mostrar el contador "X de Y". */
function readFindState(editor: Editor | null): FindStateView {
  if (!editor) return { total: 0, currentIndex: -1 };
  const s = findHighlightKey.getState(editor.state);
  if (!s) return { total: 0, currentIndex: -1 };
  return { total: s.total, currentIndex: s.currentIndex };
}

/** Despacha una transacción al plugin con cambios en la query o el índice. */
function dispatchMeta(editor: Editor, meta: { query?: string; currentIndex?: number; cycle?: 1 | -1 }): void {
  editor.view.dispatch(editor.state.tr.setMeta(findHighlightKey, meta));
}

/** Mueve la vista al match actual (scroll into view). */
function scrollToCurrent(editor: Editor): void {
  const s = findHighlightKey.getState(editor.state);
  if (!s || s.currentIndex < 0) return;
  const m = s.matches[s.currentIndex];
  if (!m) return;
  // Lleva la selección al match para que ProseMirror lo desplace a la vista.
  editor.commands.setTextSelection({ from: m.from, to: m.to });
  editor.commands.scrollIntoView();
}

export function FindInNote() {
  const open = useStore((s) => s.findInNoteOpen);
  const setOpen = useStore((s) => s.openFindInNote);
  const query = useStore((s) => s.findInNoteQuery);
  const setQuery = useStore((s) => s.setFindInNoteQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  const [findState, setFindState] = useState<FindStateView>({ total: 0, currentIndex: -1 });

  // Mantén `findState` sincronizado con el plugin del editor activo.
  useEffect(() => {
    if (!open) return;
    let editor = getActiveEditor();
    const refresh = () => setFindState(readFindState(getActiveEditor()));
    const sub = (e: Editor | null) => { editor = e; refresh(); };
    const unsubBridge = subscribeActiveEditor(sub);
    const onTr = () => refresh();
    editor?.on('transaction', onTr);
    refresh();
    return () => {
      unsubBridge();
      editor?.off('transaction', onTr);
    };
  }, [open]);

  // Devolvemos el foco al input al abrir.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [open]);

  // Al cambiar la query, actualiza el plugin (con debounce ligero) y desplaza
  // la vista al primer match.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const editor = getActiveEditor();
      if (!editor) return;
      dispatchMeta(editor, { query });
      scrollToCurrent(editor);
    }, 120);
    return () => clearTimeout(t);
  }, [query, open]);

  // Limpia el resaltado al cerrar.
  useEffect(() => {
    if (open) return;
    const editor = getActiveEditor();
    if (editor) dispatchMeta(editor, { query: '' });
  }, [open]);

  if (!open) return null;

  const navigate = (dir: 1 | -1) => {
    const editor = getActiveEditor();
    if (!editor) return;
    dispatchMeta(editor, { cycle: dir });
    scrollToCurrent(editor);
    inputRef.current?.focus();
  };

  const label =
    query === ''
      ? ''
      : findState.total === 0
        ? 'Sin coincidencias'
        : `${findState.currentIndex + 1} de ${findState.total}`;

  return (
    <div className="fixed right-8 top-14 z-40 flex items-center gap-1 rounded-card bg-surface px-2 py-1.5 shadow-xl ring-1 ring-black/[0.08]">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
          if (e.key === 'Enter') { e.preventDefault(); navigate(e.shiftKey ? -1 : 1); }
        }}
        placeholder="Buscar en la nota…"
        className="w-[220px] rounded-control bg-surface-alt px-2.5 py-1 text-[13px] text-text placeholder:text-text-muted focus:outline-none"
      />
      <span className="px-2 text-[11.5px] tabular-nums text-text-muted">{label}</span>
      <button
        onClick={() => navigate(-1)}
        title="Anterior (Shift+Enter)"
        disabled={findState.total === 0}
        className="rounded-control p-1.5 text-text-muted hover:bg-surface-alt hover:text-text disabled:opacity-40"
      >
        <ChevronUp size={14} />
      </button>
      <button
        onClick={() => navigate(1)}
        title="Siguiente (Enter)"
        disabled={findState.total === 0}
        className="rounded-control p-1.5 text-text-muted hover:bg-surface-alt hover:text-text disabled:opacity-40"
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
