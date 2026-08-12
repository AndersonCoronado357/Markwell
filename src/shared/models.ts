// DTOs compartidos entre main y renderer.

export type NoteType = 'document' | 'canvas' | 'wall' | 'list';

export interface Folder {
  id: number;
  uuid: string;
  parentId: number | null;
  name: string;
  color: string | null;
  position: number;
  kind: 'notes' | 'boards' | 'chats';
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

export interface BoardSummary {
  id: number;
  uuid: string;
  name: string;
  color: string | null;
  folderId: number | null;
  updatedAt: string;
}

export interface BoardItem {
  id: number;
  boardId: number;
  type: 'sticky';
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string | null;
  updatedAt: string;
}

export interface BoardConnection {
  id: number;
  boardId: number;
  fromId: number;
  toId: number;
  color: string | null;
}

export interface Board extends BoardSummary {
  items: BoardItem[];
  connections: BoardConnection[];
  createdAt: string;
  deletedAt: string | null;
}

export interface AiConvSummary {
  id: number;
  uuid: string;
  title: string;
  updatedAt: string;
  folderId: number | null;
}
export interface AiConvMessage {
  id: number;
  conversationId: number;
  role: 'user' | 'model';
  text: string;
  createdAt: string;
}
export interface AiConversation extends AiConvSummary {
  messages: AiConvMessage[];
  createdAt: string;
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
