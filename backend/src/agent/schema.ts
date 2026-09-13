import { z } from 'zod';

// Espejo de `web/src/a2ui/schema.ts` — el contrato `render_ui` documentado
// en `systemPrompt.md` (adaptado de
// .context/agente-educacion-financiera-CLAUDE.md). El backend valida la
// `Pantalla` con este mismo schema antes de mandarla por WebSocket. Debe
// mantenerse en sync con la copia del frontend.

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

export type Bloque = z.infer<typeof BloqueSchema>;
export type Pantalla = z.infer<typeof PantallaSchema>;
