import { BrowserWindow } from 'electron';
import type { SecretsService } from './secrets.service';
import type { SettingsRepo } from '../repositories/settings.repo';

const KEY_NAME = 'gemini';
const MODEL_KEY = 'ai.gemini.model';
// Modelo por defecto: `gemini-flash-lite-latest`. Probado contra la API de
// Google: es el único de la familia Flash con cuota gratuita disponible en
// este momento (los demás devuelven 429 o 503). El usuario lo puede cambiar
// en Ajustes → IA.
const DEFAULT_MODEL = 'gemini-flash-lite-latest';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Modelos verificados contra la API. Si el modelo elegido falla con 429/503,
 * intentamos los siguientes en orden hasta encontrar uno que responda. Los
 * Gemma están al final porque incluyen "chain of thought" visible en el texto.
 */
export const SUPPORTED_MODELS: Array<{ id: string; label: string; hint: string }> = [
  { id: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite (último)', hint: 'Recomendado · estable y disponible' },
  { id: 'gemini-flash-latest',      label: 'Gemini Flash (último)',      hint: 'Más capaz · puede estar saturado' },
  { id: 'gemini-2.0-flash-lite',    label: 'Gemini 2.0 Flash Lite',      hint: 'Versión 2.0 estable' },
  { id: 'gemini-2.0-flash',         label: 'Gemini 2.0 Flash',           hint: 'Cuota gratuita más ajustada' },
  { id: 'gemini-2.5-flash',         label: 'Gemini 2.5 Flash',           hint: 'Razonamiento extendido · cuota baja' },
];

/** Lista de modelos en orden de prioridad para auto-fallback ante 429/503. */
const FALLBACK_CHAIN = [
  'gemini-flash-lite-latest',
  'gemini-2.0-flash-lite',
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
];

/** Modelos ya obsoletos / que devuelven 404. Se migran silenciosamente. */
const DEPRECATED_MODELS = new Set([
  'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro',
  'gemini-pro', 'gemini-pro-vision',
]);

// === Límites de seguridad ===
const MAX_PROMPT_CHARS = 200_000;     // ~50k tokens, suficiente para una nota grande
const TIMEOUT_MS = 60_000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 30;          // 30 requests / minuto

export type AiChatRole = 'user' | 'model';
export interface AiMessage { role: AiChatRole; text: string; }

export interface AiStatus {
  configured: boolean;
  available: boolean;
  model: string;
}

interface RateState { calls: number[]; }

/**
 * Cliente del API de Gemini (Google Generative AI). Todo se ejecuta en el
 * proceso principal — la clave nunca sale del main. El renderer solo recibe
 * los tokens generados, en streaming.
 */
export class AiService {
  private rate: RateState = { calls: [] };

  constructor(private secrets: SecretsService, private settings: SettingsRepo) {}

  status(): AiStatus {
    return {
      configured: this.secrets.hasKey(KEY_NAME) && this.secrets.available(),
      available: this.secrets.available(),
      model: this.getModel(),
    };
  }

  saveKey(key: string): void {
    const trimmed = key.trim();
    if (trimmed.length < 10) throw new Error('La clave parece demasiado corta');
    this.secrets.setKey(KEY_NAME, trimmed);
  }
  removeKey(): void { this.secrets.removeKey(KEY_NAME); }
  setModel(model: string): void { this.settings.set(MODEL_KEY, model); }
  getModel(): string {
    const stored = this.settings.get(MODEL_KEY);
    // Migra automáticamente cualquier modelo obsoleto al default actual.
    if (!stored || DEPRECATED_MODELS.has(stored)) return DEFAULT_MODEL;
    return stored;
  }

  /** Lista de modelos a probar empezando por el preferido del usuario. */
  private modelChain(): string[] {
    const preferred = this.getModel();
    return [preferred, ...FALLBACK_CHAIN.filter((m) => m !== preferred)];
  }

  /** Embedding de un solo texto (3072 dims) con gemini-embedding-001. */
  async embed(text: string): Promise<number[]> {
    const [v] = await this.embedBatch([text]);
    return v ?? [];
  }

  /** Embeddings en lote — una llamada por texto. */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    const key = this.requireKey();
    const url = `${BASE_URL}/gemini-embedding-001:embedContent?key=${encodeURIComponent(key)}`;
    const out: number[][] = [];
    for (const text of texts) {
      const body = {
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text: text.slice(0, 8000) }] },
      };
      const res = await this.timedFetch(url, body);
      if (!res.ok) {
        // No rompemos toda la indexación por un fallo puntual.
        out.push([]);
        continue;
      }
      const data = (await res.json()) as { embedding?: { values?: number[] } };
      out.push(data.embedding?.values ?? []);
    }
    return out;
  }

  /** No-streaming: para acciones cortas (resumir, generar pizarra, etc.). */
  async generate(prompt: string, opts?: { maxTokens?: number; system?: string }): Promise<string> {
    this.checkRateLimit();
    const key = this.requireKey();
    if (prompt.length > MAX_PROMPT_CHARS) throw new Error('El texto es demasiado largo para procesar.');

    const body = buildBody([{ role: 'user', text: prompt }], opts?.system, opts?.maxTokens);
    const chain = this.modelChain();
    const errors: string[] = [];

    for (const model of chain) {
      const url = `${BASE_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
      const res = await this.timedFetch(url, body);
      if (res.ok) {
        const data = (await res.json()) as GeminiResponse;
        return extractText(data);
      }
      // Si es 429 (cuota) o 503 (saturado), probamos el siguiente modelo.
      if (res.status === 429 || res.status === 503) {
        errors.push(`${model}: HTTP ${res.status}`);
        continue;
      }
      // Errores no recuperables (clave inválida, etc.): aborta de inmediato.
      await this.throwApiError(res);
    }
    throw new Error(
      `Todos los modelos disponibles están saturados o sin cuota. Detalles: ${errors.join(' · ')}. Espera unas horas o activa la facturación en https://ai.google.dev.`,
    );
  }

  /**
   * Chat con streaming. Envía cada delta al renderer destino mediante un
   * canal IPC ('ai:stream') con el `requestId` que identifica la conversación.
   */
  async chatStream(args: {
    requestId: string;
    messages: AiMessage[];
    system?: string;
    senderWebContentsId: number;
  }): Promise<void> {
    this.checkRateLimit();
    const key = this.requireKey();
    const totalChars = args.messages.reduce((n, m) => n + m.text.length, 0);
    if (totalChars > MAX_PROMPT_CHARS) throw new Error('La conversación es demasiado larga.');

    const body = buildBody(args.messages, args.system);
    const chain = this.modelChain();

    const sender = BrowserWindow.getAllWindows()
      .map((w) => w.webContents)
      .find((wc) => wc.id === args.senderWebContentsId);
    const sendEvent = (payload: { type: 'delta'; text: string } | { type: 'done' } | { type: 'error'; message: string }) => {
      sender?.send('ai:stream', { requestId: args.requestId, ...payload });
    };

    try {
      // Auto-fallback de modelos para streaming. Avisamos en el primer delta
      // si tuvimos que cambiar de modelo.
      let res: Response | null = null;
      let usedModel = '';
      const failed: string[] = [];
      for (const model of chain) {
        const url = `${BASE_URL}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`;
        const r = await this.timedFetch(url, body);
        if (r.ok) { res = r; usedModel = model; break; }
        if (r.status === 429 || r.status === 503) {
          failed.push(`${model}:${r.status}`);
          continue;
        }
        await this.throwApiError(r);
        return; // unreachable
      }
      if (!res) {
        throw new Error(
          `Todos los modelos están saturados o sin cuota gratuita (${failed.join(', ')}). Espera unas horas o activa la facturación en https://ai.google.dev.`,
        );
      }
      if (failed.length > 0) {
        sendEvent({ type: 'delta', text: `_(usando ${usedModel} — los preferidos no estaban disponibles)_\n\n` });
      }
      if (!res.body) throw new Error('La respuesta de la IA no se pudo leer');

      // Lectura del stream SSE.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE: cada evento es uno o más renglones 'data: ...' separados por \n\n.
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          const json = line.slice(5).trim();
          if (!json || json === '[DONE]') continue;
          try {
            const chunk = JSON.parse(json) as GeminiResponse;
            const delta = extractText(chunk);
            if (delta) sendEvent({ type: 'delta', text: delta });
          } catch {
            /* ignoramos chunks malformados */
          }
        }
      }
      sendEvent({ type: 'done' });
    } catch (err) {
      sendEvent({ type: 'error', message: (err as Error).message });
    }
  }

  // === Helpers internos ===

  private requireKey(): string {
    const k = this.secrets.getKey(KEY_NAME);
    if (!k) throw new Error('Configura la clave de Gemini en Ajustes → IA.');
    return k;
  }

  private checkRateLimit(): void {
    const now = Date.now();
    this.rate.calls = this.rate.calls.filter((t) => now - t < RATE_WINDOW_MS);
    if (this.rate.calls.length >= RATE_MAX_REQUESTS) {
      throw new Error('Demasiadas peticiones de IA. Espera un minuto.');
    }
    this.rate.calls.push(now);
  }

  private async timedFetch(url: string, body: unknown): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async throwApiError(res: Response): Promise<never> {
    let raw = '';
    try { raw = await res.text(); } catch { /* ignore */ }
    const model = this.getModel();
    // 429 = cuota agotada o rate-limit del lado del servidor. Mensaje útil.
    if (res.status === 429) {
      const retry = parseRetrySeconds(raw);
      const isDailyQuota = /quota|exceeded your current quota|requests per day/i.test(raw);
      const head = isDailyQuota
        ? `Se agotó la cuota gratuita diaria del modelo "${model}".`
        : `Demasiadas peticiones a Gemini en poco tiempo.`;
      const advice = isDailyQuota
        ? `Espera unas horas a que se reinicie la cuota, prueba con otro modelo en Ajustes → IA (recomendado: gemini-1.5-flash) o activa la facturación en https://ai.google.dev.`
        : retry
          ? `Vuelve a intentarlo en ${retry}.`
          : `Espera un minuto antes de volver a intentar.`;
      throw new Error(`${head} ${advice}`);
    }
    if (res.status === 400 && /API_KEY_INVALID|API key not valid/i.test(raw)) {
      throw new Error('La clave de Gemini no es válida. Pégala de nuevo en Ajustes → IA.');
    }
    if (res.status === 403) {
      throw new Error('Gemini rechazó la solicitud (clave sin permisos o región no soportada).');
    }
    const detail = raw.slice(0, 300).replace(/\s+/g, ' ').trim();
    throw new Error(`Error ${res.status} de Gemini: ${detail}`);
  }
}

// === Tipos / utilidades del wire format de Gemini ===

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

function buildBody(messages: AiMessage[], system?: string, maxTokens?: number) {
  return {
    contents: messages.map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    })),
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    generationConfig: {
      maxOutputTokens: maxTokens ?? 2048,
      temperature: 0.7,
    },
  };
}

function extractText(r: GeminiResponse): string {
  return (r.candidates ?? [])
    .map((c) => (c.content?.parts ?? []).map((p) => p.text ?? '').join(''))
    .join('');
}

/** Intenta sacar el `retryDelay` (p. ej. "23s") del cuerpo de error 429 de Google. */
function parseRetrySeconds(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { error?: { details?: Array<{ retryDelay?: string }> } };
    const delay = parsed.error?.details?.find((d) => d.retryDelay)?.retryDelay;
    if (!delay) return null;
    const m = /^(\d+(?:\.\d+)?)s$/.exec(delay);
    if (!m) return delay;
    const secs = Math.ceil(parseFloat(m[1]));
    return secs < 60 ? `${secs} segundos` : `${Math.ceil(secs / 60)} minutos`;
  } catch { return null; }
}
