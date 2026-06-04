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

const RAIL_W = '20px';

export default function App() {
  const init = useStore((s) => s.init);
  const settingsOpen = useStore((s) => s.settingsOpen);
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const notesPaneCollapsed = useStore((s) => s.notesPaneCollapsed);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const toggleNotesPane = useStore((s) => s.toggleNotesPane);

  useEffect(() => { void init(); }, [init]);
  useShortcuts();

  const sidebarW = sidebarCollapsed ? RAIL_W : '260px';
  const notesW = notesPaneCollapsed ? RAIL_W : 'minmax(280px, 1fr)';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-alt font-ui text-text">
      <TitleBar />
      {settingsOpen ? (
        <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: `${sidebarW} 1px 1fr` }}>
          {sidebarCollapsed
            ? <CollapseRail side="left" onClick={toggleSidebar} title="Mostrar barra lateral" />
            : <Sidebar />}
          <CollapseDivider
            pointing={sidebarCollapsed ? 'right' : 'left'}
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Mostrar barra lateral' : 'Ocultar barra lateral'}
          />
          <SettingsPane />
        </div>
      ) : (
        <div
          className="grid min-h-0 flex-1"
          style={{ gridTemplateColumns: `${sidebarW} 1px ${notesW} 1px minmax(0, 2.4fr)` }}
        >
          {sidebarCollapsed
            ? <CollapseRail side="left" onClick={toggleSidebar} title="Mostrar barra lateral" />
            : <Sidebar />}
          <CollapseDivider
            pointing={sidebarCollapsed ? 'right' : 'left'}
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Mostrar barra lateral' : 'Ocultar barra lateral'}
          />
          {notesPaneCollapsed
            ? <CollapseRail side="left" onClick={toggleNotesPane} title="Mostrar lista de notas" />
            : <NotesPane />}
          <CollapseDivider
            pointing={notesPaneCollapsed ? 'right' : 'left'}
            onClick={toggleNotesPane}
            title={notesPaneCollapsed ? 'Mostrar lista de notas' : 'Ocultar lista de notas'}
          />
          <ContentPane />
        </div>
      )}
      <Toaster />
      <CommandPalette />
      <FindInNote />
    </div>
  );
}
