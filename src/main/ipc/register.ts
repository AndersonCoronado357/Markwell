import { app, ipcMain } from 'electron';
import type { Container } from '../db/container';
import { Channels, type HealthInfo, type IpcApi } from '../../shared/ipc';
import { validators } from '../../shared/validation';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Registra todos los handlers IPC. Valida el payload con zod en la frontera. */
export function registerIpc(c: Container): void {
  const handle = <K extends keyof IpcApi>(
    channel: K,
    fn: (req: IpcApi[K]['req']) => IpcApi[K]['res'] | Promise<IpcApi[K]['res']>,
  ): void => {
    ipcMain.handle(channel as string, async (_e, raw) => {
      const schema = validators[channel as string];
      const req = schema ? schema.parse(raw) : raw;
      return fn(req as IpcApi[K]['req']);
    });
  };

  ipcMain.handle(Channels.appHealth, (): HealthInfo => {
    const sqlite = (c.db.prepare('SELECT sqlite_version() AS v').get() as any).v;
    let vec: string | undefined;
    try {
      vec = (c.db.prepare('SELECT vec_version() AS v').get() as any).v;
    } catch {
      vec = undefined;
    }
    return {
      app: app.getVersion(),
      electron: process.versions.electron,
      node: process.versions.node,
      chrome: process.versions.chrome,
      sqlite,
      vec,
      notes: c.notes.countLive(),
      folders: c.folders.count(),
    };
  });

  // Carpetas
  handle(Channels.folderTree, () => c.folders.tree());
  handle(Channels.folderCreate, (r) => c.folders.create(r));
  handle(Channels.folderRename, (r) => c.folders.rename(r.id, r.name, r.color));
  handle(Channels.folderTrash, (r) => c.folders.trash(r.id));
  handle(Channels.folderRestore, (r) => {
    c.folders.restore(r.folderIds, r.noteIds ?? []);
    return { ok: true as const };
  });
  handle(Channels.notesInFolder, (r) => c.notes.listInFolder(r.folderId, { trashed: !!r.trashed }));
  handle(Channels.folderPurge, (r) => {
    c.folders.purge(r.id);
    return { ok: true as const };
  });
  handle(Channels.folderListTrashed, () => c.folders.listTrashed());

  // Notas
  handle(Channels.noteList, (r) => (r.tagId != null ? c.notes.listByTag(r.tagId) : c.notes.list(r)));
  handle(Channels.noteGet, (r) => c.notes.get(r.id));
  handle(Channels.noteCreate, (r) => c.notes.create(r));
  handle(Channels.noteSave, (r) => c.notes.save(r));
  handle(Channels.noteRename, (r) => c.notes.rename(r.id, r.title));
  handle(Channels.noteTrash, (r) => {
    c.notes.trash(r.id);
    return { ok: true as const };
  });
  handle(Channels.noteRestore, (r) => {
    c.notes.restore(r.id);
    return { ok: true as const };
  });
  handle(Channels.notePurge, (r) => {
    c.notes.purge(r.id);
    return { ok: true as const };
  });
  handle(Channels.noteSetFavorite, (r) => {
    c.notes.setFavorite(r.id, r.favorite);
    return { ok: true as const };
  });

  // Etiquetas
  handle(Channels.tagList, () => c.tags.list());
  handle(Channels.tagCreate, (r) => c.tags.create(r.name, r.color, r.icon));
  handle(Channels.tagRename, (r) => c.tags.update(r.id, { name: r.name, color: r.color, icon: r.icon }));
  handle(Channels.tagTrash, (r) => {
    c.tags.trash(r.id);
    return { ok: true as const };
  });
  handle(Channels.tagRestore, (r) => {
    c.tags.restore(r.id);
    return { ok: true as const };
  });
  handle(Channels.tagPurge, (r) => {
    c.tags.purge(r.id);
    return { ok: true as const };
  });
  handle(Channels.tagListTrashed, () => c.tags.listTrashed());
  handle(Channels.noteTags, (r) => c.tags.forNote(r.noteId));
  handle(Channels.noteSetTags, (r) => c.tags.setForNote(r.noteId, r.tagIds));

  // Búsqueda
  handle(Channels.search, (r) => c.search.query(r.q, { limit: r.limit, includeTrashed: r.includeTrashed }));

  // Ajustes
  handle(Channels.settingsGetAll, () => c.settings.getAll());
  handle(Channels.settingsSet, (r) => {
    c.settings.set(r.key, r.value);
    return { ok: true as const };
  });

  // Respaldos
  handle(Channels.backupCreate, () => c.backup.create());
  handle(Channels.backupList, () => c.backup.list());

  // Plantillas
  handle(Channels.templateList, () => c.templates.list());
  handle(Channels.templateCreate, (r) => c.templates.create(r));
  handle(Channels.templateUpdate, (r) => c.templates.update(r.id, r));
  handle(Channels.templateDelete, (r) => {
    c.templates.delete(r.id);
    return { ok: true as const };
  });
  handle(Channels.noteFromTemplate, (r) => {
    const tpl = c.templates.get(r.templateId);
    if (!tpl) throw new Error('Plantilla no encontrada');
    const note = c.notes.create({ folderId: r.folderId ?? null, title: tpl.name, type: 'document' });
    c.notes.save({ id: note.id, title: tpl.name, contentJson: tpl.contentJson, plaintext: '' });
    return c.notes.get(note.id)!;
  });
}
