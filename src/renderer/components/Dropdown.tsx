import { type ReactNode } from 'react';
import * as DM from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';

export interface DropdownOption<T extends string | number> {
  value: T;
  label: string;
  style?: React.CSSProperties;
}

interface Props<T extends string | number> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  width?: number;
  align?: 'start' | 'center' | 'end';
  title?: string;
  /** Render personalizado del trigger (en lugar del botón con la etiqueta). */
  trigger?: ReactNode;
}

/** Dropdown propio (Radix DropdownMenu) con estilo consistente al resto de la app. */
export function Dropdown<T extends string | number>({
  value, options, onChange, width = 150, align = 'start', title, trigger,
}: Props<T>) {
  const current = options.find((o) => o.value === value);
  return (
    <DM.Root>
      <DM.Trigger asChild>
        {trigger ?? (
          <button
            title={title}
            className="flex h-7 items-center justify-between gap-1 rounded-control bg-transparent px-2 text-[12px] text-text outline-none transition-colors hover:bg-surface-alt focus:outline-none focus-visible:bg-surface-alt data-[state=open]:bg-surface-alt"
            style={{ width }}
          >
            <span className="truncate text-text-muted" style={current?.style}>{current?.label ?? '—'}</span>
            <ChevronDown size={11} className="shrink-0 text-text-muted" />
          </button>
        )}
      </DM.Trigger>
      <DM.Portal>
        <DM.Content
          align={align}
          sideOffset={4}
          className="mw-sin-barra z-50 max-h-[320px] overflow-y-auto rounded-card bg-surface p-1 shadow-xl ring-1 ring-black/[0.08]"
          style={{ width: width }}
        >
          {options.map((o) => (
            <DM.Item
              key={String(o.value)}
              onSelect={() => onChange(o.value)}
              className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-[13px] text-text outline-none data-[highlighted]:bg-surface-alt"
            >
              <span className="flex-1 truncate" style={o.style}>{o.label}</span>
              {o.value === value && <Check size={13} className="text-text" />}
            </DM.Item>
          ))}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
