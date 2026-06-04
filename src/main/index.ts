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

app.whenReady().then(() => {
  try {
    const paths = resolvePaths();
    const db = openDb(paths.dbPath);
    const version = migrate(db);
    const container = buildContainer(db, paths.backupsDir);
    registerIpc(container);

    // Respaldo automático si pasaron >=24h desde el último (sin bloquear).
    setImmediate(() => {
      try { container.backup.maybeAutoBackup(); } catch (e) { console.warn('auto-backup failed', e); }
    });

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
