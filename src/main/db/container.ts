import type { DB } from './connection';
import { FoldersRepo } from '../repositories/folders.repo';
import { NotesRepo } from '../repositories/notes.repo';
import { TagsRepo } from '../repositories/tags.repo';
import { SettingsRepo } from '../repositories/settings.repo';
import { SearchService } from '../services/search.service';
import { BackupService } from '../services/backup.service';

export interface Container {
  db: DB;
  folders: FoldersRepo;
  notes: NotesRepo;
  tags: TagsRepo;
  settings: SettingsRepo;
  search: SearchService;
  backup: BackupService;
}

export function buildContainer(db: DB, backupsDir: string): Container {
  const settings = new SettingsRepo(db);
  return {
    db,
    folders: new FoldersRepo(db),
    notes: new NotesRepo(db),
    tags: new TagsRepo(db),
    settings,
    search: new SearchService(db),
    backup: new BackupService(db, settings, backupsDir),
  };
}
