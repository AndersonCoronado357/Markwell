import type { DB } from './connection';
import init001 from './migrations/001_init.sql?raw';
import softDelete002 from './migrations/002_soft_delete.sql?raw';
import tagIcon003 from './migrations/003_tag_icon.sql?raw';
import templates004 from './migrations/004_templates.sql?raw';
import boards005 from './migrations/005_boards.sql?raw';
import foldersKind006 from './migrations/006_folders_kind.sql?raw';
import aiConvs007 from './migrations/007_ai_conversations.sql?raw';
import chatFolders008 from './migrations/008_chat_folders.sql?raw';
import embeddings009 from './migrations/009_embeddings.sql?raw';
import embeddings010 from './migrations/010_embeddings_3072.sql?raw';

interface Migration { v: number; sql: string; }
const MIGRATIONS: Migration[] = [
  { v: 1, sql: init001 },
  { v: 2, sql: softDelete002 },
  { v: 3, sql: tagIcon003 },
  { v: 4, sql: templates004 },
  { v: 5, sql: boards005 },
  { v: 6, sql: foldersKind006 },
  { v: 7, sql: aiConvs007 },
  { v: 8, sql: chatFolders008 },
  { v: 9, sql: embeddings009 },
  { v: 10, sql: embeddings010 },
];

/** Aplica las migraciones pendientes en una transacción. Devuelve la versión final. */
export function migrate(db: DB): number {
  const current = db.pragma('user_version', { simple: true }) as number;
  const run = db.transaction(() => {
    for (const m of MIGRATIONS) {
      if (m.v <= current) continue;
      db.exec(m.sql);
      db.pragma(`user_version = ${m.v}`);
    }
  });
  run();

  // Auto-reparación: si por algún motivo la BD quedó a medio migrar (versiones
  // antiguas de la app que hicieron commit del user_version pero fallaron en
  // un ALTER), aseguramos las columnas críticas. Idempotente.
  ensureColumn(db, 'ai_conversations', 'folder_id', 'INTEGER REFERENCES folders(id) ON DELETE SET NULL');

  return db.pragma('user_version', { simple: true }) as number;
}

/** Añade una columna si no existe. Para curar BDs que ya estaban en v ≥ N pero les falta la columna. */
function ensureColumn(db: DB, table: string, column: string, def: string): void {
  try {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    if (cols.some((c) => c.name === column)) return;
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
  } catch {
    // La tabla no existe todavía o la BD no se puede leer. Lo dejamos pasar.
  }
}
