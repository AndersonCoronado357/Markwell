import { useEffect, useState } from 'react';
import { Star, Plus } from 'lucide-react';
import { useStore } from '../store';
import { ipc } from '../ipc';
import { Channels } from '../../shared/ipc';
import { ContextMenu, type CtxItem } from './ContextMenu';
import { Trash2 } from 'lucide-react';
import type { Note, NoteSummary } from '../../shared/models';

/**
 * Mural de tarjetas: vista alternativa al "estado vacío" del editor.
 * Muestra las notas del contexto actual (carpeta / etiqueta / favoritos / todas)
 * como tarjetas grandes en cuadrícula, con preview del contenido.
 */
export function WallView() {
  const notes = useStore((s) => s.notes);
  const view = useStore((s) => s.view);
  const tags = useStore((s) => s.tags);
  const selectedTagId = useStore((s) => s.selectedTagId);
  const setActiveNote = useStore((s) => s.setActiveNote);
  const createNote = useStore((s) => s.createNote);
  const setFavorite = useStore((s) => s.setFavorite);
  const trashNote = useStore((s) => s.trashNote);

  // Cargamos los previews (plaintext recortado) de las notas visibles.
  const [previews, setPreviews] = useState<Map<number, string>>(new Map());
  useEffect(() => {
    let cancelled = false;
    const next = new Map<number, string>();
    Promise.all(
      notes.slice(0, 100).map(async (n) => {
        const full = await ipc(Channels.noteGet, { id: n.id });
        if (full) next.set(n.id, (full as Note).plaintext.slice(0, 280));
      }),
    ).then(() => { if (!cancelled) setPreviews(next); });
    return () => { cancelled = true; };
  }, [notes]);

  const title =
    view === 'favorites' ? 'Favoritos'
    : view === 'tag' ? `#${tags.find((t) => t.id === selectedTagId)?.name ?? ''}`
    : 'Todas las notas';

  return (
    <section className="flex min-h-0 flex-col bg-surface">
      <header className="flex items-center justify-between px-8 pt-6 pb-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">{title}</h1>
          <p className="mt-0.5 text-[12.5px] text-text-muted">{notes.length} {notes.length === 1 ? 'nota' : 'notas'}</p>
        </div>
        {view !== 'tag' && view !== 'favorites' && (
          <button
            onClick={() => createNote()}
            className="inline-flex items-center gap-1.5 rounded-control bg-text px-3 py-1.5 text-[13px] font-semibold text-surface transition-opacity hover:opacity-90"
          >
            <Plus size={14} />
            Nota
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-10">
        {notes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-[64px] w-[64px] items-center justify-center rounded-[18px] bg-surface-alt">
              <span className="h-6 w-6 rounded-[8px] bg-text/80" />
            </div>
            <h3 className="text-[19px] font-bold tracking-tight">Nada por aquí todavía</h3>
            <p className="mt-1 max-w-sm text-[13px] text-text-muted">
              Crea una nota para empezar, o elige una carpeta o etiqueta de la barra lateral.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {notes.map((n) => (
              <Card
                key={n.id}
                note={n}
                preview={previews.get(n.id) ?? ''}
                onOpen={() => setActiveNote(n.id)}
                onFav={() => setFavorite(n.id, !n.isFavorite)}
                onTrash={() => trashNote(n.id, n.title)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Card({
  note, preview, onOpen, onFav, onTrash,
}: {
  note: NoteSummary; preview: string;
  onOpen: () => void; onFav: () => void; onTrash: () => void;
}) {
  const items: CtxItem[] = [
    {
      label: note.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos',
      icon: <Star size={14} />,
      onSelect: onFav,
    },
    { label: 'Mover a la papelera', icon: <Trash2 size={14} />, danger: true, onSelect: onTrash },
  ];

  return (
    <ContextMenu items={items}>
      <button
        onClick={onOpen}
        className="group relative flex h-[180px] w-full flex-col gap-2 overflow-hidden rounded-card bg-bg p-4 text-left ring-1 ring-black/[0.05] transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-black/[0.12]"
      >
        <div className="flex items-start gap-2">
          <h3 className="line-clamp-2 flex-1 text-[14.5px] font-semibold leading-snug text-text">
            {note.title || 'Sin título'}
          </h3>
          {note.isFavorite && (
            <Star size={14} fill="var(--color-pastel-durazno)" stroke="var(--color-pastel-durazno)" className="shrink-0" />
          )}
        </div>
        <p className="line-clamp-5 flex-1 text-[12.5px] leading-relaxed text-text-muted">
          {preview || <span className="italic">Sin contenido</span>}
        </p>
        <p className="text-[11px] text-text-muted/80">
          {new Date(note.updatedAt).toLocaleDateString('es', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </button>
    </ContextMenu>
  );
}
