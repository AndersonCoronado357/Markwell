// Contrato IPC: nombres de canal + formas request/response. Una sola fuente de
// verdad compartida por preload, renderer y main.
import type { BackupInfo, Folder, FolderNode, Note, NoteSummary, NoteType, SearchHit, Tag } from './models';

export const Channels = {
  appHealth: 'app:health',

  folderTree: 'folders:tree',
  folderCreate: 'folders:create',
  folderRename: 'folders:rename',
  folderTrash: 'folders:trash',
  folderRestore: 'folders:restore',
  folderPurge: 'folders:purge',
  folderListTrashed: 'folders:listTrashed',
  notesInFolder: 'notes:inFolder',

  noteList: 'notes:list',
  noteGet: 'notes:get',
  noteCreate: 'notes:create',
  noteSave: 'notes:save',
  noteRename: 'notes:rename',
  noteTrash: 'notes:trash',
  noteRestore: 'notes:restore',
  notePurge: 'notes:purge',
  noteSetFavorite: 'notes:setFavorite',

  tagList: 'tags:list',
  tagCreate: 'tags:create',
  tagRename: 'tags:rename',
  tagTrash: 'tags:trash',
  tagRestore: 'tags:restore',
  tagPurge: 'tags:purge',
  tagListTrashed: 'tags:listTrashed',
  noteTags: 'tags:forNote',
  noteSetTags: 'tags:setForNote',

  search: 'search:query',

  settingsGetAll: 'settings:getAll',
  settingsSet: 'settings:set',

  backupCreate: 'backup:create',
  backupList: 'backup:list',
} as const;

export interface HealthInfo {
  app: string;
  electron: string;
  node: string;
  chrome: string;
  sqlite?: string;
  vec?: string;
  notes?: number;
  folders?: number;
}

export interface IpcApi {
  [Channels.appHealth]: { req: void; res: HealthInfo };

  [Channels.folderTree]: { req: void; res: FolderNode[] };
  [Channels.folderCreate]: {
    req: { name: string; parentId?: number | null; color?: string | null };
    res: Folder;
  };
  [Channels.folderRename]: { req: { id: number; name: string; color?: string | null }; res: Folder };
  [Channels.folderTrash]: { req: { id: number }; res: { trashedFolderIds: number[]; trashedNoteIds: number[] } };
  [Channels.folderRestore]: { req: { folderIds: number[]; noteIds?: number[] }; res: { ok: true } };
  [Channels.folderPurge]: { req: { id: number }; res: { ok: true } };
  [Channels.folderListTrashed]: { req: void; res: Folder[] };
  [Channels.notesInFolder]: { req: { folderId: number; trashed?: boolean }; res: NoteSummary[] };

  [Channels.noteList]: {
    req: { folderId?: number | null; favoritesOnly?: boolean; trashed?: boolean; tagId?: number };
    res: NoteSummary[];
  };
  [Channels.noteGet]: { req: { id: number }; res: Note | null };
  [Channels.noteCreate]: {
    req: { folderId?: number | null; title?: string; type?: NoteType };
    res: Note;
  };
  [Channels.noteSave]: {
    req: { id: number; title: string; contentJson: unknown; plaintext: string };
    res: { id: number; updatedAt: string };
  };
  [Channels.noteRename]: { req: { id: number; title: string }; res: { id: number; updatedAt: string } };
  [Channels.noteTrash]: { req: { id: number }; res: { ok: true } };
  [Channels.noteRestore]: { req: { id: number }; res: { ok: true } };
  [Channels.notePurge]: { req: { id: number }; res: { ok: true } };
  [Channels.noteSetFavorite]: { req: { id: number; favorite: boolean }; res: { ok: true } };

  [Channels.tagList]: { req: void; res: Tag[] };
  [Channels.tagCreate]: { req: { name: string; color?: string | null; icon?: string | null }; res: Tag };
  [Channels.tagRename]: { req: { id: number; name?: string; color?: string | null; icon?: string | null }; res: Tag };
  [Channels.tagTrash]: { req: { id: number }; res: { ok: true } };
  [Channels.tagRestore]: { req: { id: number }; res: { ok: true } };
  [Channels.tagPurge]: { req: { id: number }; res: { ok: true } };
  [Channels.tagListTrashed]: { req: void; res: Tag[] };
  [Channels.noteTags]: { req: { noteId: number }; res: Tag[] };
  [Channels.noteSetTags]: { req: { noteId: number; tagIds: number[] }; res: Tag[] };

  [Channels.search]: { req: { q: string; limit?: number; includeTrashed?: boolean }; res: SearchHit[] };

  [Channels.settingsGetAll]: { req: void; res: Record<string, string> };
  [Channels.settingsSet]: { req: { key: string; value: string }; res: { ok: true } };

  [Channels.backupCreate]: { req: void; res: BackupInfo };
  [Channels.backupList]: { req: void; res: BackupInfo[] };
}

export type ChannelName = keyof IpcApi;
