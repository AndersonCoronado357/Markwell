-- Trozos de notas con embeddings vectoriales para búsqueda semántica.
-- Usamos `sqlite-vec` (la extensión `vec0`) con vectores de 3072 dimensiones
-- (modelo `gemini-embedding-001` de Google Generative AI).

CREATE TABLE note_chunks (
  id           INTEGER PRIMARY KEY,
  note_id      INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  idx          INTEGER NOT NULL,    -- posición del chunk dentro de la nota
  text         TEXT NOT NULL,
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_note_chunks_note ON note_chunks(note_id, idx);

-- Tabla virtual de vec0 — sqlite-vec se carga al abrir la BD.
CREATE VIRTUAL TABLE note_chunk_vectors USING vec0(
  chunk_id INTEGER PRIMARY KEY,
  embedding FLOAT[3072]
);
