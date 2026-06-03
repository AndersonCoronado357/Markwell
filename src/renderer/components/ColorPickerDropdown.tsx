import { type ReactNode, useState } from 'react';
import * as DM from '@radix-ui/react-dropdown-menu';
import { Check, Pipette, ArrowLeft } from 'lucide-react';
import { CustomColorPicker } from './CustomColorPicker';

export interface ColorPreset { name: string; value: string; }

interface Props {
  value: string;
  presets: ColorPreset[];
  onChange: (color: string) => void;
  trigger: ReactNode;
  resetLabel?: string;
}

export function ColorPickerDropdown({ value, presets, onChange, trigger, resetLabel = 'Predeterminado' }: Props) {
  const [customOpen, setCustomOpen] = useState(false);

  return (
    <DM.Root onOpenChange={(o) => { if (!o) setCustomOpen(false); }}>
      <DM.Trigger asChild>{trigger}</DM.Trigger>
      <DM.Portal>
        <DM.Content
          sideOffset={4}
          align="start"
          className="z-50 w-[260px] rounded-card bg-surface p-2 shadow-xl ring-1 ring-black/[0.08]"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {customOpen ? (
            <>
              <button
                onClick={() => setCustomOpen(false)}
                className="mb-1 flex items-center gap-1.5 rounded-control px-2 py-1 text-[12px] text-text-muted hover:bg-surface-alt hover:text-text"
              >
                <ArrowLeft size={12} />
                Atrás
              </button>
              <CustomColorPicker initial={value || '#a89bf0'} onChange={(hex) => onChange(hex)} />
            </>
          ) : (
            <>
              <button
                onClick={() => onChange('')}
                className="flex w-full cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-[12.5px] text-text outline-none hover:bg-surface-alt"
              >
                <span className="h-4 w-4 rounded-full ring-1 ring-black/[0.08]" />
                <span className="flex-1 text-left">{resetLabel}</span>
                {value === '' && <Check size={12} className="text-text" />}
              </button>

              <div className="px-1 pt-2 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">Paleta</div>
              <div className="grid grid-cols-6 gap-1 px-1">
                {presets.map((p) => {
                  const active = value.toLowerCase() === p.value.toLowerCase();
                  return (
                    <button
                      key={p.value}
                      onClick={() => onChange(p.value)}
                      title={p.name}
                      className="relative flex h-6 w-6 items-center justify-center rounded-full ring-1 ring-black/[0.08] transition-transform hover:scale-110"
                      style={{ background: p.value }}
                    >
                      {active && <Check size={10} className="text-[#0e0e10]" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCustomOpen(true)}
                className="mt-2 flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-[12.5px] text-text outline-none hover:bg-surface-alt"
              >
                <Pipette size={13} className="text-text-muted" />
                <span className="flex-1 text-left">Color personalizado…</span>
              </button>
            </>
          )}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
