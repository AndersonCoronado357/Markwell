import { randomUUID } from 'node:crypto';
import type { DB } from '../db/connection';
import type { Note, NoteSummary, NoteType } from '../../shared/models';

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapSummary(r: any): NoteSummary {
  return {
    id: r.id,
    uuid: r.uuid,
    title: r.title,
    type: r.type,
    folderId: r.folder_id,
    isFavorite: !!r.is_favorite,
    updatedAt: r.updated_at,
  };
}

function mapNote(r: any): Note {
  return {
    ...mapSummary(r),
    contentJson: JSON.parse(r.content),
    plaintext: r.plaintext,
    createdAt: r.created_at,
    deletedAt: r.deleted_at,
  };
}

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
const SUMMARY_COLS = 'id, uuid, title, type, folder_id, is_favorite, updated_at';

export class NotesRepo {
  constructor(private db: DB) {}

  list(opts: { folderId?: number | null; favoritesOnly?: boolean; trashed?: boolean } = {}): NoteSummary[] {
    const where: string[] = [opts.trashed ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL'];
    const params: Record<string, unknown> = {};
    if (opts.favoritesOnly) where.push('is_favorite = 1');
    if (opts.folderId !== undefined) {
      where.push('folder_id IS @folderId');
      params.folderId = opts.folderId;
    }
    const sql = `SELECT ${SUMMARY_COLS} FROM notes WHERE ${where.join(' AND ')} ORDER BY updated_at DESC`;
    const stmt = this.db.prepare(sql);
    const rows = (Object.keys(params).length ? stmt.all(params) : stmt.all()) as any[];
    return rows.map(mapSummary);
  }

  get(id: number): Note | null {
    const r = this.db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as any;
    return r ? mapNote(r) : null;
  }

  create(p: { folderId?: number | null; title?: string; type?: NoteType }): Note {
    const info = this.db
      .prepare('INSERT INTO notes(uuid, title, type, folder_id) VALUES (?,?,?,?)')
      .run(randomUUID(), p.title ?? '', p.type ?? 'document', p.folderId ?? null);
    return this.get(Number(info.lastInsertRowid))!;
  }

  /** Guarda contenido + plaintext (el trigger notes_au mantiene el índice FTS). */
  save(p: { id: number; title: string; contentJson: unknown; plaintext: string }): { id: number; updatedAt: string } {
    this.db
      .prepare(`UPDATE notes SET title = @title, content = @content, plaintext = @plaintext, updated_at = ${NOW} WHERE id = @id`)
      .run({ id: p.id, title: p.title, content: JSON.stringify(p.contentJson), plaintext: p.plaintext });
    const r = this.db.prepare('SELECT updated_at FROM notes WHERE id = ?').get(p.id) as any;
    return { id: p.id, updatedAt: r.updated_at };
  }

  trash(id: number): void {
    this.db.prepare(`UPDATE notes SET deleted_at = ${NOW} WHERE id = ?`).run(id);
  }

  /**
   * Restaura una nota. Si su carpeta padre (o cualquier ancestro) está en la
   * papelera, también restaura toda la cadena ascendente — así la nota vuelve
   * a ser visible exactamente donde estaba.
   */
  restore(id: number): void {
    const note = this.db.prepare('SELECT folder_id FROM notes WHERE id = ?').get(id) as { folder_id: number | null } | undefined;
    const tx = this.db.transaction(() => {
      if (note?.folder_id != null) {
        const ancestors = this.collectTrashedAncestors(note.folder_id);
        if (ancestors.length) {
          const ph = ancestors.map(() => '?').join(',');
          this.db.prepare(`UPDATE folders SET deleted_at = NULL WHERE id IN (${ph})`).run(...ancestors);
        }
      }
      this.db.prepare('UPDATE notes SET deleted_at = NULL WHERE id = ?').run(id);
    });
    tx();
  }

  private collectTrashedAncestors(folderId: number): number[] {
    const out: number[] = [];
    let cur: number | null = folderId;
    const stmt = this.db.prepare('SELECT parent_id, deleted_at FROM folders WHERE id = ?');
    while (cur != null) {
      const row = stmt.get(cur) as { parent_id: number | null; deleted_at: string | null } | undefined;
      if (!row) break;
      if (row.deleted_at != null) out.push(cur);
      cur = row.parent_id;
    }
    return out;
  }

  setFavorite(id: number, favorite: boolean): void {
    this.db.prepare('UPDATE notes SET is_favorite = ? WHERE id = ?').run(favorite ? 1 : 0, id);
  }

  rename(id: number, title: string): { id: number; updatedAt: string } {
    this.db.prepare(`UPDATE notes SET title = ?, updated_at = ${NOW} WHERE id = ?`).run(title, id);
    const r = this.db.prepare('SELECT updated_at FROM notes WHERE id = ?').get(id) as any;
    return { id, updatedAt: r.updated_at };
  }

  purge(id: number): void {
    this.db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  }

  listByTag(tagId: number): NoteSummary[] {
    const sql = `SELECT ${SUMMARY_COLS} FROM notes n
                 JOIN note_tags nt ON nt.note_id = n.id
                 WHERE nt.tag_id = ? AND n.deleted_at IS NULL
                 ORDER BY n.updated_at DESC`;
    return (this.db.prepare(sql).all(tagId) as any[]).map(mapSummary);
  }

  /** Notas (vivas o trasheadas) dentro de una carpeta concreta — para árbol de papelera. */
  listInFolder(folderId: number, opts: { trashed: boolean }): NoteSummary[] {
    const where = opts.trashed ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL';
    return (
      this.db
        .prepare(`SELECT ${SUMMARY_COLS} FROM notes WHERE folder_id = ? AND ${where} ORDER BY updated_at DESC`)
        .all(folderId) as any[]
    ).map(mapSummary);
  }

  countLive(): number {
    return (this.db.prepare('SELECT COUNT(*) AS c FROM notes WHERE deleted_at IS NULL').get() as any).c;
  }
}
