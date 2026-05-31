import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';

interface Props {
  side: 'left' | 'right';
  onClick: () => void;
  title?: string;
}

/** Barra vertical delgada para un panel colapsado, con el botón para expandir. */
export function CollapseRail({ side, onClick, title }: Props) {
  const Icon = side === 'left' ? PanelLeftOpen : PanelRightOpen;
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-alt">
      <button
        onClick={onClick}
        title={title ?? 'Expandir'}
        className="flex h-8 w-8 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-black/[0.06] hover:text-text"
      >
        <Icon size={14} />
      </button>
    </div>
  );
}
