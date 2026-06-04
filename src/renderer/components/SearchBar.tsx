import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useStore } from '../store';

export function SearchBar() {
  const [text, setText] = useState('');
  const runSearch = useStore((s) => s.runSearch);
  const clearSearch = useStore((s) => s.clearSearch);
  const view = useStore((s) => s.view);

  useEffect(() => {
    if (view !== 'search') setText((t) => (t === '' ? t : ''));
  }, [view]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (text.trim()) runSearch(text);
      else if (view === 'search') clearSearch();
    }, 180);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="relative">
      <Search
        size={13}
        strokeWidth={2}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
      />
      <input
        data-mw-search
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Buscar en tus notas"
        className="w-full rounded-control bg-surface py-1.5 pl-8 pr-7 text-[13px] text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--text)_18%,transparent)]"
      />
      {text && (
        <button
          onClick={() => setText('')}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-control p-1 text-text-muted hover:bg-black/[0.06] hover:text-text"
          title="Limpiar"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
