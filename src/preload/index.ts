import { contextBridge, ipcRenderer } from 'electron';

// Único puente entre renderer y main. Toda la lógica vive en main; aquí solo
// exponemos un invoke genérico (tipado en el renderer vía IpcApi) y una
// suscripción a eventos main→renderer.
const api = {
  invoke: (channel: string, payload?: unknown): Promise<unknown> =>
    ipcRenderer.invoke(channel, payload),
  onEvent: (cb: (event: unknown) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, ev: unknown) => cb(ev);
    ipcRenderer.on('app:event', handler);
    return () => ipcRenderer.removeListener('app:event', handler);
  },
};

contextBridge.exposeInMainWorld('markwell', api);

export type MarkwellBridge = typeof api;
