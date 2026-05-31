import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  /** Hacia qué lado apunta el botón cuando el panel está EXPANDIDO. */
  pointing: 'left' | 'right';
  onClick: () => void;
  title?: string;
}

/**
 * Línea divisora vertical entre paneles. Un botón flotante en el centro
 * vertical aparece al pasar el ratón cerca, para colapsar el panel.
 */
export function CollapseDivider({ pointing, onClick, title }: Props) {
  const Icon = pointing === 'left' ? ChevronLeft : ChevronRight;
  return (
    <div className="group relative w-px shrink-0 bg-border/60 transition-colors hover:bg-border">
      <button
        onClick={onClick}
        title={title ?? 'Colapsar panel'}
        className="absolute top-1/2 left-1/2 z-20 flex h-8 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-control bg-surface text-text-muted opacity-0 ring-1 ring-black/[0.08] transition-opacity hover:text-text group-hover:opacity-100"
      >
        <Icon size={12} />
      </button>
    </div>
  );
}
