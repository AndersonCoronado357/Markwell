import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Nodo "callout" (recuadro de aviso). Tiene un color pastel y un icono.
 * Se renderiza como <div class="mw-callout" data-color="..." data-icon="...">
 */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      color: {
        default: 'cielo',
        parseHTML: (el) => el.getAttribute('data-color') ?? 'cielo',
        renderHTML: (attrs) => ({ 'data-color': attrs.color }),
      },
      icon: {
        default: 'info',
        parseHTML: (el) => el.getAttribute('data-icon') ?? 'info',
        renderHTML: (attrs) => ({ 'data-icon': attrs.icon }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div.mw-callout' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const color = (node.attrs.color as string) || 'cielo';
    const icon = (node.attrs.icon as string) || 'info';
    const symbol = ICONS[icon] ?? ICONS.info;
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'mw-callout',
        style: `--callout-color: var(--color-pastel-${color});`,
      }),
      ['div', { class: 'mw-callout-icon', contenteditable: 'false' }, symbol],
      ['div', { class: 'mw-callout-body' }, 0],
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attrs?: { color?: string; icon?: string }) =>
        ({ commands }) =>
          commands.wrapIn(this.name, attrs ?? {}),
      toggleCallout:
        (attrs?: { color?: string; icon?: string }) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, attrs ?? {}),
    };
  },
});

const ICONS: Record<string, string> = {
  info: 'i',
  warn: '!',
  ok: '✓',
  bulb: '★',
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { color?: string; icon?: string }) => ReturnType;
      toggleCallout: (attrs?: { color?: string; icon?: string }) => ReturnType;
    };
  }
}
