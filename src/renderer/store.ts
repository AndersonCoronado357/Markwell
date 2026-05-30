import { create } from 'zustand';
import { ipc } from './ipc';
import { Channels } from '../shared/ipc';
import type { Folder, FolderNode, NoteSummary, SearchHit, Tag } from '../shared/models';
import { toast } from './toastStore';

export type View = 'folder' | 'favorites' | 'trash' | 'tag' | 'search';

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
  theme: 'light' | 'dark';
  fontScale: number; // editor: 0.85, 1, 1.15, 1.3
  appFont: string;   // family CSS para la UI, '' = predeterminada
  sidebarCollapsed: boolean;
  notesPaneCollapsed: boolean;
  foldersSectionCollapsed: boolean;
  tagsSectionCollapsed: boolean;

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
  setTheme: (t: 'light' | 'dark') => void;
  setFontScale: (s: number) => void;
  setAppFont: (f: string) => void;
  toggleSidebar: () => void;
  toggleNotesPane: () => void;
  toggleFoldersSection: () => void;
  toggleTagsSection: () => void;
}

const THEME_KEY = 'theme';
const FONT_SCALE_KEY = 'fontScale';
const APP_FONT_KEY = 'appFont';
const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';
const NOTES_COLLAPSED_KEY = 'notesCollapsed';
const FOLDERS_SEC_KEY = 'foldersSectionCollapsed';
const TAGS_SEC_KEY = 'tagsSectionCollapsed';

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
  theme: 'light',
  fontScale: 1,
  appFont: '',
  sidebarCollapsed: false,
  notesPaneCollapsed: false,
  foldersSectionCollapsed: false,
  tagsSectionCollapsed: false,

  init: async () => {
    const settings = await ipc(Channels.settingsGetAll);
    const theme = settings[THEME_KEY] === 'dark' ? 'dark' : 'light';
    const fontScale = Number(settings[FONT_SCALE_KEY]) || 1;
    const appFont = settings[APP_FONT_KEY] ?? '';
    const sidebarCollapsed = settings[SIDEBAR_COLLAPSED_KEY] === '1';
    const notesPaneCollapsed = settings[NOTES_COLLAPSED_KEY] === '1';
    const foldersSectionCollapsed = settings[FOLDERS_SEC_KEY] === '1';
    const tagsSectionCollapsed = settings[TAGS_SEC_KEY] === '1';
    set({ theme, fontScale, appFont, sidebarCollapsed, notesPaneCollapsed, foldersSectionCollapsed, tagsSectionCollapsed });
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty('--editor-scale', String(fontScale));
    document.documentElement.style.setProperty('--font-ui-override', appFont || 'inherit');
    if (appFont) document.documentElement.style.setProperty('--font-ui', appFont);
    await get().loadFolders();
    await get().loadTags();
    await get().loadNotes();
  },

  loadFolders: async () => set({ foldersTree: await ipc(Channels.folderTree) }),
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
    await get().loadNotes();
  },

  selectTag: async (id) => {
    set({ selectedTagId: id, selectedFolderId: null, view: 'tag', activeNoteId: null });
    await get().loadNotes();
  },

  setView: async (view) => {
    set({ view, selectedFolderId: null, selectedTagId: null, activeNoteId: null });
    if (view === 'trash') await get().loadTrash();
    await get().loadNotes();
  },

  toggleFolderCollapsed: (id) => {
    const next = new Set(get().collapsedFolders);
    if (next.has(id)) next.delete(id); else next.add(id);
    set({ collapsedFolders: next });
  },

  createFolder: async (name, parentId = null, color = null) => {
    const pastels = ['lavanda', 'cielo', 'menta', 'durazno', 'lima', 'agua', 'malva'];
    const finalColor = color ?? pastels[get().foldersTree.length % pastels.length];
    await ipc(Channels.folderCreate, { name, parentId, color: finalColor });
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

  setActiveNote: (id) => set({ activeNoteId: id }),

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

  setTheme: (t) => {
    set({ theme: t });
    document.documentElement.dataset.theme = t;
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
}));
