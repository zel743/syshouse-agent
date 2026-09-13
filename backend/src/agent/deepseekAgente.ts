import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { z } from 'zod';
import type { Agente } from './agente';
import { PantallaSchema, type Pantalla } from './schema';
import { listarHerramientasMcp, llamarHerramientaMcp } from './mcpClient';

// DeepSeek expone una API compatible con la de OpenAI (Chat Completions +
// function calling) — por eso se usa el SDK `openai` apuntando a otro
// `baseURL` en vez de instalar un SDK propio de DeepSeek.
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const MAX_TURNOS = 6;

const SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, 'systemPrompt.md'), 'utf-8');

const RENDER_UI_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'render_ui',
    description:
      'Muestra la pantalla final al usuario. Es tu ÚNICA forma de responder — nunca respondas con texto plano. Llama esta función exactamente una vez, al final, con la composición completa de la pantalla.',
    parameters: z.toJSONSchema(PantallaSchema) as Record<string, unknown>,
  },
};

let deepseek: OpenAI | null = null;
function client(): OpenAI {
  if (!deepseek) {
    deepseek = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' });
  }
  return deepseek;
}

function fallbackPantalla(mensaje: string): Pantalla {
  return {
    pantalla_id: 'error_agente',
    composicion: [{ tipo: 'tarjeta', variante: 'alerta', titulo: 'No pude generar tu pantalla', descripcion: mensaje }],
  };
}

export const deepseekAgente: Agente = async (ctx, emit) => {
  const herramientasMcp = await listarHerramientasMcp();
  const tools: ChatCompletionTool[] = [
    ...herramientasMcp.map(
      (h): ChatCompletionTool => ({
        type: 'function',
        function: { name: h.name, description: h.description, parameters: h.input_schema as Record<string, unknown> },
      })
    ),
    RENDER_UI_TOOL,
  ];

  const contexto = {
    auth_uid: ctx.auth_uid,
    pantalla_actual: ctx.pantalla_actual ?? null,
    accion: ctx.accion ?? 'ver_resumen',
    parametros: ctx.parametros ?? {},
  };

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(contexto) },
  ];

  for (let turno = 0; turno < MAX_TURNOS; turno++) {
    emit({ type: 'agent_status', text: turno === 0 ? 'Analizando tu solicitud…' : 'Procesando resultados…' });

    const respuesta = await client().chat.completions.create({
      model: MODEL,
      messages,
      tools,
    });

    const mensaje = respuesta.choices[0].message;
    messages.push({ role: 'assistant', content: mensaje.content, tool_calls: mensaje.tool_calls });

    const llamadas = mensaje.tool_calls ?? [];
    const llamadaRenderUi = llamadas.find((t) => t.type === 'function' && t.function.name === 'render_ui');

    if (llamadaRenderUi && llamadaRenderUi.type === 'function') {
      let input: unknown;
      try {
        input = JSON.parse(llamadaRenderUi.function.arguments);
      } catch {
        return fallbackPantalla('El agente generó un JSON inválido para la pantalla. Intenta de nuevo.');
      }

      const parsed = PantallaSchema.safeParse(input);
      if (!parsed.success) {
        console.error('[deepseekAgente] render_ui con input inválido:', parsed.error.issues);
        return fallbackPantalla('El agente generó una pantalla con un formato inválido. Intenta de nuevo.');
      }
      return parsed.data;
    }

    if (llamadas.length === 0) {
      console.warn('[deepseekAgente] El modelo respondió sin llamar a ninguna tool (finish_reason:', respuesta.choices[0].finish_reason, ')');
      break;
    }

    for (const llamada of llamadas) {
      if (llamada.type !== 'function') continue;

      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(llamada.function.arguments || '{}');
      } catch {
        // args inválidos: se manda vacío y se deja que la tool de mcp/ rechace por schema
      }

      emit({ type: 'tool_call', tool: llamada.function.name, args });

      try {
        const { data, isError } = await llamarHerramientaMcp(llamada.function.name, args);
        emit({ type: 'tool_result', tool: llamada.function.name, summary: JSON.stringify(data).slice(0, 200) });
        messages.push({ role: 'tool', tool_call_id: llamada.id, content: JSON.stringify(isError ? { error: data } : data) });
      } catch (error) {
        const mensajeError = error instanceof Error ? error.message : 'Error desconocido llamando la tool';
        emit({ type: 'tool_result', tool: llamada.function.name, summary: `error: ${mensajeError}` });
        messages.push({ role: 'tool', tool_call_id: llamada.id, content: JSON.stringify({ error: mensajeError }) });
      }
    }
  }

  return fallbackPantalla('El agente no pudo generar una respuesta a tiempo. Intenta de nuevo.');
};
