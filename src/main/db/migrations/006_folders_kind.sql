-- Carpetas separadas por modo: 'notes' para notas, 'boards' para pizarras.
-- Las existentes se quedan como 'notes'. Las conexiones entre stickies viven
-- en su propia tabla.
ALTER TABLE folders ADD COLUMN kind TEXT NOT NULL DEFAULT 'notes';
CREATE INDEX idx_folders_kind ON folders(kind, parent_id, position) WHERE deleted_at IS NULL;

CREATE TABLE board_connections (
  id        INTEGER PRIMARY KEY,
  board_id  INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  from_id   INTEGER NOT NULL REFERENCES board_items(id) ON DELETE CASCADE,
  to_id     INTEGER NOT NULL REFERENCES board_items(id) ON DELETE CASCADE,
  color     TEXT
);
CREATE INDEX idx_connections_board ON board_connections(board_id);
