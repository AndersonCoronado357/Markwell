import { BrowserWindow } from 'electron';
import path from 'node:path';

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 880,
    minHeight: 600,
    show: false,
    // Sin barra de título nativa: la dibuja por completo la app (los controles
    // de minimizar/maximizar/cerrar son componentes propios y responden al tema).
    titleBarStyle: 'hidden',
    backgroundColor: '#f7f8fb',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  // Mostramos solo cuando el contenido está listo.
  win.once('ready-to-show', () => win.show());

  // electron-vite: en desarrollo carga el servidor de Vite; en producción, el HTML compilado.
  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return win;
}
