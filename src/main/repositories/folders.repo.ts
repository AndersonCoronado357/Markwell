import { randomUUID } from 'node:crypto';
import type { DB } from '../db/connection';
import type { Folder, FolderNode } from '../../shared/models';

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapFolder(r: any): Folder {
  return {
    id: r.id,
    uuid: r.uuid,
    parentId: r.parent_id,
    name: r.name,
    color: r.color,
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

export class FoldersRepo {
  constructor(private db: DB) {}

  list(): Folder[] {
    return (
      this.db
        .prepare('SELECT * FROM folders WHERE deleted_at IS NULL ORDER BY parent_id, position, name')
        .all() as any[]
    ).map(mapFolder);
  }

  listTrashed(): Folder[] {
    return (
      this.db
        .prepare('SELECT * FROM folders WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC')
        .all() as any[]
    ).map(mapFolder);
  }

  tree(): FolderNode[] {
    const nodes = new Map<number, FolderNode>();
    for (const f of this.list()) nodes.set(f.id, { ...f, children: [] });
    const roots: FolderNode[] = [];
    for (const node of nodes.values()) {
      if (node.parentId != null && nodes.has(node.parentId)) nodes.get(node.parentId)!.children.push(node);
      else roots.push(node);
    }
    return roots;
  }

  get(id: number): Folder | null {
    const r = this.db.prepare('SELECT * FROM folders WHERE id = ?').get(id) as any;
    return r ? mapFolder(r) : null;
  }

  create(p: { name: string; parentId?: number | null; color?: string | null }): Folder {
    const parentId = p.parentId ?? null;
    const pos = (
      this.db
        .prepare('SELECT COALESCE(MAX(position), 0) + 1 AS p FROM folders WHERE parent_id IS ? AND deleted_at IS NULL')
        .get(parentId) as any
    ).p;
    const info = this.db
      .prepare('INSERT INTO folders(uuid, name, parent_id, color, position) VALUES (?,?,?,?,?)')
      .run(randomUUID(), p.name, parentId, p.color ?? null, pos);
    return this.get(Number(info.lastInsertRowid))!;
  }

  rename(id: number, name: string, color?: string | null): Folder {
    if (color !== undefined) {
      this.db.prepare(`UPDATE folders SET name = ?, color = ?, updated_at = ${NOW} WHERE id = ?`).run(name, color, id);
    } else {
      this.db.prepare(`UPDATE folders SET name = ?, updated_at = ${NOW} WHERE id = ?`).run(name, id);
    }
    return this.get(id)!;
  }

  /**
   * Manda a la papelera la carpeta, sus subcarpetas y las NOTAS vivas dentro
   * de cualquiera de ellas. NO toca folder_id, así al restaurar todo queda igual.
   */
  trash(id: number): { trashedFolderIds: number[]; trashedNoteIds: number[] } {
    const folderIds = this.collectDescendantsAndSelf(id);
    const fph = folderIds.map(() => '?').join(',');
    const trashedNoteIds: number[] = [];
    const tx = this.db.transaction(() => {
      const rows = this.db
        .prepare(`SELECT id FROM notes WHERE folder_id IN (${fph}) AND deleted_at IS NULL`)
        .all(...folderIds) as any[];
      for (const r of rows) trashedNoteIds.push(r.id);
      if (trashedNoteIds.length) {
        const nph = trashedNoteIds.map(() => '?').join(',');
        this.db.prepare(`UPDATE notes SET deleted_at = ${NOW} WHERE id IN (${nph})`).run(...trashedNoteIds);
      }
      this.db.prepare(`UPDATE folders SET deleted_at = ${NOW} WHERE id IN (${fph})`).run(...folderIds);
    });
    tx();
    return { trashedFolderIds: folderIds, trashedNoteIds };
  }

  restore(folderIds: number[], noteIds: number[] = []): void {
    const tx = this.db.transaction(() => {
      if (folderIds.length) {
        const fph = folderIds.map(() => '?').join(',');
        this.db.prepare(`UPDATE folders SET deleted_at = NULL WHERE id IN (${fph})`).run(...folderIds);
      }
      if (noteIds.length) {
        const nph = noteIds.map(() => '?').join(',');
        this.db.prepare(`UPDATE notes SET deleted_at = NULL WHERE id IN (${nph})`).run(...noteIds);
      }
    });
    tx();
  }

  purge(id: number): void {
    const ids = this.collectDescendantsAndSelf(id);
    const placeholders = ids.map(() => '?').join(',');
    this.db.prepare(`DELETE FROM folders WHERE id IN (${placeholders})`).run(...ids);
  }

  count(): number {
    return (this.db.prepare('SELECT COUNT(*) AS c FROM folders WHERE deleted_at IS NULL').get() as any).c;
  }

  private collectDescendantsAndSelf(rootId: number): number[] {
    const out: number[] = [rootId];
    const queue: number[] = [rootId];
    const childStmt = this.db.prepare('SELECT id FROM folders WHERE parent_id = ?');
    while (queue.length) {
      const cur = queue.shift()!;
      const children = (childStmt.all(cur) as any[]).map((r) => r.id as number);
      for (const c of children) { out.push(c); queue.push(c); }
    }
    return out;
  }
}
