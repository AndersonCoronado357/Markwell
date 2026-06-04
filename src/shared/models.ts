// DTOs compartidos entre main y renderer.

export type NoteType = 'document' | 'canvas' | 'wall' | 'list';

export interface Folder {
  id: number;
  uuid: string;
  parentId: number | null;
  name: string;
  color: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface FolderNode extends Folder {
  children: FolderNode[];
}

export interface Tag {
  id: number;
  uuid: string;
  name: string;
  color: string | null;
  icon: string | null;
}

export interface NoteSummary {
  id: number;
  uuid: string;
  title: string;
  type: NoteType;
  folderId: number | null;
  isFavorite: boolean;
  updatedAt: string;
}

export interface Note extends NoteSummary {
  contentJson: unknown;
  plaintext: string;
  createdAt: string;
  deletedAt: string | null;
}

export interface BackupInfo {
  filename: string;
  path: string;
  createdAt: string;
  sizeBytes: number;
}

export interface SearchHit {
  noteId: number;
  title: string;
  snippet: string;
  rank: number;
  folderId: number | null;
  trashed: boolean;
}
