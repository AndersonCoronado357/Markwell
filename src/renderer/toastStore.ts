import { create } from 'zustand';

export interface ToastAction {
  label: string;
  onClick: () => void;
  primary?: boolean; // muestra el botón destacado
  danger?: boolean;  // muestra el botón en rojo
}

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  actions?: ToastAction[];
  /** Duración en ms; null = permanente hasta acción/cierre. */
  duration?: number | null;
}

interface ToastState {
  items: ToastItem[];
  show: (t: Omit<ToastItem, 'id'>) => number;
  remove: (id: number) => void;
  clear: () => void;
}

let _id = 0;
export const useToastStore = create<ToastState>((set) => ({
  items: [],
  show: (t) => {
    const id = ++_id;
    set((s) => ({ items: [...s.items, { ...t, id }] }));
    return id;
  },
  remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
  clear: () => set({ items: [] }),
}));

export const toast = (t: Omit<ToastItem, 'id'>) => useToastStore.getState().show(t);
export const dismissToast = (id: number) => useToastStore.getState().remove(id);
