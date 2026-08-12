import { create } from 'zustand';
import { ipc } from './ipc';
import { Channels } from '../shared/ipc';
import type { BoardSummary, Folder, FolderNode, NoteSummary, SearchHit, Tag } from '../shared/models';
import { toast } from './toastStore';

export type View = 'folder' | 'favorites' | 'trash' | 'tag' | 'search';
export type AppMode = 'notes' | 'boards' | 'ai';

interface AppState {
  foldersTree: FolderNode[];
  notes: NoteSummary[];
  tags: Tag[];
  trashedFolders: Folder[];
  trashedTags: Tag[];
  selectedFolderId: number | null;
  selectedTagId: number | null;
  view: View;
  activeNoteId: number | null;
  collapsedFolders: Set<number>;
  searchQuery: string;
  searchHits: SearchHit[];
  searching: boolean;
  settingsOpen: boolean;
  paletteOpen: boolean;
  findInNoteOpen: boolean;
  findInNoteQuery: string;
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark'; // tema efectivo aplicado (resuelve 'system')
  fontScale: number; // editor: 0.85, 1, 1.15, 1.3
  appFont: string;   // family CSS para la UI, '' = predeterminada
  sidebarCollapsed: boolean;
  notesPaneCollapsed: boolean;
  foldersSectionCollapsed: boolean;
  tagsSectionCollapsed: boolean;

  // Modo de la app: notas (clásico) o pizarras.
  mode: AppMode;
  boards: BoardSummary[];
  activeBoardId: number | null;

  init: () => Promise<void>;
  loadFolders: () => Promise<void>;
  loadTags: () => Promise<void>;
  loadNotes: () => Promise<void>;
  loadTrash: () => Promise<void>;
  selectFolder: (id: number | null) => Promise<void>;
  selectTag: (id: number) => Promise<void>;
  setView: (view: Exclude<View, 'tag' | 'search'>) => Promise<void>;
  toggleFolderCollapsed: (id: number) => void;
  createFolder: (name: string, parentId?: number | null, color?: string | null) => Promise<void>;
  renameFolder: (id: number, name: string, color?: string | null) => Promise<void>;
  trashFolder: (id: number, name: string) => Promise<void>;
  restoreFolder: (folderIds: number[], noteIds?: number[]) => Promise<void>;
  purgeFolder: (id: number) => Promise<void>;
  createTag: (name: string, color?: string | null, icon?: string | null) => Promise<void>;
  renameTag: (id: number, name: string, color?: string | null, icon?: string | null) => Promise<void>;
  trashTag: (id: number, name: string) => Promise<void>;
  restoreTag: (id: number) => Promise<void>;
  purgeTag: (id: number) => Promise<void>;
  createNote: () => Promise<void>;
  trashNote: (id: number, title: string) => Promise<void>;
  restoreNote: (id: number) => Promise<void>;
  purgeNote: (id: number) => Promise<void>;
  setFavorite: (id: number, fav: boolean) => Promise<void>;
  renameNote: (id: number, title: string) => Promise<void>;
  setActiveNote: (id: number | null) => void;
  runSearch: (q: string) => Promise<void>;
  clearSearch: () => void;
  openSettings: (open: boolean) => void;
  openPalette: (open: boolean) => void;
  openFindInNote: (open: boolean) => void;
  setFindInNoteQuery: (q: string) => void;
  focusGlobalSearch: () => void;
  setTheme: (t: 'light' | 'dark' | 'system') => void;
  setFontScale: (s: number) => void;
  setAppFont: (f: string) => void;
  toggleSidebar: () => void;
  toggleNotesPane: () => void;
  toggleFoldersSection: () => void;
  toggleTagsSection: () => void;

  setMode: (m: AppMode) => void;
  loadBoards: () => Promise<void>;
  setBoardFavorite: (id: number, fav: boolean) => Promise<void>;
  setActiveBoard: (id: number | null) => void;
  createBoard: (name?: string) => Promise<void>;
  startNewChat: () => void;
  moveNoteToFolder: (noteId: number, folderId: number | null) => Promise<void>;
  renameBoard: (id: number, name: string, color?: string | null) => Promise<void>;
  trashBoard: (id: number, name: string) => Promise<void>;
}

const THEME_KEY = 'theme';
const FONT_SCALE_KEY = 'fontScale';
const APP_FONT_KEY = 'appFont';
const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';
const NOTES_COLLAPSED_KEY = 'notesCollapsed';
const FOLDERS_SEC_KEY = 'foldersSectionCollapsed';
const TAGS_SEC_KEY = 'tagsSectionCollapsed';
const LAST_MODE_KEY = 'lastMode';
const LAST_NOTE_KEY = 'lastNoteId';
const LAST_BOARD_KEY = 'lastBoardId';

export const useStore = create<AppState>((set, get) => ({
  foldersTree: [],
  notes: [],
  tags: [],
  trashedFolders: [],
  trashedTags: [],
  selectedFolderId: null,
  selectedTagId: null,
  view: 'folder',
  activeNoteId: null,
  collapsedFolders: new Set<number>(),
  searchQuery: '',
  searchHits: [],
  searching: false,
  settingsOpen: false,
  paletteOpen: false,
  findInNoteOpen: false,
  findInNoteQuery: '',
  theme: 'light',
  resolvedTheme: 'light',
  fontScale: 1,
  appFont: '',
  sidebarCollapsed: false,
  notesPaneCollapsed: false,
  foldersSectionCollapsed: false,
  tagsSectionCollapsed: false,

  mode: 'notes',
  boards: [],
  activeBoardId: null,

  init: async () => {
    const settings = await ipc(Channels.settingsGetAll);
    const raw = settings[THEME_KEY];
    const theme: 'light' | 'dark' | 'system' = raw === 'dark' ? 'dark' : raw === 'system' ? 'system' : 'light';
    const fontScale = Number(settings[FONT_SCALE_KEY]) || 1;
    const appFont = settings[APP_FONT_KEY] ?? '';
    const sidebarCollapsed = settings[SIDEBAR_COLLAPSED_KEY] === '1';
    const notesPaneCollapsed = settings[NOTES_COLLAPSED_KEY] === '1';
    const foldersSectionCollapsed = settings[FOLDERS_SEC_KEY] === '1';
    const tagsSectionCollapsed = settings[TAGS_SEC_KEY] === '1';
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolvedTheme: 'light' | 'dark' = theme === 'system' ? (sysDark ? 'dark' : 'light') : theme;
    set({ theme, resolvedTheme, fontScale, appFont, sidebarCollapsed, notesPaneCollapsed, foldersSectionCollapsed, tagsSectionCollapsed });
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.setProperty('--editor-scale', String(fontScale));
    if (appFont) document.documentElement.style.setProperty('--font-ui', appFont);

    // Si el usuario eligió "system", reaccionamos a cambios del SO.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (get().theme !== 'system') return;
      const rt: 'light' | 'dark' = mq.matches ? 'dark' : 'light';
      set({ resolvedTheme: rt });
      document.documentElement.dataset.theme = rt;
    };
    mq.addEventListener('change', onChange);

    // Modo previo (notas / pizarras / ai)
    const lastModeRaw = settings[LAST_MODE_KEY];
    const lastMode: 'notes' | 'boards' | 'ai' =
      lastModeRaw === 'boards' ? 'boards' : lastModeRaw === 'ai' ? 'ai' : 'notes';
    set({ mode: lastMode });

    await get().loadFolders();
    await get().loadTags();
    if (lastMode === 'boards') await get().loadBoards();
    else if (lastMode !== 'ai') await get().loadNotes();

    // Reabrir la última nota / pizarra activa.
    const lastNoteId = Number(settings[LAST_NOTE_KEY]);
    const lastBoardId = Number(settings[LAST_BOARD_KEY]);
    if (lastMode === 'notes' && lastNoteId && get().notes.some((n) => n.id === lastNoteId)) {
      set({ activeNoteId: lastNoteId });
    } else if (lastMode === 'boards' && lastBoardId && get().boards.some((b) => b.id === lastBoardId)) {
      set({ activeBoardId: lastBoardId });
    }
  },

  loadFolders: async () => {
    const m = get().mode;
    const kind = m === 'boards' ? 'boards' : m === 'ai' ? 'chats' : 'notes';
    set({ foldersTree: await ipc(Channels.folderTree, { kind }) });
  },
  loadTags: async () => set({ tags: await ipc(Channels.tagList) }),

  loadNotes: async () => {
    const { selectedFolderId, view, selectedTagId } = get();
    let res: NoteSummary[] = [];
    if (view === 'favorites') res = await ipc(Channels.noteList, { favoritesOnly: true });
    else if (view === 'trash') res = await ipc(Channels.noteList, { trashed: true });
    else if (view === 'tag' && selectedTagId != null) res = await ipc(Channels.noteList, { tagId: selectedTagId });
    else res = await ipc(Channels.noteList, selectedFolderId != null ? { folderId: selectedFolderId } : {});
    set({ notes: res });
  },

  loadTrash: async () => {
    const [folders, tags] = await Promise.all([
      ipc(Channels.folderListTrashed),
      ipc(Channels.tagListTrashed),
    ]);
    set({ trashedFolders: folders, trashedTags: tags });
  },

  selectFolder: async (id) => {
    set({ selectedFolderId: id, selectedTagId: null, view: 'folder', activeNoteId: null });
    // En modo IA, las carpetas filtran conversaciones; AiPage reacciona al
    // cambio de selectedFolderId. No hace falta cargar notas.
    if (get().mode === 'ai') return;
    await get().loadNotes();
  },

  selectTag: async (id) => {
    set({ selectedTagId: id, selectedFolderId: null, view: 'tag', activeNoteId: null });
    await get().loadNotes();
  },

  setView: async (view) => {
    set({ view, selectedFolderId: null, selectedTagId: null, activeNoteId: null });
    if (view === 'trash') await get().loadTrash();
    // Cada modo recarga su propia lista. Las conversaciones se recargan solas
    // en AiConversationsList, que ya observa los cambios de vista.
    if (get().mode === 'boards') await get().loadBoards();
    else await get().loadNotes();
  },

  toggleFolderCollapsed: (id) => {
    const next = new Set(get().collapsedFolders);
    if (next.has(id)) next.delete(id); else next.add(id);
    set({ collapsedFolders: next });
  },

  createFolder: async (name, parentId = null, color = null) => {
    const pastels = ['lavanda', 'cielo', 'menta', 'durazno', 'lima', 'agua', 'malva'];
    const finalColor = color ?? pastels[get().foldersTree.length % pastels.length];
    const m = get().mode;
    const kind = m === 'boards' ? 'boards' : m === 'ai' ? 'chats' : 'notes';
    await ipc(Channels.folderCreate, { name, parentId, color: finalColor, kind });
    await get().loadFolders();
  },

  renameFolder: async (id, name, color) => {
    await ipc(Channels.folderRename, { id, name, color });
    await get().loadFolders();
  },

  trashFolder: async (id, name) => {
    const { trashedFolderIds, trashedNoteIds } = await ipc(Channels.folderTrash, { id });
    if (get().selectedFolderId === id) set({ selectedFolderId: null, view: 'folder' });
    await Promise.all([get().loadFolders(), get().loadNotes()]);
    toast({
      title: `Carpeta movida a la papelera`,
      description: name,
      actions: [{
        label: 'Deshacer', primary: true,
        onClick: () => void get().restoreFolder(trashedFolderIds, trashedNoteIds),
      }],
    });
  },

  restoreFolder: async (folderIds, noteIds = []) => {
    await ipc(Channels.folderRestore, { folderIds, noteIds });
    await Promise.all([get().loadFolders(), get().loadNotes()]);
    if (get().view === 'trash') await get().loadTrash();
  },

  purgeFolder: async (id) => {
    await ipc(Channels.folderPurge, { id });
    await get().loadTrash();
  },

  createTag: async (name, color, icon) => {
    const pastels = ['rosa', 'menta', 'cielo', 'durazno', 'lima', 'agua', 'lavanda', 'coral'];
    const c = color ?? pastels[get().tags.length % pastels.length];
    await ipc(Channels.tagCreate, { name, color: c, icon: icon ?? 'hash' });
    await get().loadTags();
  },

  renameTag: async (id, name, color, icon) => {
    await ipc(Channels.tagRename, { id, name, color, icon });
    await get().loadTags();
  },

  trashTag: async (id, name) => {
    await ipc(Channels.tagTrash, { id });
    if (get().selectedTagId === id) set({ selectedTagId: null, view: 'folder' });
    await Promise.all([get().loadTags(), get().loadNotes()]);
    toast({
      title: `Etiqueta movida a la papelera`,
      description: name,
      actions: [{ label: 'Deshacer', primary: true, onClick: () => void get().restoreTag(id) }],
    });
  },

  restoreTag: async (id) => {
    await ipc(Channels.tagRestore, { id });
    await get().loadTags();
    if (get().view === 'trash') await get().loadTrash();
  },

  purgeTag: async (id) => {
    await ipc(Channels.tagPurge, { id });
    await get().loadTrash();
  },

  createNote: async () => {
    const folderId = get().view === 'folder' ? get().selectedFolderId ?? null : null;
    const note = await ipc(Channels.noteCreate, { folderId, title: 'Nueva nota' });
    await get().loadNotes();
    set({ activeNoteId: note.id });
  },

  trashNote: async (id, title) => {
    await ipc(Channels.noteTrash, { id });
    if (get().activeNoteId === id) set({ activeNoteId: null });
    await get().loadNotes();
    toast({
      title: `Nota movida a la papelera`,
      description: title || 'Sin título',
      actions: [{ label: 'Deshacer', primary: true, onClick: () => void get().restoreNote(id) }],
    });
  },

  restoreNote: async (id) => {
    await ipc(Channels.noteRestore, { id });
    // El backend también puede haber restaurado carpetas ancestro que estaban
    // en la papelera, así que recargamos también el árbol y la papelera.
    await Promise.all([get().loadFolders(), get().loadNotes()]);
    if (get().view === 'trash') await get().loadTrash();
  },

  purgeNote: async (id) => {
    await ipc(Channels.notePurge, { id });
    if (get().activeNoteId === id) set({ activeNoteId: null });
    await get().loadNotes();
  },

  setFavorite: async (id, fav) => {
    await ipc(Channels.noteSetFavorite, { id, favorite: fav });
    await get().loadNotes();
  },

  renameNote: async (id, title) => {
    await ipc(Channels.noteRename, { id, title });
    await get().loadNotes();
  },

  setActiveNote: (id) => {
    set({ activeNoteId: id });
    if (id != null) void ipc(Channels.settingsSet, { key: LAST_NOTE_KEY, value: String(id) });
  },

  runSearch: async (q) => {
    const query = q.trim();
    if (!query) { get().clearSearch(); return; }
    set({ searchQuery: q, searching: true, view: 'search', activeNoteId: null });
    try {
      // Búsqueda SIEMPRE incluye la papelera; cada resultado dice si está trasheado.
      const hits = await ipc(Channels.search, { q: query, limit: 80, includeTrashed: true });
      set({ searchHits: hits });
    } finally {
      set({ searching: false });
    }
  },

  clearSearch: () => {
    set({ searchQuery: '', searchHits: [], searching: false });
    if (get().view === 'search') {
      set({ view: 'folder' });
      void get().loadNotes();
    }
  },

  openSettings: (open) => set({ settingsOpen: open }),
  openPalette: (open) => set({ paletteOpen: open }),
  openFindInNote: (open) => set({ findInNoteOpen: open, findInNoteQuery: open ? get().findInNoteQuery : '' }),
  setFindInNoteQuery: (q) => set({ findInNoteQuery: q }),

  focusGlobalSearch: () => {
    // Llevamos al usuario a "Todas las notas" y le damos foco al input de la sidebar.
    set({ selectedFolderId: null, selectedTagId: null, view: 'folder', activeNoteId: null, settingsOpen: false });
    void get().loadNotes();
    setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>('input[data-mw-search]');
      el?.focus();
      el?.select();
    }, 30);
  },

  setTheme: (t) => {
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const rt: 'light' | 'dark' = t === 'system' ? (sysDark ? 'dark' : 'light') : t;
    set({ theme: t, resolvedTheme: rt });
    document.documentElement.dataset.theme = rt;
    void ipc(Channels.settingsSet, { key: THEME_KEY, value: t });
  },

  setFontScale: (s) => {
    set({ fontScale: s });
    document.documentElement.style.setProperty('--editor-scale', String(s));
    void ipc(Channels.settingsSet, { key: FONT_SCALE_KEY, value: String(s) });
  },

  setAppFont: (f) => {
    set({ appFont: f });
    if (f) document.documentElement.style.setProperty('--font-ui', f);
    else document.documentElement.style.removeProperty('--font-ui');
    void ipc(Channels.settingsSet, { key: APP_FONT_KEY, value: f });
  },

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    set({ sidebarCollapsed: next });
    void ipc(Channels.settingsSet, { key: SIDEBAR_COLLAPSED_KEY, value: next ? '1' : '0' });
  },

  toggleNotesPane: () => {
    const next = !get().notesPaneCollapsed;
    set({ notesPaneCollapsed: next });
    void ipc(Channels.settingsSet, { key: NOTES_COLLAPSED_KEY, value: next ? '1' : '0' });
  },

  toggleFoldersSection: () => {
    const next = !get().foldersSectionCollapsed;
    set({ foldersSectionCollapsed: next });
    void ipc(Channels.settingsSet, { key: FOLDERS_SEC_KEY, value: next ? '1' : '0' });
  },

  toggleTagsSection: () => {
    const next = !get().tagsSectionCollapsed;
    set({ tagsSectionCollapsed: next });
    void ipc(Channels.settingsSet, { key: TAGS_SEC_KEY, value: next ? '1' : '0' });
  },

  setMode: (m) => {
    set({ mode: m, activeNoteId: null, activeBoardId: null, selectedFolderId: null });
    void ipc(Channels.settingsSet, { key: LAST_MODE_KEY, value: m });
    // Cada modo tiene su propio árbol de carpetas; recargamos al cambiar.
    // El modo IA usa carpetas con kind='chats' para agrupar conversaciones.
    void get().loadFolders();
    if (m === 'boards') void get().loadBoards();
    else if (m !== 'ai') void get().loadNotes();
  },

  loadBoards: async () => {
    const { selectedFolderId, view } = get();
    if (view === 'favorites') {
      set({ boards: await ipc(Channels.boardListFavorites) });
      return;
    }
    const req = selectedFolderId != null ? { folderId: selectedFolderId } : {};
    set({ boards: await ipc(Channels.boardList, req) });
  },

  setBoardFavorite: async (id, fav) => {
    await ipc(Channels.boardSetFavorite, { id, favorite: fav });
    await get().loadBoards();
  },

  setActiveBoard: (id) => {
    set({ activeBoardId: id });
    if (id != null) void ipc(Channels.settingsSet, { key: LAST_BOARD_KEY, value: String(id) });
  },

  createBoard: async (name) => {
    const folderId = get().selectedFolderId ?? null;
    const finalName = name && name.trim() ? name : 'Nueva pizarra';
    const b = await ipc(Channels.boardCreate, { name: finalName, folderId, color: 'lavanda' });
    await get().loadBoards();
    set({ activeBoardId: b.id });
  },

  startNewChat: () => {
    // El store de IA gestiona el chat; importamos perezosamente para evitar ciclos.
    void import('./ai/aiStore').then(({ useAi }) => {
      useAi.getState().setGeneralConversation(null, []);
    });
  },

  moveNoteToFolder: async (noteId, folderId) => {
    await ipc(Channels.noteMove, { id: noteId, folderId });
    await get().loadNotes();
    toast({ title: 'Nota movida', description: folderId == null ? 'A la raíz' : 'A la carpeta seleccionada' });
  },

  renameBoard: async (id, name, color) => {
    await ipc(Channels.boardRename, { id, name, color });
    await get().loadBoards();
  },

  trashBoard: async (id, name) => {
    await ipc(Channels.boardTrash, { id });
    if (get().activeBoardId === id) set({ activeBoardId: null });
    await get().loadBoards();
    toast({
      title: 'Pizarra movida a la papelera',
      description: name,
      actions: [{
        label: 'Deshacer', primary: true,
        onClick: async () => { await ipc(Channels.boardRestore, { id }); await get().loadBoards(); },
      }],
    });
  },
}));
