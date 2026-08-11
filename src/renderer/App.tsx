import { useEffect } from 'react';
import { useStore } from './store';
import { useShortcuts } from './useShortcuts';
import { Sidebar } from './components/Sidebar';
import { NotesPane } from './components/NotesPane';
import { ContentPane } from './components/ContentPane';
import { SettingsPane } from './components/SettingsPane';
import { TitleBar } from './components/TitleBar';
import { Toaster } from './components/Toaster';
import { CollapseRail } from './components/CollapseRail';
import { CollapseDivider } from './components/Divider';
import { CommandPalette } from './components/CommandPalette';
import { FindInNote } from './components/FindInNote';
import { BoardsList } from './components/BoardsList';
import { BoardCanvas } from './components/BoardCanvas';
import { AiConversationsList } from './components/AiConversationsList';
import { AiChatPane } from './components/AiChatPane';

const RAIL_W = '20px';

export default function App() {
  const init = useStore((s) => s.init);
  const settingsOpen = useStore((s) => s.settingsOpen);
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const notesPaneCollapsed = useStore((s) => s.notesPaneCollapsed);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const toggleNotesPane = useStore((s) => s.toggleNotesPane);
  const mode = useStore((s) => s.mode);

  useEffect(() => { void init(); }, [init]);
  useShortcuts();

  const sidebarW = sidebarCollapsed ? RAIL_W : '260px';
  const notesW = notesPaneCollapsed ? RAIL_W : 'minmax(280px, 1fr)';

  // En modo notas: sidebar | NotesPane | ContentPane
  // En modo pizarras: sidebar | BoardsList | BoardCanvas
  // En modo IA:     sidebar | AiConversationsList | AiChatPane
  const middleColumn = (() => {
    if (mode === 'boards') return <BoardsList />;
    if (mode === 'ai')     return <AiConversationsList />;
    return <NotesPane />;
  })();
  const rightColumn = (() => {
    if (mode === 'boards') return <BoardCanvas />;
    if (mode === 'ai')     return <AiChatPane />;
    return <ContentPane />;
  })();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-alt font-ui text-text">
      <TitleBar />
      {settingsOpen ? (
        <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: `${sidebarW} 1px 1fr` }}>
          {sidebarCollapsed ? <CollapseRail side="left" onClick={toggleSidebar} title="Mostrar barra lateral" /> : <Sidebar />}
          <CollapseDivider pointing="left" onClick={toggleSidebar} title="Ocultar" showButton={!sidebarCollapsed} />
          <SettingsPane />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: `${sidebarW} 1px ${notesW} 1px minmax(0, 2.4fr)` }}>
          {sidebarCollapsed ? <CollapseRail side="left" onClick={toggleSidebar} title="Mostrar barra lateral" /> : <Sidebar />}
          <CollapseDivider pointing="left" onClick={toggleSidebar} title="Ocultar" showButton={!sidebarCollapsed} />
          {notesPaneCollapsed ? <CollapseRail side="left" onClick={toggleNotesPane} title="Mostrar" /> : middleColumn}
          <CollapseDivider pointing="left" onClick={toggleNotesPane} title="Ocultar" showButton={!notesPaneCollapsed} />
          {rightColumn}
        </div>
      )}
      <Toaster />
      <CommandPalette />
      <FindInNote />
    </div>
  );
}
