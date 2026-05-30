import { z } from 'zod';
import { Channels } from './ipc';

const noteType = z.enum(['document', 'canvas', 'wall', 'list']);

const folderCreate = z.object({
  name: z.string().min(1).max(200),
  parentId: z.number().int().nullable().optional(),
  color: z.string().max(40).nullable().optional(),
});
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

// Esquema zod por canal (los que reciben payload). Se valida en la frontera IPC.
export const validators: Partial<Record<string, z.ZodTypeAny>> = {
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
  [Channels.tagCreate]: tagCreate,
  [Channels.tagRename]: tagRename,
  [Channels.tagTrash]: idReq,
  [Channels.tagRestore]: idReq,
  [Channels.tagPurge]: idReq,
  [Channels.noteTags]: noteIdReq,
  [Channels.noteSetTags]: noteSetTags,
  [Channels.search]: searchReq,
  [Channels.settingsSet]: settingSet,
};
