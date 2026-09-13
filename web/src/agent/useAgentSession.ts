import { useEffect, useRef, useState } from 'react';
import { safeParsePantalla, type Pantalla } from '../a2ui/schema';
import type { ServerEvent } from './protocol';

const claveTap = (accion: string, parametros?: Record<string, unknown>) =>
  `${accion}::${JSON.stringify(parametros ?? {})}`;

/**
 * Vive en `App.tsx` (no dentro de `CanvasScreen`) para que la conexión, la
 * pila de navegación y el caché de pantallas sobrevivan a que el usuario
 * salga al menú y vuelva a entrar — así no se re-genera nada ni se manda
 * un tap/init de más. `stack` es el historial de pantallas visitadas
 * dentro del canvas (como el historial de un navegador): cada tap nuevo
 * empuja una pantalla, y "atrás" solo saca la última en vez de pedirle
 * otra vez al agente.
 */
export function useAgentSession(authUid: string | null) {
  const [stack, setStack] = useState<Pantalla[]>([]);
  const [conectado, setConectado] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const cacheRef = useRef<Map<string, Pantalla>>(new Map());
  const pendienteRef = useRef<string | null>(null);

  useEffect(() => {
    // Nuevo usuario (o logout, authUid=null): empieza de cero.
    setStack([]);
    cacheRef.current.clear();
    pendienteRef.current = null;

    if (!authUid) return;

    const ws = new WebSocket(import.meta.env.VITE_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConectado(true);
      pendienteRef.current = '__init__';
      ws.send(JSON.stringify({ type: 'init', auth_uid: authUid }));
    };

    ws.onmessage = (event) => {
      const data: ServerEvent = JSON.parse(event.data);
      if (data.type !== 'pantalla') return;

      const parsed = safeParsePantalla(data.pantalla);
      if (pendienteRef.current) {
        cacheRef.current.set(pendienteRef.current, parsed);
        pendienteRef.current = null;
      }
      setStack((prev) => [...prev, parsed]);
    };

    ws.onclose = () => setConectado(false);
    ws.onerror = () => setConectado(false);

    return () => ws.close();
  }, [authUid]);

  const pantalla = stack.length > 0 ? stack[stack.length - 1] : null;
  const atRoot = stack.length <= 1;

  const sendAction = (accion: string, parametros?: Record<string, unknown>) => {
    const clave = claveTap(accion, parametros);
    const cacheada = cacheRef.current.get(clave);

    // Ya se generó esta misma pantalla antes (mismo tap) — se reutiliza
    // tal cual, sin mandar nada por WebSocket.
    if (cacheada) {
      setStack((prev) => [...prev, cacheada]);
      return;
    }

    pendienteRef.current = clave;
    wsRef.current?.send(
      JSON.stringify({
        type: 'tap',
        auth_uid: authUid,
        pantalla_actual: pantalla?.pantalla_id ?? 'inicio',
        accion,
        parametros,
      })
    );
  };

  /** Regresa a la pantalla anterior del historial local, sin red. */
  const goBack = () => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  return { pantalla, conectado, sendAction, goBack, atRoot };
}
