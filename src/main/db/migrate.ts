import type { DB } from './connection';
import init001 from './migrations/001_init.sql?raw';
import softDelete002 from './migrations/002_soft_delete.sql?raw';
import tagIcon003 from './migrations/003_tag_icon.sql?raw';
import templates004 from './migrations/004_templates.sql?raw';

interface Migration { v: number; sql: string; }
const MIGRATIONS: Migration[] = [
  { v: 1, sql: init001 },
  { v: 2, sql: softDelete002 },
  { v: 3, sql: tagIcon003 },
  { v: 4, sql: templates004 },
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
  return db.pragma('user_version', { simple: true }) as number;
}
