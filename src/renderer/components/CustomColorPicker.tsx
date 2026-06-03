import { useEffect, useMemo, useRef, useState } from 'react';

/* Conversiones de color simples (sin dependencias). */
function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)); }

function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const hh = (h / 60) % 6;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (0 <= hh && hh < 1) [r, g, b] = [c, x, 0];
  else if (1 <= hh && hh < 2) [r, g, b] = [x, c, 0];
  else if (2 <= hh && hh < 3) [r, g, b] = [0, c, x];
  else if (3 <= hh && hh < 4) [r, g, b] = [0, x, c];
  else if (4 <= hh && hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

function rgbToHsv(r: number, g: number, b: number) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((n) => clamp(n, 0, 255).toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

interface Props {
  initial?: string;
  onChange: (hex: string) => void;
}

/**
 * Color picker propio (no nativo del navegador): cuadrado de saturación/valor,
 * slider de tono, e input hexadecimal + RGB.
 */
export function CustomColorPicker({ initial = '#a89bf0', onChange }: Props) {
  const start = hexToRgb(initial) ?? { r: 168, g: 155, b: 240 };
  const [hsv, setHsv] = useState(rgbToHsv(start.r, start.g, start.b));
  const [hexInput, setHexInput] = useState(initial);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  const rgb = useMemo(() => hsvToRgb(hsv.h, hsv.s, hsv.v), [hsv]);
  const hex = useMemo(() => rgbToHex(rgb.r, rgb.g, rgb.b), [rgb]);

  useEffect(() => {
    setHexInput(hex);
    onChange(hex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex]);

  const setSV = (clientX: number, clientY: number) => {
    const el = svRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = clamp((clientX - r.left) / r.width, 0, 1);
    const y = clamp((clientY - r.top) / r.height, 0, 1);
    setHsv((h) => ({ ...h, s: x, v: 1 - y }));
  };
  const setHue = (clientX: number) => {
    const el = hueRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = clamp((clientX - r.left) / r.width, 0, 1);
    setHsv((h) => ({ ...h, h: x * 360 }));
  };

  const onSVDown = (e: React.PointerEvent) => {
    setSV(e.clientX, e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onSVMove = (e: React.PointerEvent) => {
    if (e.buttons === 1) setSV(e.clientX, e.clientY);
  };
  const onHueDown = (e: React.PointerEvent) => {
    setHue(e.clientX);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onHueMove = (e: React.PointerEvent) => {
    if (e.buttons === 1) setHue(e.clientX);
  };

  const updateChannel = (ch: 'r' | 'g' | 'b', val: number) => {
    const next = { ...rgb, [ch]: clamp(val, 0, 255) };
    setHsv(rgbToHsv(next.r, next.g, next.b));
  };

  const tryApplyHex = (v: string) => {
    const rgb2 = hexToRgb(v);
    if (rgb2) setHsv(rgbToHsv(rgb2.r, rgb2.g, rgb2.b));
  };

  const hueColor = rgbToHex(...Object.values(hsvToRgb(hsv.h, 1, 1)) as [number, number, number]);

  return (
    <div className="space-y-2 p-1" onClick={(e) => e.stopPropagation()}>
      {/* Cuadrado de Saturation/Value */}
      <div
        ref={svRef}
        onPointerDown={onSVDown}
        onPointerMove={onSVMove}
        className="relative h-[140px] w-full cursor-crosshair rounded-control"
        style={{
          background: `linear-gradient(to top, #000 0%, transparent 100%),
                       linear-gradient(to right, #fff 0%, ${hueColor} 100%)`,
        }}
      >
        <span
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hex }}
        />
      </div>

      {/* Tira de Hue */}
      <div
        ref={hueRef}
        onPointerDown={onHueDown}
        onPointerMove={onHueMove}
        className="relative h-3 w-full cursor-pointer rounded-full"
        style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }}
      >
        <span
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
          style={{ left: `${(hsv.h / 360) * 100}%`, background: hueColor }}
        />
      </div>

      {/* Hex + R/G/B */}
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 shrink-0 rounded-control ring-1 ring-black/[0.08]" style={{ background: hex }} />
        <input
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onBlur={() => tryApplyHex(hexInput)}
          onKeyDown={(e) => { if (e.key === 'Enter') tryApplyHex(hexInput); }}
          placeholder="#RRGGBB"
          className="h-7 flex-1 rounded-control bg-surface-alt px-2 font-mono text-[12px] text-text outline-none focus:ring-1 focus:ring-text/30"
        />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {(['r', 'g', 'b'] as const).map((ch) => (
          <label key={ch} className="flex flex-col items-center gap-0.5">
            <input
              type="number"
              min={0} max={255}
              value={rgb[ch]}
              onChange={(e) => updateChannel(ch, Number(e.target.value))}
              className="h-7 w-full rounded-control bg-surface-alt px-1 text-center text-[12px] text-text outline-none focus:ring-1 focus:ring-text/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-[10px] uppercase tracking-wider text-text-muted">{ch}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
