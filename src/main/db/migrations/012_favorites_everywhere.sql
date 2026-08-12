-- Favoritos en pizarras y conversaciones.
--
-- La barra lateral ya ofrecía "Favoritos" en el modo pizarras, pero solo las
-- notas tenían la columna, así que la vista salía vacía siempre. Y en el modo
-- IA la opción ni aparecía. Ahora las tres cosas se pueden marcar igual.
ALTER TABLE boards ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ai_conversations ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_boards_favorite ON boards(is_favorite)
  WHERE deleted_at IS NULL AND is_favorite = 1;
CREATE INDEX idx_ai_conv_favorite ON ai_conversations(is_favorite)
  WHERE is_favorite = 1;
