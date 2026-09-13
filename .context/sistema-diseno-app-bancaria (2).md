# Sistema de diseño — App bancaria móvil
### Basado en mockups de referencia ("Educación financiera", "Salidas", "Ingresos")

## 0. Propósito de este documento

Este archivo traduce un set de mockups de baja fidelidad (plantilla genérica, colores de marcador de posición) en un **sistema de componentes formal** para una app bancaria real, con **rojo y blanco como colores primarios de marca**. No es una copia 1:1 de los mockups: conserva su estructura, jerarquía y tipos de gráficas, pero resuelve la paleta, tipografía y detalles de estado que los mockups no definen.

Este documento está pensado para que un **agente generador de interfaces** lo use como base de componentes reutilizables — no debe inventar layouts desde cero, sino combinar los patrones y tokens definidos aquí. La sección 7 incluye los tokens en formato estructurado para consumo directo.

**Origen de los mockups:**
- Las 4 pantallas de **"Educación financiera"** son la **plantilla base**: la estructura (header → icono de módulo → indicadores de progreso → gráfica → chips de categoría) debe repetirse en pantallas similares, pero es un punto de partida ampliable, no un molde rígido.
- Las pantallas de **"Salidas"** (3 variantes) e **"Ingresos"** son una **compilación de elementos adicionales**: tarjeta de métrica destacada, dona con leyenda, selector segmentado y dos variantes de agrupación en tarjetas. Se usan como banco de piezas para pantallas de resumen financiero.

**Nota sobre marca:** el logotipo circular de los mockups es un marcador de posición genérico. El agente debe dejar un slot de logo neutro y **no** reproducir logotipos de bancos reales.

---

## 1. Principios de dirección visual

1. **Rojo y blanco son el "chrome" de marca, no el relleno de toda la pantalla.** Se usan en: barra superior, botones primarios, estados activos/seleccionados, indicadores de foco y acentos de marca. El **contenido** (gráficas, categorías, iconografía de módulo) usa una paleta secundaria más amplia que armoniza con el rojo, para que la app no se sienta monocromática ni agresiva a la vista.
2. **Un solo elemento con personalidad, el resto disciplinado.** El acento distintivo de esta app es la **ola decorativa** inferior (ver 2.4), heredada de los mockups. Se conserva como firma visual; el resto de la interfaz permanece sobrio (tarjetas blancas, tipografía neutra, iconografía simple de línea/duotono).
3. **Semántica de color consistente**, no decorativa: verde = positivo/ingreso/fácil, ámbar = medio, rojo = negativo/alerta/difícil, azul/morado/naranja/cian = datos neutros (categorías sin carga positiva o negativa). Esta semántica ya está presente en los mockups (ej. chips "Difícil/Medio/Fácil") y debe respetarse en toda la app.
4. **Cifras siempre legibles:** números tabulares, alineación a la derecha en listas, jerarquía clara entre cifra principal y etiqueta secundaria.
5. **Sentence case en toda la UI** (no versalitas/mayúsculas sostenidas), tono directo y en segunda persona ("Tu ahorro", "vs. mes anterior").

---

## 2. Fundamentos de marca

### 2.1 Paleta de color

**Marca (dominante en navegación y acciones):**

| Token | Uso | Hex |
|---|---|---|
| `rojo-marca` | Header principal, CTA primario, estado activo | `#E22C2C` |
| `rojo-marca-oscuro` | Estado presionado/hover de rojo-marca | `#B81F1F` |
| `rojo-marca-suave` | Fondos tenues, chips de alerta suave, hover ligero | `#FBE6E6` |
| `blanco` | Fondo base, texto sobre rojo, tarjetas | `#FFFFFF` |

**Neutros (estructura y texto):**

| Token | Uso | Hex |
|---|---|---|
| `gris-fondo` | Fondo de pantalla (no blanco puro, evita destello) | `#F7F7F9` |
| `gris-borde` | Bordes de tarjeta, divisores | `#E8E8EC` |
| `texto-principal` | Texto de alto contraste | `#1C1C1E` |
| `texto-secundario` | Etiquetas, subtítulos, leyendas | `#6B7280` |

**Secundaria / datos (para gráficas, categorías, iconografía de módulo — nunca para el header ni botones primarios):**

| Token | Uso sugerido (heredado de los mockups) | Hex |
|---|---|---|
| `verde-positivo` | Ingresos, "fácil", tendencias al alza | `#1E9E6D` |
| `verde-oliva` | Icono de módulo (árbol, meta cumplida) | `#4C7A2E` |
| `ambar-medio` | Riesgo/dificultad "medio", medidores tipo gauge | `#C99A00` |
| `azul-dato` | Categoría de dato neutro (ej. "Mobile", líneas comparativas) | `#4C6FF0` |
| `morado-dato` | Categoría de dato neutro (ej. "Desktop") | `#8B6FF0` |
| `cian-dato` | Barra de progreso secundaria, "Tablet" | `#17B3C9` |
| `naranja-dato` | Categoría de gasto (Entretenimiento) | `#F2892E` |
| `magenta-dato` | Categoría de gasto (Transporte) | `#D63A8C` |
| `indigo-dato` | Categoría de gasto (Servicios) | `#4B2E83` |
| `rojo-alerta` | "Difícil", gastos, negativo — deliberadamente distinto del `rojo-marca` para no confundir marca con alerta | `#D64545` |

> Regla de uso: en cualquier pantalla, **máximo un color de marca (rojo) como protagonista** fuera del header; el resto de rojos/verdes/azules que aparezcan son semánticos (categoría o estado), no decorativos.

### 2.2 Tipografía

- **Encabezados y cifras destacadas:** *Plus Jakarta Sans* (o similar geométrica con personalidad amable), pesos 600–700.
- **Cuerpo, listas, leyendas:** *Inter*, pesos 400–500, con `font-variant-numeric: tabular-nums` en cualquier cifra monetaria o porcentual para que las columnas de números alineen.
- **Escala tipográfica:**

| Estilo | Tamaño / interlineado | Peso | Uso |
|---|---|---|---|
| Título de header | 18 / 24 px | 700 | "Educación financiera", "Salidas", "Ingresos" |
| Cifra destacada | 28–32 / 36 px | 700 | "$18,500", "67 %" en el centro de una dona |
| Título de tarjeta | 15 / 20 px | 600 | "Gastos por categoría", "Evolución de ingresos" |
| Cuerpo | 14 / 20 px | 400 | textos generales |
| Etiqueta / leyenda | 12–13 / 16 px | 500 | leyenda de dona, ejes de gráfica |

Sentence case siempre; no usar versalitas para etiquetas de sección.

### 2.3 Radios, sombras y espaciado

- Radio de tarjeta: `20px`. Radio de botón/chip: `14px`. Pills (selector segmentado, badges): `999px` (full round).
- Sombra única y sutil para tarjetas: `0 1px 3px rgba(20,20,30,0.06)` — no variar el radio ni la sombra entre componentes del mismo nivel; la consistencia es el punto, no la variedad.
- Espaciado en escala de 4: `4, 8, 12, 16, 24, 32` px. Padding estándar de tarjeta: `16px`. Separación entre secciones: `24px`.

### 2.4 Elemento de firma: ola decorativa

Los mockups incluyen una ola inferior decorativa en cada pantalla. Se conserva como **firma visual de la app** (es el único lugar donde se permite un gesto gráfico "libre"):

- Ubicación: pie de pantalla, detrás del contenido con scroll, no interactiva.
- Color: degradado sutil en tonos `rojo-marca-suave` → `blanco` (no el beige/rosa genérico del mockup), opacidad baja para no competir con el contenido.
- Altura: ~10–12% de la pantalla, recortada, nunca tapa contenido interactivo.

---

## 3. Biblioteca de componentes base

Cada componente indica: qué mockup lo origina, sus estados clave y un icono sugerido (set `lucide-react`) para que el agente lo implemente sin inventar iconografía nueva.

| Componente | Origen en mockup | Estados / variantes | Icono sugerido |
|---|---|---|---|
| **Barra superior (header)** | Todas las pantallas | Fondo `rojo-marca` sólido, título centrado en blanco 700, botón de regreso circular blanco a la izquierda, slot de logo a la derecha | `ArrowLeft` |
| **Botón de regreso** | Círculo con flecha, esquina sup. izq. | Fondo blanco, icono `rojo-marca`; estado presionado: fondo `rojo-marca-suave` | `ArrowLeft` |
| **Icono de módulo circular** | Árbol / brote / grano / billetera | Círculo con borde 2px del color semántico del módulo, icono centrado | `TreePine`, `Sprout`, `Wheat`, `Wallet` |
| **Anillo de progreso (donut simple)** | "Porcentaje de ahorro" 67% | Dos tonos (relleno + track), cifra grande centrada, arco puede ser parcial | — (SVG/gráfica) |
| **Barra de progreso lineal** | Barras 39%/77%/67% | Pill redondeada, relleno bicolor (marca + acento), cifra a la derecha alineada | — |
| **Medidor tipo gauge (semicírculo)** | Iconos de velocímetro amarillo/verde | Aguja + banda de color según nivel (ámbar = medio, verde = fácil, rojo = difícil) | — (SVG) |
| **Gráfica de líneas / área** | "Proyección de inversión", "Evolución de ingresos" | Línea de 1–3 series, puntos marcados, grid horizontal ligero (`gris-borde`), etiquetas de eje en `texto-secundario`; con relleno de área muy sutil si es serie única | — |
| **Gráfica de dona con leyenda** | "Gastos por categoría", "Ingresos por fuente" | Centro con total en cifra destacada, leyenda en lista: punto de color + nombre + monto + % alineado a la derecha | — |
| **Chip de nivel (traffic light)** | "Plan de ahorro difícil/medio/fácil" | 3 estados fijos: rojo = difícil, ámbar = medio, verde = fácil; texto oscuro sobre el color para contraste, no blanco puro | — |
| **Botón de categoría/CTA secundario** | "Botón para planes de inversión avanzado" | Rectángulo redondeado, color semántico de fondo, texto centrado en 2 líneas si es necesario | — |
| **Selector segmentado (toggle)** | "Día · Quincena · Mes" | Pill contenedora `gris-fondo`, opción activa en pill blanca con sombra suave + texto `rojo-marca`, opciones inactivas en `texto-secundario` | — |
| **Tarjeta de métrica destacada** | "Ingresos del mes $18,500 +12.3%" | Icono circular + etiqueta + cifra grande + indicador de variación (flecha + % en `verde-positivo` o `rojo-alerta` según signo) | `TrendingUp`, `Wallet` |
| **Tarjeta contenedora** | Variante "Salidas" con bordes | Fondo blanco, radio 20px, sombra única, padding 16px — usar para agrupar cada bloque de contenido (ver 4.2) | — |

---

## 4. Patrones de pantalla

### 4.1 Plantilla base — "Módulo con indicadores de progreso"
*(origen: las 4 pantallas de Educación financiera — aplicar a cualquier pantalla educativa o de seguimiento de metas)*

```
┌──────────────────────────────┐
│  ←     Título del módulo   ⌾ │  header rojo-marca
├──────────────────────────────┤
│   (icono         gráfica de  │
│   circular)      línea/área  │
│                   con título │
│   indicador(es)   ┌────────┐ │
│   de progreso:    │        │ │
│   anillo, barras   │  chart │ │
│   o gauges         │        │ │
│                    └────────┘ │
│  [chip] [chip] [chip]  (opc.)│
├──────────────────────────────┤
│         ola de marca (fija)   │
└──────────────────────────────┘
```

Reglas:
- El icono circular y los indicadores de progreso comparten el **mismo color semántico** (verde = meta positiva, ámbar = medio, rojo = alerta) — nunca mezclar semánticas dentro del mismo módulo.
- Los chips de categoría (cuando existan) van en fila horizontal, scrolleable si no caben, debajo de la gráfica.
- En pantallas angostas (mobile), icono + indicadores van arriba, la gráfica ocupa el ancho completo debajo (nunca lado a lado como en un layout de escritorio ancho).

### 4.2 Patrón — "Resumen financiero" (Salidas / Ingresos)
*(origen: pantallas de Salidas e Ingresos — usar para cualquier pantalla de balance, gasto, ingreso o movimiento)*

Dos variantes de agrupación documentadas en los mockups; **usar variante B en mobile** por mejor escaneo visual:

- **Variante A — continua:** bloques separados solo por espaciado, sin tarjeta propia. Válida en pantallas cortas con poco contenido.
- **Variante B — en tarjetas:** cada bloque (métrica destacada, dona + leyenda, línea de tendencia) va dentro de su propia `tarjeta contenedora` (ver 3). **Recomendada por defecto** para mantener escaneo rápido en pantallas con varios bloques.

```
┌──────────────────────────────┐
│  ←        Salidas          ⌾ │  header rojo-marca (o
├──────────────────────────────┤   verde-positivo si es
│ ┌──────────────────────────┐ │   la pantalla de Ingresos)
│ │ 💳  Salidas al mes        │ │
│ │     $72,000               │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Gastos por categoría       │ │
│ │   (dona + total al centro) │ │
│ │   ● Vivienda   $31,000 43% │ │
│ │   ● Alimentos  $17,000 23% │ │
│ │   ...                      │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Salidas mensuales           │ │
│ │   (línea de tendencia)      │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

Notas específicas de "Ingresos":
- Incluye el **selector segmentado** (Día/Quincena/Mes) dentro de la tarjeta de tendencia.
- El indicador de variación ("+12.3% vs. mes anterior") usa `verde-positivo` con flecha ascendente; si el mes es negativo, usar `rojo-alerta` con flecha descendente — el color nunca es fijo, depende del signo del dato.
- Encabezado: se recomienda **mantener `rojo-marca`** en el header por consistencia de marca en toda la app; si se quiere diferenciar Ingresos de Salidas a simple vista, hacerlo con un **badge o icono en `verde-positivo`** junto al título, no cambiando el color completo del header.

---

## 5. Reglas de aplicación de color (resumen ejecutable)

- **Header, botón primario, estado seleccionado, foco de accesibilidad → `rojo-marca` + `blanco`.** Siempre.
- **Gráficas, categorías, iconografía de módulo → paleta secundaria** (2.1), elegida por semántica, no al azar.
- **Nunca** más del 20–25% de una pantalla en `rojo-marca` sólido fuera del header (evitar "todo rojo").
- **Nunca** dejar una categoría de gasto/ingreso sin color asignado de forma consistente entre pantallas (ej. "Alimentos" siempre `azul-dato` en toda la app).
- Fondo de pantalla siempre `gris-fondo`, tarjetas siempre `blanco`, para que las tarjetas se separen del fondo sin necesitar borde grueso.

---

## 6. Accesibilidad y responsividad

- Contraste texto/fondo mínimo AA (4.5:1); texto blanco sobre `rojo-marca` cumple, verificar `ambar-medio` con texto oscuro (no blanco) encima.
- El nivel "difícil/medio/fácil" nunca se comunica solo por color: siempre acompañado de texto (ya presente en los mockups) o icono.
- Layout mobile-first: una sola columna, tarjetas de ancho completo; en tablet/desktop las gráficas pueden ir a dos columnas dentro de la misma tarjeta o en tarjetas lado a lado, pero el orden de lectura mobile (métrica → desglose → tendencia) se mantiene.
- Números siempre con `tabular-nums` y separador de miles; moneda con símbolo `$` y sin decimales salvo que el monto los requiera.
- Estados de foco de teclado visibles (outline `rojo-marca` 2px) en todo elemento interactivo.

---

## 7. Tokens estructurados (para consumo del agente)

```json
{
  "color": {
    "brand": {
      "red": "#E22C2C",
      "redDark": "#B81F1F",
      "redSoft": "#FBE6E6",
      "white": "#FFFFFF"
    },
    "neutral": {
      "background": "#F7F7F9",
      "border": "#E8E8EC",
      "textPrimary": "#1C1C1E",
      "textSecondary": "#6B7280"
    },
    "data": {
      "positiveGreen": "#1E9E6D",
      "oliveGreen": "#4C7A2E",
      "amberMid": "#C99A00",
      "blue": "#4C6FF0",
      "purple": "#8B6FF0",
      "cyan": "#17B3C9",
      "orange": "#F2892E",
      "magenta": "#D63A8C",
      "indigo": "#4B2E83",
      "alertRed": "#D64545"
    }
  },
  "typography": {
    "headingFont": "Plus Jakarta Sans",
    "bodyFont": "Inter",
    "scale": {
      "headerTitle": { "size": 18, "lineHeight": 24, "weight": 700 },
      "metricHighlight": { "size": 30, "lineHeight": 36, "weight": 700 },
      "cardTitle": { "size": 15, "lineHeight": 20, "weight": 600 },
      "body": { "size": 14, "lineHeight": 20, "weight": 400 },
      "label": { "size": 12, "lineHeight": 16, "weight": 500 }
    }
  },
  "radius": { "card": 20, "button": 14, "pill": 999 },
  "shadow": { "card": "0 1px 3px rgba(20,20,30,0.06)" },
  "spacing": [4, 8, 12, 16, 24, 32],
  "components": [
    "top_app_bar", "back_button_circular", "module_icon_circular",
    "progress_ring", "progress_bar_linear", "gauge_semicircle",
    "line_area_chart", "donut_chart_with_legend", "traffic_light_chip",
    "category_cta_button", "segmented_toggle", "highlight_metric_card",
    "container_card", "decorative_wave_footer"
  ],
  "screenPatterns": ["module_progress_template", "financial_summary_pattern"]
}
```

---

## 8. Notas y restricciones para el agente generador de UI

- Reutilizar los componentes de la sección 3 y los patrones de la sección 4 en vez de crear layouts nuevos; solo diseñar desde cero lo que no esté cubierto aquí.
- No usar rojo y blanco fuera de sus usos definidos en la sección 5.
- No reproducir el logotipo del mockup original: usar un slot de logo neutro/placeholder.
- Mantener nombres de categoría y su color asociado consistentes entre pantallas (ej. "Vivienda" siempre el mismo morado en toda la app).
- Todo texto de UI en sentence case, tono directo, sin adornos tipográficos (sin versalitas, sin separadores decorativos tipo "—" o "·").
- La ola decorativa (2.4) es el único elemento "libre"; el resto de la interfaz debe ser sobrio y consistente en radio, sombra y espaciado.
