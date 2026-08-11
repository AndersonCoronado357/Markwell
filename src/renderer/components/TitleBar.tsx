import { Minus, Square, X, Settings } from 'lucide-react';
import { useStore } from '../store';
import { Logo } from './Logo';

export function TitleBar() {
  const send = (cmd: 'min' | 'max' | 'close') => window.markwell.invoke('window:' + cmd);
  const settingsOpen = useStore((s) => s.settingsOpen);
  const openSettings = useStore((s) => s.openSettings);

  return (
    <div className="mw-drag relative z-30 flex h-9 select-none items-center justify-between border-b border-border/60 bg-surface-alt">
      <div className="flex items-center gap-1.5 px-3 text-[12.5px] font-semibold tracking-tight text-text">
        <Logo size={20} />
        Markwell
      </div>
      <div className="mw-no-drag flex h-full items-center">
        <button
          onClick={() => openSettings(!settingsOpen)}
          title={settingsOpen ? 'Cerrar ajustes' : 'Ajustes'}
          className={`flex h-full items-center gap-1.5 px-3 text-[12px] transition-colors ${
            settingsOpen ? 'text-text' : 'text-text-muted hover:bg-black/[0.06] hover:text-text'
          }`}
        >
          <Settings size={13} />
          Ajustes
        </button>
        <CtrlBtn label="Minimizar" onClick={() => send('min')}><Minus size={14} /></CtrlBtn>
        <CtrlBtn label="Maximizar" onClick={() => send('max')}><Square size={11} /></CtrlBtn>
        <CtrlBtn label="Cerrar" onClick={() => send('close')} danger><X size={14} /></CtrlBtn>
      </div>
    </div>
  );
}

function CtrlBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex h-full w-11 items-center justify-center text-text-muted transition-colors ${
        danger ? 'hover:bg-[#e81123] hover:text-white' : 'hover:bg-black/[0.06] hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}
