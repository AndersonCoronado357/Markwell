import fs from 'node:fs';
import path from 'node:path';
import type { DB } from '../db/connection';
import type { SettingsRepo } from '../repositories/settings.repo';

export interface BackupInfo {
  filename: string;
  path: string;
  createdAt: string;
  sizeBytes: number;
}

const LAST_BACKUP_KEY = 'lastBackupAt';
const RETENTION = 7;

/**
 * Respaldos diarios automáticos vía `VACUUM INTO`: atómico, compactado y
 * autónomo (no copia ficheros WAL). Retención: últimos 7.
 */
export class BackupService {
  constructor(
    private db: DB,
    private settings: SettingsRepo,
    private backupsDir: string,
  ) {}

  /** Crea un respaldo ya. Devuelve la info del archivo creado. */
  create(): BackupInfo {
    fs.mkdirSync(this.backupsDir, { recursive: true });
    const now = new Date();
    const ts = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '').replace('T', '-');
    const filename = `markwell-${ts}.db`;
    const target = path.join(this.backupsDir, filename);
    this.db.prepare(`VACUUM INTO ?`).run(target);
    this.settings.set(LAST_BACKUP_KEY, now.toISOString());
    this.prune();
    return this.statBackup(filename, target);
  }

  /** Si pasaron >=24h desde el último respaldo, crea uno. */
  maybeAutoBackup(): BackupInfo | null {
    const lastIso = this.settings.get(LAST_BACKUP_KEY);
    const last = lastIso ? new Date(lastIso).getTime() : 0;
    const elapsed = Date.now() - last;
    if (elapsed >= 24 * 60 * 60 * 1000) return this.create();
    return null;
  }

  list(): BackupInfo[] {
    if (!fs.existsSync(this.backupsDir)) return [];
    return fs
      .readdirSync(this.backupsDir)
      .filter((n) => n.startsWith('markwell-') && n.endsWith('.db'))
      .map((n) => this.statBackup(n, path.join(this.backupsDir, n)))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  /** Mantiene los últimos N respaldos, borra el resto. */
  private prune(): void {
    const all = this.list();
    for (const old of all.slice(RETENTION)) {
      try { fs.unlinkSync(old.path); } catch { /* ignore */ }
    }
  }

  /**
   * Verifica que un respaldo exista y devuelve su ruta absoluta. El proceso
   * principal usa este path para programar la restauración en el siguiente
   * arranque.
   */
  prepareRestore(filename: string): string {
    const target = path.join(this.backupsDir, filename);
    if (!fs.existsSync(target)) throw new Error('El respaldo no existe.');
    return target;
  }

  private statBackup(filename: string, fullPath: string): BackupInfo {
    const st = fs.statSync(fullPath);
    return { filename, path: fullPath, createdAt: st.mtime.toISOString(), sizeBytes: st.size };
  }
}
