import { useEffect, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Plus, X, Check } from 'lucide-react';
import { ipc } from '../ipc';
import { Channels } from '../../shared/ipc';
import { useStore } from '../store';
import type { Tag } from '../../shared/models';
import { TagChip } from './TagIcon';

interface Props { noteId: number; }

/** Chips de etiquetas asignadas a la nota + popover para añadir/quitar. */
export function NoteTags({ noteId }: Props) {
  const allTags = useStore((s) => s.tags);
  const [assigned, setAssigned] = useState<Tag[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = async () => {
    const t = await ipc(Channels.noteTags, { noteId });
    setAssigned(t);
  };
  useEffect(() => { void load(); }, [noteId]);

  const setIds = async (ids: number[]) => {
    await ipc(Channels.noteSetTags, { noteId, tagIds: ids });
    await load();
  };

  const toggle = async (tag: Tag) => {
    const ids = assigned.map((t) => t.id);
    const next = ids.includes(tag.id) ? ids.filter((x) => x !== tag.id) : [...ids, tag.id];
    await setIds(next);
  };

  const remove = async (tag: Tag) => {
    await setIds(assigned.filter((t) => t.id !== tag.id).map((t) => t.id));
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {assigned.map((t) => (
        <div
          key={t.id}
          className="group flex items-center gap-1.5 rounded-control bg-surface-alt py-1 pl-1.5 pr-1 text-[12.5px] text-text"
        >
          <TagChip name={t.icon} color={t.color} size={16} iconSize={10} />
          <span>{t.name}</span>
          <button
            onClick={() => remove(t)}
            title="Quitar etiqueta"
            className="rounded p-0.5 text-text-muted opacity-0 transition-opacity hover:bg-black/[0.06] hover:text-text group-hover:opacity-100"
          >
            <X size={11} />
          </button>
        </div>
      ))}
      <Popover.Root open={pickerOpen} onOpenChange={setPickerOpen}>
        <Popover.Trigger asChild>
          <button className="inline-flex items-center gap-1 rounded-control border border-dashed border-border px-2 py-1 text-[12px] text-text-muted hover:border-text-muted hover:text-text">
            <Plus size={11} />
            Etiqueta
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={6}
            className="z-50 w-[260px] rounded-card bg-surface p-2 shadow-xl ring-1 ring-black/[0.08]"
          >
            {allTags.length === 0 ? (
              <p className="px-2 py-3 text-center text-[12.5px] text-text-muted">
                Aún no hay etiquetas. Créalas desde la barra lateral.
              </p>
            ) : (
              <div className="max-h-[320px] overflow-y-auto">
                {allTags.map((t) => {
                  const isOn = assigned.some((a) => a.id === t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggle(t)}
                      className="flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-[13px] text-text hover:bg-surface-alt"
                    >
                      <TagChip name={t.icon} color={t.color} />
                      <span className="flex-1 truncate">{t.name}</span>
                      {isOn && <Check size={13} className="text-text" />}
                    </button>
                  );
                })}
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
