-- Migración defensiva: si la BD ya tenía la tabla vec0 con 768 dimensiones
-- (versión anterior de 009), la recreamos a 3072. DROP descarta cualquier
-- embedding previo — los chunks se re-indexan en el siguiente guardado.
DROP TABLE IF EXISTS note_chunk_vectors;
CREATE VIRTUAL TABLE note_chunk_vectors USING vec0(
  chunk_id INTEGER PRIMARY KEY,
  embedding FLOAT[3072]
);
