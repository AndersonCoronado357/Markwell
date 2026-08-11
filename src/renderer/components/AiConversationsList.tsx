import { useEffect, useState } from 'react';
import { MessagesSquare, Plus, Trash2, FolderOpen, Pencil, FolderInput } from 'lucide-react';
import { ipc } from '../ipc';
import { Channels } from '../../shared/ipc';
import type { AiConvSummary, AiConversation } from '../../shared/models';
import { useStore } from '../store';
import { useAi } from '../ai/aiStore';
import { ContextMenu, type CtxItem } from './ContextMenu';
import { confirmDelete } from '../confirmDelete';
import { InlineEditor } from './InlineEditor';

/**
 * Columna central del modo IA: lista de conversaciones de la carpeta
 * seleccionada (o todas, si no hay carpeta). Equivalente al `NotesPane` del
 * modo notas.
 */
export function AiConversationsList() {
  const general = useAi((s) => s.general);
  const setGeneralConversation = useAi((s) => s.setGeneralConversation);
  const selectedFolderId = useStore((s) => s.selectedFolderId);
  const view = useStore((s) => s.view);
  const foldersTree = useStore((s) => s.foldersTree);
  const [convs, setConvs] = useState<AiConvSummary[]>([]);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<number | null>(null);

  const flatFolders = flattenFolders(foldersTree);
  const headerLabel = (() => {
    if (view === 'folder' && selectedFolderId != null) {
      const f = flatFolders.find((x) => x.id === selectedFolderId);
      return f?.name ?? 'Carpeta';
    }
    return 'Todas las conversaciones';
  })();

  const reload = () => {
    const folderArg = view === 'folder' && selectedFolderId != null ? { folderId: selectedFolderId } : undefined;
    void ipc(Channels.aiConvList, folderArg ?? {}).then(setConvs);
  };
  useEffect(reload, [selectedFolderId, view]);

  // Recarga al terminar de chatear.
  useEffect(() => {
    if (!general.streaming && general.conversationId != null) reload();
  }, [general.streaming, general.conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const newConversation = () => setGeneralConversation(null, []);

  const openConversation = async (id: number) => {
    const conv = await ipc(Channels.aiConvGet, { id });
    if (!conv) return;
    setGeneralConversation(conv.id, (conv as AiConversation).messages.map((m) => ({ role: m.role, text: m.text })));
  };

  const deleteConv = (c: AiConvSummary) => {
    confirmDelete({
      kind: 'nota', label: c.title,
      onConfirm: async () => {
        await ipc(Channels.aiConvDelete, { id: c.id });
        if (general.conversationId === c.id) setGeneralConversation(null, []);
        reload();
      },
    });
  };

  const renameConv = async (c: AiConvSummary, name: string) => {
    if (name.trim() && name.trim() !== c.title) {
      await ipc(Channels.aiConvRename, { id: c.id, title: name.trim() });
      reload();
    }
    setRenamingId(null);
  };

  const moveConv = async (c: AiConvSummary, folderId: number | null) => {
    await ipc(Channels.aiConvMove, { id: c.id, folderId });
    setMoveTargetId(null);
    reload();
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-col bg-bg">
      <header className="flex items-center justify-between gap-2 px-5 pt-6 pb-3">
        <div className="min-w-0">
          <h2 className="truncate text-[18px] font-bold tracking-tight">
            {headerLabel} <span className="ml-1.5 text-sm font-normal text-text-muted">{convs.length}</span>
          </h2>
        </div>
        <button
          onClick={newConversation}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-control bg-text px-3 py-1.5 text-[13px] font-semibold text-surface transition-opacity hover:opacity-90"
        >
          <Plus size={14} />
          Nueva
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        {convs.length === 0 ? (
          <p className="mt-12 px-3 text-center text-[13px] text-text-muted">
            {view === 'folder' && selectedFolderId != null
              ? 'Esta carpeta no tiene chats.'
              : 'No hay conversaciones guardadas todavía.'}
          </p>
        ) : (
          <ul className="space-y-1">
            {convs.map((c) => {
              const active = general.conversationId === c.id;
              if (renamingId === c.id) {
                return (
                  <li key={c.id}>
                    <InlineEditor
                      initialName={c.title}
                      onSubmit={(name) => void renameConv(c, name)}
                      onCancel={() => setRenamingId(null)}
                      paddingLeft={10}
                    />
                  </li>
                );
              }
              if (moveTargetId === c.id) {
                return (
                  <li key={c.id} className="rounded-card bg-surface p-3 shadow-sm ring-1 ring-black/[0.04]">
                    <div className="mb-1.5 text-[11.5px] text-text-muted">Mover "{c.title}" a:</div>
                    <div className="space-y-0.5">
                      <button
                        onClick={() => void moveConv(c, null)}
                        className="flex w-full items-center gap-2 rounded-control px-2 py-1 text-left text-[12.5px] hover:bg-surface-alt"
                      >
                        <FolderOpen size={12} className="text-text-muted" /> Raíz (sin carpeta)
                      </button>
                      {flatFolders.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => void moveConv(c, f.id)}
                          className="flex w-full items-center gap-2 rounded-control px-2 py-1 text-left text-[12.5px] hover:bg-surface-alt"
                        >
                          <FolderOpen size={12} className="text-text-muted" /> {f.indent}{f.name}
                        </button>
                      ))}
                      <button
                        onClick={() => setMoveTargetId(null)}
                        className="mt-1 w-full rounded-control px-2 py-1 text-left text-[11.5px] text-text-muted hover:bg-surface-alt"
                      >
                        Cancelar
                      </button>
                    </div>
                  </li>
                );
              }
              const items: CtxItem[] = [
                { label: 'Renombrar', icon: <Pencil size={14} />, onSelect: () => setRenamingId(c.id) },
                { label: 'Mover a carpeta', icon: <FolderInput size={14} />, onSelect: () => setMoveTargetId(c.id) },
                { label: 'Eliminar', icon: <Trash2 size={14} />, danger: true, onSelect: () => deleteConv(c) },
              ];
              return (
                <li key={c.id}>
                  <ContextMenu items={items}>
                    <button
                      onClick={() => void openConversation(c.id)}
                      className={`flex w-full items-center gap-3 rounded-card px-4 py-3 text-left transition-colors ${
                        active ? 'bg-surface shadow-sm ring-1 ring-black/[0.04]' : 'hover:bg-surface/70'
                      }`}
                    >
                      <MessagesSquare size={14} className="shrink-0 text-text-muted" />
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-[14px] ${active ? 'font-semibold' : 'font-medium'} text-text`}>
                          {c.title || 'Conversación'}
                        </div>
                        <div className="mt-0.5 truncate text-[11.5px] text-text-muted">
                          {new Date(c.updatedAt).toLocaleDateString('es', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </button>
                  </ContextMenu>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function flattenFolders(tree: ReturnType<typeof useStore.getState>['foldersTree']): { id: number; name: string; indent: string }[] {
  const out: { id: number; name: string; indent: string }[] = [];
  const walk = (nodes: ReturnType<typeof useStore.getState>['foldersTree'], depth: number) => {
    for (const n of nodes) {
      out.push({ id: n.id, name: n.name, indent: '  '.repeat(depth) });
      if (n.children?.length) walk(n.children, depth + 1);
    }
  };
  walk(tree, 0);
  return out;
}
