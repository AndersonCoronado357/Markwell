import { FileText, LayoutDashboard, Sparkles } from 'lucide-react';
import { useStore } from '../store';

/**
 * Tres modos de la app: Notas, Pizarras y IA. Va encima del buscador en el
 * sidebar. La IA es un modo dedicado con su propio historial de conversaciones;
 * en Notas y Pizarras hay además un asistente lateral integrado.
 */
export function ModeSwitch() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);

  return (
    <div className="grid grid-cols-3 gap-1 rounded-control bg-surface p-0.5">
      <Btn active={mode === 'notes'}  onClick={() => setMode('notes')}  icon={<FileText size={12} />}        label="Notas" />
      <Btn active={mode === 'boards'} onClick={() => setMode('boards')} icon={<LayoutDashboard size={12} />} label="Pizarras" />
      <Btn active={mode === 'ai'}     onClick={() => setMode('ai')}     icon={<Sparkles size={12} />}        label="IA" />
    </div>
  );
}

function Btn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-[5px] py-1 text-[11.5px] font-medium transition-colors ${
        active ? 'bg-text text-surface' : 'text-text-muted hover:bg-surface-alt hover:text-text'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
