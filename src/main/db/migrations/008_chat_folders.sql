-- Carpetas para conversaciones de IA. Reutilizamos la tabla `folders` con
-- kind = 'chats'. Las conversaciones pueden estar en una carpeta o en la raíz.
ALTER TABLE ai_conversations ADD COLUMN folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL;
CREATE INDEX idx_ai_conv_folder ON ai_conversations(folder_id);
