import { useEffect, useState } from 'react';
import { Plus, Star, Trash2, Undo2, X as XIcon, Folder as FolderIcon, FileText, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import { ContextMenu, type CtxItem } from './ContextMenu';
import { confirmDelete } from '../confirmDelete';
import { ipc } from '../ipc';
import { Channels } from '../../shared/ipc';
import { TagChip } from './TagIcon';
import type { Folder, NoteSummary, Tag } from '../../shared/models';

const VIEW_TITLE: Record<string, string> = {
  favorites: 'Favoritos',
  trash: 'Papelera',
  folder: 'Notas',
  tag: 'Etiqueta',
  search: 'Resultados',
};

const pastelVar = (color: string | null): string =>
  color ? `var(--color-pastel-${color})` : 'var(--text-muted)';

function NoteRow({ note }: { note: NoteSummary }) {
  const active = useStore((s) => s.activeNoteId === note.id);
  const view = useStore((s) => s.view);
  const setActiveNote = useStore((s) => s.setActiveNote);
  const trashNote = useStore((s) => s.trashNote);
  const restoreNote = useStore((s) => s.restoreNote);
  const purgeNote = useStore((s) => s.purgeNote);
  const setFavorite = useStore((s) => s.setFavorite);

  const items: CtxItem[] =
    view === 'trash'
      ? [
          { label: 'Restaurar', icon: <Undo2 size={14} />, onSelect: () => restoreNote(note.id) },
          {
            label: 'Eliminar para siempre', icon: <Trash2 size={14} />, danger: true,
            onSelect: () => confirmDelete({ kind: 'nota', label: note.title || 'Sin título', onConfirm: () => purgeNote(note.id) }),
          },
        ]
      : [
          {
            label: note.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos',
            icon: <Star size={14} />,
            onSelect: () => setFavorite(note.id, !note.isFavorite),
          },
          {
            label: 'Mover a la papelera', icon: <Trash2 size={14} />, danger: true,
            onSelect: () => trashNote(note.id, note.title),
          },
        ];

  return (
    <ContextMenu items={items}>
      <button
        onClick={() => setActiveNote(note.id)}
        draggable={view !== 'trash'}
        onDragStart={(e) => {
          e.dataTransfer.setData('application/x-markwell-note', String(note.id));
          e.dataTransfer.effectAllowed = 'move';
        }}
        className={`group flex w-full items-center gap-3 rounded-card px-4 py-3 text-left transition-colors ${
          active ? 'bg-surface shadow-sm ring-1 ring-black/[0.04]' : 'hover:bg-surface/70'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className={`truncate text-[14px] ${active ? 'font-semibold' : 'font-medium'} text-text`}>
            {note.title || 'Sin título'}
          </div>
          <div className="mt-1 truncate text-[11.5px] text-text-muted">
            {new Date(note.updatedAt).toLocaleDateString('es', {
              day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
            })}
          </div>
        </div>
        {note.isFavorite && (
          <Star
            size={14}
            fill="var(--color-pastel-durazno)"
            stroke="var(--color-pastel-durazno)"
            className="shrink-0"
          />
        )}
      </button>
    </ContextMenu>
  );
}

/** Carpeta trasheada en árbol: muestra subcarpetas y notas dentro (también trasheadas). */
function TrashedFolderNode({
  folder, allFolders, depth, notesCache, onNotesLoaded,
}: {
  folder: Folder; allFolders: Folder[]; depth: number;
  notesCache: Map<number, NoteSummary[]>;
  onNotesLoaded: (folderId: number, notes: NoteSummary[]) => void;
}) {
  const [open, setOpen] = useState(true);
  const restoreFolder = useStore((s) => s.restoreFolder);
  const purgeFolder = useStore((s) => s.purgeFolder);
  const setActiveNote = useStore((s) => s.setActiveNote);
  const activeNoteId = useStore((s) => s.activeNoteId);
  const restoreNote = useStore((s) => s.restoreNote);
  const purgeNote = useStore((s) => s.purgeNote);

  const children = allFolders.filter((f) => f.parentId === folder.id);
  const indent = depth * 16;
  const c = pastelVar(folder.color);
  const innerNotes = notesCache.get(folder.id) ?? [];

  useEffect(() => {
    if (!notesCache.has(folder.id)) {
      void ipc(Channels.notesInFolder, { folderId: folder.id, trashed: true }).then((n) => onNotesLoaded(folder.id, n));
    }
  }, [folder.id, notesCache, onNotesLoaded]);

  const hasChildren = children.length > 0 || innerNotes.length > 0;

  /** Restaura recursivamente esta carpeta, sus subcarpetas y todas las notas dentro. */
  const restoreAll = () => {
    const folderIds: number[] = [];
    const noteIds: number[] = [];
    const walk = (id: number) => {
      folderIds.push(id);
      (notesCache.get(id) ?? []).forEach((n) => noteIds.push(n.id));
      allFolders.filter((f) => f.parentId === id).forEach((c) => walk(c.id));
    };
    walk(folder.id);
    void restoreFolder(folderIds, noteIds);
  };

  const folderMenu: CtxItem[] = [
    { label: open ? 'Contraer' : 'Expandir', icon: <ChevronRight size={14} />, onSelect: () => setOpen((o) => !o) },
    { label: 'Restaurar (con su contenido)', icon: <Undo2 size={14} />, onSelect: restoreAll },
    {
      label: 'Eliminar para siempre', icon: <Trash2 size={14} />, danger: true,
      onSelect: () => confirmDelete({ kind: 'carpeta', label: folder.name, onConfirm: () => purgeFolder(folder.id) }),
    },
  ];

  return (
    <div>
      <ContextMenu items={folderMenu}>
        <div className="flex items-center gap-2 rounded-card bg-surface px-3 py-2 shadow-sm ring-1 ring-black/[0.04]" style={{ marginLeft: indent }}>
          <button
            onClick={() => setOpen((o) => !o)}
            disabled={!hasChildren}
            className="flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-black/[0.06] hover:text-text disabled:opacity-25"
          >
            <ChevronRight size={12} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
          <FolderIcon size={16} style={{ color: c, fill: c }} />
          <span className="flex-1 truncate text-[13.5px] text-text">{folder.name}</span>
          <span className="text-[11px] text-text-muted">{innerNotes.length}</span>
          <button
            onClick={restoreAll}
            title="Restaurar carpeta y su contenido"
            className="rounded-control p-1.5 text-text-muted hover:bg-surface-alt hover:text-text"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={() => confirmDelete({ kind: 'carpeta', label: folder.name, onConfirm: () => purgeFolder(folder.id) })}
            title="Eliminar para siempre"
            className="rounded-control p-1.5 text-text-muted hover:bg-[#fee2e8] hover:text-[#c34062]"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </ContextMenu>

      {open && hasChildren && (
        <div className="mt-1.5 space-y-1.5">
          {children.map((sub) => (
            <TrashedFolderNode
              key={sub.id} folder={sub} allFolders={allFolders} depth={depth + 1}
              notesCache={notesCache} onNotesLoaded={onNotesLoaded}
            />
          ))}
          {innerNotes.map((n) => {
            const noteMenu: CtxItem[] = [
              { label: 'Restaurar', icon: <Undo2 size={14} />, onSelect: () => restoreNote(n.id) },
              {
                label: 'Eliminar para siempre', icon: <Trash2 size={14} />, danger: true,
                onSelect: () => confirmDelete({ kind: 'nota', label: n.title || 'Sin título', onConfirm: () => purgeNote(n.id) }),
              },
            ];
            return (
              <ContextMenu items={noteMenu} key={n.id}>
                <div
                  className={`flex items-center gap-2 rounded-card bg-surface px-3 py-2 ring-1 ring-black/[0.04] ${
                    activeNoteId === n.id ? 'shadow-sm ring-2 ring-text/30' : ''
                  }`}
                  style={{ marginLeft: indent + 24 }}
                >
                  <FileText size={14} className="text-text-muted" />
                  <button onClick={() => setActiveNote(n.id)} className="flex-1 truncate text-left text-[13px] text-text">
                    {n.title || 'Sin título'}
                  </button>
                  <button onClick={() => restoreNote(n.id)} title="Restaurar" className="rounded-control p-1.5 text-text-muted hover:bg-surface-alt hover:text-text">
                    <Undo2 size={14} />
                  </button>
                  <button
                    onClick={() => confirmDelete({ kind: 'nota', label: n.title || 'Sin título', onConfirm: () => purgeNote(n.id) })}
                    title="Eliminar para siempre"
                    className="rounded-control p-1.5 text-text-muted hover:bg-[#fee2e8] hover:text-[#c34062]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </ContextMenu>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TrashView() {
  const notes = useStore((s) => s.notes);
  const folders = useStore((s) => s.trashedFolders);
  const tags = useStore((s) => s.trashedTags);
  const restoreTag = useStore((s) => s.restoreTag);
  const purgeTag = useStore((s) => s.purgeTag);
  const restoreNote = useStore((s) => s.restoreNote);
  const purgeNote = useStore((s) => s.purgeNote);
  const loadTrash = useStore((s) => s.loadTrash);
  const setActiveNote = useStore((s) => s.setActiveNote);
  const activeNoteId = useStore((s) => s.activeNoteId);
  // Cache compartido de notas trasheadas por carpeta (usado por el árbol).
  const [notesByFolder, setNotesByFolder] = useState<Map<number, NoteSummary[]>>(new Map());
  const onNotesLoaded = (fId: number, list: NoteSummary[]) => {
    setNotesByFolder((m) => { const n = new Map(m); n.set(fId, list); return n; });
  };

  useEffect(() => { void loadTrash(); setNotesByFolder(new Map()); }, [loadTrash]);

  const trashedFolderIds = new Set(folders.map((f) => f.id));
  // Notas trasheadas que NO están dentro de una carpeta también trasheada.
  const orphanNotes = notes.filter((n) => n.folderId == null || !trashedFolderIds.has(n.folderId));
  const rootFolders = folders.filter((f) => f.parentId == null || !trashedFolderIds.has(f.parentId));
  const total = notes.length + folders.length + tags.length;

  return (
    <section className="flex min-h-0 flex-col bg-bg">
      <header className="px-5 pt-6 pb-3">
        <h2 className="text-[18px] font-bold tracking-tight">
          Papelera <span className="ml-1.5 text-sm font-normal text-text-muted">{total}</span>
        </h2>
        <p className="mt-1 text-[12.5px] text-text-muted">Restaura lo que necesites o elimínalo para siempre.</p>
      </header>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {total === 0 && (
          <p className="mt-20 px-3 text-center text-[13px] text-text-muted">La papelera está vacía</p>
        )}

        {rootFolders.length > 0 && (
          <Section title="Carpetas" count={folders.length}>
            <div className="space-y-1.5">
              {rootFolders.map((f) => (
                <TrashedFolderNode
                  key={f.id} folder={f} allFolders={folders} depth={0}
                  notesCache={notesByFolder} onNotesLoaded={onNotesLoaded}
                />
              ))}
            </div>
          </Section>
        )}

        {tags.length > 0 && (
          <Section title="Etiquetas" count={tags.length}>
            {tags.map((t: Tag) => {
              const menu: CtxItem[] = [
                { label: 'Restaurar', icon: <Undo2 size={14} />, onSelect: () => restoreTag(t.id) },
                {
                  label: 'Eliminar para siempre', icon: <Trash2 size={14} />, danger: true,
                  onSelect: () => confirmDelete({ kind: 'etiqueta', label: t.name, onConfirm: () => purgeTag(t.id) }),
                },
              ];
              return (
                <ContextMenu items={menu} key={t.id}>
                  <div className="flex items-center gap-3 rounded-card bg-surface px-4 py-2.5 shadow-sm ring-1 ring-black/[0.04]">
                    <TagChip name={t.icon} color={t.color} />
                    <span className="flex-1 truncate text-[13.5px] text-text">{t.name}</span>
                    <button onClick={() => restoreTag(t.id)} title="Restaurar" className="rounded-control p-1.5 text-text-muted hover:bg-surface-alt hover:text-text">
                      <Undo2 size={14} />
                    </button>
                    <button
                      onClick={() => confirmDelete({ kind: 'etiqueta', label: t.name, onConfirm: () => purgeTag(t.id) })}
                      title="Eliminar para siempre"
                      className="rounded-control p-1.5 text-text-muted hover:bg-[#fee2e8] hover:text-[#c34062]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </ContextMenu>
              );
            })}
          </Section>
        )}

        {orphanNotes.length > 0 && (
          <Section title="Notas sueltas" count={orphanNotes.length}>
            {orphanNotes.map((n) => {
              const menu: CtxItem[] = [
                { label: 'Restaurar', icon: <Undo2 size={14} />, onSelect: () => restoreNote(n.id) },
                {
                  label: 'Eliminar para siempre', icon: <Trash2 size={14} />, danger: true,
                  onSelect: () => confirmDelete({ kind: 'nota', label: n.title || 'Sin título', onConfirm: () => purgeNote(n.id) }),
                },
              ];
              return (
                <ContextMenu items={menu} key={n.id}>
                  <div
                    className={`flex items-center gap-2 rounded-card bg-surface px-4 py-2.5 shadow-sm ring-1 ring-black/[0.04] ${
                      activeNoteId === n.id ? 'ring-2 ring-text/30' : ''
                    }`}
                  >
                    <FileText size={14} className="text-text-muted" />
                    <button onClick={() => setActiveNote(n.id)} className="flex-1 truncate text-left text-[13.5px] text-text">
                      {n.title || 'Sin título'}
                    </button>
                    <button onClick={() => restoreNote(n.id)} title="Restaurar" className="rounded-control p-1.5 text-text-muted hover:bg-surface-alt hover:text-text">
                      <Undo2 size={14} />
                    </button>
                    <button
                      onClick={() => confirmDelete({ kind: 'nota', label: n.title || 'Sin título', onConfirm: () => purgeNote(n.id) })}
                      title="Eliminar para siempre"
                      className="rounded-control p-1.5 text-text-muted hover:bg-[#fee2e8] hover:text-[#c34062]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </ContextMenu>
              );
            })}
          </Section>
        )}
      </div>
    </section>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">
        {title} <span className="ml-1 text-text-muted/70">{count}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function SearchResults() {
  const hits = useStore((s) => s.searchHits);
  const searching = useStore((s) => s.searching);
  const q = useStore((s) => s.searchQuery);
  const activeNoteId = useStore((s) => s.activeNoteId);
  const setActiveNote = useStore((s) => s.setActiveNote);
  const clear = useStore((s) => s.clearSearch);

  return (
    <section className="flex min-h-0 flex-col bg-bg">
      <header className="flex items-center justify-between px-5 pt-6 pb-3">
        <h2 className="text-[18px] font-bold tracking-tight">
          Resultados <span className="ml-1 text-sm font-normal text-text-muted">{hits.length}</span>
        </h2>
        <button onClick={() => clear()} className="rounded-control p-1.5 text-text-muted hover:bg-black/[0.06] hover:text-text" title="Cerrar búsqueda">
          <XIcon size={14} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        {searching ? (
          <p className="px-3 py-2 text-[13px] text-text-muted">Buscando…</p>
        ) : hits.length === 0 ? (
          <p className="mt-20 px-3 text-center text-[13px] text-text-muted">Sin resultados para “{q}”.</p>
        ) : (
          <ul className="space-y-1">
            {hits.map((h) => {
              const active = activeNoteId === h.noteId;
              const parts = h.snippet.split(/<<|>>/);
              return (
                <li key={h.noteId}>
                  <button
                    onClick={() => setActiveNote(h.noteId)}
                    className={`w-full rounded-card px-4 py-3 text-left transition-colors ${
                      active ? 'bg-surface shadow-sm ring-1 ring-black/[0.04]' : 'hover:bg-surface/70'
                    } ${h.trashed ? 'opacity-65' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`flex-1 truncate text-[14px] ${active ? 'font-semibold' : 'font-medium'} text-text`}>
                        {h.title || 'Sin título'}
                      </div>
                      {h.trashed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-alt px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                          <Trash2 size={10} />
                          papelera
                        </span>
                      )}
                    </div>
                    <div className="mt-1 line-clamp-2 text-[12.5px] text-text-muted">
                      {parts.map((p, i) =>
                        i % 2 === 1 ? (
                          <mark key={i} className="rounded bg-[color-mix(in_srgb,var(--color-pastel-amarillo)_60%,transparent)] px-0.5 text-text">{p}</mark>
                        ) : (
                          <span key={i}>{p}</span>
                        ),
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

export function NotesPane() {
  const notes = useStore((s) => s.notes);
  const view = useStore((s) => s.view);
  const tags = useStore((s) => s.tags);
  const selectedTagId = useStore((s) => s.selectedTagId);
  const createNote = useStore((s) => s.createNote);

  if (view === 'search') return <SearchResults />;
  if (view === 'trash') return <TrashView />;

  const tag = view === 'tag' ? tags.find((t) => t.id === selectedTagId) : null;
  const title = tag ? `#${tag.name}` : VIEW_TITLE[view];

  return (
    <section className="flex min-h-0 flex-col bg-bg">
      <header className="flex items-center justify-between px-5 pt-6 pb-3">
        <h2 className="text-[18px] font-bold tracking-tight">
          {title}
          <span className="ml-1.5 text-sm font-normal text-text-muted">{notes.length}</span>
        </h2>
        {(view === 'folder' || view === 'tag') && (
          <button
            onClick={() => createNote()}
            className="inline-flex items-center gap-1.5 rounded-control bg-text px-3 py-1.5 text-[13px] font-semibold text-surface transition-opacity hover:opacity-90"
          >
            <Plus size={14} />
            Nota
          </button>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        {notes.length === 0 ? (
          <p className="mt-20 px-3 text-center text-[13px] text-text-muted">No hay notas todavía</p>
        ) : (
          <ul className="space-y-1">
            {notes.map((n) => (
              <li key={n.id}>
                <NoteRow note={n} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
