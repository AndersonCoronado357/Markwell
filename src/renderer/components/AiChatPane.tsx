import { ChatPanel } from './ChatPanel';
import { useAi } from '../ai/aiStore';

/**
 * Columna derecha del modo IA: el ChatPanel a pantalla completa, con el slot
 * general que persiste su historial en la conversación seleccionada.
 */
export function AiChatPane() {
  const setGeneralConversation = useAi((s) => s.setGeneralConversation);
  return (
    <section className="flex min-h-0 min-w-0 flex-col">
      <ChatPanel
        slot="general"
        title="Asistente · Markwell"
        placeholder="Pregunta lo que quieras… (o usa /resumen, /pizarra, /ayuda)"
        onNewConversation={() => setGeneralConversation(null, [])}
      />
    </section>
  );
}
