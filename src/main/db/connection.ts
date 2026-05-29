import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';

export type DB = Database.Database;

/**
 * Abre la base SQLite, aplica los pragmas de durabilidad/rendimiento y carga
 * la extensión sqlite-vec (tablas vec0 para búsqueda semántica, Fase 3).
 */
export function openDb(dbPath: string): DB {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL'); // lecturas/escrituras concurrentes, durable
  db.pragma('synchronous = NORMAL'); // seguro con WAL y rápido
  db.pragma('foreign_keys = ON'); // respeta FK + ON DELETE CASCADE
  db.pragma('busy_timeout = 5000');
  db.pragma('temp_store = MEMORY');
  loadSqliteVec(db);
  return db;
}

function loadSqliteVec(db: DB): void {
  // sqlite-vec devuelve la ruta de su binario relativa a node_modules. Cuando la
  // app está empaquetada, ese node_modules vive dentro de app.asar, pero los
  // binarios nativos se desempaquetan a app.asar.unpacked. Redirigimos la ruta.
  const loadablePath = sqliteVec.getLoadablePath().replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
  db.loadExtension(loadablePath);
}
