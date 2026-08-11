import { create } from 'zustand';

export type ChatRole = 'user' | 'model';
export interface ChatMessage { role: ChatRole; text: string; }
/** Contexto del chat: dónde está el panel y qué notas/pizarras puede leer. */
export type ChatContext =
  | { kind: 'note'; noteId: number }
  | { kind: 'board'; boardId: number }
  | { kind: 'general' };

/** Cada panel de chat (inline en nota, inline en pizarra, modo IA) tiene su propio estado. */
export interface ChatSession {
  open: boolean;
  context: ChatContext;
  messages: ChatMessage[];
  streaming: boolean;
  /** Si pertenece a una conversación persistida (solo en modo IA), su id en BD. */
  conversationId: number | null;
}

export type ChatSlot = 'note' | 'board' | 'general';

interface AiUiState {
  /** Estado del panel inline en notas. */
  note: ChatSession;
  /** Estado del panel inline en pizarras. */
  board: ChatSession;
  /** Estado del chat del modo IA dedicado. */
  general: ChatSession;
  status: { configured: boolean; available: boolean; model: string } | null;

  setStatus: (s: { configured: boolean; available: boolean; model: string }) => void;
  openNote: (noteId: number) => void;
  closeNote: () => void;
  openBoard: (boardId: number) => void;
  closeBoard: () => void;
  setGeneralConversation: (conversationId: number | null, messages: ChatMessage[]) => void;
  pushUser: (slot: ChatSlot, text: string) => void;
  /** Reemplaza el texto del último mensaje (el placeholder del modelo) por la respuesta completa. */
  setLastModelText: (slot: ChatSlot, text: string) => void;
  finishStream: (slot: ChatSlot) => void;
  failStream: (slot: ChatSlot, msg: string) => void;
  resetSession: (slot: ChatSlot) => void;
}

const emptyNote = (): ChatSession => ({ open: false, context: { kind: 'general' }, messages: [], streaming: false, conversationId: null });
const emptyBoard = (): ChatSession => ({ open: false, context: { kind: 'general' }, messages: [], streaming: false, conversationId: null });
const emptyGeneral = (): ChatSession => ({ open: false, context: { kind: 'general' }, messages: [], streaming: false, conversationId: null });

export const useAi = create<AiUiState>((set) => ({
  note: emptyNote(),
  board: emptyBoard(),
  general: emptyGeneral(),
  status: null,

  setStatus: (s) => set({ status: s }),

  openNote: (noteId) =>
    set((s) => ({ note: { ...s.note, open: true, context: { kind: 'note', noteId }, messages: s.note.context.kind === 'note' && s.note.context.noteId === noteId ? s.note.messages : [] } })),
  closeNote: () => set((s) => ({ note: { ...s.note, open: false } })),

  openBoard: (boardId) =>
    set((s) => ({ board: { ...s.board, open: true, context: { kind: 'board', boardId }, messages: s.board.context.kind === 'board' && s.board.context.boardId === boardId ? s.board.messages : [] } })),
  closeBoard: () => set((s) => ({ board: { ...s.board, open: false } })),

  setGeneralConversation: (conversationId, messages) =>
    set((s) => ({ general: { ...s.general, open: true, conversationId, messages, streaming: false } })),

  pushUser: (slot, text) =>
    set((s) => {
      const sess = s[slot];
      const updated: ChatSession = {
        ...sess,
        messages: [...sess.messages, { role: 'user', text }, { role: 'model', text: '' }],
        streaming: true,
      };
      if (slot === 'note')    return { note: updated };
      if (slot === 'board')   return { board: updated };
      return { general: updated };
    }),

  setLastModelText: (slot, text) =>
    set((s) => {
      const sess = s[slot];
      if (!sess.messages.length) return {} as Partial<AiUiState>;
      const last = sess.messages[sess.messages.length - 1];
      if (last.role !== 'model') return {} as Partial<AiUiState>;
      const updated: ChatSession = {
        ...sess,
        messages: [...sess.messages.slice(0, -1), { ...last, text }],
      };
      if (slot === 'note')    return { note: updated };
      if (slot === 'board')   return { board: updated };
      return { general: updated };
    }),

  finishStream: (slot) =>
    set((s) => {
      const updated: ChatSession = { ...s[slot], streaming: false };
      if (slot === 'note')    return { note: updated };
      if (slot === 'board')   return { board: updated };
      return { general: updated };
    }),

  failStream: (slot, msg) =>
    set((s) => {
      const sess = s[slot];
      const messages = [...sess.messages];
      if (messages.length && messages[messages.length - 1].role === 'model') {
        messages[messages.length - 1] = { role: 'model', text: `_(error: ${msg})_` };
      }
      const updated: ChatSession = { ...sess, messages, streaming: false };
      if (slot === 'note')    return { note: updated };
      if (slot === 'board')   return { board: updated };
      return { general: updated };
    }),

  resetSession: (slot) =>
    set((s) => {
      const updated: ChatSession = {
        ...s[slot],
        messages: [],
        conversationId: slot === 'general' ? null : s[slot].conversationId,
      };
      if (slot === 'note')    return { note: updated };
      if (slot === 'board')   return { board: updated };
      return { general: updated };
    }),
}));
