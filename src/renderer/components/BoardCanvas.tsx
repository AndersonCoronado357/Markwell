import { useEffect, useRef, useState } from 'react';
import { Plus, LayoutDashboard, Link2, Link2Off, ZoomIn, ZoomOut, Maximize2, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { useAi } from '../ai/aiStore';
import { ipc } from '../ipc';
import { Channels } from '../../shared/ipc';
import type { Board, BoardConnection, BoardItem } from '../../shared/models';
import { Sticky } from './Sticky';
import { toast } from '../toastStore';
import { ChatPanel } from './ChatPanel';

const STICKY_COLORS = ['amarillo', 'rosa', 'cielo', 'menta', 'durazno', 'lavanda', 'lima', 'coral'] as const;
const SNAP_THRESHOLD = 6; // px de tolerancia para snap a guía
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;

export function BoardCanvas() {
  const activeBoardId = useStore((s) => s.activeBoardId);
  const aiSession = useAi((s) => s.board);
  const openAi = useAi((s) => s.openBoard);
  const closeAi = useAi((s) => s.closeBoard);
  const [board, setBoard] = useState<Board | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [connectMode, setConnectMode] = useState(false);
  const [pendingFrom, setPendingFrom] = useState<number | null>(null);
  // Guides activas durante el drag de un sticky (líneas verticales/horizontales que aparecen).
  const [guides, setGuides] = useState<{ vx?: number; hy?: number }>({});
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeBoardId == null) { setBoard(null); return; }
    void ipc(Channels.boardGet, { id: activeBoardId }).then((b) => {
      setBoard(b);
      setPan({ x: 0, y: 0 });
      setZoom(1);
      setPendingFrom(null);
    });
  }, [activeBoardId]);

  if (activeBoardId == null) {
    return (
      <section className="flex min-h-0 flex-col items-center justify-center bg-surface px-10 text-center">
        <div className="mb-6 flex h-[64px] w-[64px] items-center justify-center rounded-[18px] bg-surface-alt">
          <LayoutDashboard size={26} className="text-text-muted" />
        </div>
        <h3 className="text-[22px] font-bold tracking-tight">Tus pizarras</h3>
        <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-text-muted">
          Elige una pizarra de la lista o crea una nueva para empezar a pegar ideas.
        </p>
      </section>
    );
  }
  if (!board) return <section className="flex min-h-0 flex-col bg-surface" />;

  // Convierte coords de pantalla → coords del mundo de la pizarra (sin pan/zoom).
  const screenToWorld = (cx: number, cy: number) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: (cx - r.left - pan.x) / zoom, y: (cy - r.top - pan.y) / zoom };
  };

  const addSticky = async (cx: number, cy: number, color?: string) => {
    if (!board) return;
    const { x, y } = screenToWorld(cx, cy);
    const created = await ipc(Channels.itemCreate, {
      boardId: board.id, type: 'sticky', text: '',
      x: x - 110, y: y - 90, w: 220, h: 180,
      color: color ?? STICKY_COLORS[board.items.length % STICKY_COLORS.length],
    });
    setBoard({ ...board, items: [...board.items, created] });
  };

  const onItemUpdate = (updated: BoardItem) => {
    setBoard((b) => b ? { ...b, items: b.items.map((it) => (it.id === updated.id ? updated : it)) } : b);
  };
  const onItemLiveMove = (id: number, x: number, y: number) => {
    // Actualiza solo en memoria mientras se arrastra (no persiste); las conexiones se redibujan.
    setBoard((b) => b ? { ...b, items: b.items.map((it) => (it.id === id ? { ...it, x, y } : it)) } : b);
  };
  const onItemDelete = (id: number) => {
    setBoard((b) => b ? {
      ...b,
      items: b.items.filter((it) => it.id !== id),
      connections: b.connections.filter((c) => c.fromId !== id && c.toId !== id),
    } : b);
  };

  // Pan: arrastra el fondo (solo si no se pulsa un sticky).
  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.mw-sticky')) return;
    const startX = e.clientX, startY = e.clientY;
    const startPan = { ...pan };
    const onMove = (ev: PointerEvent) => {
      setPan({ x: startPan.x + (ev.clientX - startX), y: startPan.y + (ev.clientY - startY) });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onCanvasDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.mw-sticky')) return;
    void addSticky(e.clientX, e.clientY);
  };

  // Zoom con la rueda (centrado en el cursor).
  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 30) return; // ignora scroll trivial
    e.preventDefault();
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return;
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const oldZoom = zoom;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom * factor));
    // Mantener el punto bajo el cursor fijo.
    const wx = (px - pan.x) / oldZoom;
    const wy = (py - pan.y) / oldZoom;
    setZoom(newZoom);
    setPan({ x: px - wx * newZoom, y: py - wy * newZoom });
  };

  const resetView = () => { setPan({ x: 0, y: 0 }); setZoom(1); };

  // Modo conexión.
  const onStickyClickInConnectMode = async (itemId: number) => {
    if (!board) return;
    if (pendingFrom == null) {
      setPendingFrom(itemId);
      toast({ title: 'Elige el segundo elemento', description: 'Haz clic en otra nota para conectar.' });
      return;
    }
    if (pendingFrom === itemId) { setPendingFrom(null); return; }
    try {
      const conn = await ipc(Channels.connCreate, { boardId: board.id, fromId: pendingFrom, toId: itemId });
      setBoard({ ...board, connections: [...board.connections.filter((c) => c.id !== conn.id), conn] });
    } catch (err) {
      toast({ title: 'No se pudo conectar', description: (err as Error).message });
    } finally {
      setPendingFrom(null);
      setConnectMode(false);
    }
  };
  const deleteConnection = async (id: number) => {
    await ipc(Channels.connDelete, { id });
    setBoard((b) => b ? { ...b, connections: b.connections.filter((c) => c.id !== id) } : b);
  };

  const aiOpenForThisBoard =
    aiSession.open && aiSession.context.kind === 'board' && aiSession.context.boardId === activeBoardId;
  const toggleAi = () => { aiOpenForThisBoard ? closeAi() : openAi(activeBoardId); };

  return (
    <section className="flex min-h-0 min-w-0 bg-bg">
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border/40 px-5 py-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-[8px]"
            style={{ background: `color-mix(in srgb, ${board.color ? `var(--color-pastel-${board.color})` : 'var(--text-muted)'} 55%, transparent)` }}
          >
            <LayoutDashboard size={14} className="text-text" />
          </span>
          <h2 className="text-[17px] font-bold tracking-tight">{board.name}</h2>
          <span className="text-[11.5px] text-text-muted">
            {board.items.length} {board.items.length === 1 ? 'nota' : 'notas'} · doble clic en el fondo para añadir
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Controles de zoom */}
          <div className="flex items-center gap-0.5 rounded-control bg-surface-alt p-0.5">
            <button onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.1))} title="Reducir" className="rounded p-1 text-text-muted hover:bg-surface hover:text-text">
              <ZoomOut size={13} />
            </button>
            <button onClick={resetView} title="Restablecer vista" className="rounded px-1.5 py-1 text-[11px] tabular-nums text-text-muted hover:bg-surface hover:text-text">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.1))} title="Aumentar" className="rounded p-1 text-text-muted hover:bg-surface hover:text-text">
              <ZoomIn size={13} />
            </button>
            <button onClick={resetView} title="Centrar" className="rounded p-1 text-text-muted hover:bg-surface hover:text-text">
              <Maximize2 size={13} />
            </button>
          </div>
          <button
            onClick={() => {
              setConnectMode((v) => !v);
              setPendingFrom(null);
              if (!connectMode) toast({ title: 'Elige el primer elemento', description: 'Haz clic en una nota para empezar.' });
            }}
            className={`inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
              connectMode ? 'bg-text text-surface' : 'bg-surface-alt text-text-muted hover:text-text'
            }`}
          >
            {connectMode ? <Link2Off size={14} /> : <Link2 size={14} />}
            {connectMode ? 'Cancelar' : 'Conectar'}
          </button>
          <button
            onClick={toggleAi}
            title={aiOpenForThisBoard ? 'Cerrar asistente' : 'Abrir asistente'}
            className={`inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
              aiOpenForThisBoard ? 'bg-text text-surface' : 'bg-surface-alt text-text-muted hover:text-text'
            }`}
          >
            <Sparkles size={14} />
            Asistente
          </button>
          <button
            onClick={() => {
              const r = canvasRef.current?.getBoundingClientRect();
              if (r) void addSticky(r.left + r.width / 2, r.top + r.height / 2);
            }}
            className="inline-flex items-center gap-1.5 rounded-control bg-text px-3 py-1.5 text-[12.5px] font-semibold text-surface transition-opacity hover:opacity-90"
          >
            <Plus size={14} />
            Nota
          </button>
        </div>
      </header>

      <div
        ref={canvasRef}
        onPointerDown={onCanvasPointerDown}
        onDoubleClick={onCanvasDoubleClick}
        onWheel={onWheel}
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{ cursor: connectMode ? 'crosshair' : 'default', touchAction: 'none' }}
      >
        {/* Trama de puntos de fondo. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, color-mix(in srgb, var(--text) 10%, transparent) 1px, transparent 1px)',
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />

        {/* Capa transformada (pan + zoom). */}
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          {/* SVG de conexiones (debajo de los stickies). */}
          <svg
            className="pointer-events-none absolute left-0 top-0"
            style={{ width: 1, height: 1, overflow: 'visible' }}
          >
            {board.connections.map((c) => (
              <ConnectionLine
                key={c.id} conn={c} items={board.items}
                onDelete={() => void deleteConnection(c.id)}
              />
            ))}
          </svg>

          {/* Guías de alineación al arrastrar */}
          {(guides.vx != null) && (
            <div className="pointer-events-none absolute top-[-9999px] bottom-[-9999px] w-px bg-[color-mix(in_srgb,var(--text)_45%,transparent)]"
                 style={{ left: guides.vx }} />
          )}
          {(guides.hy != null) && (
            <div className="pointer-events-none absolute left-[-9999px] right-[-9999px] h-px bg-[color-mix(in_srgb,var(--text)_45%,transparent)]"
                 style={{ top: guides.hy }} />
          )}

          {/* Stickies */}
          {board.items.map((it) => (
            <Sticky
              key={it.id}
              item={it}
              allItems={board.items}
              zoom={zoom}
              snapThreshold={SNAP_THRESHOLD}
              onUpdate={onItemUpdate}
              onLiveMove={onItemLiveMove}
              onDelete={onItemDelete}
              onGuidesChange={setGuides}
              connectMode={connectMode}
              isPending={pendingFrom === it.id}
              onConnectClick={() => void onStickyClickInConnectMode(it.id)}
            />
          ))}
        </div>
      </div>
      </div>
      {aiOpenForThisBoard && (
        <div className="w-[400px] shrink-0">
          <ChatPanel
            slot="board"
            title="Asistente · esta pizarra"
            placeholder="Pregunta o usa /resumen…"
            onClose={closeAi}
          />
        </div>
      )}
    </section>
  );
}

/** Conexión ortogonal con codo central y botón X para eliminar. */
function ConnectionLine({
  conn, items, onDelete,
}: { conn: BoardConnection; items: BoardItem[]; onDelete: () => void }) {
  const a = items.find((i) => i.id === conn.fromId);
  const b = items.find((i) => i.id === conn.toId);
  if (!a || !b) return null;

  const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const dx = bc.x - ac.x;
  const dy = bc.y - ac.y;
  const horizontalFirst = Math.abs(dx) >= Math.abs(dy);

  let path = ''; let elbow = { x: 0, y: 0 };
  if (horizontalFirst) {
    const aOut = { x: dx >= 0 ? a.x + a.w : a.x, y: ac.y };
    const bIn  = { x: dx >= 0 ? b.x       : b.x + b.w, y: bc.y };
    const midX = (aOut.x + bIn.x) / 2;
    path = `M ${aOut.x} ${aOut.y} L ${midX} ${aOut.y} L ${midX} ${bIn.y} L ${bIn.x} ${bIn.y}`;
    elbow = { x: midX, y: (aOut.y + bIn.y) / 2 };
  } else {
    const aOut = { x: ac.x, y: dy >= 0 ? a.y + a.h : a.y };
    const bIn  = { x: bc.x, y: dy >= 0 ? b.y       : b.y + b.h };
    const midY = (aOut.y + bIn.y) / 2;
    path = `M ${aOut.x} ${aOut.y} L ${aOut.x} ${midY} L ${bIn.x} ${midY} L ${bIn.x} ${bIn.y}`;
    elbow = { x: (aOut.x + bIn.x) / 2, y: midY };
  }
  const stroke = conn.color ? `var(--color-pastel-${conn.color})` : 'color-mix(in srgb, var(--text) 45%, transparent)';

  return (
    <g>
      <path d={path} stroke={stroke} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={elbow.x} cy={elbow.y} r={9}
        fill="var(--surface)" stroke={stroke} strokeWidth={1.5}
        className="pointer-events-auto cursor-pointer hover:fill-[color-mix(in_srgb,var(--text)_8%,var(--surface))]"
        onClick={onDelete}
      />
      <text x={elbow.x} y={elbow.y + 3.5} textAnchor="middle" fontSize="11" fill="var(--text-muted)" className="pointer-events-none select-none">×</text>
    </g>
  );
}
