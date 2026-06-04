import { randomUUID } from 'node:crypto';
import type { DB } from '../db/connection';
import type { Template } from '../../shared/models';

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapTemplate(r: any): Template {
  return {
    id: r.id,
    uuid: r.uuid,
    name: r.name,
    description: r.description ?? null,
    contentJson: JSON.parse(r.content),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

export class TemplatesRepo {
  constructor(private db: DB) {}

  list(): Template[] {
    return (
      this.db.prepare('SELECT * FROM templates ORDER BY name COLLATE NOCASE').all() as any[]
    ).map(mapTemplate);
  }

  get(id: number): Template | null {
    const r = this.db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as any;
    return r ? mapTemplate(r) : null;
  }

  create(p: { name: string; description?: string | null; contentJson: unknown }): Template {
    const info = this.db
      .prepare('INSERT INTO templates(uuid, name, description, content) VALUES (?,?,?,?)')
      .run(randomUUID(), p.name, p.description ?? null, JSON.stringify(p.contentJson ?? {}));
    return this.get(Number(info.lastInsertRowid))!;
  }

  update(id: number, p: { name?: string; description?: string | null; contentJson?: unknown }): Template {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (p.name !== undefined) { sets.push('name = ?'); vals.push(p.name); }
    if (p.description !== undefined) { sets.push('description = ?'); vals.push(p.description); }
    if (p.contentJson !== undefined) { sets.push('content = ?'); vals.push(JSON.stringify(p.contentJson)); }
    if (sets.length) {
      sets.push(`updated_at = ${NOW}`);
      vals.push(id);
      this.db.prepare(`UPDATE templates SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    }
    return this.get(id)!;
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM templates WHERE id = ?').run(id);
  }
}
