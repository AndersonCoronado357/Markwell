import { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Search, CornerDownLeft } from 'lucide-react';
import { useStore } from '../store';
import { buildCommandsAsync, type Command } from '../commands';

/** Filtro difuso simple: cada caracter de la query debe aparecer en orden en el label. */
function fuzzyMatch(label: string, query: string): boolean {
  if (!query) return true;
  const l = label.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  const q = query.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  let i = 0;
  for (const ch of l) { if (ch === q[i]) i++; if (i >= q.length) return true; }
  return i >= q.length;
}

export function CommandPalette() {
  const open = useStore((s) => s.paletteOpen);
  const setOpen = useStore((s) => s.openPalette);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Recalcula la lista al abrir: depende del estado (nota activa, modo…).
  const [commands, setCommands] = useState<Command[]>([]);
  useEffect(() => {
    if (!open) { setCommands([]); return; }
    void buildCommandsAsync().then(setCommands);
  }, [open]);
  const filtered = useMemo(() => commands.filter((c) => fuzzyMatch(c.label, query)), [commands, query]);

  useEffect(() => { setActiveIndex(0); }, [query, open]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  // Agrupa por sección manteniendo el orden filtrado.
  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const c of filtered) {
      const arr = map.get(c.group) ?? [];
      arr.push(c);
      map.set(c.group, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const flat = filtered;

  const run = (c: Command) => {
    setOpen(false);
    setTimeout(() => { void c.run(); }, 0);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20" />
        <Dialog.Content
          className="fixed left-1/2 top-[18%] z-50 w-[min(620px,92vw)] -translate-x-1/2 overflow-hidden rounded-card bg-surface shadow-2xl ring-1 ring-black/[0.08] focus:outline-none"
          aria-describedby={undefined}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIndex((i) => Math.min(flat.length - 1, i + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex((i) => Math.max(0, i - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const cmd = flat[activeIndex];
              if (cmd) run(cmd);
            }
          }}
        >
          <Dialog.Title className="sr-only">Paleta de comandos</Dialog.Title>

          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            <Search size={14} className="text-text-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribe un comando o una acción…"
              className="flex-1 bg-transparent text-[14px] text-text placeholder:text-text-muted focus:outline-none"
            />
            <kbd className="rounded bg-surface-alt px-1.5 py-0.5 font-mono text-[10px] text-text-muted ring-1 ring-black/[0.06]">Esc</kbd>
          </div>

          <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-1.5">
            {flat.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-text-muted">Sin comandos para "{query}"</p>
            ) : (
              grouped.map(([group, items]) => (
                <div key={group} className="mb-1">
                  <div className="px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">{group}</div>
                  {items.map((c) => {
                    const idx = flat.indexOf(c);
                    const active = idx === activeIndex;
                    return (
                      <button
                        key={c.id}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => run(c)}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13.5px] transition-colors ${
                          active ? 'bg-surface-alt text-text' : 'text-text hover:bg-surface-alt'
                        }`}
                      >
                        <span className="truncate">{c.label}</span>
                        <div className="flex shrink-0 items-center gap-2">
                          {c.shortcut && (
                            <kbd className="rounded bg-surface-alt px-1.5 py-0.5 font-mono text-[10px] text-text-muted ring-1 ring-black/[0.06]">
                              {c.shortcut}
                            </kbd>
                          )}
                          {active && <CornerDownLeft size={12} className="text-text-muted" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
