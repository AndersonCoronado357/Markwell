import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor as TipTapEditor, JSONContent } from '@tiptap/react';
import { useEffect, useRef } from 'react';
import {
  Bold, Italic, UnderlineIcon as UnderlineI, Strikethrough, Link as LinkIcon, Code,
  Heading1, Heading2, Heading3, List, ListOrdered, ListChecks, Quote, Minus,
  Highlighter, Table as TableIcon, ImageIcon, Info, Type,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Undo2, Redo2,
  Scissors, Copy, ClipboardPaste, MousePointerClick,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
} from 'lucide-react';
import { buildExtensions } from './extensions';
import { useAutosave, type SaveStatus } from './useAutosave';
import { Dropdown } from '../components/Dropdown';
import { ContextMenu, type CtxItem } from '../components/ContextMenu';
import { ColorPickerDropdown, type ColorPreset } from '../components/ColorPickerDropdown';

interface Props {
  noteId: number;
  initialContent: unknown;
  title: string;
  onStatusChange?: (s: SaveStatus, savedAt: string | null) => void;
}

const HIGHLIGHTS: ColorPreset[] = [
  { name: 'amarillo', value: '#fff3a3' },
  { name: 'menta', value: '#b6e8c1' },
  { name: 'cielo', value: '#b8d6f5' },
  { name: 'rosa', value: '#f8c8d4' },
  { name: 'durazno', value: '#fad8aa' },
  { name: 'lavanda', value: '#d2c5f3' },
];

const TEXT_COLORS: ColorPreset[] = [
  { name: 'rosa', value: '#d2546d' },
  { name: 'naranja', value: '#d27543' },
  { name: 'amarillo', value: '#b3902a' },
  { name: 'verde', value: '#3a8c4e' },
  { name: 'azul', value: '#3a6dc4' },
  { name: 'violeta', value: '#7a52c7' },
];

// Catálogo amplio de fuentes (las 4 instaladas + ~25 fuentes del sistema en Windows).
const FONTS: { label: string; value: string }[] = [
  { label: 'Predeterminada', value: '' },
  { label: 'Plus Jakarta Sans', value: '"Plus Jakarta Sans Variable", sans-serif' },
  { label: 'Inter', value: '"Inter Variable", sans-serif' },
  { label: 'Nunito', value: '"Nunito Variable", sans-serif' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono Variable", monospace' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Arial Black', value: '"Arial Black", Gadget, sans-serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Cambria', value: 'Cambria, Georgia, serif' },
  { label: 'Candara', value: 'Candara, sans-serif' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
  { label: 'Consolas', value: 'Consolas, monospace' },
  { label: 'Constantia', value: 'Constantia, serif' },
  { label: 'Corbel', value: 'Corbel, sans-serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Franklin Gothic Medium', value: '"Franklin Gothic Medium", sans-serif' },
  { label: 'Garamond', value: 'Garamond, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Impact', value: 'Impact, Charcoal, sans-serif' },
  { label: 'Lucida Console', value: '"Lucida Console", Monaco, monospace' },
  { label: 'Lucida Sans Unicode', value: '"Lucida Sans Unicode", "Lucida Grande", sans-serif' },
  { label: 'Palatino Linotype', value: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
  { label: 'Segoe Print', value: '"Segoe Print", cursive' },
  { label: 'Segoe Script', value: '"Segoe Script", cursive' },
  { label: 'Segoe UI', value: '"Segoe UI", sans-serif' },
  { label: 'Sylfaen', value: 'Sylfaen, serif' },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
];

const SIZES: { label: string; value: string }[] = [
  { label: '8', value: '8px' }, { label: '9', value: '9px' }, { label: '10', value: '10px' },
  { label: '11', value: '11px' }, { label: '12', value: '12px' }, { label: '14', value: '14px' },
  { label: '16', value: '16px' }, { label: '18', value: '18px' }, { label: '20', value: '20px' },
  { label: '24', value: '24px' }, { label: '28', value: '28px' }, { label: '32', value: '32px' },
  { label: '36', value: '36px' }, { label: '48', value: '48px' }, { label: '72', value: '72px' },
];

export function Editor({ noteId, initialContent, title, onStatusChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const editor = useEditor(
    {
      extensions: buildExtensions(),
      content: (initialContent as JSONContent | string | null) ?? '',
      autofocus: 'end',
      editorProps: { attributes: { class: 'mw-editor', spellcheck: 'false' } },
    },
    [noteId],
  );

  const { status, savedAt } = useAutosave(noteId, editor, title);
  useEffect(() => { onStatusChange?.(status, savedAt); }, [status, savedAt, onStatusChange]);

  const insertImage = (file: File) => {
    if (!editor) return;
    const reader = new FileReader();
    reader.onload = () => editor.chain().focus().setImage({ src: reader.result as string }).run();
    reader.readAsDataURL(file);
  };

  // Menú contextual del editor (clic derecho dentro del área de escritura).
  const ctxItems: CtxItem[] = editor ? [
    { label: 'Cortar', icon: <Scissors size={14} />, onSelect: () => document.execCommand('cut') },
    { label: 'Copiar', icon: <Copy size={14} />, onSelect: () => document.execCommand('copy') },
    {
      label: 'Pegar', icon: <ClipboardPaste size={14} />,
      onSelect: async () => {
        try {
          const t = await navigator.clipboard.readText();
          editor.chain().focus().insertContent(t).run();
        } catch { /* sin permiso */ }
      },
    },
    { label: 'Seleccionar todo', icon: <MousePointerClick size={14} />, onSelect: () => editor.chain().focus().selectAll().run() },
    { label: 'Negrita', icon: <Bold size={14} />, onSelect: () => editor.chain().focus().toggleBold().run() },
    { label: 'Cursiva', icon: <Italic size={14} />, onSelect: () => editor.chain().focus().toggleItalic().run() },
    { label: 'Subrayado', icon: <UnderlineI size={14} />, onSelect: () => editor.chain().focus().toggleUnderline().run() },
  ] : [];

  return (
    <>
      <Toolbar editor={editor} onPickImage={() => fileRef.current?.click()} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) insertImage(f); e.target.value = ''; }}
      />
      <ContextMenu items={ctxItems}>
        <div>
          <EditorContent editor={editor} className="leading-[1.75] text-text" />
        </div>
      </ContextMenu>
    </>
  );
}

function Btn({
  onClick, active, label, children, disabled,
}: { onClick: () => void; active?: boolean; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-control transition-colors ${
        active ? 'bg-black/[0.09] text-text' : 'text-text-muted hover:bg-surface-alt hover:text-text'
      } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
    >
      {children}
    </button>
  );
}

function Divider() { return <span className="mx-1 h-4 w-px bg-border" />; }

function Toolbar({ editor, onPickImage }: { editor: TipTapEditor | null; onPickImage: () => void }) {
  if (!editor) return null;
  const c = () => editor.chain().focus();
  const linkPrompt = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = prompt('URL del enlace (vacío para quitar):', prev ?? 'https://');
    if (url === null) return;
    if (url === '') c().unsetLink().run();
    else c().extendMarkRange('link').setLink({ href: url }).run();
  };

  const currentFont = (editor.getAttributes('textStyle').fontFamily ?? '') as string;
  const currentSize = (editor.getAttributes('textStyle').fontSize ?? '') as string;
  const currentColor = (editor.getAttributes('textStyle').color ?? '') as string;
  const currentHighlight = (editor.getAttributes('highlight').color ?? '') as string;

  const inCell = editor.isActive('tableCell') || editor.isActive('tableHeader');
  const setVAlign = (v: 'top' | 'middle' | 'bottom') => editor.chain().focus().updateAttributes('tableCell', { verticalAlign: v }).run();
  const currentVAlign = (editor.getAttributes('tableCell').verticalAlign ?? '') as string;

  return (
    <div className="sticky top-0 z-10 -mx-2 mb-3 flex items-center gap-0.5 overflow-x-auto whitespace-nowrap rounded-card border border-border bg-surface px-2 py-1.5">
      <Btn label="Deshacer" onClick={() => c().undo().run()} disabled={!editor.can().undo()}><Undo2 size={14} /></Btn>
      <Btn label="Rehacer" onClick={() => c().redo().run()} disabled={!editor.can().redo()}><Redo2 size={14} /></Btn>
      <Divider />

      <Dropdown
        value={currentFont}
        options={FONTS.map((f) => ({ value: f.value, label: f.label, style: { fontFamily: f.value || undefined } }))}
        onChange={(v) => { if (!v) c().unsetFontFamily().run(); else c().setFontFamily(v as string).run(); }}
        width={170}
        title="Tipografía"
      />
      <Dropdown
        value={currentSize}
        options={[{ value: '', label: 'Automático' }, ...SIZES.map((s) => ({ value: s.value, label: s.label }))]}
        onChange={(v) => { if (!v) c().unsetMark('textStyle').run(); else c().setMark('textStyle', { fontSize: v }).run(); }}
        width={92}
        title="Tamaño"
      />
      <Divider />

      <Btn label="Título 1" active={editor.isActive('heading', { level: 1 })} onClick={() => c().toggleHeading({ level: 1 }).run()}><Heading1 size={15} /></Btn>
      <Btn label="Título 2" active={editor.isActive('heading', { level: 2 })} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></Btn>
      <Btn label="Título 3" active={editor.isActive('heading', { level: 3 })} onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading3 size={15} /></Btn>
      <Divider />

      <Btn label="Negrita" active={editor.isActive('bold')} onClick={() => c().toggleBold().run()}><Bold size={14} /></Btn>
      <Btn label="Cursiva" active={editor.isActive('italic')} onClick={() => c().toggleItalic().run()}><Italic size={14} /></Btn>
      <Btn label="Subrayado" active={editor.isActive('underline')} onClick={() => c().toggleUnderline().run()}><UnderlineI size={14} /></Btn>
      <Btn label="Tachado" active={editor.isActive('strike')} onClick={() => c().toggleStrike().run()}><Strikethrough size={14} /></Btn>
      <Btn label="Código" active={editor.isActive('code')} onClick={() => c().toggleCode().run()}><Code size={14} /></Btn>
      <Btn label="Enlace" active={editor.isActive('link')} onClick={linkPrompt}><LinkIcon size={14} /></Btn>
      <Divider />

      {/* Color de texto: dropdown con paleta + color personalizado */}
      <ColorPickerDropdown
        value={currentColor}
        presets={TEXT_COLORS}
        onChange={(v) => { if (!v) c().unsetColor().run(); else c().setColor(v).run(); }}
        trigger={
          <button
            title="Color de texto"
            className="flex h-7 items-center gap-1 rounded-control px-2 text-text-muted outline-none transition-colors hover:bg-surface-alt hover:text-text focus:outline-none data-[state=open]:bg-surface-alt"
          >
            <Type size={13} />
            <span className="h-3 w-3 rounded-full ring-1 ring-black/[0.08]" style={{ background: currentColor || 'var(--text-muted)' }} />
          </button>
        }
      />
      {/* Resaltado: mismo estilo */}
      <ColorPickerDropdown
        value={currentHighlight}
        presets={HIGHLIGHTS}
        onChange={(v) => { if (!v) c().unsetHighlight().run(); else c().setHighlight({ color: v }).run(); }}
        resetLabel="Sin resaltado"
        trigger={
          <button
            title="Resaltado"
            className="flex h-7 items-center gap-1 rounded-control px-2 text-text-muted outline-none transition-colors hover:bg-surface-alt hover:text-text focus:outline-none data-[state=open]:bg-surface-alt"
          >
            <Highlighter size={13} />
            <span className="h-3 w-3 rounded-full ring-1 ring-black/[0.08]" style={{ background: currentHighlight || 'transparent' }} />
          </button>
        }
      />
      <Divider />

      <Btn label="Alinear izquierda" active={editor.isActive({ textAlign: 'left' })} onClick={() => c().setTextAlign('left').run()}><AlignLeft size={14} /></Btn>
      <Btn label="Alinear centro" active={editor.isActive({ textAlign: 'center' })} onClick={() => c().setTextAlign('center').run()}><AlignCenter size={14} /></Btn>
      <Btn label="Alinear derecha" active={editor.isActive({ textAlign: 'right' })} onClick={() => c().setTextAlign('right').run()}><AlignRight size={14} /></Btn>
      <Btn label="Justificar" active={editor.isActive({ textAlign: 'justify' })} onClick={() => c().setTextAlign('justify').run()}><AlignJustify size={14} /></Btn>
      {/* Alineación vertical (solo activa en celdas de tabla) */}
      <Btn label="Alinear arriba (celda)" active={inCell && currentVAlign === 'top'} disabled={!inCell} onClick={() => setVAlign('top')}><AlignVerticalJustifyStart size={14} /></Btn>
      <Btn label="Alinear centro vertical (celda)" active={inCell && currentVAlign === 'middle'} disabled={!inCell} onClick={() => setVAlign('middle')}><AlignVerticalJustifyCenter size={14} /></Btn>
      <Btn label="Alinear abajo (celda)" active={inCell && currentVAlign === 'bottom'} disabled={!inCell} onClick={() => setVAlign('bottom')}><AlignVerticalJustifyEnd size={14} /></Btn>
      <Divider />

      <Btn label="Lista" active={editor.isActive('bulletList')} onClick={() => c().toggleBulletList().run()}><List size={15} /></Btn>
      <Btn label="Lista numerada" active={editor.isActive('orderedList')} onClick={() => c().toggleOrderedList().run()}><ListOrdered size={15} /></Btn>
      <Btn label="Lista de tareas" active={editor.isActive('taskList')} onClick={() => c().toggleTaskList().run()}><ListChecks size={15} /></Btn>
      <Divider />

      <Btn label="Cita" active={editor.isActive('blockquote')} onClick={() => c().toggleBlockquote().run()}><Quote size={15} /></Btn>
      <Btn label="Bloque de código" active={editor.isActive('codeBlock')} onClick={() => c().toggleCodeBlock().run()}><Code size={15} /></Btn>
      <Btn label="Callout (aviso)" onClick={() => c().toggleCallout({ color: 'cielo', icon: 'info' }).run()}><Info size={15} /></Btn>
      <Btn label="Tabla" onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon size={15} /></Btn>
      <Btn label="Imagen" onClick={onPickImage}><ImageIcon size={15} /></Btn>
      <Btn label="Separador" onClick={() => c().setHorizontalRule().run()}><Minus size={15} /></Btn>
    </div>
  );
}
