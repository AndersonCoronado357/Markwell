import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';

export interface FindHighlightState {
  query: string;
  total: number;
  currentIndex: number; // 0-based; -1 si no hay coincidencias.
  matches: { from: number; to: number }[];
  decorationSet: DecorationSet;
}

export const findHighlightKey = new PluginKey<FindHighlightState>('mw-find-highlight');

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMatches(doc: PMNode, query: string): { from: number; to: number }[] {
  const matches: { from: number; to: number }[] = [];
  if (!query) return matches;
  const re = new RegExp(escapeRegExp(query), 'gi');
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(node.text)) !== null) {
      const start = pos + m.index;
      matches.push({ from: start, to: start + m[0].length });
      // Evita bucle infinito con matches de longitud cero.
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  });
  return matches;
}

function buildDecorations(
  doc: PMNode,
  matches: { from: number; to: number }[],
  currentIndex: number,
): DecorationSet {
  const decos = matches.map((m, i) =>
    Decoration.inline(m.from, m.to, {
      class: i === currentIndex ? 'mw-find-hit mw-find-hit-current' : 'mw-find-hit',
    }),
  );
  return DecorationSet.create(doc, decos);
}

/** Extensión TipTap: resalta todas las coincidencias de un texto y permite navegar. */
export const FindHighlight = Extension.create({
  name: 'findHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin<FindHighlightState>({
        key: findHighlightKey,
        state: {
          init(): FindHighlightState {
            return { query: '', total: 0, currentIndex: -1, matches: [], decorationSet: DecorationSet.empty };
          },
          apply(tr, prev, _oldState, newState): FindHighlightState {
            const meta = tr.getMeta(findHighlightKey) as
              | { query?: string; currentIndex?: number; cycle?: 1 | -1 }
              | undefined;

            // Si no hay meta y el doc no cambió, mapeamos decoraciones existentes.
            if (!meta && !tr.docChanged) {
              return { ...prev, decorationSet: prev.decorationSet.map(tr.mapping, tr.doc) };
            }

            const query = meta?.query !== undefined ? meta.query : prev.query;
            const matches = (meta?.query !== undefined || tr.docChanged)
              ? findMatches(newState.doc, query)
              : prev.matches;
            const total = matches.length;

            let currentIndex = prev.currentIndex;
            if (meta?.currentIndex !== undefined) currentIndex = meta.currentIndex;
            if (meta?.cycle) currentIndex = currentIndex + meta.cycle;
            if (total === 0) currentIndex = -1;
            else if (currentIndex < 0 || currentIndex >= total) currentIndex = ((currentIndex % total) + total) % total;

            return {
              query,
              total,
              currentIndex,
              matches,
              decorationSet: buildDecorations(newState.doc, matches, currentIndex),
            };
          },
        },
        props: {
          decorations(state) {
            return findHighlightKey.getState(state)?.decorationSet;
          },
        },
      }),
    ];
  },
});
