import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

export interface AppPaths {
  userData: string;
  dbPath: string;
  imagesDir: string;
  backupsDir: string;
  secretsDir: string;
}

/** Rutas de datos en runtime (en userData, separadas del código). Crea las carpetas. */
export function resolvePaths(): AppPaths {
  const userData = app.getPath('userData');
  const imagesDir = path.join(userData, 'images');
  const backupsDir = path.join(userData, 'backups');
  const secretsDir = path.join(userData, 'secrets');
  for (const dir of [imagesDir, backupsDir, secretsDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return {
    userData,
    dbPath: path.join(userData, 'markwell.db'),
    imagesDir,
    backupsDir,
    secretsDir,
  };
}
