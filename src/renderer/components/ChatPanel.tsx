import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, X, Trash2, Sparkles, FileText, LayoutDashboard, FileType, HelpCircle, Wand2 } from 'lucide-react';
import { useAi, type ChatMessage } from '../ai/aiStore';
import { sendChatMessage } from '../ai/aiActions';
import { ipc } from '../ipc';
import { Channels } from '../../shared/ipc';

interface Props {
  slot: 'note' | 'board' | 'general';
  /** Título del panel (p. ej. "Asistente · esta nota"). */
  title: string;
  /** Lo que se muestra en el placeholder del input. */
  placeholder?: string;
  /** Botón de cerrar (opcional — el modo general no se cierra). */
  onClose?: () => void;
  /** Botón opcional para "Nueva conversación" en modo general. */
  onNewConversation?: () => void;
}

interface SlashCommand {
  name: string;       // sin la barra
  args?: string;      // hint del argumento ("<tema>")
  desc: string;
  icon: React.ReactNode;
}

const COMMANDS: SlashCommand[] = [
  { name: 'resumen',  desc: 'Resume la nota actual (o todas, en el modo IA)',  icon: <FileText size={13} /> },
  { name: 'pizarra',  args: '[tema]',  desc: 'Crea pizarra real con tarjetas conectadas (sin tema = del último resumen)', icon: <LayoutDashboard size={13} /> },
  { name: 'nota',     args: '[tema]',  desc: 'Crea una nota nueva (sin tema = del último resumen)',  icon: <FileType size={13} /> },
  { name: 'formato',  args: '[estilo]',desc: 'Reformatea la nota actual con encabezados, listas y negritas',  icon: <Wand2 size={13} /> },
  { name: 'ayuda',    desc: 'Muestra todos los comandos',  icon: <HelpCircle size={13} /> },
];

/**
 * Componente reutilizable del chat. Lo usan el panel inline de notas, el
 * panel inline de pizarras y el modo IA dedicado. Soporta comandos slash
 * con autocomplete y dropdown de sugerencias.
 */
export function ChatPanel({ slot, title, placeholder, onClose, onNewConversation }: Props) {
  const session = useAi((s) => s[slot]);
  const status = useAi((s) => s.status);
  const setStatus = useAi((s) => s.setStatus);
  const reset = useAi((s) => s.resetSession);

  const [input, setInput] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void ipc(Channels.aiStatus).then(setStatus);
  }, [setStatus]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [session.messages, session.streaming]);

  // Filtrado de comandos según lo que el usuario está escribiendo.
  const suggestions = useMemo(() => {
    const match = input.match(/^\/(\w*)$/);
    if (!match) return [];
    const q = match[1].toLowerCase();
    return COMMANDS.filter((c) => c.name.startsWith(q));
  }, [input]);

  // Reset del índice al cambiar las sugerencias.
  useEffect(() => { setHighlightIdx(0); }, [suggestions.length]);

  // No renderizar si el slot inline está cerrado.
  if (slot !== 'general' && !session.open) return null;

  const submit = () => {
    const text = input.trim();
    if (!text || session.streaming) return;
    setInput('');
    void sendChatMessage(slot, text);
  };

  const acceptSuggestion = (cmd: SlashCommand) => {
    const next = cmd.args ? `/${cmd.name} ` : `/${cmd.name}`;
    setInput(next);
    // Mantener foco y mover el cursor al final.
    requestAnimationFrame(() => {
      const t = textareaRef.current;
      if (t) { t.focus(); t.setSelectionRange(next.length, next.length); }
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIdx((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        acceptSuggestion(suggestions[highlightIdx]);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        // Si la sugerencia tiene args y el input es exacto al nombre, autocomplétalo
        // en lugar de enviar (para que el usuario escriba el argumento).
        const exact = suggestions.find((s) => `/${s.name}` === input.trim());
        if (exact && exact.args) {
          e.preventDefault();
          acceptSuggestion(exact);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setInput('');
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
          <Sparkles size={14} className="text-text-muted" />
          {title}
        </div>
        <div className="flex items-center gap-1">
          {onNewConversation && (
            <button
              onClick={onNewConversation}
              title="Nueva conversación"
              className="rounded-control px-2 py-1 text-[11.5px] text-text-muted hover:bg-surface-alt hover:text-text"
            >
              + Nueva
            </button>
          )}
          <button
            onClick={() => reset(slot)}
            title="Limpiar"
            disabled={session.messages.length === 0}
            className="rounded-control p-1.5 text-text-muted hover:bg-surface-alt hover:text-text disabled:opacity-40"
          >
            <Trash2 size={13} />
          </button>
          {onClose && (
            <button onClick={onClose} title="Cerrar" className="rounded-control p-1.5 text-text-muted hover:bg-surface-alt hover:text-text">
              <X size={14} />
            </button>
          )}
        </div>
      </header>

      {!status?.configured && (
        <div className="border-b border-border bg-[#fff5d6] px-3 py-2 text-[12px] text-[#8a6618]">
          La IA aún no está configurada. Abre <strong>Ajustes → IA</strong>.
        </div>
      )}

      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {session.messages.length === 0 ? (
          <div className="mt-6 text-center text-[12.5px] text-text-muted">
            <p>Escribe tu pregunta. También puedes usar comandos:</p>
            <p className="mt-2 font-mono text-[11.5px]">
              <code className="rounded bg-surface-alt px-1.5 py-0.5">/resumen</code>{' '}
              <code className="rounded bg-surface-alt px-1.5 py-0.5">/pizarra</code>{' '}
              <code className="rounded bg-surface-alt px-1.5 py-0.5">/nota</code>{' '}
              <code className="rounded bg-surface-alt px-1.5 py-0.5">/ayuda</code>
            </p>
            <p className="mt-3 text-[11.5px]">Tip: escribe <code className="rounded bg-surface-alt px-1 py-0.5 font-mono">/</code> y pulsa <kbd className="rounded bg-surface-alt px-1 py-0.5 font-mono text-[10px]">Tab</kbd> para autocompletar.</p>
            {slot !== 'general' && <p className="mt-3 text-[11.5px]">Esta conversación es efímera.</p>}
          </div>
        ) : (
          session.messages.map((m, i) => <Bubble key={i} m={m} isLast={i === session.messages.length - 1} streaming={session.streaming} />)
        )}
      </div>

      <div className="relative border-t border-border bg-surface p-2">
        {/* Dropdown de sugerencias de comandos */}
        {suggestions.length > 0 && (
          <div className="absolute bottom-full left-2 right-2 mb-1 overflow-hidden rounded-card bg-surface shadow-xl ring-1 ring-black/[0.08]">
            <div className="border-b border-border bg-surface-alt px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-text-muted">
              Comandos · ↑↓ navegar · Tab para autocompletar
            </div>
            <ul>
              {suggestions.map((c, i) => (
                <li key={c.name}>
                  <button
                    onMouseEnter={() => setHighlightIdx(i)}
                    onClick={() => acceptSuggestion(c)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                      i === highlightIdx ? 'bg-surface-alt' : 'hover:bg-surface-alt/60'
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-bg text-text-muted">
                      {c.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[12.5px] font-medium text-text">
                        /{c.name}{c.args && <span className="ml-1 font-sans text-[11px] font-normal text-text-muted">{c.args}</span>}
                      </div>
                      <div className="truncate text-[11px] text-text-muted">{c.desc}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder ?? 'Escribe o usa / para comandos…'}
            rows={2}
            disabled={!status?.configured || session.streaming}
            className="flex-1 resize-none rounded-control bg-surface-alt px-2.5 py-1.5 text-[13px] text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--text)_18%,transparent)] disabled:opacity-50"
          />
          <button
            onClick={submit}
            disabled={!input.trim() || session.streaming || !status?.configured}
            className="rounded-control bg-text p-2 text-surface transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
        {slot !== 'general' && (
          <p className="mt-1.5 px-1 text-[10.5px] text-text-muted">
            Enter = enviar · Shift+Enter = salto · Conversación efímera (no se guarda).
          </p>
        )}
      </div>
    </div>
  );
}

function Bubble({ m, isLast, streaming }: { m: ChatMessage; isLast: boolean; streaming: boolean }) {
  const isUser = m.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] rounded-card px-3 py-2 text-[13px] leading-relaxed ${
        isUser ? 'bg-text text-surface' : 'bg-surface-alt text-text'
      }`}>
        {renderInlineMarkdown(m.text)}
        {streaming && isLast && m.role === 'model' && (
          <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-current align-middle" />
        )}
      </div>
    </div>
  );
}

function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    if (/^###\s+/.test(line)) return <div key={i} className="mt-2 font-bold">{inline(line.replace(/^###\s+/, ''))}</div>;
    if (/^##\s+/.test(line))  return <div key={i} className="mt-2 text-[14px] font-bold">{inline(line.replace(/^##\s+/, ''))}</div>;
    if (/^#\s+/.test(line))   return <div key={i} className="mt-2 text-[15px] font-bold">{inline(line.replace(/^#\s+/, ''))}</div>;
    if (/^\s*[-*]\s+/.test(line)) return <div key={i} className="ml-3">• {inline(line.replace(/^\s*[-*]\s+/, ''))}</div>;
    if (/^\s*\d+\.\s+/.test(line)) return <div key={i} className="ml-3">{line.match(/^\s*(\d+)\./)?.[1]}. {inline(line.replace(/^\s*\d+\.\s+/, ''))}</div>;
    if (!line.trim()) return <div key={i} className="h-2" />;
    return <div key={i}>{inline(line)}</div>;
  });
}

function inline(s: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let i = 0; let key = 0;
  while (i < s.length) {
    if (s[i] === '*' && s[i + 1] === '*') {
      const end = s.indexOf('**', i + 2);
      if (end > i + 1) { parts.push(<strong key={key++}>{s.slice(i + 2, end)}</strong>); i = end + 2; continue; }
    }
    if (s[i] === '`') {
      const end = s.indexOf('`', i + 1);
      if (end > i) { parts.push(<code key={key++} className="rounded bg-black/10 px-1 font-mono text-[12px]">{s.slice(i + 1, end)}</code>); i = end + 1; continue; }
    }
    if (s[i] === '_' && /\w/.test(s[i + 1] ?? '')) {
      const end = s.indexOf('_', i + 1);
      if (end > i) { parts.push(<em key={key++}>{s.slice(i + 1, end)}</em>); i = end + 1; continue; }
    }
    let j = i + 1;
    while (j < s.length && s[j] !== '*' && s[j] !== '`' && s[j] !== '_') j++;
    parts.push(<span key={key++}>{s.slice(i, j)}</span>);
    i = j;
  }
  return parts;
}
