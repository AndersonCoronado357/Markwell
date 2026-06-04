import { useStore } from './store';
import { ipc } from './ipc';
import { Channels } from '../shared/ipc';
import { toast } from './toastStore';

export interface Command {
  id: string;
  label: string;
  hint?: string;
  shortcut?: string;
  group: 'Navegación' | 'Crear' | 'Vista' | 'Ajustes' | 'Datos';
  run: () => void | Promise<void>;
}

/** Catálogo central de comandos disponibles desde la paleta y los atajos. */
export function buildCommands(): Command[] {
  const s = useStore.getState();
  return [
    // Crear
    {
      id: 'note.new', label: 'Nueva nota', group: 'Crear', shortcut: 'Ctrl+N',
      run: () => s.createNote(),
    },
    {
      id: 'folder.new', label: 'Nueva carpeta', group: 'Crear',
      run: () => s.createFolder('Nueva carpeta'),
    },
    {
      id: 'tag.new', label: 'Nueva etiqueta', group: 'Crear',
      run: () => s.createTag('nueva-etiqueta'),
    },

    // Navegación
    {
      id: 'go.all', label: 'Ir a Todas las notas', group: 'Navegación',
      run: () => s.selectFolder(null),
    },
    {
      id: 'go.favorites', label: 'Ir a Favoritos', group: 'Navegación',
      run: () => s.setView('favorites'),
    },
    {
      id: 'go.trash', label: 'Ir a Papelera', group: 'Navegación',
      run: () => s.setView('trash'),
    },

    // Vista
    {
      id: 'view.theme.light', label: 'Tema: Claro', group: 'Vista',
      run: () => s.setTheme('light'),
    },
    {
      id: 'view.theme.dark', label: 'Tema: Oscuro', group: 'Vista',
      run: () => s.setTheme('dark'),
    },
    {
      id: 'view.theme.system', label: 'Tema: Sistema', group: 'Vista',
      run: () => s.setTheme('system'),
    },
    {
      id: 'view.sidebar', label: 'Mostrar / ocultar barra lateral', group: 'Vista', shortcut: 'Ctrl+Shift+S',
      run: () => s.toggleSidebar(),
    },
    {
      id: 'view.notes', label: 'Mostrar / ocultar lista de notas', group: 'Vista', shortcut: 'Ctrl+Shift+N',
      run: () => s.toggleNotesPane(),
    },

    // Ajustes
    {
      id: 'settings.open', label: 'Abrir ajustes', group: 'Ajustes', shortcut: 'Ctrl+,',
      run: () => s.openSettings(true),
    },

    // Datos
    {
      id: 'data.openFolder', label: 'Abrir carpeta de datos', group: 'Datos',
      run: () => { void window.markwell.invoke('shell:openUserData'); },
    },
    {
      id: 'data.openBackups', label: 'Abrir carpeta de respaldos', group: 'Datos',
      run: () => { void window.markwell.invoke('shell:openBackups'); },
    },
    {
      id: 'data.backup.create', label: 'Crear respaldo ahora', group: 'Datos',
      run: async () => {
        try {
          const b = await ipc(Channels.backupCreate);
          toast({ title: 'Respaldo creado', description: b.filename });
        } catch {
          toast({ title: 'No se pudo crear el respaldo' });
        }
      },
    },
  ];
}
