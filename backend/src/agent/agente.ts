import type { Pantalla } from './schema';
import type { ServerEvent } from './protocol';

export type AgenteContexto = {
  auth_uid: string;
  /** null = carga inicial de la pantalla (no fue un tap sobre un bloque) */
  accion: string | null;
  parametros?: Record<string, unknown>;
  /** pantalla_id de la pantalla desde la que se disparó el tap, si aplica */
  pantalla_actual?: string;
};

export type EmitirEvento = (evento: ServerEvent) => void;

/**
 * Contrato que debe cumplir cualquier implementación del agente — la mock
 * basada en reglas de hoy, o el loop real contra Claude después.
 * `emit` sirve para transmitir en vivo qué tool está llamando y qué va
 * generando, mientras arma la Pantalla final que se devuelve.
 */
export type Agente = (ctx: AgenteContexto, emit: EmitirEvento) => Promise<Pantalla>;
