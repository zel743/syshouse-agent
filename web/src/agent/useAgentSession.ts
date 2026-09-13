import { useEffect, useRef, useState } from 'react';
import { safeParsePantalla, type Pantalla } from '../a2ui/schema';
import type { ServerEvent } from './protocol';

export function useAgentSession(authUid: string) {
  const [pantalla, setPantalla] = useState<Pantalla | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [conectado, setConectado] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pantallaActualRef = useRef<string>('inicio');

  useEffect(() => {
    const ws = new WebSocket(import.meta.env.VITE_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConectado(true);
      ws.send(JSON.stringify({ type: 'init', auth_uid: authUid }));
    };

    ws.onmessage = (event) => {
      const data: ServerEvent = JSON.parse(event.data);

      switch (data.type) {
        case 'agent_status':
          setLog((prev) => [...prev, data.text]);
          break;
        case 'tool_call':
          setLog((prev) => [...prev, `→ llamando ${data.tool}(${JSON.stringify(data.args)})`]);
          break;
        case 'tool_result':
          setLog((prev) => [...prev, `← ${data.tool}: ${data.summary}`]);
          break;
        case 'pantalla': {
          const parsed = safeParsePantalla(data.pantalla);
          pantallaActualRef.current = parsed.pantalla_id;
          setPantalla(parsed);
          break;
        }
        case 'error':
          setLog((prev) => [...prev, `⚠ ${data.message}`]);
          break;
      }
    };

    ws.onclose = () => setConectado(false);
    ws.onerror = () => setConectado(false);

    return () => ws.close();
  }, [authUid]);

  const sendAction = (accion: string, parametros?: Record<string, unknown>) => {
    setLog([]);
    setPantalla(null);
    wsRef.current?.send(
      JSON.stringify({
        type: 'tap',
        auth_uid: authUid,
        pantalla_actual: pantallaActualRef.current,
        accion,
        parametros,
      })
    );
  };

  return { pantalla, log, conectado, sendAction };
}
