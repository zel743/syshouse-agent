// Paleta secundaria de .context/sistema-diseno-app-bancaria (2).md, sección 2.1
// — nunca para header/botones primarios, solo para categorías/series de datos.
export const DATA_PALETTE = [
  '#4C6FF0', // azul-dato
  '#8B6FF0', // morado-dato
  '#17B3C9', // cian-dato
  '#F2892E', // naranja-dato
  '#D63A8C', // magenta-dato
  '#4B2E83', // indigo-dato
  '#4C7A2E', // verde-oliva
  '#C99A00', // ambar-medio
];

/**
 * Determinístico: el mismo nombre de categoría/serie siempre cae en el
 * mismo color en toda la app (regla de diseño 5), sin necesitar un
 * registro central categoría→color.
 */
export function colorForLabel(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return DATA_PALETTE[hash % DATA_PALETTE.length];
}
