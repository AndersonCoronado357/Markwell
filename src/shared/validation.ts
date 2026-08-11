import { z } from 'zod';
import { Channels } from './ipc';

const noteType = z.enum(['document', 'canvas', 'wall', 'list']);

const folderCreate = z.object({
  name: z.string().min(1).max(200),
  parentId: z.number().int().nullable().optional(),
  color: z.string().max(40).nullable().optional(),
  kind: z.enum(['notes', 'boards', 'chats']).optional(),
});
const folderTreeReq = z.object({ kind: z.enum(['notes', 'boards', 'chats']).optional() }).default({});
const folderRename = z.object({
  id: z.number().int(),
  name: z.string().min(1).max(200),
  color: z.string().max(40).nullable().optional(),
});
const idReq = z.object({ id: z.number().int() });
const noteList = z
  .object({
    folderId: z.number().int().nullable().optional(),
    favoritesOnly: z.boolean().optional(),
    trashed: z.boolean().optional(),
    tagId: z.number().int().optional(),
  })
  .default({});
const noteCreate = z
  .object({
    folderId: z.number().int().nullable().optional(),
    title: z.string().max(500).optional(),
    type: noteType.optional(),
  })
  .default({});
const noteSave = z.object({
  id: z.number().int(),
  title: z.string().max(500),
  contentJson: z.unknown(),
  plaintext: z.string(),
});
const noteRename = z.object({ id: z.number().int(), title: z.string().max(500) });
const noteFavorite = z.object({ id: z.number().int(), favorite: z.boolean() });

const tagCreate = z.object({
  name: z.string().min(1).max(80),
  color: z.string().max(40).nullable().optional(),
  icon: z.string().max(40).nullable().optional(),
});
const tagRename = z.object({
  id: z.number().int(),
  name: z.string().min(1).max(80).optional(),
  color: z.string().max(40).nullable().optional(),
  icon: z.string().max(40).nullable().optional(),
});
const noteIdReq = z.object({ noteId: z.number().int() });
const noteSetTags = z.object({ noteId: z.number().int(), tagIds: z.array(z.number().int()) });

const searchReq = z.object({
  q: z.string().max(500),
  limit: z.number().int().min(1).max(200).optional(),
  includeTrashed: z.boolean().optional(),
});

const settingSet = z.object({ key: z.string().min(1).max(120), value: z.string().max(4000) });

const templateCreate = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  contentJson: z.unknown(),
});
const templateUpdate = z.object({
  id: z.number().int(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  contentJson: z.unknown().optional(),
});
const noteFromTemplate = z.object({
  templateId: z.number().int(),
  folderId: z.number().int().nullable().optional(),
});

const boardList = z.object({ folderId: z.number().int().nullable().optional() }).default({});
const boardCreate = z.object({
  name: z.string().min(1).max(200),
  folderId: z.number().int().nullable().optional(),
  color: z.string().max(40).nullable().optional(),
});
const boardRename = z.object({
  id: z.number().int(),
  name: z.string().min(1).max(200),
  color: z.string().max(40).nullable().optional(),
});
const itemCreate = z.object({
  boardId: z.number().int(),
  type: z.literal('sticky').optional(),
  text: z.string().max(20_000),
  x: z.number(), y: z.number(),
  w: z.number().optional(), h: z.number().optional(),
  color: z.string().max(40).nullable().optional(),
});
const itemUpdate = z.object({
  id: z.number().int(),
  text: z.string().max(20_000).optional(),
  x: z.number().optional(), y: z.number().optional(),
  w: z.number().optional(), h: z.number().optional(),
  color: z.string().max(40).nullable().optional(),
});
const boardFromNote = z.object({ noteId: z.number().int() });
const connCreate = z.object({
  boardId: z.number().int(),
  fromId: z.number().int(),
  toId: z.number().int(),
  color: z.string().max(40).nullable().optional(),
});

const noteMove = z.object({ id: z.number().int(), folderId: z.number().int().nullable() });

const aiSetKey = z.object({ key: z.string().min(10).max(500) });
const aiSetModel = z.object({ model: z.string().min(2).max(200) });
const aiGenerate = z.object({
  prompt: z.string().max(200_000),
  system: z.string().max(20_000).optional(),
  maxTokens: z.number().int().min(1).max(65536).optional(),
});
const aiChat = z.object({
  requestId: z.string().min(1).max(120),
  messages: z.array(z.object({ role: z.enum(['user', 'model']), text: z.string().max(50_000) })).max(40),
  system: z.string().max(20_000).optional(),
});

const semanticSearch = z.object({ query: z.string().min(1).max(2000), limit: z.number().int().min(1).max(50).optional() });

const aiConvCreate = z.object({
  title: z.string().max(200).optional(),
  folderId: z.number().int().nullable().optional(),
}).default({});
const aiConvList = z.object({ folderId: z.number().int().nullable().optional() }).default({});
const aiConvMove = z.object({ id: z.number().int(), folderId: z.number().int().nullable() });
const aiConvRename = z.object({ id: z.number().int(), title: z.string().min(1).max(200) });
const aiConvAppend = z.object({
  conversationId: z.number().int(),
  role: z.enum(['user', 'model']),
  text: z.string().max(50_000),
});

// Esquema zod por canal (los que reciben payload). Se valida en la frontera IPC.
export const validators: Partial<Record<string, z.ZodTypeAny>> = {
  [Channels.folderTree]: folderTreeReq,
  [Channels.folderCreate]: folderCreate,
  [Channels.folderRename]: folderRename,
  [Channels.folderTrash]: idReq,
  [Channels.folderRestore]: z.object({
    folderIds: z.array(z.number().int()),
    noteIds: z.array(z.number().int()).optional(),
  }),
  [Channels.folderPurge]: idReq,
  [Channels.notesInFolder]: z.object({ folderId: z.number().int(), trashed: z.boolean().optional() }),
  [Channels.noteList]: noteList,
  [Channels.noteGet]: idReq,
  [Channels.noteCreate]: noteCreate,
  [Channels.noteSave]: noteSave,
  [Channels.noteRename]: noteRename,
  [Channels.noteTrash]: idReq,
  [Channels.noteRestore]: idReq,
  [Channels.notePurge]: idReq,
  [Channels.noteSetFavorite]: noteFavorite,
  [Channels.noteMove]: noteMove,
  [Channels.tagCreate]: tagCreate,
  [Channels.tagRename]: tagRename,
  [Channels.tagTrash]: idReq,
  [Channels.tagRestore]: idReq,
  [Channels.tagPurge]: idReq,
  [Channels.noteTags]: noteIdReq,
  [Channels.noteSetTags]: noteSetTags,
  [Channels.search]: searchReq,
  [Channels.settingsSet]: settingSet,
  [Channels.noteExport]: z.object({
    id: z.number().int(),
    format: z.enum(['md', 'html', 'pdf']),
  }),

  [Channels.templateCreate]: templateCreate,
  [Channels.templateUpdate]: templateUpdate,
  [Channels.templateDelete]: idReq,
  [Channels.noteFromTemplate]: noteFromTemplate,

  [Channels.boardList]: boardList,
  [Channels.boardGet]: idReq,
  [Channels.boardCreate]: boardCreate,
  [Channels.boardRename]: boardRename,
  [Channels.boardTrash]: idReq,
  [Channels.boardRestore]: idReq,
  [Channels.boardPurge]: idReq,
  [Channels.boardFromNote]: boardFromNote,
  [Channels.itemCreate]: itemCreate,
  [Channels.itemUpdate]: itemUpdate,
  [Channels.itemDelete]: idReq,
  [Channels.connCreate]: connCreate,
  [Channels.connDelete]: idReq,

  [Channels.aiSetKey]: aiSetKey,
  [Channels.aiSetModel]: aiSetModel,
  [Channels.aiGenerate]: aiGenerate,
  [Channels.aiChat]: aiChat,

  [Channels.aiConvCreate]: aiConvCreate,
  [Channels.semanticSearch]: semanticSearch,
  [Channels.aiConvList]: aiConvList,
  [Channels.aiConvMove]: aiConvMove,
  [Channels.aiConvRename]: aiConvRename,
  [Channels.aiConvDelete]: idReq,
  [Channels.aiConvGet]: idReq,
  [Channels.aiConvAppend]: aiConvAppend,
};
