import type { DB } from '../db/connection';
import type { AiService } from './ai.service';

/**
 * Servicio de embeddings: trocea el texto de una nota, genera vectores con
 * Google Generative AI (text-embedding-004, 768 dims) y los guarda en la tabla
 * virtual `note_chunk_vectors` (sqlite-vec). Se llama de forma asíncrona después
 * del autosave, fuera del camino crítico.
 */
const CHUNK_TARGET = 600;   // chars aprox por chunk
const CHUNK_OVERLAP = 100;

export class EmbeddingsService {
  constructor(private db: DB, private ai: AiService) {}

  /** Trocea + embedea la nota. Si la nota no tiene texto, limpia sus chunks. */
  async indexNote(noteId: number, plaintext: string): Promise<void> {
    const text = (plaintext ?? '').trim();
    if (!text) { this.clearNote(noteId); return; }
    if (!this.ai.status().configured) return; // no rompe nada si no hay clave

    const chunks = splitIntoChunks(text);
    const tx = this.db.transaction(() => {
      this.clearNote(noteId);
      for (let i = 0; i < chunks.length; i++) {
        this.db.prepare('INSERT INTO note_chunks(note_id, idx, text) VALUES (?, ?, ?)').run(noteId, i, chunks[i]);
      }
    });
    tx();

    // Genera embeddings en lote y los guarda.
    const rows = this.db.prepare('SELECT id, text FROM note_chunks WHERE note_id = ? ORDER BY idx').all(noteId) as { id: number; text: string }[];
    const vectors = await this.ai.embedBatch(rows.map((r) => r.text)).catch(() => [] as number[][]);
    if (!vectors.length) return;

    const stmt = this.db.prepare('INSERT INTO note_chunk_vectors(chunk_id, embedding) VALUES (?, ?)');
    const tx2 = this.db.transaction(() => {
      this.db.prepare('DELETE FROM note_chunk_vectors WHERE chunk_id IN (SELECT id FROM note_chunks WHERE note_id = ?)').run(noteId);
      for (let i = 0; i < vectors.length; i++) {
        if (vectors[i].length !== 3072) continue; // omite embeddings vacíos / dim incorrecta
        stmt.run(BigInt(rows[i].id), Buffer.from(new Float32Array(vectors[i]).buffer));
      }
    });
    tx2();
  }

  /** Búsqueda semántica: devuelve top-K chunks similares al query. */
  async search(query: string, limit = 8): Promise<Array<{ noteId: number; idx: number; text: string; distance: number }>> {
    if (!query.trim()) return [];
    if (!this.ai.status().configured) return [];
    const vec = await this.ai.embed(query).catch(() => null);
    if (!vec) return [];
    const buf = Buffer.from(new Float32Array(vec).buffer);
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const rows = this.db.prepare(`
      SELECT v.chunk_id AS chunk_id, v.distance AS distance,
             c.note_id AS note_id, c.idx AS idx, c.text AS text
      FROM note_chunk_vectors v
      JOIN note_chunks c ON c.id = v.chunk_id
      WHERE v.embedding MATCH ? AND k = ?
      ORDER BY v.distance ASC
    `).all(buf, limit) as any[];
    return rows.map((r) => ({ noteId: r.note_id, idx: r.idx, text: r.text, distance: r.distance }));
  }

  private clearNote(noteId: number): void {
    this.db.prepare('DELETE FROM note_chunk_vectors WHERE chunk_id IN (SELECT id FROM note_chunks WHERE note_id = ?)').run(noteId);
    this.db.prepare('DELETE FROM note_chunks WHERE note_id = ?').run(noteId);
  }
}

function splitIntoChunks(text: string): string[] {
  // Respeta saltos de párrafo cuando es posible.
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let buf = '';
  for (const p of paragraphs) {
    if ((buf + '\n\n' + p).length > CHUNK_TARGET && buf) {
      chunks.push(buf.trim());
      buf = buf.slice(Math.max(0, buf.length - CHUNK_OVERLAP)) + ' ' + p;
    } else {
      buf = buf ? buf + '\n\n' + p : p;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.length ? chunks : [text.slice(0, CHUNK_TARGET)];
}
