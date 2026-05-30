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

    lines.push('SELFTEST_OK');
  } catch (e: any) {
    lines.push('SELFTEST_FAIL ' + (e?.stack || e?.message || String(e)));
  }
  fs.writeFileSync(path.join(app.getPath('userData'), 'selftest.result.txt'), lines.join('\n'));
  app.quit();
}
