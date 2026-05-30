import { app } from 'electron';
import type { Container } from './db/container';

const EMPTY_DOC = { type: 'doc', content: [] };

/** Datos de ejemplo (gateado por MARKWELL_SEED=1) para verificar la UI. */
export function runSeed(c: Container): void {
  if (c.folders.count() === 0) {
    const trabajo = c.folders.create({ name: 'Trabajo', color: 'cielo' });
    const ideas = c.folders.create({ name: 'Ideas', color: 'lavanda' });
    const personal = c.folders.create({ name: 'Personal', color: 'durazno' });

    const urgente = c.tags.create('urgente', 'rosa', 'flame');
    const lectura = c.tags.create('lectura', 'menta', 'bookmark');
    const semanal = c.tags.create('semanal', 'cielo', 'calendar');

    const make = (folderId: number, title: string, plaintext: string, tagIds: number[] = [], fav = false) => {
      const n = c.notes.create({ folderId, title });
      c.notes.save({ id: n.id, title, contentJson: EMPTY_DOC, plaintext });
      if (fav) c.notes.setFavorite(n.id, true);
      if (tagIds.length) c.tags.setForNote(n.id, tagIds);
    };

    make(trabajo.id, 'Reunión de lunes', 'Agenda y pendientes del lunes con el equipo.', [semanal.id], true);
    make(trabajo.id, 'Roadmap del trimestre', 'Hitos, prioridades y métricas para los próximos tres meses.');
    make(ideas.id, 'Idea de app de notas', 'Organizar las notas por bloques, con búsqueda instantánea y asistente.', [lectura.id]);
    make(personal.id, 'Lista de compras', 'Café, pan, fruta y leche.', [urgente.id]);
  }
  app.quit();
}
