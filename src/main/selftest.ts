import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { Container } from './db/container';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Auto-prueba de la capa de datos (gateada por MARKWELL_SELFTEST=1): ejercita los
 * repositorios reales y la búsqueda FTS, escribe el resultado y cierra la app.
 */
export function runSelfTest(c: Container, version: number): void {
  const lines: string[] = [];
  try {
    lines.push('user_version=' + version);

    const folder = c.folders.create({ name: 'Ideas', color: 'lavanda' });
    lines.push(`folder created id=${folder.id} uuid=${folder.uuid}`);

    const note = c.notes.create({ folderId: folder.id, title: 'Primera nota' });
    lines.push('note created id=' + note.id);

    c.notes.save({
      id: note.id,
      title: 'Café y diseño',
      contentJson: { type: 'doc', content: [] },
      plaintext: 'Tomar café mientras diseño la organización',
    });

    lines.push('notes.list -> ' + JSON.stringify(c.notes.list({ folderId: folder.id })));
    lines.push('folders.tree len=' + c.folders.tree().length);

    const hits = (
      c.db
        .prepare(
          "SELECT n.id, n.title FROM notes_fts JOIN notes n ON n.id = notes_fts.rowid WHERE notes_fts MATCH ? AND n.deleted_at IS NULL",
        )
        .all('diseno*') as any[]
    );
    lines.push('search "diseno*" -> ' + JSON.stringify(hits));

    c.notes.trash(note.id);
    lines.push('after trash, live notes.list len=' + c.notes.list({ folderId: folder.id }).length);

    // --- Verificaciones de las migraciones nuevas (006 → 009) ---

    // 006: folders.kind
    const fcols = (c.db.prepare('PRAGMA table_info(folders)').all() as any[]).map((r) => r.name);
    if (!fcols.includes('kind')) throw new Error('folders.kind missing');
    lines.push('migration_006_OK folders.kind');

    // 007: ai_conversations + ai_messages
    const aiTables = (c.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('ai_conversations','ai_messages')").all() as any[]).map((r) => r.name);
    if (aiTables.length !== 2) throw new Error('ai_conversations / ai_messages missing');
    lines.push('migration_007_OK ai_conversations,ai_messages');

    // 008: ai_conversations.folder_id
    const aiCols = (c.db.prepare('PRAGMA table_info(ai_conversations)').all() as any[]).map((r) => r.name);
    if (!aiCols.includes('folder_id')) throw new Error('ai_conversations.folder_id missing');
    lines.push('migration_008_OK ai_conversations.folder_id');

    // 009: note_chunks + note_chunk_vectors (vec0)
    const chunkTables = (c.db.prepare("SELECT name FROM sqlite_master WHERE name IN ('note_chunks','note_chunk_vectors')").all() as any[]).map((r) => r.name);
    if (chunkTables.length !== 2) throw new Error('note_chunks / note_chunk_vectors missing');

    // Inserta un vector real y prueba kNN para validar que vec0 está activo.
    const fakeVec = new Float32Array(3072);
    for (let i = 0; i < 3072; i++) fakeVec[i] = Math.sin(i * 0.1);
    const chRes = c.db.prepare('INSERT INTO note_chunks(note_id, idx, text) VALUES (?, ?, ?)').run(note.id, 0, 'texto de prueba');
    const chunkId = chRes.lastInsertRowid;
    c.db.prepare('INSERT INTO note_chunk_vectors(chunk_id, embedding) VALUES (?, ?)').run(BigInt(chunkId as number), Buffer.from(fakeVec.buffer));
    const query = new Float32Array(3072);
    for (let i = 0; i < 3072; i++) query[i] = Math.sin(i * 0.1 + 0.001);
    const knn = (c.db.prepare(`SELECT v.chunk_id, v.distance FROM note_chunk_vectors v WHERE v.embedding MATCH ? AND k = ? ORDER BY v.distance`).all(Buffer.from(query.buffer), 1) as any[]);
    if (knn.length === 0) throw new Error('vec0 kNN returned 0 results');
    lines.push('migration_009_OK vec0 kNN distance=' + knn[0].distance.toFixed(4));

    // Servicio de respaldos (estructura, no llama API externa)
    const last = c.backup.list().length;
    const created = c.backup.create();
    if (c.backup.list().length !== last + 1) throw new Error('backup.create did not add file');
    fs.unlinkSync(created.path);
    lines.push('backup_OK list,create');

    // EmbeddingsService.search devuelve [] si no hay clave de IA (no debe romper)
    const searchProm = c.embeddings.search('test sin clave');
    lines.push('embeddings.search returned promise=' + (searchProm instanceof Promise));

    // AiConversations: create, list, append, list-by-folder
    const conv = c.aiConv.create('Conv test');
    c.aiConv.appendMessage(conv.id, 'user', 'hola');
    c.aiConv.appendMessage(conv.id, 'model', 'qué tal');
    const full = c.aiConv.get(conv.id);
    if (!full || full.messages.length !== 2) throw new Error('aiConv messages broken');
    const movedConv = c.aiConv.move(conv.id, folder.id);
    if (movedConv.folderId !== folder.id) throw new Error('aiConv.move did not set folderId');
    const byFolder = c.aiConv.list(folder.id);
    if (!byFolder.some((x) => x.id === conv.id)) throw new Error('aiConv.list by folder missing the conv');
    c.aiConv.delete(conv.id);
    lines.push('aiConv_OK create,append,get,move,list-by-folder,delete');

    // notes.move (drag&drop entre carpetas)
    const folder2 = c.folders.create({ name: 'Otra', color: 'menta' });
    c.notes.restore(note.id);
    c.notes.move(note.id, folder2.id);
    const moved = c.notes.list({ folderId: folder2.id });
    if (!moved.some((n) => n.id === note.id)) throw new Error('notes.move did not place note in folder2');
    lines.push('notes_move_OK');

    lines.push('SELFTEST_OK');
  } catch (e: any) {
    lines.push('SELFTEST_FAIL ' + (e?.stack || e?.message || String(e)));
  }
  fs.writeFileSync(path.join(app.getPath('userData'), 'selftest.result.txt'), lines.join('\n'));
  app.quit();
}
