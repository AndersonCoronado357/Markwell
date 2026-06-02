import type { ReactNode } from 'react';
import * as RCM from '@radix-ui/react-context-menu';

export interface CtxItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  shortcut?: string;
}

interface Props {
  items: CtxItem[];
  children: ReactNode;
}

/** Menú contextual (clic derecho) accesible, vestido con tokens de Markwell. */
export function ContextMenu({ items, children }: Props) {
  return (
    <RCM.Root>
      <RCM.Trigger asChild>{children}</RCM.Trigger>
      <RCM.Portal>
        <RCM.Content
          className="min-w-[180px] rounded-card bg-surface p-1 text-sm text-text shadow-lg ring-1 ring-black/[0.06]"
          collisionPadding={8}
        >
          {items.map((it, i) => (
            <RCM.Item
              key={i}
              onSelect={it.onSelect}
              className={`flex cursor-pointer select-none items-center gap-2.5 rounded-control px-2.5 py-1.5 outline-none ${
                it.danger
                  ? 'text-[#a04055] data-[highlighted]:bg-[color-mix(in_srgb,var(--color-pastel-rosa)_30%,transparent)]'
                  : 'data-[highlighted]:bg-surface-alt'
              }`}
            >
              {it.icon && <span className="opacity-70">{it.icon}</span>}
              <span className="flex-1">{it.label}</span>
              {it.shortcut && <span className="text-xs text-text-muted">{it.shortcut}</span>}
            </RCM.Item>
          ))}
        </RCM.Content>
      </RCM.Portal>
    </RCM.Root>
  );
}
