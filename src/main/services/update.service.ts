import { app, BrowserWindow } from 'electron';
import pkg from 'electron-updater';
import type { UpdateStatus } from '../../shared/ipc';

// electron-updater se publica en CommonJS: con `verbatimModuleSyntax` la
// importación con nombre no funciona y hay que sacar `autoUpdater` del default.
const { autoUpdater } = pkg;

/**
 * Actualizaciones automáticas contra el servidor propio (`generic`), que es la
 * misma carpeta desde la que se descarga el instalador. No hay GitHub Releases
 * de por medio.
 *
 * La descarga NO es automática: primero se avisa, y solo se instala cuando el
 * usuario lo pide. Descargar 100 MB por sorpresa en la conexión de alguien es
 * exactamente el tipo de cosa que esta aplicación no hace.
 */
export class UpdateService {
  private estado: UpdateStatus = {
    supported: false,
    checking: false,
    available: null,
    downloaded: false,
    current: app.getVersion(),
    error: null,
  };

  constructor() {
    // En desarrollo no hay app empaquetada que reemplazar.
    this.estado.supported = app.isPackaged;

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      this.estado.checking = true;
      this.estado.error = null;
      this.emitir();
    });
    autoUpdater.on('update-available', (info) => {
      this.estado.checking = false;
      this.estado.available = info.version;
      this.emitir();
      // Ya sabemos que hay algo: se descarga en segundo plano para que
      // "Reiniciar e instalar" sea inmediato cuando el usuario lo elija.
      autoUpdater.downloadUpdate().catch((e: unknown) => this.fallo(e));
    });
    autoUpdater.on('update-not-available', () => {
      this.estado.checking = false;
      this.estado.available = null;
      this.emitir();
    });
    autoUpdater.on('update-downloaded', (info) => {
      this.estado.downloaded = true;
      this.estado.available = info.version;
      this.emitir();
    });
    autoUpdater.on('error', (e) => this.fallo(e));
  }

  private fallo(e: unknown): void {
    this.estado.checking = false;
    this.estado.error = e instanceof Error ? e.message : String(e);
    console.warn('[update]', this.estado.error);
    this.emitir();
  }

  /** Avisa a la interfaz por el canal de eventos que ya existe. */
  private emitir(): void {
    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed()) w.webContents.send('app:event', { type: 'update', status: this.status() });
    }
  }

  status(): UpdateStatus {
    return { ...this.estado };
  }

  async check(): Promise<UpdateStatus> {
    if (!this.estado.supported) return this.status();
    try {
      await autoUpdater.checkForUpdates();
    } catch (e) {
      this.fallo(e);
    }
    return this.status();
  }

  /** Comprobación silenciosa al arrancar, fuera del camino crítico. */
  checkOnStartup(): void {
    if (!this.estado.supported) return;
    setTimeout(() => { void this.check(); }, 8000);
  }

  install(): { ok: boolean; reason?: string } {
    if (!this.estado.downloaded) return { ok: false, reason: 'todavía no se ha descargado' };
    // `isSilent` en false deja ver el instalador; el segundo argumento fuerza
    // que la aplicación vuelva a abrirse al terminar.
    setImmediate(() => autoUpdater.quitAndInstall(false, true));
    return { ok: true };
  }
}
