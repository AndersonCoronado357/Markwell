// Tipo del puente expuesto por el preload en window.markwell.
export {};

declare global {
  interface Window {
    markwell: {
      invoke: <T = unknown>(channel: string, payload?: unknown) => Promise<T>;
      onEvent: (cb: (event: unknown) => void) => () => void;
    };
  }
}
