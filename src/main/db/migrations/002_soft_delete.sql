-- Soft-delete extendido a carpetas y etiquetas: nada se borra de un clic.
-- Solo desde la papelera (y con confirmación) se eliminan de verdad.

ALTER TABLE folders ADD COLUMN deleted_at TEXT;
ALTER TABLE tags    ADD COLUMN deleted_at TEXT;

CREATE INDEX idx_folders_trashed ON folders(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_tags_trashed    ON tags(deleted_at)    WHERE deleted_at IS NOT NULL;
