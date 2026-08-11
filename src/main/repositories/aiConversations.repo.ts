import { randomUUID } from 'node:crypto';
import type { DB } from '../db/connection';
import type { AiConversation, AiConvMessage, AiConvSummary } from '../../shared/models';

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapSummary(r: any): AiConvSummary {
  return { id: r.id, uuid: r.uuid, title: r.title, updatedAt: r.updated_at, folderId: r.folder_id ?? null };
}
function mapMessage(r: any): AiConvMessage {
  return { id: r.id, conversationId: r.conversation_id, role: r.role, text: r.text, createdAt: r.created_at };
}

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

export class AiConversationsRepo {
  constructor(private db: DB) {}

  /**
   * Lista las conversaciones, opcionalmente filtradas por carpeta.
   * folderId = undefined → todas. folderId = null → solo raíz. folderId = N → solo esa.
   */
  list(folderId?: number | null): AiConvSummary[] {
    if (folderId === undefined) {
      return (this.db.prepare('SELECT * FROM ai_conversations ORDER BY updated_at DESC').all() as any[]).map(mapSummary);
    }
    if (folderId === null) {
      return (this.db.prepare('SELECT * FROM ai_conversations WHERE folder_id IS NULL ORDER BY updated_at DESC').all() as any[]).map(mapSummary);
    }
    return (this.db.prepare('SELECT * FROM ai_conversations WHERE folder_id = ? ORDER BY updated_at DESC').all(folderId) as any[]).map(mapSummary);
  }

  get(id: number): AiConversation | null {
    const r = this.db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(id) as any;
    if (!r) return null;
    const messages = (
      this.db.prepare('SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY id').all(id) as any[]
    ).map(mapMessage);
    return { ...mapSummary(r), messages, createdAt: r.created_at };
  }

  create(title?: string, folderId?: number | null): AiConversation {
    const info = this.db
      .prepare('INSERT INTO ai_conversations(uuid, title, folder_id) VALUES (?, ?, ?)')
      .run(randomUUID(), title ?? 'Conversación', folderId ?? null);
    return this.get(Number(info.lastInsertRowid))!;
  }

  rename(id: number, title: string): AiConvSummary {
    this.db.prepare(`UPDATE ai_conversations SET title = ?, updated_at = ${NOW} WHERE id = ?`).run(title, id);
    return mapSummary(this.db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(id));
  }

  /** Mueve la conversación a otra carpeta (null = raíz). */
  move(id: number, folderId: number | null): AiConvSummary {
    this.db.prepare(`UPDATE ai_conversations SET folder_id = ?, updated_at = ${NOW} WHERE id = ?`).run(folderId, id);
    return mapSummary(this.db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(id));
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM ai_conversations WHERE id = ?').run(id);
  }

  appendMessage(conversationId: number, role: 'user' | 'model', text: string): AiConvMessage {
    const info = this.db
      .prepare('INSERT INTO ai_messages(conversation_id, role, text) VALUES (?, ?, ?)')
      .run(conversationId, role, text);
    this.db.prepare(`UPDATE ai_conversations SET updated_at = ${NOW} WHERE id = ?`).run(conversationId);
    return mapMessage(this.db.prepare('SELECT * FROM ai_messages WHERE id = ?').get(Number(info.lastInsertRowid)));
  }
}
