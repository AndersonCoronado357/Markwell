import type { DB } from '../db/connection';
import type { SearchHit } from '../../shared/models';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Sanitiza una entrada del usuario a una consulta FTS5 segura de prefijo por token. */
function toFtsQuery(input: string): string {
  const tokens = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // sin diacríticos para coincidir con remove_diacritics 2
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2)
    .slice(0, 12);
  if (tokens.length === 0) return '';
  // Cada término entre comillas + prefijo *
  return tokens.map((t) => `"${t.replace(/"/g, '""')}"*`).join(' AND ');
}

export class SearchService {
  constructor(private db: DB) {}

  query(q: string, opts: { limit?: number; includeTrashed?: boolean } = {}): SearchHit[] {
    const ftsQ = toFtsQuery(q);
    if (!ftsQ) return [];
    const limit = Math.min(Math.max(opts.limit ?? 30, 1), 200);
    const includeTrash = !!opts.includeTrashed;
    const sql = `
      SELECT
        n.id              AS noteId,
        n.title           AS title,
        n.folder_id       AS folderId,
        n.deleted_at      AS deletedAt,
        snippet(notes_fts, 1, '<<', '>>', '…', 12) AS snippet,
        bm25(notes_fts, 2.0, 1.0) AS rank
      FROM notes_fts
      JOIN notes n ON n.id = notes_fts.rowid
      WHERE notes_fts MATCH ? ${includeTrash ? '' : 'AND n.deleted_at IS NULL'}
      ORDER BY rank
      LIMIT ?`;
    const rows = this.db.prepare(sql).all(ftsQ, limit) as any[];
    return rows.map((r) => ({
      noteId: r.noteId,
      title: r.title,
      folderId: r.folderId,
      snippet: r.snippet,
      rank: r.rank,
      trashed: r.deletedAt != null,
    }));
  }
}
