import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ipc } from '../ipc';
import { Channels } from '../../shared/ipc';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

/**
 * Autoguardado con debounce. Escucha cambios del editor (JSON + getText) y
 * llama a notes:save 800ms después de la última edición; también permite forzar
 * un flush síncrono (útil al cambiar de nota o cerrar la app).
 */
export function useAutosave(noteId: number | null, editor: Editor | null, title: string) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const titleRef = useRef(title);

  // Mantén la referencia al título actual sin re-suscribirse al editor.
  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  const doSave = useCallback(async () => {
    if (!editor || noteId == null) return;
    const contentJson = editor.getJSON();
    const plaintext = editor.getText({ blockSeparator: '\n\n' });
    setStatus('saving');
    try {
      await ipc(Channels.noteSave, { id: noteId, title: titleRef.current, contentJson, plaintext });
      setSavedAt(new Date().toISOString());
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [editor, noteId]);

  // Programar guardado al cambiar
  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      setStatus('dirty');
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void doSave();
      }, 800);
    };
    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
    };
  }, [editor, doSave]);

  // Flush al cambiar de nota / desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
        void doSave();
      }
    };
  }, [doSave, noteId]);

  // Flush al cerrar ventana
  useEffect(() => {
    const h = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
        void doSave();
      }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [doSave]);

  return { status, savedAt };
}
