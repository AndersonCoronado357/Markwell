-- Pizarras: vista alternativa donde el usuario coloca notas (stickies) en un
-- lienzo libre con coordenadas X/Y. Las pizarras se organizan por carpetas
-- (reutilizan la tabla folders existente).
CREATE TABLE boards (
  id          INTEGER PRIMARY KEY,
  uuid        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  color       TEXT,
  folder_id   INTEGER REFERENCES folders(id) ON DELETE SET NULL,
  deleted_at  TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_boards_folder  ON boards(folder_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_boards_trashed ON boards(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TABLE board_items (
  id          INTEGER PRIMARY KEY,
  board_id    INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'sticky' CHECK (type IN ('sticky')),
  text        TEXT NOT NULL DEFAULT '',
  x           REAL NOT NULL DEFAULT 0,
  y           REAL NOT NULL DEFAULT 0,
  w           REAL NOT NULL DEFAULT 220,
  h           REAL NOT NULL DEFAULT 180,
  color       TEXT,
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_items_board ON board_items(board_id);
