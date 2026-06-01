import { randomUUID } from 'node:crypto';
import type { DB } from '../db/connection';
import type { Tag } from '../../shared/models';

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapTag(r: any): Tag {
  return { id: r.id, uuid: r.uuid, name: r.name, color: r.color, icon: r.icon ?? null };
}

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

export class TagsRepo {
  constructor(private db: DB) {}

  list(): Tag[] {
    return (
      this.db.prepare('SELECT * FROM tags WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE').all() as any[]
    ).map(mapTag);
  }

  listTrashed(): Tag[] {
    return (
      this.db.prepare('SELECT * FROM tags WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC').all() as any[]
    ).map(mapTag);
  }

  get(id: number): Tag | null {
    const r = this.db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as any;
    return r ? mapTag(r) : null;
  }

  create(name: string, color?: string | null, icon?: string | null): Tag {
    const info = this.db
      .prepare('INSERT INTO tags(uuid, name, color, icon) VALUES (?,?,?,?)')
      .run(randomUUID(), name, color ?? null, icon ?? null);
    return this.get(Number(info.lastInsertRowid))!;
  }

  update(id: number, p: { name?: string; color?: string | null; icon?: string | null }): Tag {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (p.name !== undefined) { sets.push('name = ?'); vals.push(p.name); }
    if (p.color !== undefined) { sets.push('color = ?'); vals.push(p.color); }
    if (p.icon !== undefined) { sets.push('icon = ?'); vals.push(p.icon); }
    if (sets.length) {
      vals.push(id);
      this.db.prepare(`UPDATE tags SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    }
    return this.get(id)!;
  }

  trash(id: number): void {
    this.db.prepare(`UPDATE tags SET deleted_at = ${NOW} WHERE id = ?`).run(id);
  }

  restore(id: number): void {
    this.db.prepare('UPDATE tags SET deleted_at = NULL WHERE id = ?').run(id);
  }

  purge(id: number): void {
    this.db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  }

  forNote(noteId: number): Tag[] {
    return (
      this.db
        .prepare(
          'SELECT t.* FROM tags t JOIN note_tags nt ON nt.tag_id = t.id WHERE nt.note_id = ? AND t.deleted_at IS NULL ORDER BY t.name COLLATE NOCASE',
        )
        .all(noteId) as any[]
    ).map(mapTag);
  }

  setForNote(noteId: number, tagIds: number[]): Tag[] {
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM note_tags WHERE note_id = ?').run(noteId);
      const ins = this.db.prepare('INSERT INTO note_tags(note_id, tag_id) VALUES (?, ?)');
      for (const t of tagIds) ins.run(noteId, t);
    });
    tx();
    return this.forNote(noteId);
  }
}
