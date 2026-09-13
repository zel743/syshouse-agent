import type { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import type { Agente } from './agente';
import type { ClientEvent, ServerEvent } from './protocol';
import { mockAgente } from './mockAgente';
import { deepseekAgente } from './deepseekAgente';
import { PantallaSchema } from './schema';

// Si hay API key de DeepSeek, se usa el agente real; si no, el mock por
// reglas sigue funcionando exactamente igual (mismo contrato `Agente`).
const agente: Agente = process.env.DEEPSEEK_API_KEY ? deepseekAgente : mockAgente;
if (process.env.DEEPSEEK_API_KEY) {
  console.log('[agente] Usando deepseekAgente (DeepSeek)');
} else {
  console.log('[agente] DEEPSEEK_API_KEY no configurada — usando mockAgente');
}

const FALLBACK_PANTALLA = {
  pantalla_id: 'error',
  composicion: [
    {
      tipo: 'tarjeta',
      titulo: 'Aviso',
      descripcion: 'El agente generó una respuesta inválida. Intenta de nuevo.',
      variante: 'alerta',
    },
  ],
};

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const emit = (evento: ServerEvent) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(evento));
    };

    ws.on('message', async (raw) => {
      let evento: ClientEvent;

      try {
        evento = JSON.parse(raw.toString());
      } catch {
        emit({ type: 'error', message: 'Mensaje inválido (no es JSON)' });
        return;
      }

      if (!evento.auth_uid) {
        emit({ type: 'error', message: 'Falta auth_uid' });
        return;
      }

      try {
        const pantallaCruda = await agente(
          evento.type === 'tap'
            ? {
                auth_uid: evento.auth_uid,
                accion: evento.accion,
                parametros: evento.parametros,
                pantalla_actual: evento.pantalla_actual,
              }
            : { auth_uid: evento.auth_uid, accion: null },
          emit
        );

        const parsed = PantallaSchema.safeParse(pantallaCruda);

        if (!parsed.success) {
          console.error('[agente] Pantalla inválida generada por el agente:', parsed.error.issues);
          emit({ type: 'pantalla', pantalla: FALLBACK_PANTALLA });
          return;
        }

        emit({ type: 'pantalla', pantalla: parsed.data });
      } catch (error) {
        console.error('[agente] Error procesando evento:', error);
        emit({ type: 'error', message: 'Ocurrió un error procesando tu solicitud.' });
      }
    });
  });

  return wss;
}
