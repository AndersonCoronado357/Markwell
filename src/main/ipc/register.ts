import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
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
  handle(Channels.folderTree, (r) => c.folders.tree(r?.kind ?? 'notes'));
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
  handle(Channels.noteSave, (r) => {
    const saved = c.notes.save(r);
    // Indexa el texto para búsqueda semántica fuera del camino crítico.
    setImmediate(() => {
      void c.embeddings.indexNote(r.id, r.plaintext).catch(() => { /* falla silenciosa: la nota se guarda igual */ });
    });
    return saved;
  });
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
  handle(Channels.noteMove, (r) => {
    c.notes.move(r.id, r.folderId);
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
  // Exportar la nota abierta. El diálogo de guardado se abre aquí, en main,
  // porque el renderer no tiene (ni debe tener) acceso al sistema de archivos.
  handle(Channels.noteExport, async (r) => {
    const nota = c.notes.get(r.id);
    if (!nota) return { ok: false };

    const extensiones = { md: 'md', html: 'html', pdf: 'pdf' } as const;
    const nombres = {
      md: 'Markdown', html: 'Página HTML', pdf: 'Documento PDF',
    } as const;

    // Un título puede traer barras o dos puntos: se limpia antes de proponerlo.
    const base = (nota.title?.trim() || 'Nota sin título')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .slice(0, 120);

    const ventana = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const eleccion = await dialog.showSaveDialog(ventana, {
      title: 'Exportar nota',
      defaultPath: path.join(app.getPath('documents'), `${base}.${extensiones[r.format]}`),
      filters: [{ name: nombres[r.format], extensions: [extensiones[r.format]] }],
    });
    if (eleccion.canceled || !eleccion.filePath) return { ok: false, canceled: true };

    const destino = await c.exporter.escribir(eleccion.filePath, r.format, {
      title: nota.title,
      contentJson: nota.contentJson,
    });
    return { ok: true, path: destino };
  });

  handle(Channels.updateStatus, () => c.updates.status());
  handle(Channels.updateCheck, () => c.updates.check());
  handle(Channels.updateInstall, () => c.updates.install());

  handle(Channels.backupCreate, () => c.backup.create());
  handle(Channels.backupList, () => c.backup.list());


  // Pizarras
  handle(Channels.boardList, (r) => c.boards.list(r.folderId));
  handle(Channels.boardGet, (r) => c.boards.get(r.id));
  handle(Channels.boardCreate, (r) => c.boards.create(r));
  handle(Channels.boardRename, (r) => c.boards.rename(r.id, r.name, r.color));
  handle(Channels.boardTrash, (r) => { c.boards.trash(r.id); return { ok: true as const }; });
  handle(Channels.boardListTrashed, () => c.boards.listTrashed());
  handle(Channels.boardRestore, (r) => { c.boards.restore(r.id); return { ok: true as const }; });
  handle(Channels.boardPurge, (r) => { c.boards.purge(r.id); return { ok: true as const }; });
  handle(Channels.boardFromNote, (r) => c.boards.fromNote(c.notes, r.noteId));
  handle(Channels.boardSetFavorite, (r) => { c.boards.setFavorite(r.id, r.favorite); return { ok: true as const }; });
  handle(Channels.boardListFavorites, () => c.boards.listFavorites());
  handle(Channels.itemCreate, (r) => c.boards.createItem(r));
  handle(Channels.itemUpdate, (r) => c.boards.updateItem(r.id, r));
  handle(Channels.itemDelete, (r) => { c.boards.deleteItem(r.id); return { ok: true as const }; });
  handle(Channels.connCreate, (r) => c.boards.createConnection(r));
  handle(Channels.connDelete, (r) => { c.boards.deleteConnection(r.id); return { ok: true as const }; });

  // === IA (Gemini) ===
  handle(Channels.aiStatus, () => c.ai.status());
  handle(Channels.aiSetKey, (r) => { c.ai.saveKey(r.key); return { ok: true as const }; });
  handle(Channels.aiRemoveKey, () => { c.ai.removeKey(); return { ok: true as const }; });
  handle(Channels.aiSetModel, (r) => { c.ai.setModel(r.model); return { ok: true as const }; });
  handle(Channels.aiGenerate, (r) => c.ai.generate(r.prompt, { system: r.system, maxTokens: r.maxTokens }));
  // Chat con streaming: la respuesta del handler es ok, los tokens llegan al
  // renderer por el canal 'ai:stream'.
  ipcMain.handle(Channels.aiChat, (e, raw) => {
    const schema = validators[Channels.aiChat as string];
    const req = schema ? schema.parse(raw) : raw;
    const senderId = e.sender.id;
    if (!BrowserWindow.getAllWindows().some((w) => w.webContents.id === senderId)) {
      throw new Error('Ventana no disponible para streaming.');
    }
    void c.ai.chatStream({
      requestId: req.requestId,
      messages: req.messages,
      system: req.system,
      senderWebContentsId: senderId,
    });
    return { ok: true as const };
  });

  handle(Channels.semanticSearch, (r) => c.embeddings.search(r.query, r.limit ?? 8));

  // Conversaciones de IA (solo en el modo IA dedicado)
  handle(Channels.aiConvList, (r) => c.aiConv.list(r?.folderId));
  handle(Channels.aiConvGet, (r) => c.aiConv.get(r.id));
  handle(Channels.aiConvCreate, (r) => c.aiConv.create(r.title, r.folderId));
  handle(Channels.aiConvRename, (r) => c.aiConv.rename(r.id, r.title));
  handle(Channels.aiConvMove, (r) => c.aiConv.move(r.id, r.folderId));
  handle(Channels.aiConvDelete, (r) => { c.aiConv.delete(r.id); return { ok: true as const }; });
  handle(Channels.aiConvAppend, (r) => c.aiConv.appendMessage(r.conversationId, r.role, r.text));
  handle(Channels.aiConvSetFavorite, (r) => c.aiConv.setFavorite(r.id, r.favorite));
  handle(Channels.aiConvListFavorites, () => c.aiConv.listFavorites());
}
