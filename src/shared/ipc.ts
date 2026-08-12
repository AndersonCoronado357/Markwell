// Contrato IPC: nombres de canal + formas request/response. Una sola fuente de
// verdad compartida por preload, renderer y main.
import type { AiConversation, AiConvMessage, AiConvSummary, BackupInfo, Board, BoardConnection, BoardItem, BoardSummary, Folder, FolderNode, Note, NoteSummary, NoteType, SearchHit, Tag } from './models';

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
  noteMove: 'notes:move',

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

  noteExport: 'notes:export',

  updateStatus: 'update:status',
  updateCheck: 'update:check',
  updateInstall: 'update:install',

  backupCreate: 'backup:create',
  backupList: 'backup:list',
  backupRestore: 'backup:restore',


  boardList: 'boards:list',
  boardGet: 'boards:get',
  boardCreate: 'boards:create',
  boardRename: 'boards:rename',
  boardTrash: 'boards:trash',
  boardListTrashed: 'boards:listTrashed',
  boardRestore: 'boards:restore',
  boardPurge: 'boards:purge',
  boardFromNote: 'boards:fromNote',
  boardSetFavorite: 'boards:setFavorite',
  boardListFavorites: 'boards:listFavorites',
  itemCreate: 'boardItems:create',
  itemUpdate: 'boardItems:update',
  itemDelete: 'boardItems:delete',

  connCreate: 'boardConn:create',
  connDelete: 'boardConn:delete',

  aiStatus: 'ai:status',
  aiSetKey: 'ai:setKey',
  aiRemoveKey: 'ai:removeKey',
  aiSetModel: 'ai:setModel',
  aiGenerate: 'ai:generate',
  aiChat: 'ai:chat',

  semanticSearch: 'ai:semanticSearch',

  aiConvList: 'ai:convList',
  aiConvGet: 'ai:convGet',
  aiConvCreate: 'ai:convCreate',
  aiConvRename: 'ai:convRename',
  aiConvMove: 'ai:convMove',
  aiConvDelete: 'ai:convDelete',
  aiConvAppend: 'ai:convAppend',
  aiConvSetFavorite: 'ai:convSetFavorite',
  aiConvListFavorites: 'ai:convListFavorites',
} as const;

/** Estado del actualizador automático, tal como lo ve la interfaz. */
export interface UpdateStatus {
  /** `false` en desarrollo o si no hay servidor de publicación configurado. */
  supported: boolean;
  checking: boolean;
  /** Versión disponible en el servidor, si es mayor que la instalada. */
  available: string | null;
  /** Ya descargada y lista para instalarse al reiniciar. */
  downloaded: boolean;
  current: string;
  error: string | null;
}

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

  [Channels.folderTree]: { req: { kind?: 'notes' | 'boards' | 'chats' } | void; res: FolderNode[] };
  [Channels.folderCreate]: {
    req: { name: string; parentId?: number | null; color?: string | null; kind?: 'notes' | 'boards' | 'chats' };
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
  [Channels.noteMove]: { req: { id: number; folderId: number | null }; res: { ok: true } };

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

  [Channels.noteExport]: {
    req: { id: number; format: 'md' | 'html' | 'pdf' };
    res: { ok: boolean; path?: string; canceled?: boolean };
  };

  [Channels.updateStatus]: { req: void; res: UpdateStatus };
  [Channels.updateCheck]: { req: void; res: UpdateStatus };
  [Channels.updateInstall]: { req: void; res: { ok: boolean; reason?: string } };

  [Channels.backupCreate]: { req: void; res: BackupInfo };
  [Channels.backupList]: { req: void; res: BackupInfo[] };
  [Channels.backupRestore]: { req: string; res: void };


  [Channels.boardList]: { req: { folderId?: number | null }; res: BoardSummary[] };
  [Channels.boardGet]: { req: { id: number }; res: Board | null };
  [Channels.boardCreate]: { req: { name: string; folderId?: number | null; color?: string | null }; res: Board };
  [Channels.boardRename]: { req: { id: number; name: string; color?: string | null }; res: Board };
  [Channels.boardTrash]: { req: { id: number }; res: { ok: true } };
  [Channels.boardListTrashed]: { req: void; res: BoardSummary[] };
  [Channels.boardRestore]: { req: { id: number }; res: { ok: true } };
  [Channels.boardPurge]: { req: { id: number }; res: { ok: true } };
  [Channels.boardFromNote]: { req: { noteId: number }; res: Board };
  [Channels.boardSetFavorite]: { req: { id: number; favorite: boolean }; res: { ok: true } };
  [Channels.boardListFavorites]: { req: void; res: BoardSummary[] };
  [Channels.itemCreate]: {
    req: { boardId: number; type?: 'sticky'; text: string; x: number; y: number; w?: number; h?: number; color?: string | null };
    res: BoardItem;
  };
  [Channels.itemUpdate]: {
    req: { id: number; text?: string; x?: number; y?: number; w?: number; h?: number; color?: string | null };
    res: BoardItem;
  };
  [Channels.itemDelete]: { req: { id: number }; res: { ok: true } };

  [Channels.connCreate]: { req: { boardId: number; fromId: number; toId: number; color?: string | null }; res: BoardConnection };
  [Channels.connDelete]: { req: { id: number }; res: { ok: true } };

  [Channels.aiStatus]: { req: void; res: { configured: boolean; available: boolean; model: string } };
  [Channels.aiSetKey]: { req: { key: string }; res: { ok: true } };
  [Channels.aiRemoveKey]: { req: void; res: { ok: true } };
  [Channels.aiSetModel]: { req: { model: string }; res: { ok: true } };
  [Channels.aiGenerate]: { req: { prompt: string; system?: string; maxTokens?: number }; res: string };
  [Channels.aiChat]: { req: { requestId: string; messages: Array<{ role: 'user' | 'model'; text: string }>; system?: string }; res: { ok: true } };

  [Channels.semanticSearch]: { req: { query: string; limit?: number }; res: Array<{ noteId: number; idx: number; text: string; distance: number }> };

  [Channels.aiConvList]: { req: { folderId?: number | null } | void; res: AiConvSummary[] };
  [Channels.aiConvGet]: { req: { id: number }; res: AiConversation | null };
  [Channels.aiConvCreate]: { req: { title?: string; folderId?: number | null }; res: AiConversation };
  [Channels.aiConvRename]: { req: { id: number; title: string }; res: AiConvSummary };
  [Channels.aiConvMove]: { req: { id: number; folderId: number | null }; res: AiConvSummary };
  [Channels.aiConvDelete]: { req: { id: number }; res: { ok: true } };
  [Channels.aiConvAppend]: { req: { conversationId: number; role: 'user' | 'model'; text: string }; res: AiConvMessage };
  [Channels.aiConvSetFavorite]: { req: { id: number; favorite: boolean }; res: AiConvSummary };
  [Channels.aiConvListFavorites]: { req: void; res: AiConvSummary[] };
}

export type ChannelName = keyof IpcApi;
