import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { createMainWindow } from './window';
import { resolvePaths } from './env';
import { openDb } from './db/connection';
import { migrate } from './db/migrate';
import { buildContainer } from './db/container';
import { registerIpc } from './ipc/register';
import { runSelfTest } from './selftest';
import { runSeed } from './seed';

// Una sola instancia: si ya hay una, enfocamos la existente.
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

/**
 * Si en el arranque anterior se solicitó restaurar un respaldo, ahora es el
 * momento: la BD aún no está abierta. Copiamos el archivo sobre la BD y
 * borramos los WAL/SHM huérfanos para que la nueva BD arranque limpia.
 */
function maybeRestoreBackup(userDataDir: string, dbPath: string): void {
  const marker = path.join(userDataDir, 'restore-pending.txt');
  if (!fs.existsSync(marker)) return;
  try {
    const src = fs.readFileSync(marker, 'utf8').trim();
    if (!src || !fs.existsSync(src)) throw new Error('Archivo de respaldo no encontrado: ' + src);
    fs.copyFileSync(src, dbPath);
    // Limpia WAL/SHM previos para que SQLite recree desde la copia restaurada.
    for (const suf of ['-wal', '-shm']) {
      const f = dbPath + suf;
      if (fs.existsSync(f)) { try { fs.unlinkSync(f); } catch { /* ignore */ } }
    }
    console.log('[backup] respaldo restaurado desde', src);
  } catch (e) {
    console.error('[backup] no se pudo restaurar:', e);
  } finally {
    try { fs.unlinkSync(marker); } catch { /* ignore */ }
  }
}

app.whenReady().then(() => {
  try {
    const paths = resolvePaths();
    maybeRestoreBackup(app.getPath('userData'), paths.dbPath);
    const db = openDb(paths.dbPath);
    const version = migrate(db);
    const container = buildContainer(db, paths.backupsDir, paths.secretsDir);
    registerIpc(container);

    // Importa la clave de Gemini desde el archivo local (gitignored) si existe,
    // y la cifra en safeStorage. Luego borra el archivo plano.
    try {
      const setupPath = path.join(__dirname, '..', '..', '.local-secrets', 'gemini.key');
      if (fs.existsSync(setupPath) && !container.ai.status().configured) {
        const key = fs.readFileSync(setupPath, 'utf8').trim();
        if (key.length >= 10) {
          container.ai.saveKey(key);
          try { fs.unlinkSync(setupPath); } catch { /* ignore */ }
          console.log('[ai] clave de Gemini importada desde setup local');
        }
      }
    } catch (e) { console.warn('[ai] no se pudo importar la clave de setup', e); }

    // Respaldo automático si pasaron >=24h desde el último (sin bloquear).
    setImmediate(() => {
      try { container.backup.maybeAutoBackup(); } catch (e) { console.warn('auto-backup failed', e); }
    });

    // Comprobación de actualizaciones, silenciosa y con retraso: nunca debe
    // competir con el arranque de la ventana.
    container.updates.checkOnStartup();

    // Verificación / datos de ejemplo (gateados por variable de entorno).
    if (process.env.MARKWELL_SELFTEST === '1') {
      runSelfTest(container, version);
      return;
    }
    if (process.env.MARKWELL_SEED === '1') {
      runSeed(container);
      return;
    }

    // Controles de la barra de título propia (renderer → main)
    ipcMain.handle('window:min', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
    ipcMain.handle('window:max', (e) => {
      const w = BrowserWindow.fromWebContents(e.sender);
      if (!w) return;
      w.isMaximized() ? w.unmaximize() : w.maximize();
    });
    ipcMain.handle('window:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close());
    ipcMain.handle('shell:openUserData', () => shell.openPath(app.getPath('userData')));
    ipcMain.handle('shell:openBackups', () => shell.openPath(paths.backupsDir));
    ipcMain.handle('shell:openExternal', (_e, url: string) => {
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return Promise.resolve();
      return shell.openExternal(url);
    });

    // Restaurar respaldo: escribimos el marcador y reiniciamos la app. El
    // próximo arranque hace la copia antes de abrir la BD.
    ipcMain.handle('backup:restore', (_e, filename: string) => {
      const src = container.backup.prepareRestore(String(filename));
      fs.writeFileSync(path.join(app.getPath('userData'), 'restore-pending.txt'), src);
      app.relaunch();
      app.exit(0);
    });

    createMainWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  } catch (err) {
    // Una base sólida nunca muere en silencio: registramos y avisamos.
    const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
    try {
      fs.writeFileSync(path.join(app.getPath('userData'), 'startup-error.log'), message);
    } catch {
      /* sin remedio */
    }
    dialog.showErrorBox('Markwell — error al iniciar', message);
    app.quit();
  }
});

app.on('second-instance', () => {
  const [win] = BrowserWindow.getAllWindows();
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
