-- Plantillas: notas reutilizables con un nombre y un esqueleto JSON de TipTap.
-- El usuario crea una "Nueva nota desde plantilla" y se copia el contenido.
CREATE TABLE templates (
  id          INTEGER PRIMARY KEY,
  uuid        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  content     TEXT NOT NULL DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
