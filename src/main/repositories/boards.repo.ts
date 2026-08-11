import { randomUUID } from 'node:crypto';
import type { DB } from '../db/connection';
import type { Board, BoardConnection, BoardItem, BoardSummary } from '../../shared/models';
import type { NotesRepo } from './notes.repo';

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapSummary(r: any): BoardSummary {
  return {
    id: r.id, uuid: r.uuid, name: r.name, color: r.color,
    folderId: r.folder_id, updatedAt: r.updated_at,
  };
}
function mapItem(r: any): BoardItem {
  return {
    id: r.id, boardId: r.board_id, type: r.type,
    text: r.text, x: r.x, y: r.y, w: r.w, h: r.h, color: r.color,
    updatedAt: r.updated_at,
  };
}
function mapConn(r: any): BoardConnection {
  return { id: r.id, boardId: r.board_id, fromId: r.from_id, toId: r.to_id, color: r.color };
}

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

export class BoardsRepo {
  constructor(private db: DB) {}

  list(folderId?: number | null): BoardSummary[] {
    let sql = 'SELECT * FROM boards WHERE deleted_at IS NULL';
    const params: unknown[] = [];
    if (folderId !== undefined) { sql += ' AND folder_id IS ?'; params.push(folderId); }
    sql += ' ORDER BY updated_at DESC';
    return (this.db.prepare(sql).all(...params) as any[]).map(mapSummary);
  }

  listTrashed(): BoardSummary[] {
    return (
      this.db.prepare('SELECT * FROM boards WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC').all() as any[]
    ).map(mapSummary);
  }

  get(id: number): Board | null {
    const r = this.db.prepare('SELECT * FROM boards WHERE id = ?').get(id) as any;
    if (!r) return null;
    const items = this.itemsOf(id);
    const connections = this.connectionsOf(id);
    return {
      ...mapSummary(r),
      items, connections,
      createdAt: r.created_at,
      deletedAt: r.deleted_at,
    };
  }

  connectionsOf(boardId: number): BoardConnection[] {
    return (
      this.db.prepare('SELECT * FROM board_connections WHERE board_id = ?').all(boardId) as any[]
    ).map(mapConn);
  }

  createConnection(p: { boardId: number; fromId: number; toId: number; color?: string | null }): BoardConnection {
    if (p.fromId === p.toId) throw new Error('No se puede conectar una nota consigo misma');
    // Evita duplicados en ambos sentidos.
    const exists = this.db
      .prepare('SELECT id FROM board_connections WHERE board_id = ? AND ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?))')
      .get(p.boardId, p.fromId, p.toId, p.toId, p.fromId) as { id: number } | undefined;
    if (exists) return this.db.prepare('SELECT * FROM board_connections WHERE id = ?').get(exists.id) as any;
    const info = this.db
      .prepare('INSERT INTO board_connections(board_id, from_id, to_id, color) VALUES (?,?,?,?)')
      .run(p.boardId, p.fromId, p.toId, p.color ?? null);
    this.touchBoard(p.boardId);
    return mapConn(this.db.prepare('SELECT * FROM board_connections WHERE id = ?').get(Number(info.lastInsertRowid)));
  }

  deleteConnection(id: number): void {
    const r = this.db.prepare('SELECT board_id FROM board_connections WHERE id = ?').get(id) as any;
    this.db.prepare('DELETE FROM board_connections WHERE id = ?').run(id);
    if (r) this.touchBoard(r.board_id);
  }

  itemsOf(boardId: number): BoardItem[] {
    return (
      this.db.prepare('SELECT * FROM board_items WHERE board_id = ? ORDER BY id').all(boardId) as any[]
    ).map(mapItem);
  }

  create(p: { name: string; folderId?: number | null; color?: string | null }): Board {
    const info = this.db
      .prepare('INSERT INTO boards(uuid, name, folder_id, color) VALUES (?,?,?,?)')
      .run(randomUUID(), p.name, p.folderId ?? null, p.color ?? null);
    return this.get(Number(info.lastInsertRowid))!;
  }

  rename(id: number, name: string, color?: string | null): Board {
    if (color !== undefined) {
      this.db.prepare(`UPDATE boards SET name = ?, color = ?, updated_at = ${NOW} WHERE id = ?`).run(name, color, id);
    } else {
      this.db.prepare(`UPDATE boards SET name = ?, updated_at = ${NOW} WHERE id = ?`).run(name, id);
    }
    return this.get(id)!;
  }

  trash(id: number): void { this.db.prepare(`UPDATE boards SET deleted_at = ${NOW} WHERE id = ?`).run(id); }
  restore(id: number): void { this.db.prepare('UPDATE boards SET deleted_at = NULL WHERE id = ?').run(id); }
  purge(id: number): void { this.db.prepare('DELETE FROM boards WHERE id = ?').run(id); }

  // === Items ===
  createItem(p: {
    boardId: number; type?: 'sticky'; text: string;
    x: number; y: number; w?: number; h?: number; color?: string | null;
  }): BoardItem {
    const info = this.db
      .prepare('INSERT INTO board_items(board_id, type, text, x, y, w, h, color) VALUES (?,?,?,?,?,?,?,?)')
      .run(p.boardId, p.type ?? 'sticky', p.text, p.x, p.y, p.w ?? 220, p.h ?? 180, p.color ?? null);
    this.touchBoard(p.boardId);
    return this.getItem(Number(info.lastInsertRowid))!;
  }

  updateItem(id: number, p: {
    text?: string; x?: number; y?: number; w?: number; h?: number; color?: string | null;
  }): BoardItem {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (p.text !== undefined)  { sets.push('text = ?');  vals.push(p.text); }
    if (p.x !== undefined)     { sets.push('x = ?');     vals.push(p.x); }
    if (p.y !== undefined)     { sets.push('y = ?');     vals.push(p.y); }
    if (p.w !== undefined)     { sets.push('w = ?');     vals.push(p.w); }
    if (p.h !== undefined)     { sets.push('h = ?');     vals.push(p.h); }
    if (p.color !== undefined) { sets.push('color = ?'); vals.push(p.color); }
    if (sets.length) {
      sets.push(`updated_at = ${NOW}`);
      vals.push(id);
      this.db.prepare(`UPDATE board_items SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    }
    const it = this.getItem(id)!;
    this.touchBoard(it.boardId);
    return it;
  }

  deleteItem(id: number): void {
    const r = this.db.prepare('SELECT board_id FROM board_items WHERE id = ?').get(id) as any;
    this.db.prepare('DELETE FROM board_items WHERE id = ?').run(id);
    if (r) this.touchBoard(r.board_id);
  }

  getItem(id: number): BoardItem | null {
    const r = this.db.prepare('SELECT * FROM board_items WHERE id = ?').get(id) as any;
    return r ? mapItem(r) : null;
  }

  private touchBoard(boardId: number): void {
    this.db.prepare(`UPDATE boards SET updated_at = ${NOW} WHERE id = ?`).run(boardId);
  }

  /** Crea una pizarra a partir de una nota: un sticky con el texto plano de la nota. */
  fromNote(notes: NotesRepo, noteId: number): Board {
    const note = notes.get(noteId);
    if (!note) throw new Error('Nota no encontrada');
    const board = this.create({
      name: note.title || 'Pizarra sin título',
      folderId: note.folderId,
      color: 'lavanda',
    });
    this.createItem({
      boardId: board.id,
      text: note.plaintext || note.title || '',
      x: 80, y: 80, w: 280, h: 220,
      color: 'amarillo',
    });
    return this.get(board.id)!;
  }
}
