import { toast } from './toastStore';

interface Args {
  kind: 'nota' | 'carpeta' | 'etiqueta';
  label: string;
  onConfirm: () => void;
}

/**
 * Confirmación inline en toast (sin modal): pregunta y dos botones.
 * Pensado para acciones irreversibles ("eliminar para siempre").
 */
export function confirmDelete({ kind, label, onConfirm }: Args): void {
  toast({
    title: `¿Eliminar ${kind} para siempre?`,
    description: `"${label}" se borrará definitivamente.`,
    duration: null, // permanente hasta acción/cierre
    actions: [
      { label: 'Eliminar', danger: true, onClick: onConfirm },
    ],
  });
}
