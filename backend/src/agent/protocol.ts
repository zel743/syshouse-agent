// Espejo de `web/src/agent/protocol.ts`. El tap manda `pantalla_actual` +
// `accion` + `parametros` tal cual los define
// .context/agente-educacion-financiera-CLAUDE.md, sección 4.

export type ClientEvent =
  | { type: 'init'; auth_uid: string }
  | { type: 'tap'; auth_uid: string; pantalla_actual: string; accion: string; parametros?: Record<string, unknown> };

export type ServerEvent =
  | { type: 'agent_status'; text: string }
  | { type: 'tool_call'; tool: string; args: Record<string, unknown> }
  | { type: 'tool_result'; tool: string; summary: string }
  | { type: 'pantalla'; pantalla: unknown }
  | { type: 'error'; message: string };
