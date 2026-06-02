import TableCell from '@tiptap/extension-table-cell';

/** TableCell con un atributo extra `verticalAlign` (top | middle | bottom). */
export const TableCellWithAlign = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      verticalAlign: {
        default: null,
        parseHTML: (el) => el.style.verticalAlign || el.getAttribute('data-valign') || null,
        renderHTML: (attrs) => {
          if (!attrs.verticalAlign) return {};
          return {
            'data-valign': attrs.verticalAlign,
            style: `vertical-align: ${attrs.verticalAlign}`,
          };
        },
      },
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cellVerticalAlign: {
      setCellVerticalAlign: (value: 'top' | 'middle' | 'bottom') => ReturnType;
    };
  }
}
