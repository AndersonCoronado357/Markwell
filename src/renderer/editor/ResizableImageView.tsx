import { useEffect, useRef, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface DragState {
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  handle: Handle;
}

const CURSORS: Record<Handle, string> = {
  nw: 'nwse-resize',
  n:  'ns-resize',
  ne: 'nesw-resize',
  e:  'ew-resize',
  se: 'nwse-resize',
  s:  'ns-resize',
  sw: 'nesw-resize',
  w:  'ew-resize',
};

export function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [size, setSize] = useState<{ w: number | null; h: number | null }>({ w: null, h: null });
  const sizeRef = useRef(size);
  useEffect(() => { sizeRef.current = size; }, [size]);

  const src = node.attrs.src as string;
  const alt = (node.attrs.alt as string) ?? '';
  const widthAttr = node.attrs.width as number | string | null;
  const heightAttr = node.attrs.height as number | string | null;
  const align = (node.attrs.align as 'left' | 'center' | 'right') ?? 'left';

  const widthCss = size.w != null ? `${size.w}px` : widthAttr ? toCss(widthAttr) : 'auto';
  const heightCss = size.h != null ? `${size.h}px` : heightAttr ? toCss(heightAttr) : 'auto';

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      let newW = drag.startW;
      let newH = drag.startH;
      if (drag.handle.includes('e')) newW = drag.startW + dx;
      if (drag.handle.includes('w')) newW = drag.startW - dx;
      if (drag.handle.includes('s')) newH = drag.startH + dy;
      if (drag.handle.includes('n')) newH = drag.startH - dy;
      newW = Math.max(60, Math.round(newW));
      newH = Math.max(40, Math.round(newH));
      // Si solo es un handle de un eje, dejamos el otro en automático para
      // que la imagen conserve proporción (height = null).
      const onlyX = drag.handle === 'e' || drag.handle === 'w';
      const onlyY = drag.handle === 'n' || drag.handle === 's';
      setSize({
        w: onlyY ? sizeRef.current.w : newW,
        h: onlyX ? sizeRef.current.h : newH,
      });
    };
    const onUp = () => {
      const final = sizeRef.current;
      const upd: Record<string, unknown> = {};
      if (final.w != null) upd.width = final.w;
      if (final.h != null) upd.height = final.h;
      if (Object.keys(upd).length) updateAttributes(upd);
      setDrag(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, updateAttributes]);

  const start = (handle: Handle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = imgRef.current?.getBoundingClientRect();
    const w = rect?.width ?? 0;
    const h = rect?.height ?? 0;
    setDrag({ startX: e.clientX, startY: e.clientY, startW: w, startH: h, handle });
    setSize({ w, h });
  };

  const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';

  return (
    <NodeViewWrapper
      as="div"
      className="mw-img-wrapper"
      style={{ display: 'flex', width: '100%', justifyContent: justify }}
    >
      <div ref={boxRef} className="mw-img-box" style={{ width: widthCss, height: heightCss }}>
        <img ref={imgRef} src={src} alt={alt} draggable={false} />
        {selected && (
          // 8 handles para redimensionar: 4 esquinas + 4 lados. La alineación
          // (izquierda/centro/derecha) se controla desde los botones de la
          // barra superior del editor, que detectan automáticamente la imagen.
          <>
            {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as Handle[]).map((h) => (
              <span
                key={h}
                className={`mw-img-handle mw-img-h-${h}`}
                style={{ cursor: CURSORS[h] }}
                onPointerDown={start(h)}
              />
            ))}
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

function toCss(v: number | string): string {
  return typeof v === 'number' ? `${v}px` : v;
}
