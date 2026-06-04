import { useEffect, useState } from 'react';
import { ArrowLeft, Sun, Moon, Monitor, Database, Keyboard, Type, Info, TypeOutline, FolderOpen, Archive, Save } from 'lucide-react';
import { useStore } from '../store';
import { Dropdown } from './Dropdown';
import { ipc } from '../ipc';
import { Channels } from '../../shared/ipc';
import { toast } from '../toastStore';
import type { BackupInfo } from '../../shared/models';

const PASTELS = [
  'rosa', 'coral', 'durazno', 'amarillo', 'lima', 'menta',
  'agua', 'cielo', 'azul', 'lavanda', 'lila', 'malva',
] as const;

const FONT_SCALES = [
  { label: 'Pequeño', value: 0.85 },
  { label: 'Normal', value: 1 },
  { label: 'Cómodo', value: 1.15 },
  { label: 'Grande', value: 1.3 },
];

const UI_FONTS: { label: string; value: string }[] = [
  { label: 'Plus Jakarta Sans (predeterminada)', value: '' },
  { label: 'Inter', value: '"Inter Variable", sans-serif' },
  { label: 'Nunito', value: '"Nunito Variable", sans-serif' },
  { label: 'Georgia (serif)', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono Variable", monospace' },
];

const SHORTCUTS = [
  { keys: 'Ctrl + K', action: 'Abrir la paleta de comandos' },
  { keys: 'Ctrl + N', action: 'Crear una nueva nota' },
  { keys: 'Ctrl + ,', action: 'Abrir ajustes' },
  { keys: 'Ctrl + Shift + S', action: 'Mostrar / ocultar la barra lateral' },
  { keys: 'Ctrl + Shift + N', action: 'Mostrar / ocultar la lista de notas' },
  { keys: 'Click derecho', action: 'Menú contextual sobre carpeta, etiqueta o nota' },
  { keys: 'Ctrl + B / I / U', action: 'Negrita / cursiva / subrayado en el editor' },
  { keys: 'Ctrl + Z / Y', action: 'Deshacer / rehacer en el editor' },
];

export function SettingsPane() {
  const setOpen = useStore((s) => s.openSettings);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const fontScale = useStore((s) => s.fontScale);
  const setFontScale = useStore((s) => s.setFontScale);
  const appFont = useStore((s) => s.appFont);
  const setAppFont = useStore((s) => s.setAppFont);

  return (
    <section className="flex min-h-0 flex-col bg-surface">
      <header className="flex items-center gap-2 px-7 pt-4 pb-2">
        <button
          onClick={() => setOpen(false)}
          title="Volver"
          className="inline-flex items-center gap-1.5 rounded-control px-2 py-1 text-[12.5px] text-text-muted hover:bg-surface-alt hover:text-text"
        >
          <ArrowLeft size={14} />
          Atrás
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="w-full px-10 pt-2 pb-16">
          <h1 className="text-[28px] font-bold tracking-tight">Ajustes</h1>
          <p className="mt-1 text-[13.5px] text-text-muted">
            Personaliza la apariencia y el comportamiento de Markwell.
          </p>

          <Section icon={<Sun size={15} />} title="Apariencia" hint="Tema claro, oscuro o el que use tu sistema operativo.">
            <div className="grid grid-cols-3 gap-3 max-w-[820px]">
              <ThemeCard active={theme === 'light'} onClick={() => setTheme('light')} icon={<Sun size={14} />} label="Claro">
                <div className="h-16 rounded-[10px] bg-[#f7f8fb] ring-1 ring-[#e6e9f0]">
                  <div className="m-2 h-3 w-12 rounded bg-white shadow-sm" />
                  <div className="mx-2 h-2 w-20 rounded bg-[#e6e9f0]" />
                  <div className="mx-2 mt-1 h-2 w-14 rounded bg-[#e6e9f0]" />
                </div>
              </ThemeCard>
              <ThemeCard active={theme === 'dark'} onClick={() => setTheme('dark')} icon={<Moon size={14} />} label="Oscuro">
                <div className="h-16 rounded-[10px] bg-[#16161a] ring-1 ring-[#34343d]">
                  <div className="m-2 h-3 w-12 rounded bg-[#1e1e23]" />
                  <div className="mx-2 h-2 w-20 rounded bg-[#34343d]" />
                  <div className="mx-2 mt-1 h-2 w-14 rounded bg-[#34343d]" />
                </div>
              </ThemeCard>
              <ThemeCard active={theme === 'system'} onClick={() => setTheme('system')} icon={<Monitor size={14} />} label="Sistema">
                <div className="flex h-16 gap-0 overflow-hidden rounded-[10px] ring-1 ring-[#a4a7b2]">
                  <div className="flex-1 bg-[#f7f8fb] p-2">
                    <div className="h-2.5 w-8 rounded bg-white shadow-sm" />
                  </div>
                  <div className="flex-1 bg-[#16161a] p-2">
                    <div className="h-2.5 w-8 rounded bg-[#1e1e23]" />
                  </div>
                </div>
              </ThemeCard>
            </div>
          </Section>

          <Section
            icon={<TypeOutline size={15} />}
            title="Fuente de la interfaz"
            hint="Tipografía usada en menús, listas y barras. Solo afecta a la interfaz; el editor mantiene la suya."
          >
            <div className="max-w-[420px]">
              <Dropdown
                value={appFont}
                options={UI_FONTS.map((f) => ({ value: f.value, label: f.label, style: { fontFamily: f.value || undefined } }))}
                onChange={(v) => setAppFont(v as string)}
                width={420}
              />
              <p className="mt-3 rounded-card bg-surface-alt p-4 text-[14px] text-text" style={{ fontFamily: appFont || undefined }}>
                Aa — Vista previa con la tipografía elegida. Esta preferencia se guarda y se carga al abrir Markwell.
              </p>
            </div>
          </Section>

          <Section icon={<Type size={15} />} title="Tamaño del editor" hint="Tamaño base de la tipografía dentro de las notas.">
            <div className="flex flex-wrap gap-2">
              {FONT_SCALES.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setFontScale(s.value)}
                  className={`rounded-control px-3 py-1.5 text-[13px] transition-colors ${
                    Math.abs(fontScale - s.value) < 0.01
                      ? 'bg-text font-semibold text-surface'
                      : 'bg-surface-alt text-text-muted hover:text-text'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mt-3 rounded-card bg-surface-alt p-4">
              <span style={{ fontSize: `${16 * fontScale}px` }} className="text-text">
                Aa — Vista previa. El editor usa este tamaño dentro de las notas.
              </span>
            </p>
          </Section>

          <Section
            icon={<div className="h-3.5 w-3.5 rounded-full" style={{ background: 'var(--color-pastel-lavanda)' }} />}
            title="Tu paleta"
            hint="La interfaz se mantiene neutra. Estos son los colores que asignas a cada carpeta, etiqueta o destacado — distintos colores en distintas cosas."
          >
            <div className="grid grid-cols-[repeat(auto-fill,minmax(78px,1fr))] gap-3 rounded-card bg-surface-alt p-4">
              {PASTELS.map((c) => (
                <div key={c} className="flex flex-col items-center gap-1.5 py-1">
                  <span
                    className="h-10 w-10 rounded-full ring-1 ring-black/[0.06]"
                    style={{ background: `var(--color-pastel-${c})` }}
                  />
                  <span className="text-[11.5px] text-text-muted">{c}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section icon={<Keyboard size={15} />} title="Atajos" hint="Atajos generales y dentro del editor.">
            <div className="rounded-card bg-surface-alt">
              {SHORTCUTS.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between gap-4 px-4 py-2.5 text-[13px] ${
                    i < SHORTCUTS.length - 1 ? 'border-b border-border/60' : ''
                  }`}
                >
                  <span className="text-text-muted">{s.action}</span>
                  <kbd className="rounded bg-surface px-2 py-0.5 font-mono text-[11px] text-text ring-1 ring-black/[0.08]">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </Section>

          <Section icon={<Database size={15} />} title="Almacenamiento" hint="Tus notas viven aquí, en tu equipo.">
            <div className="rounded-card bg-surface-alt p-4">
              <p className="text-[13px] text-text-muted">
                Carpeta de datos: <span className="font-mono text-[12px] text-text">%APPDATA%/Markwell</span><br />
                Base de datos: <span className="font-mono text-[12px] text-text">markwell.db</span> (SQLite con WAL)
              </p>
              <button
                onClick={() => window.markwell.invoke('shell:openUserData')}
                className="mt-3 inline-flex items-center gap-1.5 rounded-control bg-text px-3 py-1.5 text-[12.5px] font-semibold text-surface transition-opacity hover:opacity-90"
              >
                <FolderOpen size={13} />
                Abrir carpeta de datos
              </button>
            </div>
          </Section>

          <BackupsSection />

          <Section icon={<Info size={15} />} title="Sobre Markwell">
            <p className="text-[13.5px] text-text-muted">
              Editor de notas local. Tus datos no salen de tu máquina. Construido con Electron, SQLite y TipTap.
            </p>
          </Section>
        </div>
      </div>
    </section>
  );
}

function BackupsSection() {
  const [items, setItems] = useState<BackupInfo[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = () => { void ipc(Channels.backupList).then(setItems); };
  useEffect(reload, []);

  const create = async () => {
    setBusy(true);
    try {
      const b = await ipc(Channels.backupCreate);
      toast({ title: 'Respaldo creado', description: b.filename });
      reload();
    } catch {
      toast({ title: 'No se pudo crear el respaldo' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section icon={<Archive size={15} />} title="Respaldos" hint="Markwell crea automáticamente un respaldo diario. Se conservan los últimos 7.">
      <div className="rounded-card bg-surface-alt p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={create}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-control bg-text px-3 py-1.5 text-[12.5px] font-semibold text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Save size={13} />
            Crear respaldo ahora
          </button>
          <button
            onClick={() => window.markwell.invoke('shell:openBackups')}
            className="inline-flex items-center gap-1.5 rounded-control bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-text ring-1 ring-black/[0.06] transition-colors hover:bg-bg"
          >
            <FolderOpen size={13} />
            Abrir carpeta
          </button>
        </div>
        {items.length === 0 ? (
          <p className="mt-4 text-[12.5px] text-text-muted">Aún no hay respaldos. Se creará uno automáticamente.</p>
        ) : (
          <ul className="mt-4 space-y-1">
            {items.map((b) => (
              <li key={b.filename} className="flex items-center justify-between gap-3 rounded-control bg-surface px-3 py-2 text-[12.5px]">
                <span className="truncate font-mono text-text">{b.filename}</span>
                <span className="shrink-0 text-text-muted">
                  {new Date(b.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  {(b.sizeBytes / 1024).toFixed(0)} KB
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

function Section({
  icon, title, hint, children,
}: { icon?: React.ReactNode; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <h2 className="flex items-center gap-2 text-[14px] font-semibold text-text">
        {icon && <span className="text-text-muted">{icon}</span>}
        {title}
      </h2>
      {hint && <p className="mt-1 max-w-[820px] text-[12.5px] leading-relaxed text-text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ThemeCard({
  active, onClick, icon, label, children,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full flex-col rounded-card p-3 text-left text-[13px] font-medium transition-all ${
        active ? 'bg-surface ring-2 ring-text' : 'bg-surface-alt ring-1 ring-transparent hover:ring-border'
      }`}
    >
      {children}
      <span className="mt-2 flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </button>
  );
}
