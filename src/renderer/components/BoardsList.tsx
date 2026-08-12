import { useEffect } from 'react';
import { Plus, LayoutDashboard, Trash2, Star } from 'lucide-react';
import { useStore } from '../store';
import { ContextMenu, type CtxItem } from './ContextMenu';

const pastelVar = (c: string | null) => (c ? `var(--color-pastel-${c})` : 'var(--text-muted)');

/** Panel del medio cuando mode='boards': lista las pizarras del contexto. */
export function BoardsList() {
  const boards = useStore((s) => s.boards);
  const activeBoardId = useStore((s) => s.activeBoardId);
  const setActiveBoard = useStore((s) => s.setActiveBoard);
  const setBoardFavorite = useStore((s) => s.setBoardFavorite);
  const createBoard = useStore((s) => s.createBoard);
  const trashBoard = useStore((s) => s.trashBoard);
  const loadBoards = useStore((s) => s.loadBoards);
  const selectedFolderId = useStore((s) => s.selectedFolderId);

  useEffect(() => { void loadBoards(); }, [loadBoards, selectedFolderId]);

  return (
    <section className="flex min-h-0 flex-col bg-bg">
      <header className="flex items-center justify-between px-5 pt-6 pb-3">
        <h2 className="text-[18px] font-bold tracking-tight">
          Pizarras
          <span className="ml-1.5 text-sm font-normal text-text-muted">{boards.length}</span>
        </h2>
        <button
          onClick={() => createBoard('Nueva pizarra')}
          className="inline-flex items-center gap-1.5 rounded-control bg-text px-3 py-1.5 text-[13px] font-semibold text-surface transition-opacity hover:opacity-90"
        >
          <Plus size={14} />
          Pizarra
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        {boards.length === 0 ? (
          <p className="mt-20 px-3 text-center text-[13px] text-text-muted">No hay pizarras todavía</p>
        ) : (
          <ul className="space-y-1">
            {boards.map((b) => {
              const active = activeBoardId === b.id;
              const items: CtxItem[] = [
                {
                  label: b.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos',
                  icon: <Star size={14} />,
                  onSelect: () => void setBoardFavorite(b.id, !b.isFavorite),
                },
                {
                  label: 'Mover a la papelera', icon: <Trash2 size={14} />, danger: true,
                  onSelect: () => trashBoard(b.id, b.name),
                },
              ];
              return (
                <li key={b.id}>
                  <ContextMenu items={items}>
                    <button
                      onClick={() => setActiveBoard(b.id)}
                      className={`group flex w-full items-center gap-3 rounded-card px-4 py-3 text-left transition-colors ${
                        active ? 'bg-surface shadow-sm ring-1 ring-black/[0.04]' : 'hover:bg-surface/70'
                      }`}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]"
                        style={{ background: `color-mix(in srgb, ${pastelVar(b.color)} 60%, transparent)` }}
                      >
                        <LayoutDashboard size={14} className="text-text" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-[14px] ${active ? 'font-semibold' : 'font-medium'} text-text`}>
                          {b.name}
                        </div>
                        <div className="mt-0.5 truncate text-[11.5px] text-text-muted">
                          {new Date(b.updatedAt).toLocaleDateString('es', {
                            day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <span
                        role="button"
                        tabIndex={-1}
                        title={b.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                        onClick={(e) => { e.stopPropagation(); void setBoardFavorite(b.id, !b.isFavorite); }}
                        className={`shrink-0 rounded-control p-1 transition-opacity ${
                          b.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Star
                          size={14}
                          fill={b.isFavorite ? 'var(--color-pastel-durazno)' : 'none'}
                          stroke={b.isFavorite ? 'var(--color-pastel-durazno)' : 'currentColor'}
                          className="text-text-muted"
                        />
                      </span>
                    </button>
                  </ContextMenu>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
