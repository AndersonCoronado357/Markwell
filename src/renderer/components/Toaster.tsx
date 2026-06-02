import * as Toast from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { useToastStore } from '../toastStore';

export function Toaster() {
  const items = useToastStore((s) => s.items);
  const remove = useToastStore((s) => s.remove);

  return (
    <Toast.Provider swipeDirection="right" duration={6000}>
      {items.map((t) => (
        <Toast.Root
          key={t.id}
          open
          duration={t.duration === null ? Number.POSITIVE_INFINITY : (t.duration ?? 6000)}
          onOpenChange={(open) => { if (!open) remove(t.id); }}
          className="flex items-center gap-3 rounded-card bg-surface px-4 py-3 shadow-xl ring-1 ring-black/[0.08]"
        >
          <div className="flex min-w-0 flex-1 flex-col">
            <Toast.Title className="text-[13px] font-medium text-text">{t.title}</Toast.Title>
            {t.description && (
              <Toast.Description className="mt-0.5 truncate text-[12px] text-text-muted">
                {t.description}
              </Toast.Description>
            )}
          </div>
          {t.actions?.map((a, i) => (
            <Toast.Action
              key={i}
              asChild
              altText={a.label}
              onClick={() => { a.onClick(); remove(t.id); }}
            >
              <button
                className={`rounded-control px-2.5 py-1 text-[12px] font-semibold transition-opacity hover:opacity-90 ${
                  a.danger
                    ? 'bg-[#c34062] text-white'
                    : a.primary
                      ? 'bg-text text-surface'
                      : 'text-text-muted hover:text-text'
                }`}
              >
                {a.label}
              </button>
            </Toast.Action>
          ))}
          <Toast.Close asChild>
            <button
              className="rounded-control p-1 text-text-muted hover:bg-surface-alt hover:text-text"
              title="Cerrar"
            >
              <X size={13} />
            </button>
          </Toast.Close>
        </Toast.Root>
      ))}
      <Toast.Viewport className="fixed bottom-4 right-4 z-[1000] flex w-[380px] max-w-[calc(100vw-2rem)] list-none flex-col gap-2 outline-none" />
    </Toast.Provider>
  );
}
