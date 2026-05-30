import type { IpcApi } from '../shared/ipc';

// Envoltorio tipado sobre window.markwell.invoke: cada canal infiere su
// request y response a partir de IpcApi.
export function ipc<C extends keyof IpcApi>(
  channel: C,
  payload?: IpcApi[C]['req'],
): Promise<IpcApi[C]['res']> {
  return window.markwell.invoke<IpcApi[C]['res']>(channel as string, payload);
}
