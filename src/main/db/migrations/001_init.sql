-- Markwell · esquema núcleo (Fase 1)
-- Las tablas de IA (note_chunks, embeddings, vec0) se añaden en su fase (003).

-- CARPETAS: árbol anidable
CREATE TABLE folders (
  id         INTEGER PRIMARY KEY,
  uuid       TEXT NOT NULL UNIQUE,
  parent_id  INTEGER REFERENCES folders(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT,                                  -- token pastel
  position   REAL NOT NULL DEFAULT 0,               -- REAL → reordenar barato
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_folders_parent ON folders(parent_id, position);

-- NOTAS. 'id' INTEGER PRIMARY KEY ES el rowid → requerido por FTS5 external-content.
-- 'uuid' = id público estable (enlaces/exportación/futura sync).
CREATE TABLE notes (
  id          INTEGER PRIMARY KEY,
  uuid        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'document'
                CHECK (type IN ('document','canvas','wall','list')),
  content     TEXT NOT NULL DEFAULT '{}',           -- JSON de ProseMirror
  plaintext   TEXT NOT NULL DEFAULT '',             -- editor.getText() → búsqueda + IA
  folder_id   INTEGER REFERENCES folders(id) ON DELETE SET NULL,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  deleted_at  TEXT,                                 -- NULL=viva; ISO=en papelera
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_notes_folder   ON notes(folder_id)   WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_favorite ON notes(is_favorite) WHERE deleted_at IS NULL AND is_favorite = 1;
CREATE INDEX idx_notes_trashed  ON notes(deleted_at)  WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_notes_updated  ON notes(updated_at DESC) WHERE deleted_at IS NULL;

-- ETIQUETAS + relación N:N
CREATE TABLE tags (
  id    INTEGER PRIMARY KEY,
  uuid  TEXT NOT NULL UNIQUE,
  name  TEXT NOT NULL UNIQUE COLLATE NOCASE,
  color TEXT
);
CREATE TABLE note_tags (
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);
CREATE INDEX idx_note_tags_tag ON note_tags(tag_id);

-- AJUSTES (clave/valor)
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ===== FTS5 external-content sobre notes(title, plaintext) =====
-- remove_diacritics 2 → "accion" encuentra "acción" (la ñ se conserva).
CREATE VIRTUAL TABLE notes_fts USING fts5(
  title, plaintext,
  content='notes', content_rowid='id',
  tokenize = "unicode61 remove_diacritics 2"
);

-- Triggers de sincronización (external-content exige espejo manual).
CREATE TRIGGER notes_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, title, plaintext) VALUES (new.id, new.title, new.plaintext);
END;
CREATE TRIGGER notes_ad AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, plaintext)
    VALUES ('delete', old.id, old.title, old.plaintext);
END;
CREATE TRIGGER notes_au AFTER UPDATE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, plaintext)
    VALUES ('delete', old.id, old.title, old.plaintext);
  INSERT INTO notes_fts(rowid, title, plaintext) VALUES (new.id, new.title, new.plaintext);
END;
