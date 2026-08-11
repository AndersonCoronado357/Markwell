import type { DB } from './connection';
import { FoldersRepo } from '../repositories/folders.repo';
import { NotesRepo } from '../repositories/notes.repo';
import { TagsRepo } from '../repositories/tags.repo';
import { SettingsRepo } from '../repositories/settings.repo';
import { SearchService } from '../services/search.service';
import { BackupService } from '../services/backup.service';
import { TemplatesRepo } from '../repositories/templates.repo';
import { BoardsRepo } from '../repositories/boards.repo';
import { SecretsService } from '../services/secrets.service';
import { AiService } from '../services/ai.service';
import { AiConversationsRepo } from '../repositories/aiConversations.repo';
import { EmbeddingsService } from '../services/embeddings.service';
import { ExportService } from '../services/export.service';
import { UpdateService } from '../services/update.service';

export interface Container {
  db: DB;
  folders: FoldersRepo;
  notes: NotesRepo;
  tags: TagsRepo;
  settings: SettingsRepo;
  search: SearchService;
  backup: BackupService;
  templates: TemplatesRepo;
  boards: BoardsRepo;
  secrets: SecretsService;
  ai: AiService;
  aiConv: AiConversationsRepo;
  embeddings: EmbeddingsService;
  exporter: ExportService;
  updates: UpdateService;
}

export function buildContainer(db: DB, backupsDir: string, secretsDir: string): Container {
  const settings = new SettingsRepo(db);
  const secrets = new SecretsService(secretsDir);
  return {
    db,
    folders: new FoldersRepo(db),
    notes: new NotesRepo(db),
    tags: new TagsRepo(db),
    settings,
    search: new SearchService(db),
    backup: new BackupService(db, settings, backupsDir),
    templates: new TemplatesRepo(db),
    boards: new BoardsRepo(db),
    secrets,
    ai: new AiService(secrets, settings),
    aiConv: new AiConversationsRepo(db),
    embeddings: new EmbeddingsService(db, new AiService(secrets, settings)),
    exporter: new ExportService(),
    updates: new UpdateService(),
  };
}
