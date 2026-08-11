import { useEffect, useRef, useState } from 'react';
import { X, Palette, Bold, Italic, List, Trash2 } from 'lucide-react';
import { ipc } from '../ipc';
import { Channels } from '../../shared/ipc';
import type { BoardItem } from '../../shared/models';
import { ContextMenu, type CtxItem } from './ContextMenu';

const COLORS = ['amarillo', 'rosa', 'cielo', 'menta', 'durazno', 'lavanda', 'lima', 'coral'];
const pastelVar = (c: string | null) => `var(--color-pastel-${c ?? 'amarillo'})`;

interface Props {
  item: BoardItem;
  allItems: BoardItem[];
  zoom: number;
  snapThreshold: number;
  onUpdate: (it: BoardItem) => void;
  onLiveMove?: (id: number, x: number, y: number) => void;
  onDelete: (id: number) => void;
  onGuidesChange?: (g: { vx?: number; hy?: number }) => void;
  connectMode: boolean;
  isPending: boolean;
  onConnectClick: () => void;
}

/** Calcula snap a guías: bordes/centro de los OTROS stickies. */
function computeSnap(
  draft: { x: number; y: number; w: number; h: number },
  others: BoardItem[],
  threshold: number,
): { x: number; y: number; vx?: number; hy?: number } {
  let snapX = draft.x; let snapY = draft.y;
  let vx: number | undefined; let hy: number | undefined;

  const myEdgesX = [draft.x, draft.x + draft.w / 2, draft.x + draft.w];
  const myEdgesY = [draft.y, draft.y + draft.h / 2, draft.y + draft.h];

  for (const o of others) {
    const otherX = [o.x, o.x + o.w / 2, o.x + o.w];
    const otherY = [o.y, o.y + o.h / 2, o.y + o.h];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (Math.abs(myEdgesX[i] - otherX[j]) < threshold && vx == null) {
          const offset = otherX[j] - myEdgesX[i];
          snapX = draft.x + offset;
          vx = otherX[j];
        }
        if (Math.abs(myEdgesY[i] - otherY[j]) < threshold && hy == null) {
          const offset = otherY[j] - myEdgesY[i];
          snapY = draft.y + offset;
          hy = otherY[j];
        }
      }
    }
  }
  return { x: snapX, y: snapY, vx, hy };
}

export function Sticky({
  item, allItems, zoom, snapThreshold,
  onUpdate, onLiveMove, onDelete, onGuidesChange,
  connectMode, isPending, onConnectClick,
}: Props) {
  const [local, setLocal] = useState(item);
  const [editing, setEditing] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!editing) setLocal(item); }, [item, editing]);

  const persistTimer = useRef<number | null>(null);
  const persist = (patch: Partial<BoardItem>) => {
    setLocal((l) => ({ ...l, ...patch }));
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(async () => {
      const updated = await ipc(Channels.itemUpdate, { id: item.id, ...patch });
      onUpdate(updated);
    }, 350);
  };
  const persistNow = async (patch: Partial<BoardItem>) => {
    if (persistTimer.current) { window.clearTimeout(persistTimer.current); persistTimer.current = null; }
    setLocal((l) => ({ ...l, ...patch }));
    const updated = await ipc(Channels.itemUpdate, { id: item.id, ...patch });
    onUpdate(updated);
  };

  // Drag con snap y guías. Las deltas se dividen por zoom para que el movimiento del puntero coincida con la pantalla.
  const onHeaderDown = (e: React.PointerEvent) => {
    if (editing || connectMode) return;
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY;
    const ox = local.x, oy = local.y;
    const others = allItems.filter((it) => it.id !== item.id);
    const onMove = (ev: PointerEvent) => {
      const draft = {
        x: ox + (ev.clientX - sx) / zoom,
        y: oy + (ev.clientY - sy) / zoom,
        w: local.w, h: local.h,
      };
      const snapped = computeSnap(draft, others, snapThreshold);
      setLocal((l) => ({ ...l, x: snapped.x, y: snapped.y }));
      onLiveMove?.(item.id, snapped.x, snapped.y);
      onGuidesChange?.({ vx: snapped.vx, hy: snapped.hy });
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      onGuidesChange?.({});
      const draft = {
        x: ox + (ev.clientX - sx) / zoom,
        y: oy + (ev.clientY - sy) / zoom,
        w: local.w, h: local.h,
      };
      const snapped = computeSnap(draft, others, snapThreshold);
      void persistNow({ x: snapped.x, y: snapped.y });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY;
    const sw = local.w, sh = local.h;
    const onMove = (ev: PointerEvent) => {
      setLocal((l) => ({
        ...l,
        w: Math.max(140, sw + (ev.clientX - sx) / zoom),
        h: Math.max(100, sh + (ev.clientY - sy) / zoom),
      }));
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      void persistNow({
        w: Math.max(140, sw + (ev.clientX - sx) / zoom),
        h: Math.max(100, sh + (ev.clientY - sy) / zoom),
      });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const remove = async () => {
    await ipc(Channels.itemDelete, { id: item.id });
    onDelete(item.id);
  };

  const startEditing = () => {
    if (connectMode) return;
    setEditing(true);
    setTimeout(() => {
      const el = bodyRef.current; if (!el) return;
      el.innerHTML = local.text || '';
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el); range.collapse(false);
      const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(range);
    }, 0);
  };
  const stopEditing = () => {
    if (!editing) return;
    const html = bodyRef.current?.innerHTML ?? '';
    setEditing(false);
    void persistNow({ text: html });
  };
  const onEditorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); stopEditing(); return; }
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'b') { e.preventDefault(); document.execCommand('bold'); }
    else if (k === 'i') { e.preventDefault(); document.execCommand('italic'); }
    else if (k === 'u') { e.preventDefault(); document.execCommand('underline'); }
  };

  const ctxItems: CtxItem[] = [
    { label: 'Editar', onSelect: startEditing },
    { label: 'Cambiar color', icon: <Palette size={14} />, onSelect: () => setShowPalette((v) => !v) },
    { label: 'Eliminar nota', icon: <Trash2 size={14} />, danger: true, onSelect: remove },
  ];

  const onStickyClick = (e: React.MouseEvent) => {
    if (!connectMode || editing) return;
    e.stopPropagation();
    onConnectClick();
  };

  return (
    <ContextMenu items={ctxItems}>
      <div
        onClick={onStickyClick}
        className={`mw-sticky absolute select-none rounded-card shadow-md ring-1 ring-black/[0.08] ${
          isPending ? 'ring-2 ring-text' : ''
        } ${connectMode ? 'cursor-crosshair' : ''}`}
        style={{
          left: local.x, top: local.y, width: local.w, height: local.h,
          background: `color-mix(in srgb, ${pastelVar(local.color)} 70%, white)`,
        }}
      >
        <div
          onPointerDown={onHeaderDown}
          className="flex h-7 items-center justify-between px-2"
          style={{ cursor: editing ? 'default' : connectMode ? 'crosshair' : 'grab' }}
        >
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); setShowPalette((v) => !v); }} title="Cambiar color"
              className="rounded p-0.5 text-[#1d2230]/60 hover:bg-black/10 hover:text-[#1d2230]">
              <Palette size={12} />
            </button>
            {editing && (
              <>
                <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold'); }} title="Negrita (Ctrl+B)" className="rounded p-0.5 text-[#1d2230]/60 hover:bg-black/10 hover:text-[#1d2230]"><Bold size={11} /></button>
                <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic'); }} title="Cursiva (Ctrl+I)" className="rounded p-0.5 text-[#1d2230]/60 hover:bg-black/10 hover:text-[#1d2230]"><Italic size={11} /></button>
                <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertUnorderedList'); }} title="Lista" className="rounded p-0.5 text-[#1d2230]/60 hover:bg-black/10 hover:text-[#1d2230]"><List size={11} /></button>
              </>
            )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); void remove(); }} title="Eliminar"
            className="rounded p-0.5 text-[#1d2230]/60 hover:bg-black/10 hover:text-[#1d2230]">
            <X size={12} />
          </button>
        </div>

        {showPalette && (
          <div onPointerDown={(e) => e.stopPropagation()}
            className="absolute left-1.5 top-7 z-10 flex flex-wrap gap-1 rounded-card bg-white p-1.5 shadow-lg ring-1 ring-black/[0.08]"
            style={{ width: 132 }}>
            {COLORS.map((c) => (
              <button key={c}
                onClick={(e) => { e.stopPropagation(); void persistNow({ color: c }); setShowPalette(false); }}
                className="h-5 w-5 rounded-full ring-1 ring-black/[0.08] transition-transform hover:scale-110"
                style={{ background: `var(--color-pastel-${c})` }}
                title={c}
              />
            ))}
          </div>
        )}

        {editing ? (
          <div ref={bodyRef} contentEditable suppressContentEditableWarning
            onBlur={stopEditing} onKeyDown={onEditorKeyDown}
            className="mw-sticky-body block w-full overflow-auto bg-transparent px-3 pb-3 text-[13px] leading-snug text-[#1d2230] focus:outline-none"
            style={{ height: local.h - 28 }}
          />
        ) : (
          <div onDoubleClick={(e) => { e.stopPropagation(); startEditing(); }}
            className="mw-sticky-body overflow-hidden break-words px-3 pb-3 text-[13px] leading-snug text-[#1d2230]"
            style={{ height: local.h - 28 }}
            dangerouslySetInnerHTML={{
              __html: local.text || '<span style="opacity:.45;font-style:italic">Doble clic para editar</span>',
            }}
          />
        )}

        <span onPointerDown={onResizeDown}
          className="absolute right-0 bottom-0 h-3.5 w-3.5 cursor-nwse-resize"
          style={{ background: 'linear-gradient(135deg, transparent 0 50%, color-mix(in srgb, #1d2230 35%, transparent) 50% 60%, transparent 60% 75%, color-mix(in srgb, #1d2230 35%, transparent) 75% 85%, transparent 85%)' }}
        />
      </div>
    </ContextMenu>
  );
}
