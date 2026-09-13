import { z } from 'zod';

// Contrato `render_ui` tal cual lo define
// backend/src/agent/systemPrompt.md (adaptado de
// .context/agente-educacion-financiera-CLAUDE.md) — el agente arma
// `composicion`, un arreglo de bloques con esta forma, y el Renderer los
// despacha al componente visual correspondiente (sistema de diseño en
// .context/sistema-diseno-app-bancaria (2).md).
//
// `accion` + `parametros` son el mecanismo de "lo que la persona toca
// regresa al modelo como contexto": cualquier bloque interactivo los trae,
// y al tocarlo el frontend los manda de vuelta junto con `pantalla_actual`.

const accionable = {
  accion: z.string().optional(),
  parametros: z.record(z.string(), z.unknown()).optional(),
};

export const KpiBlockSchema = z.object({
  tipo: z.literal('kpi'),
  titulo: z.string(),
  valor: z.union([z.string(), z.number()]),
  moneda: z.string().optional(),
  tendencia: z.enum(['positivo', 'negativo', 'neutro']).optional(),
  comparacion: z.string().optional(),
  ...accionable,
});

export const ChartSerieSchema = z.object({
  nombre: z.string(),
  datos: z.array(z.number()),
});

export const ChartBlockSchema = z.object({
  tipo: z.literal('chart'),
  subtipo: z.enum(['linea', 'barra', 'dona', 'area']),
  titulo: z.string(),
  periodo: z.string().optional(),
  categorias: z.array(z.string()).optional(),
  series: z.array(ChartSerieSchema).min(1),
  ...accionable,
});

export const ListaItemSchema = z.object({
  titulo: z.string(),
  categoria: z.string().optional(),
  monto: z.string().optional(),
  fecha: z.string().optional(),
  ...accionable,
});

export const ListaBlockSchema = z.object({
  tipo: z.literal('lista'),
  titulo: z.string().optional(),
  items: z.array(ListaItemSchema),
});

export const AccionSugeridaSchema = z.object({
  texto: z.string(),
  accion: z.string(),
  parametros: z.record(z.string(), z.unknown()).optional(),
});

export const TarjetaBlockSchema = z.object({
  tipo: z.literal('tarjeta'),
  variante: z.enum(['alerta', 'info', 'exito', 'educativa']),
  titulo: z.string(),
  descripcion: z.string().optional(),
  accion_sugerida: AccionSugeridaSchema.optional(),
});

export const BotonBlockSchema = z.object({
  tipo: z.literal('boton'),
  texto: z.string(),
  accion: z.string(),
  parametros: z.record(z.string(), z.unknown()).optional(),
  estilo: z.enum(['primario', 'secundario']).optional(),
});

export const TextoBlockSchema = z.object({
  tipo: z.literal('texto'),
  estilo: z.enum(['titulo', 'parrafo', 'nota']),
  contenido: z.string(),
});

export const BloqueSchema = z.discriminatedUnion('tipo', [
  KpiBlockSchema,
  ChartBlockSchema,
  ListaBlockSchema,
  TarjetaBlockSchema,
  BotonBlockSchema,
  TextoBlockSchema,
]);

export const PantallaSchema = z.object({
  pantalla_id: z.string(),
  composicion: z.array(BloqueSchema),
});

export type KpiBlock = z.infer<typeof KpiBlockSchema>;
export type ChartBlock = z.infer<typeof ChartBlockSchema>;
export type ListaBlock = z.infer<typeof ListaBlockSchema>;
export type TarjetaBlock = z.infer<typeof TarjetaBlockSchema>;
export type BotonBlock = z.infer<typeof BotonBlockSchema>;
export type TextoBlock = z.infer<typeof TextoBlockSchema>;
export type Bloque = z.infer<typeof BloqueSchema>;
export type Pantalla = z.infer<typeof PantallaSchema>;

function fallbackPantalla(input: unknown): Pantalla {
  const candidato = input as Record<string, unknown> | string | null | undefined;
  const texto =
    typeof candidato === 'string'
      ? candidato
      : typeof candidato?.contenido === 'string'
        ? candidato.contenido
        : 'No se pudo generar la interfaz para esta acción. Intenta de nuevo.';

  return {
    pantalla_id: 'fallback',
    composicion: [{ tipo: 'tarjeta', titulo: 'Aviso', descripcion: texto, variante: 'alerta' }],
  };
}

/**
 * Parseo tolerante: valida cada bloque de `composicion` por separado y
 * descarta solo los inválidos (con un warning), en vez de tirar toda la
 * pantalla por un campo mal formado. Si ni siquiera hay un arreglo de
 * bloques utilizable, degrada a una tarjeta de texto plano.
 */
export function safeParsePantalla(input: unknown): Pantalla {
  const crudo = input as Record<string, unknown> | null | undefined;
  const bloquesCrudos = crudo?.composicion;

  if (!Array.isArray(bloquesCrudos)) {
    return fallbackPantalla(input);
  }

  const composicion: Bloque[] = [];
  for (const bloqueCrudo of bloquesCrudos) {
    const parsed = BloqueSchema.safeParse(bloqueCrudo);
    if (parsed.success) {
      composicion.push(parsed.data);
    } else {
      console.warn('[A2UI] bloque inválido descartado:', parsed.error.issues, bloqueCrudo);
    }
  }

  if (composicion.length === 0) {
    return fallbackPantalla(input);
  }

  const pantalla_id = typeof crudo?.pantalla_id === 'string' ? crudo.pantalla_id : 'sin_id';
  return { pantalla_id, composicion };
}
