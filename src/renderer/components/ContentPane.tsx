import { useEffect, useState } from 'react';
import { Star, Trash2, ArchiveRestore, Sparkles } from 'lucide-react';
import { ipc } from '../ipc';
import { Channels } from '../../shared/ipc';
import { useStore } from '../store';
import { useAi } from '../ai/aiStore';
import type { Note } from '../../shared/models';
import { Editor } from '../editor/Editor';
import type { SaveStatus } from '../editor/useAutosave';
import { NoteTags } from './NoteTags';
import { ChatPanel } from './ChatPanel';

export function ContentPane() {
  const activeNoteId = useStore((s) => s.activeNoteId);
  const view = useStore((s) => s.view);
  const setFavorite = useStore((s) => s.setFavorite);
  const trashNoteAct = useStore((s) => s.trashNote);
  const restoreNote = useStore((s) => s.restoreNote);
  const renameNote = useStore((s) => s.renameNote);
  const aiSession = useAi((s) => s.note);
  const openAi = useAi((s) => s.openNote);
  const closeAi = useAi((s) => s.closeNote);
  const [note, setNote] = useState<Note | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (activeNoteId == null) {
      setNote(null);
      setTitleDraft('');
      return;
    }
    ipc(Channels.noteGet, { id: activeNoteId }).then((n) => {
      setNote(n);
      setTitleDraft(n?.title ?? '');
    });
  }, [activeNoteId]);

  if (activeNoteId == null || !note) {
    // Sin nota seleccionada: placeholder simple, claro y consistente para
    // todas las vistas (carpeta, favoritos, etiqueta, búsqueda, papelera).
    const hint = view === 'trash' ? 'Selecciona una nota de la papelera para verla.'
               : view === 'search' ? 'Selecciona un resultado de la búsqueda.'
               : 'Elige una nota de la lista o crea una nueva para empezar a escribir.';
    return (
      <section className="flex min-h-0 flex-col items-center justify-center bg-surface px-10 text-center">
        <div className="mb-6 flex h-[64px] w-[64px] items-center justify-center rounded-[18px] bg-surface-alt">
          <span className="h-6 w-6 rounded-[8px] bg-text/85" />
        </div>
        <h3 className="text-[22px] font-bold tracking-tight">Tus notas</h3>
        <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-text-muted">{hint}</p>
      </section>
    );
  }

  const inTrash = note.deletedAt != null;
  const statusLabel = (() => {
    if (saveStatus === 'saving') return 'Guardando…';
    if (saveStatus === 'saved' && savedAt)
      return `Guardado · ${new Date(savedAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
    if (saveStatus === 'dirty') return 'Sin guardar';
    if (saveStatus === 'error') return 'Error al guardar';
    return note.updatedAt
      ? `Editado · ${new Date(note.updatedAt).toLocaleDateString('es', {
          day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
        })}`
      : '';
  })();

  // El asistente aparece como una columna lateral integrada (no flotante) cuando
  // está abierto y la nota actual coincide con su contexto.
  const aiOpenForThisNote =
    aiSession.open && aiSession.context.kind === 'note' && aiSession.context.noteId === activeNoteId;

  const toggleAi = () => { aiOpenForThisNote ? closeAi() : openAi(activeNoteId); };

  return (
    <section className="flex min-h-0 min-w-0 bg-surface">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 px-7 pt-4 pb-1">
          <div className="flex min-w-0 items-center gap-2 text-[12px] text-text-muted">
            <span
              className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                saveStatus === 'saving'
                  ? 'bg-[color-mix(in_srgb,var(--color-pastel-amarillo)_85%,#000)]'
                  : saveStatus === 'error'
                    ? 'bg-[color-mix(in_srgb,var(--color-pastel-rosa)_80%,#000)]'
                    : 'bg-[color-mix(in_srgb,var(--color-pastel-menta)_70%,#000)]'
              }`}
            />
            <span className="truncate">{statusLabel}</span>
          </div>
          <div className="flex items-center gap-0.5">
            {!inTrash ? (
              <>
                <IconBtn
                  label={aiOpenForThisNote ? 'Cerrar asistente' : 'Abrir asistente'}
                  onClick={toggleAi}
                  active={aiOpenForThisNote}
                >
                  <Sparkles size={16} />
                </IconBtn>
                <IconBtn
                  label={note.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                  onClick={() => setFavorite(note.id, !note.isFavorite)}
                >
                  <Star
                    size={16}
                    fill={note.isFavorite ? 'var(--color-pastel-durazno)' : 'none'}
                    stroke={note.isFavorite ? 'var(--color-pastel-durazno)' : 'currentColor'}
                  />
                </IconBtn>
                <IconBtn label="Mover a la papelera" onClick={() => trashNoteAct(note.id, note.title)}>
                  <Trash2 size={16} />
                </IconBtn>
              </>
            ) : (
              <IconBtn label="Restaurar" onClick={() => restoreNote(note.id)}>
                <ArchiveRestore size={16} />
              </IconBtn>
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <article className="w-full px-10 pt-6 pb-24">
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                const t = titleDraft.trim();
                if (t && t !== note.title) renameNote(note.id, t);
              }}
              disabled={inTrash}
              placeholder="Sin título"
              className="w-full bg-transparent text-[34px] font-bold leading-tight tracking-tight text-text placeholder:text-text-muted focus:outline-none disabled:opacity-70"
            />
            {!inTrash && <NoteTags noteId={note.id} />}
            {!inTrash ? (
              <Editor
                key={note.id}
                noteId={note.id}
                initialContent={note.contentJson}
                title={titleDraft}
                onStatusChange={(s, t) => { setSaveStatus(s); setSavedAt(t); }}
              />
            ) : (
              <div className="mt-6 whitespace-pre-wrap text-[16px] leading-[1.75] text-text-muted">
                {note.plaintext || 'Esta nota está vacía.'}
              </div>
            )}
          </article>
        </div>
      </div>

      {aiOpenForThisNote && (
        <div className="w-[400px] shrink-0">
        <ChatPanel
          slot="note"
          title="Asistente · esta nota"
          placeholder="Pregunta o usa /resumen, /pizarra…"
          onClose={closeAi}
        />
        </div>
      )}
    </section>
  );
}

function IconBtn({
  label, onClick, children, active,
}: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`rounded-control p-2 transition-colors ${
        active ? 'bg-surface-alt text-text' : 'text-text-muted hover:bg-surface-alt hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}
