import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { TableCellWithAlign } from './TableCellWithAlign';
import { ResizableImage } from './ResizableImage';
import { lowlight } from './lowlight-config';
import TextAlign from '@tiptap/extension-text-align';
import FontFamily from '@tiptap/extension-font-family';
import { Callout } from './Callout';

export const buildExtensions = () => [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4] },
    codeBlock: false, // se reemplaza por CodeBlockLowlight más abajo
    link: false,
  }),
  CodeBlockLowlight.configure({
    lowlight,
    // Lenguaje por defecto cuando insertas un bloque: con resaltado desde el primer
    // carácter. El usuario puede cambiar el lenguaje desde la toolbar.
    defaultLanguage: 'javascript',
    HTMLAttributes: { spellcheck: 'false' },
  }),
  Underline,
  Highlight.configure({ multicolor: true }),
  TextStyle,
  Color,
  FontFamily,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  ResizableImage.configure({ inline: false, allowBase64: true }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCellWithAlign,
  Callout,
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === 'heading') return 'Encabezado';
      if (node.type.name === 'paragraph') return 'Empieza a escribir…';
      return '';
    },
    includeChildren: true,
    showOnlyCurrent: false,
  }),
];
