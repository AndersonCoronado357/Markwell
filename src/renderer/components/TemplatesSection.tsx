import { useEffect, useState } from 'react';
import { FileText, Plus, Pencil, Trash2 } from 'lucide-react';
import { ipc } from '../ipc';
import { Channels } from '../../shared/ipc';
import type { Template } from '../../shared/models';
import { toast } from '../toastStore';
import { confirmDelete } from '../confirmDelete';

/** Sección "Plantillas" dentro de Ajustes: lista, crea, renombra y elimina. */
export function TemplatesSection() {
  const [items, setItems] = useState<Template[]>([]);
  const [editing, setEditing] = useState<{ id?: number; name: string; description: string } | null>(null);

  const reload = () => { void ipc(Channels.templateList).then(setItems); };
  useEffect(reload, []);

  const save = async () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) return;
    try {
      if (editing.id != null) {
        await ipc(Channels.templateUpdate, { id: editing.id, name, description: editing.description.trim() || null });
        toast({ title: 'Plantilla actualizada', description: name });
      } else {
        await ipc(Channels.templateCreate, {
          name,
          description: editing.description.trim() || null,
          // Esqueleto inicial: un párrafo vacío. El usuario lo edita después.
          contentJson: { type: 'doc', content: [{ type: 'paragraph' }] },
        });
        toast({ title: 'Plantilla creada', description: name });
      }
      setEditing(null);
      reload();
    } catch {
      toast({ title: 'No se pudo guardar la plantilla' });
    }
  };

  const remove = (t: Template) =>
    confirmDelete({
      kind: 'nota',
      label: t.name,
      onConfirm: async () => {
        await ipc(Channels.templateDelete, { id: t.id });
        reload();
      },
    });

  return (
    <div className="mt-10">
      <h2 className="flex items-center gap-2 text-[14px] font-semibold text-text">
        <FileText size={15} className="text-text-muted" />
        Plantillas
      </h2>
      <p className="mt-1 max-w-[820px] text-[12.5px] leading-relaxed text-text-muted">
        Guarda esqueletos reutilizables (diario, reunión, idea, lista). Desde la paleta de comandos puedes crear una nueva nota a partir de cualquier plantilla.
      </p>

      <div className="mt-3 rounded-card bg-surface-alt p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setEditing({ name: '', description: '' })}
            className="inline-flex items-center gap-1.5 rounded-control bg-text px-3 py-1.5 text-[12.5px] font-semibold text-surface transition-opacity hover:opacity-90"
          >
            <Plus size={13} />
            Nueva plantilla
          </button>
        </div>

        {editing && (
          <div className="mt-4 space-y-2 rounded-control bg-surface p-3 ring-1 ring-black/[0.06]">
            <input
              autoFocus
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); void save(); }
                if (e.key === 'Escape') setEditing(null);
              }}
              placeholder="Nombre de la plantilla"
              className="w-full rounded-control bg-surface-alt px-2.5 py-1.5 text-[13px] text-text placeholder:text-text-muted focus:outline-none"
            />
            <input
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="Descripción (opcional)"
              className="w-full rounded-control bg-surface-alt px-2.5 py-1.5 text-[12.5px] text-text-muted placeholder:text-text-muted/70 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-control px-3 py-1 text-[12px] text-text-muted hover:bg-surface-alt hover:text-text"
              >
                Cancelar
              </button>
              <button
                onClick={() => void save()}
                className="rounded-control bg-text px-3 py-1 text-[12px] font-semibold text-surface transition-opacity hover:opacity-90"
              >
                Guardar
              </button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <p className="mt-4 text-[12.5px] text-text-muted">No hay plantillas. Crea la primera con el botón de arriba.</p>
        ) : (
          <ul className="mt-4 space-y-1">
            {items.map((t) => (
              <li key={t.id} className="group flex items-center gap-3 rounded-control bg-surface px-3 py-2 ring-1 ring-black/[0.06]">
                <FileText size={14} className="shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-text">{t.name}</div>
                  {t.description && <div className="truncate text-[11.5px] text-text-muted">{t.description}</div>}
                </div>
                <button
                  onClick={() => setEditing({ id: t.id, name: t.name, description: t.description ?? '' })}
                  title="Renombrar"
                  className="rounded-control p-1.5 text-text-muted opacity-0 hover:bg-surface-alt hover:text-text group-hover:opacity-100"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => remove(t)}
                  title="Eliminar"
                  className="rounded-control p-1.5 text-text-muted opacity-0 hover:bg-[#fee2e8] hover:text-[#c34062] group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
