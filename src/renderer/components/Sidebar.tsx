import { type ReactNode, useState } from 'react';
import { Plus, Inbox, Star, Trash2, Pencil, FolderPlus, ChevronRight, ChevronDown, Folder as FolderIcon } from 'lucide-react';
import { useStore } from '../store';
import type { FolderNode, Tag } from '../../shared/models';
import { ContextMenu, type CtxItem } from './ContextMenu';
import { InlineEditor } from './InlineEditor';
import { SearchBar } from './SearchBar';
import { TagChip } from './TagIcon';
import { ModeSwitch } from './ModeSwitch';

const ROW =
  'group flex w-full items-center gap-2 rounded-control pr-2 py-[6px] text-left text-[13.5px] transition-colors';

const pastelVar = (color: string | null): string =>
  color ? `var(--color-pastel-${color})` : 'var(--text-muted)';

function ColoredFolder({ color, size = 16 }: { color: string | null; size?: number }) {
  const c = pastelVar(color);
  return <FolderIcon size={size} style={{ color: c, fill: c }} />;
}

function FolderItem({ node, depth }: { node: FolderNode; depth: number }) {
  const selectFolder = useStore((s) => s.selectFolder);
  const trashFolder = useStore((s) => s.trashFolder);
  const renameFolder = useStore((s) => s.renameFolder);
  const createFolder = useStore((s) => s.createFolder);
  const moveNoteToFolder = useStore((s) => s.moveNoteToFolder);
  const collapsedFolders = useStore((s) => s.collapsedFolders);
  const toggleCollapsed = useStore((s) => s.toggleFolderCollapsed);
  const settingsOpen = useStore((s) => s.settingsOpen);
  const openSettings = useStore((s) => s.openSettings);
  const active = useStore((s) => !s.settingsOpen && s.view === 'folder' && s.selectedFolderId === node.id);
  const [renaming, setRenaming] = useState(false);
  const [creatingChild, setCreatingChild] = useState(false);
  const [dropOver, setDropOver] = useState(false);
  const pastel = pastelVar(node.color);
  const hasChildren = node.children.length > 0;
  const collapsed = collapsedFolders.has(node.id);
  const indent = 4 + depth * 14;

  const items: CtxItem[] = [
    { label: 'Renombrar / color', icon: <Pencil size={14} />, onSelect: () => setRenaming(true) },
    {
      label: 'Nueva subcarpeta',
      icon: <FolderPlus size={14} />,
      onSelect: () => {
        setCreatingChild(true);
        if (collapsedFolders.has(node.id)) toggleCollapsed(node.id);
      },
    },
    {
      label: 'Mover a la papelera', icon: <Trash2 size={14} />, danger: true,
      onSelect: () => trashFolder(node.id, node.name),
    },
  ];

  if (renaming) {
    return (
      <InlineEditor
        initialName={node.name}
        initialColor={node.color}
        onSubmit={(name, color) => { renameFolder(node.id, name, color); setRenaming(false); }}
        onCancel={() => setRenaming(false)}
        paddingLeft={indent}
      />
    );
  }

  return (
    <>
      <ContextMenu items={items}>
        <button
          onClick={() => { if (settingsOpen) openSettings(false); selectFolder(node.id); }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('application/x-markwell-note')) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (!dropOver) setDropOver(true);
            }
          }}
          onDragLeave={() => setDropOver(false)}
          onDrop={(e) => {
            const raw = e.dataTransfer.getData('application/x-markwell-note');
            const id = Number(raw);
            setDropOver(false);
            if (id) { e.preventDefault(); void moveNoteToFolder(id, node.id); }
          }}
          className={`${ROW} ${active ? 'font-semibold text-text' : 'text-text-muted hover:text-text'} ${dropOver ? 'ring-1 ring-text/50' : ''}`}
          style={{
            paddingLeft: indent,
            background: dropOver
              ? `color-mix(in srgb, ${pastel} 60%, transparent)`
              : active
                ? `color-mix(in srgb, ${pastel} 36%, transparent)`
                : undefined,
          }}
        >
          {hasChildren ? (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); toggleCollapsed(node.id); }}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-muted hover:bg-black/[0.08] hover:text-text"
              title={collapsed ? 'Expandir' : 'Contraer'}
            >
              <ChevronRight size={12} className={`transition-transform ${collapsed ? '' : 'rotate-90'}`} />
            </span>
          ) : (
            <span className="h-5 w-5 shrink-0" />
          )}
          <ColoredFolder color={node.color} />
          <span className="truncate">{node.name}</span>
        </button>
      </ContextMenu>
      {hasChildren && !collapsed && (
        <div className="relative">
          <div className="absolute top-0 bottom-0 w-px bg-black/[0.08]" style={{ left: indent + 9 }} aria-hidden />
          {node.children.map((c) => <FolderItem key={c.id} node={c} depth={depth + 1} />)}
        </div>
      )}
      {creatingChild && (
        <InlineEditor
          initialColor={node.color}
          placeholder="Nombre de la subcarpeta"
          onSubmit={(name, color) => { createFolder(name, node.id, color); setCreatingChild(false); }}
          onCancel={() => setCreatingChild(false)}
          paddingLeft={indent + 14}
        />
      )}
    </>
  );
}

function TagItem({ tag }: { tag: Tag }) {
  const active = useStore((s) => !s.settingsOpen && s.view === 'tag' && s.selectedTagId === tag.id);
  const settingsOpen = useStore((s) => s.settingsOpen);
  const openSettings = useStore((s) => s.openSettings);
  const selectTag = useStore((s) => s.selectTag);
  const renameTag = useStore((s) => s.renameTag);
  const trashTag = useStore((s) => s.trashTag);
  const [renaming, setRenaming] = useState(false);
  const pastel = pastelVar(tag.color);

  const items: CtxItem[] = [
    { label: 'Renombrar / color / icono', icon: <Pencil size={14} />, onSelect: () => setRenaming(true) },
    { label: 'Mover a la papelera', icon: <Trash2 size={14} />, danger: true, onSelect: () => trashTag(tag.id, tag.name) },
  ];

  if (renaming) {
    return (
      <InlineEditor
        initialName={tag.name}
        initialColor={tag.color}
        initialIcon={tag.icon}
        withIcon
        onSubmit={(name, color, icon) => { renameTag(tag.id, name, color, icon); setRenaming(false); }}
        onCancel={() => setRenaming(false)}
        paddingLeft={10}
      />
    );
  }

  return (
    <ContextMenu items={items}>
      <button
        onClick={() => { if (settingsOpen) openSettings(false); selectTag(tag.id); }}
        className={`${ROW} ${active ? 'font-semibold text-text' : 'text-text-muted hover:text-text'}`}
        style={{ paddingLeft: 10, background: active ? `color-mix(in srgb, ${pastel} 36%, transparent)` : undefined }}
      >
        <TagChip name={tag.icon} color={tag.color} />
        <span className="truncate">{tag.name}</span>
      </button>
    </ContextMenu>
  );
}

export function Sidebar() {
  const tree = useStore((s) => s.foldersTree);
  const tags = useStore((s) => s.tags);
  const view = useStore((s) => s.view);
  const mode = useStore((s) => s.mode);
  const selectedFolderId = useStore((s) => s.selectedFolderId);
  const selectFolder = useStore((s) => s.selectFolder);
  const setView = useStore((s) => s.setView);
  const createFolder = useStore((s) => s.createFolder);
  const createTag = useStore((s) => s.createTag);
  const settingsOpen = useStore((s) => s.settingsOpen);
  const openSettings = useStore((s) => s.openSettings);
  const foldersSectionCollapsed = useStore((s) => s.foldersSectionCollapsed);
  const tagsSectionCollapsed = useStore((s) => s.tagsSectionCollapsed);
  const toggleFoldersSection = useStore((s) => s.toggleFoldersSection);
  const toggleTagsSection = useStore((s) => s.toggleTagsSection);
  const [newFolder, setNewFolder] = useState(false);
  const [newTag, setNewTag] = useState(false);

  // Etiquetas de UI dependientes del modo. Las "etiquetas" (tags) y la vista
  // de "favoritos / papelera" son propias del modo notas; en IA solo tiene
  // sentido el árbol de carpetas para agrupar chats.
  const isAi = mode === 'ai';
  const isBoards = mode === 'boards';
  const allLabel = isAi ? 'Todas las conversaciones' : isBoards ? 'Todas las pizarras' : 'Todas las notas';
  const foldersLabel = isAi ? 'Carpetas de chats' : 'Carpetas';

  const closeSettings = () => settingsOpen && openSettings(false);

  const nav = (active: boolean, onClick: () => void, icon: ReactNode, label: string) => (
    <button
      onClick={() => { closeSettings(); onClick(); }}
      className={`flex w-full items-center gap-2.5 rounded-control px-2.5 py-[6px] text-left text-[13.5px] transition-colors ${
        active ? 'bg-black/[0.07] font-semibold text-text' : 'text-text-muted hover:bg-black/[0.04] hover:text-text'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <aside className="flex min-h-0 flex-col bg-surface-alt">
      <div className="px-3 pt-3 pb-2">
        <ModeSwitch />
      </div>
      <div className="px-3 pb-3">
        <SearchBar />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2.5">
        {nav(!settingsOpen && view === 'folder' && selectedFolderId === null, () => selectFolder(null), <Inbox size={15} />, allLabel)}
        {!isAi && nav(!settingsOpen && view === 'favorites', () => setView('favorites'), <Star size={15} className="text-text-muted" />, 'Favoritos')}

        <div className="flex items-center justify-between px-2.5 pt-5 pb-1.5">
          <button
            onClick={toggleFoldersSection}
            className="flex items-center gap-1 rounded text-[10.5px] font-bold uppercase tracking-[0.1em] text-text-muted hover:text-text"
          >
            {foldersSectionCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
            {foldersLabel}
          </button>
          <button
            onClick={() => { closeSettings(); setNewFolder(true); if (foldersSectionCollapsed) toggleFoldersSection(); }}
            title="Nueva carpeta"
            className="rounded-control p-1 text-text-muted hover:bg-black/[0.06] hover:text-text"
          >
            <Plus size={13} />
          </button>
        </div>
        {!foldersSectionCollapsed && (
          <div className="space-y-0.5">
            {tree.map((n) => <FolderItem key={n.id} node={n} depth={0} />)}
            {newFolder && (
              <InlineEditor
                placeholder="Nombre de la carpeta"
                onSubmit={(name, color) => { createFolder(name, null, color); setNewFolder(false); }}
                onCancel={() => setNewFolder(false)}
                paddingLeft={4}
              />
            )}
            {!tree.length && !newFolder && (
              <button
                onClick={() => { closeSettings(); setNewFolder(true); }}
                className="flex w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-[12.5px] text-text-muted hover:bg-black/[0.04] hover:text-text"
              >
                <FolderPlus size={14} className="opacity-60" />
                Crear primera carpeta
              </button>
            )}
          </div>
        )}

        {!isAi && (
          <>
            <div className="flex items-center justify-between px-2.5 pt-5 pb-1.5">
              <button
                onClick={toggleTagsSection}
                className="flex items-center gap-1 rounded text-[10.5px] font-bold uppercase tracking-[0.1em] text-text-muted hover:text-text"
              >
                {tagsSectionCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                Etiquetas
              </button>
              <button
                onClick={() => { closeSettings(); setNewTag(true); if (tagsSectionCollapsed) toggleTagsSection(); }}
                title="Nueva etiqueta"
                className="rounded-control p-1 text-text-muted hover:bg-black/[0.06] hover:text-text"
              >
                <Plus size={13} />
              </button>
            </div>
            {!tagsSectionCollapsed && (
              <div className="space-y-0.5">
                {tags.map((t) => <TagItem key={t.id} tag={t} />)}
                {newTag && (
                  <InlineEditor
                    placeholder="Nombre de la etiqueta"
                    withIcon
                    onSubmit={(name, color, icon) => { createTag(name, color, icon); setNewTag(false); }}
                    onCancel={() => setNewTag(false)}
                    paddingLeft={10}
                  />
                )}
                {!tags.length && !newTag && (
                  <p className="px-2.5 py-1 text-[12.5px] text-text-muted">Sin etiquetas todavía</p>
                )}
              </div>
            )}
          </>
        )}
      </nav>

      {!isAi && (
        <div className="px-2.5 pt-2 pb-3">
          {nav(!settingsOpen && view === 'trash', () => setView('trash'), <Trash2 size={15} />, 'Papelera')}
        </div>
      )}
    </aside>
  );
}
