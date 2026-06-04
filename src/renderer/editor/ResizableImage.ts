import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ResizableImageView } from './ResizableImageView';

/**
 * Image redimensionable con atributos extra:
 *  - width / height (números o cadenas con unidad)
 *  - align: 'left' | 'center' | 'right' (cómo se posiciona en el bloque)
 */
export const ResizableImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute('width') ?? el.style.width ?? null,
        renderHTML: (attrs) => attrs.width ? { width: attrs.width } : {},
      },
      height: {
        default: null,
        parseHTML: (el) => el.getAttribute('height') ?? el.style.height ?? null,
        renderHTML: (attrs) => attrs.height ? { height: attrs.height } : {},
      },
      align: {
        default: 'left',
        parseHTML: (el) => el.getAttribute('data-align') ?? 'left',
        renderHTML: (attrs) => ({ 'data-align': attrs.align ?? 'left' }),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
