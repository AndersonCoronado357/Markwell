import type { DB } from './connection';
import { FoldersRepo } from '../repositories/folders.repo';
import { NotesRepo } from '../repositories/notes.repo';
import { TagsRepo } from '../repositories/tags.repo';
import { SettingsRepo } from '../repositories/settings.repo';
import { SearchService } from '../services/search.service';

// Contenedor simple: cablea db → repositorios → servicios. Sin framework de DI.
export interface Container {
  db: DB;
  folders: FoldersRepo;
  notes: NotesRepo;
  tags: TagsRepo;
  settings: SettingsRepo;
  search: SearchService;
}

export function buildContainer(db: DB): Container {
  return {
    db,
    folders: new FoldersRepo(db),
    notes: new NotesRepo(db),
    tags: new TagsRepo(db),
    settings: new SettingsRepo(db),
    search: new SearchService(db),
  };
}
