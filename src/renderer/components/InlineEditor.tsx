import { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { TAG_ICON_NAMES, TAG_ICONS, TagChip } from './TagIcon';

const PASTELS = [
  'rosa', 'coral', 'durazno', 'amarillo', 'lima', 'menta',
  'agua', 'cielo', 'azul', 'lavanda', 'lila', 'malva',
] as const;

interface Props {
  initialName?: string;
  initialColor?: string | null;
  initialIcon?: string | null;
  /** Si está activo, el editor también muestra selector de icono (etiquetas). */
  withIcon?: boolean;
  onSubmit: (name: string, color: string, icon: string | null) => void;
  onCancel: () => void;
  placeholder?: string;
  paddingLeft?: number;
}

export function InlineEditor({
  initialName = '', initialColor = null, initialIcon = null, withIcon = false,
  onSubmit, onCancel, placeholder = 'Nombre', paddingLeft = 10,
}: Props) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState<string>(initialColor ?? 'lavanda');
  const [icon, setIcon] = useState<string | null>(initialIcon ?? (withIcon ? 'hash' : null));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = () => {
    const n = name.trim();
    if (!n) { onCancel(); return; }
    onSubmit(n, color, withIcon ? icon : null);
  };

  return (
    <div
      className="rounded-control bg-surface px-2.5 py-2 shadow-sm ring-1 ring-black/[0.06]"
      style={{ marginLeft: paddingLeft }}
      onClick={(e) => e.stopPropagation()}
    >
      {withIcon && (
        <div className="mb-2 flex items-center gap-2 rounded-control bg-surface-alt px-2 py-1.5">
          <TagChip name={icon} color={color} size={20} iconSize={12} />
          <span className="truncate text-[13px] text-text">{name.trim() || 'Vista previa'}</span>
        </div>
      )}
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); submit(); }
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }}
        onBlur={() => {
          setTimeout(() => {
            if (document.activeElement?.tagName !== 'BUTTON') submit();
          }, 120);
        }}
        placeholder={placeholder}
        className="w-full bg-transparent text-[13.5px] text-text placeholder:text-text-muted focus:outline-none"
      />

      <div className="mt-2 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">Color</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {PASTELS.map((c) => {
          const active = color === c;
          return (
            <button
              key={c}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setColor(c);
                inputRef.current?.focus();
              }}
              title={c}
              className="relative flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-black/[0.08] transition-transform hover:scale-110"
              style={{ background: `var(--color-pastel-${c})` }}
            >
              {active && <Check size={10} className="text-[#1d2230]" strokeWidth={3} />}
            </button>
          );
        })}
      </div>

      {withIcon && (
        <>
          <div className="mt-3 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">Icono</div>
          <div className="mt-1 grid grid-cols-[repeat(auto-fill,minmax(28px,1fr))] gap-1">
            {TAG_ICON_NAMES.map((n) => {
              const Icon = TAG_ICONS[n];
              const active = icon === n;
              return (
                <button
                  key={n}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIcon(n);
                    inputRef.current?.focus();
                  }}
                  title={n}
                  className={`flex h-7 w-7 items-center justify-center rounded-control transition-colors ${
                    active ? 'bg-text/15 text-text' : 'text-text-muted hover:bg-surface-alt hover:text-text'
                  }`}
                >
                  <Icon size={14} />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
