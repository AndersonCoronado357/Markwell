import { contextBridge, ipcRenderer } from 'electron';

// Único puente entre renderer y main. Toda la lógica vive en main; aquí solo
// exponemos un invoke genérico (tipado en el renderer vía IpcApi), una
// suscripción a eventos main→renderer, y un canal específico para el streaming
// de la IA.
const api = {
  invoke: (channel: string, payload?: unknown): Promise<unknown> =>
    ipcRenderer.invoke(channel, payload),
  onEvent: (cb: (event: unknown) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, ev: unknown) => cb(ev);
    ipcRenderer.on('app:event', handler);
    return () => ipcRenderer.removeListener('app:event', handler);
  },
  onAiStream: (cb: (event: { requestId: string; type: 'delta' | 'done' | 'error'; text?: string; message?: string }) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, ev: { requestId: string; type: 'delta' | 'done' | 'error'; text?: string; message?: string }) => cb(ev);
    ipcRenderer.on('ai:stream', handler);
    return () => ipcRenderer.removeListener('ai:stream', handler);
  },
};

contextBridge.exposeInMainWorld('markwell', api);

export type MarkwellBridge = typeof api;
