---
title: "Documentación Técnica — Agente de Educación Financiera (Banorte Challenge)"
subtitle: "Arquitectura, tecnologías y funcionamiento del sistema"
---

# Documentación Técnica del Proyecto

**Proyecto:** Agente de Educación Financiera — Banorte Challenge (HackMTY / Tec de Monterrey)
**Repositorio:** `syshouse-agent` (monorepo)

---

## 1. Resumen ejecutivo

El proyecto implementa un agente de inteligencia artificial capaz de **generar
interfaces de usuario dinámicamente** a partir de los datos financieros
reales de una persona, en vez de mostrar pantallas fijas con plantillas. El
usuario nunca escribe texto: cada toque sobre la interfaz se interpreta como
una intención, el agente decide qué información traer y cómo componer la
siguiente pantalla, y el frontend la dibuja usando un catálogo de
componentes visuales ya diseñado.

La arquitectura descansa en tres piezas no negociables, exigidas por las
bases del reto:

- **LLM** — el modelo (DeepSeek) interpreta la intención del usuario, decide
  qué herramientas usar y compone la respuesta.
- **MCP** (*Model Context Protocol*) — expone al modelo los datos financieros
  reales como herramientas (`tools`) estandarizadas.
- **A2UI** (*Agent-to-UI*) — el protocolo propio (`render_ui`) con el que el
  agente describe la pantalla que se debe mostrar, en vez de responder con
  texto plano.

```
Usuario (tap)
   │
   ▼
Frontend (React)  ──WebSocket──▶  Backend (Express)
   ▲                                   │
   │                                   ▼
   │                              LLM (DeepSeek)
   │                                   │
   │                    ┌──────────────┴──────────────┐
   │                    ▼                              ▼
   │              Tools de MCP                   render_ui (A2UI)
   │                    │                              │
   │                    ▼                              │
   │           Azure PostgreSQL                         │
   │                    │                              │
   └────────────────────┴──────────────────────────────┘
           (el JSON de render_ui regresa validado al frontend,
            que lo dibuja con su catálogo de componentes)
```

---

## 2. Estructura del monorepo

```
syshouse-agent/
├── web/          Frontend activo — React + Vite + TypeScript
├── backend/      Orquestador — Node.js + Express + TypeScript
├── mcp/          Servidor de datos — Node.js + Express + MCP SDK
├── app-mobil/    Frontend anterior (Expo/React Native) — congelado, sin uso
├── package.json  Orquesta backend/+mcp/ como un solo servicio (deploy)
└── railway.json  Configuración de build/deploy para Railway
```

`app-mobil/` fue el prototipo inicial (app móvil). El proyecto pivoteó a
**web puro** porque lo que se evalúa es la capacidad del agente de generar
UI dinámicamente, no la app como producto — una web sin las
particularidades de React Native (builds nativos, stores, etc.) permite
invertir el tiempo disponible en la pieza que sí se evalúa: el renderer y el
agente.

---

## 3. Tecnologías utilizadas

### 3.1 Frontend (`web/`)

- **React 19 + Vite**: SPA, sin framework de servidor (no Next.js)
- **TypeScript**: tipado estricto en todo el proyecto
- **Zod**: validación en tiempo de ejecución del contrato `render_ui`
- **Recharts**: gráficas (línea, área, barra, dona)
- **lucide-react**: iconografía
- **CSS plano + variables de diseño**: sin framework de UI (Tailwind, MUI, etc.) — sistema de diseño propio basado en tokens
- **Vitest + Testing Library**: pruebas automatizadas del renderer
- **Google Fonts** (Plus Jakarta Sans + Inter): tipografía

### 3.2 Backend (`backend/`)

- **Node.js + Express**: API REST + servidor WebSocket
- **TypeScript**: compilado con `tsc`, desarrollo con `ts-node-dev`
- **ws**: servidor WebSocket para el canal del agente
- **bcrypt**: hash de contraseñas
- **jsonwebtoken**: sesión de usuario (JWT, expiración 2h)
- **pg**: cliente de PostgreSQL
- **@modelcontextprotocol/sdk**: cliente MCP (consume las tools de `mcp/`)
- **openai** (SDK): cliente para la API de DeepSeek (compatible con OpenAI)
- **swagger-ui-express**: documentación interactiva del REST en `/api-docs`
- **Zod**: validación del `render_ui` que genera el agente antes de enviarlo

### 3.3 Servidor de datos (`mcp/`)

- **Node.js + Express**: transporte HTTP
- **@modelcontextprotocol/sdk**: implementación del servidor MCP (`McpServer`, `StreamableHTTPServerTransport`)
- **pg**: conexión propia e independiente a Azure PostgreSQL
- **Zod**: definición de los parámetros de entrada de cada tool

### 3.4 Base de datos e infraestructura

- **Azure Database for PostgreSQL** (Flexible Server): base de datos relacional, única fuente de verdad
- **Railway**: hosting de `backend/` + `mcp/` (un solo servicio)
- **Vercel**: hosting del frontend estático (`web/`)
- **DeepSeek API**: LLM que impulsa al agente en producción

---

## 4. Base de datos (Azure PostgreSQL)

### 4.1 Tablas

```
usuarios
├── id, auth_uid, nombre, perfil, racha_inversion
├── fecha_registro
├── password_hash        (autenticación)
└── saldo_actual         (saldo real, para comparar contra el calculado)

transacciones
├── id, usuario_id → usuarios.id
├── tipo   ('ingreso' | 'gasto' | 'deuda' | 'ahorro' | 'inversion')
├── monto, fecha, categoria, descripcion

resumen_mensual
├── id, usuario_id → usuarios.id
├── mes (único por usuario)
├── total_ingresos, total_gastos, saldo_calculado
└── total_deuda, total_ahorro, total_inversion

recomendaciones_ia
├── id, usuario_id → usuarios.id
├── tipo_plan ('ahorro' | 'inversion')
├── nivel ('facil' | 'medio' | 'dificil')
└── porcentaje, activa

deudas
├── id, usuario_id → usuarios.id
├── nombre, tipo (tarjeta_credito, prestamo_personal, hipotecario, ...)
├── saldo_pendiente, monto_original, pago_periodico, periodicidad_pago
├── tasa_interes, cat, fecha_corte, fecha_limite, pagos_restantes
└── cuenta_asociada, estado

inversiones
├── id, usuario_id → usuarios.id
├── tipo_inversion (cetes, acciones, fondos, etf, bonos, ...)
├── nombre_instrumento, monto_invertido, valor_actual
├── rendimiento, rendimiento_pct
└── fecha_inicio, fecha_vencimiento, plazo, nivel_riesgo, liquidez
```

### 4.2 Datos de demo

Cuatro usuarios cubren los cuatro perfiles financieros que el agente debe
reconocer y tratar de forma distinta — el mismo agente, el mismo catálogo de
componentes, cuatro interfaces distintas porque los datos son distintos:

| Usuario | Perfil | Característica clave |
|---|---|---|
| Luis | Novato | Sin historial — el agente no fuerza gráficas ni recomienda planes |
| Ana | Deudor | Deuda de tarjeta de crédito con ~15% de sus ingresos destinados al pago |
| Carlos | Inversor | Inversión en CETES con rendimiento positivo |
| Marta | Ahorrativo | Tasa de ahorro alta (~63%), deuda mínima casi liquidada |

### 4.3 Seguridad de acceso

- Autenticación con `bcrypt` (hash) + `jsonwebtoken` (sesión).
- El firewall de Azure Postgres restringe el acceso por IP; durante el
  desarrollo y despliegue se autorizan explícitamente las IPs necesarias
  (equipo de desarrollo, servicio de Railway).
- Las credenciales de conexión viven únicamente en variables de entorno
  (`.env` locales, Variables de Railway) — nunca en el repositorio.

---

## 5. Servidor MCP (`mcp/`)

### 5.1 Qué es y por qué existe

MCP (*Model Context Protocol*) es un estándar abierto para exponerle a un
modelo de lenguaje datos y herramientas de forma estructurada, sin que el
modelo necesite saber cómo consultarlos directamente. `mcp/` es el único
componente con acceso a la base de datos financiera — ni el frontend ni el
LLM la tocan directamente.

### 5.2 Diseño

- **Transporte:** `StreamableHTTPServerTransport` sobre Express, expuesto en
  `POST /mcp`.
- **Modo *stateless*:** cada request crea su propio `McpServer` y su propio
  `transport` — no hay sesión compartida entre llamadas, siguiendo el patrón
  oficial del SDK para este modo. Esto simplifica el despliegue (no hay
  estado que sincronizar entre instancias) a cambio de recalcular el
  contexto en cada llamada, lo cual es aceptable porque el agente de todas
  formas vuelve a consultar el perfil del usuario en cada tap.
- **Nunca se expone públicamente:** corre en el mismo contenedor que
  `backend/`, en un puerto interno (`MCP_PORT`, por defecto `8000`) al que
  solo `backend/` accede vía `localhost`. Railway solo genera dominio
  público para el puerto de `backend/`.

### 5.3 Catálogo de herramientas (tools)

Todas reciben `auth_uid` (el identificador del usuario ya autenticado):

| Tool | Devuelve |
|---|---|
| `obtener_perfil_usuario` | Nombre, perfil, racha de inversión |
| `obtener_resumen_mensual` | Historial mensual completo (para comparar periodos) |
| `obtener_balance` | Ingresos, salidas, saldo esperado vs. saldo actual y su diferencia |
| `obtener_ingresos` | Movimientos de ingreso |
| `obtener_gastos` | Movimientos de gasto, opcionalmente por categoría |
| `obtener_ahorro` | Monto ahorrado y tasa de ahorro calculada |
| `obtener_deudas` | Deudas activas con condiciones de pago |
| `obtener_inversiones` | Inversiones activas con rendimiento |
| `obtener_historial_movimientos` | Detalle completo de movimientos de un mes específico |
| `obtener_recomendaciones` | Planes de ahorro/inversión según perfil (niveles fácil/medio/difícil) |

Cada tool valida sus parámetros de entrada con **Zod** antes de tocar la
base de datos, y devuelve `isError: true` con un mensaje claro cuando el
usuario no existe, en vez de fallar de forma opaca.

---

## 6. Protocolo A2UI (`render_ui`)

### 6.1 El contrato

El agente nunca responde con texto libre. Su única forma de comunicarse con
el usuario es construyendo un objeto JSON con esta forma:

```json
{
  "pantalla_id": "home_resumen",
  "composicion": [
    { "tipo": "kpi", "...": "..." },
    { "tipo": "chart", "...": "..." },
    { "tipo": "texto", "...": "..." }
  ]
}
```

`composicion` es un arreglo de **bloques** — cada uno de un tipo fijo del
catálogo (sección 6.2). El agente decide **cuáles usar, cuántos, en qué
orden y con qué datos** en cada pantalla; el diseño visual de cada tipo de
bloque ya está resuelto de antemano, así que el modelo nunca inventa
layout ni CSS.

### 6.2 Catálogo de componentes

| Tipo | Para qué sirve |
|---|---|
| `kpi` | Un indicador numérico destacado (cifra grande + tendencia) |
| `chart` | Gráfica: `linea`, `barra`, `dona` o `area` |
| `lista` | Movimientos o elementos enumerables, con monto con signo |
| `tarjeta` | Mensaje destacado (`alerta`, `info`, `exito`, `educativa`), con una acción sugerida opcional |
| `boton` | Acción táctil explícita |
| `texto` | Análisis o explicación en lenguaje natural (`titulo`, `parrafo` o `nota`) |

Cualquier bloque interactivo trae un campo `accion` (y opcionalmente
`parametros`) — ese es el mecanismo completo de "lo que la persona toca
regresa al modelo como contexto": al tocar el bloque, el frontend manda
`{accion, parametros, pantalla_actual}` de vuelta al backend como la
siguiente intención del usuario.

### 6.3 Validación defensiva (por qué importa en una demo en vivo)

El contrato se valida con **Zod** en dos puntos:

1. **En el backend**, antes de enviar el `render_ui` al frontend — si el
   agente generó algo que no cumple el schema, se sustituye por una
   pantalla de aviso genérica en vez de mandar basura.
2. **En el frontend**, con una validación *tolerante*: cada bloque se
   valida por separado y **solo se descartan los inválidos** — un campo mal
   formado en un bloque no rompe toda la pantalla. Si no queda ni un bloque
   utilizable, se degrada a una tarjeta de texto plano con lo que se pueda
   rescatar del contenido original.

### 6.4 Sistema de diseño

El catálogo de componentes se implementa sobre un sistema de diseño con
tokens propios (no un framework de UI de terceros):

- **Marca:** rojo (`#E22C2C`) y blanco, usados únicamente en el header, el
  botón primario y estados activos — nunca como relleno de pantalla.
- **Datos:** una paleta secundaria (azul, morado, cian, naranja, magenta,
  índigo, oliva, ámbar) para categorías y series de gráficas, asignada de
  forma determinística por nombre (el mismo nombre de categoría siempre cae
  en el mismo color en toda la app).
- **Tipografía:** Plus Jakarta Sans (encabezados/cifras) + Inter (cuerpo),
  con `font-variant-numeric: tabular-nums` para que las columnas de números
  alineen.
- **Elemento de firma:** una ola decorativa de fondo, no interactiva,
  heredada del diseño de referencia del hackathon.
- **Componentes especiales:** gráfica de dona con el total al centro y
  leyenda con porcentajes; chips tipo semáforo (verde/ámbar/rojo) para los
  niveles de dificultad de los planes de ahorro/inversión.

---

## 7. Agente e integración del LLM

### 7.1 Arquitectura: backend como cliente MCP

Se descartó el conector nativo de *tool use* de los proveedores de LLM (que
exige que el servidor MCP sea públicamente accesible por HTTPS) a favor de
un **loop manual de tool-calling** controlado por `backend/`:

```
1. Llega un tap (o la entrada inicial) al backend por WebSocket.
2. El backend arma el mensaje con la intención (`accion`, `parametros`,
   `pantalla_actual`) y se lo manda al LLM junto con la lista de tools
   disponibles (las de mcp/ + una tool local `render_ui`).
3. El LLM decide si necesita datos: si llama una tool de mcp/, el backend
   ejecuta la llamada real contra mcp/ → Azure Postgres, y le devuelve el
   resultado al modelo.
4. Este ciclo puede repetirse varias veces (el modelo puede pedir varias
   tools antes de responder).
5. Cuando el modelo ya tiene lo que necesita, llama a la tool `render_ui`
   con el JSON de la pantalla — esa es su única forma de "responder".
6. El backend valida ese JSON contra el schema y lo transmite al frontend.
```

Esta arquitectura es **agnóstica al proveedor de LLM**: el contrato de
tools (JSON Schema) y el formato de `render_ui` no cambian según el
proveedor — solo cambia el cliente HTTP que habla con la API del modelo.

### 7.2 LLM: DeepSeek

El proveedor de LLM en producción es **DeepSeek**, vía su API compatible
con el formato de OpenAI (Chat Completions + function calling). Esto
permite reutilizar el SDK oficial de `openai` apuntado a un `baseURL`
distinto, sin necesitar un SDK propio de DeepSeek.

- **Modelo:** `deepseek-chat` (configurable por variable de entorno).
- **Tools:** las 10 tools de `mcp/` (convertidas a formato
  `{type: 'function', function: {name, description, parameters}}`) más la
  tool `render_ui`, cuyo `parameters` se genera automáticamente desde el
  mismo schema de Zod que valida la salida (`z.toJSONSchema(...)`) — el
  contrato vive en un solo lugar.
- **Límite de turnos:** el loop tiene un tope de iteraciones (protección
  contra que el modelo entre en un ciclo sin invocar `render_ui`).

### 7.3 Agente intercambiable (mock ↔ real)

El sistema define un tipo `Agente` — una función con la firma
`(contexto, emitirEvento) => Promise<Pantalla>` — que **ambas**
implementaciones cumplen por igual:

- **`mockAgente.ts`** — un agente basado en reglas fijas (sin LLM), que
  llama a las mismas tools reales de `mcp/` y decide la composición a
  partir de los datos reales del mes (ej. `deuda/ingresos > 10%` → tarjeta
  de alerta). Se usó para desarrollar y probar todo el sistema (frontend,
  protocolo, base de datos) sin depender de una API key ni gastar créditos.
- **`deepseekAgente.ts`** — el loop real descrito en 7.1, contra la API de
  DeepSeek.

`backend/` elige automáticamente cuál usar según si la variable de entorno
`DEEPSEEK_API_KEY` está configurada — sin esa variable, el sistema sigue
funcionando de punta a punta con el agente mock, útil como entorno de
desarrollo sin costo y como respaldo si el LLM no está disponible.

### 7.4 El `system prompt`

`backend/src/agent/systemPrompt.md` es el documento que se le da al modelo
como instrucciones de sistema. Define:

- El rol del agente y sus principios rectores (nunca inventar datos, nunca
  responder con texto plano, priorizar educar sobre recomendar, etc.).
- Cómo interpretar el `accion`/`parametros` de un tap.
- El modelo de datos financieros (gastos, ingresos, balance, deudas, ahorro,
  inversiones) y cómo se clasifican los cuatro perfiles.
- El catálogo completo de tools de MCP y el catálogo completo de
  componentes `render_ui`, con reglas de cuándo usar cada uno.
- Ejemplos *few-shot* de composición variable, tomados de salidas reales
  verificadas contra los 4 usuarios de demo — no inventados.

### 7.5 Streaming del proceso del agente (WebSocket)

El canal entre frontend y backend es un **WebSocket** (no REST) para poder
transmitir en vivo qué está haciendo el agente mientras arma la respuesta:
qué tool está llamando y qué le regresó, antes de la pantalla final. Tipos
de evento:

```
Cliente → Servidor:  { type: 'init', auth_uid }
                      { type: 'tap', auth_uid, pantalla_actual, accion, parametros }

Servidor → Cliente:  { type: 'agent_status', text }
                      { type: 'tool_call', tool, args }
                      { type: 'tool_result', tool, summary }
                      { type: 'pantalla', pantalla }
                      { type: 'error', message }
```

### 7.6 Caché y navegación en el frontend

Para no repetir llamadas al LLM/API innecesariamente, el frontend mantiene
por sesión:

- Un **caché** de pantallas ya generadas, indexado por la combinación
  `accion + parametros` — repetir el mismo tap reutiliza la pantalla ya
  generada sin volver a consultar al agente.
- Una **pila de navegación** (como el historial de un navegador): cada tap
  nuevo empuja una pantalla; el botón de "regresar" primero navega hacia
  atrás dentro de esa pila (instantáneo, sin red) y solo sale al menú
  principal cuando ya no hay nada más atrás.
- La conexión WebSocket y este estado viven a nivel de la aplicación (no de
  la pantalla del canvas), así que salir al menú y volver a entrar no
  reconecta ni regenera nada.

---

## 8. Infraestructura y despliegue

### 8.1 Backend + MCP → Railway (un solo servicio)

`backend/` y `mcp/` se despliegan como **un único servicio de Railway**,
ambos procesos corriendo en el mismo contenedor y comunicándose por
`localhost` — `mcp/` nunca se expone públicamente. Un `package.json` en la
raíz del repositorio orquesta ambos procesos:

```json
{
  "scripts": {
    "build": "npm install --prefix mcp && npm run build --prefix mcp && npm install --prefix backend && npm run build --prefix backend",
    "start": "concurrently -k -n mcp,backend \"node mcp/dist/index.js\" \"node backend/dist/index.js\""
  }
}
```

Puntos clave de esta configuración:

- `MCP_PORT` (fijo, interno) separa el puerto de `mcp/` del `PORT` dinámico
  que Railway asigna a `backend/` — evita que ambos procesos compitan por
  el mismo puerto.
- `"engines": {"node": ">=20"}` fuerza a Railway a aprovisionar Node 20+,
  requerido por el SDK de MCP (usa el `crypto` global del Web Crypto API,
  disponible por defecto solo desde esa versión).
- El paso de build de `backend/` copia explícitamente `systemPrompt.md` a
  `dist/`, porque `tsc` solo compila archivos `.ts` y no copia archivos
  sueltos.

### 8.2 Frontend → Vercel

`web/` se despliega en Vercel como un build estático de Vite
(`Root Directory: web/`, detectado automáticamente). Variables de entorno:
`VITE_API_URL` (REST) y `VITE_WS_URL` (WebSocket, `wss://` en producción)
apuntando a la URL pública de Railway.

### 8.3 Variables de entorno relevantes

| Servicio | Variables |
|---|---|
| `backend/` | `DB_HOST/USER/PASSWORD/NAME/PORT`, `JWT_SECRET`, `MCP_URL`, `MCP_PORT`, `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` |
| `mcp/` | `DB_HOST/USER/PASSWORD/NAME/PORT`, `MCP_PORT` |
| `web/` | `VITE_API_URL`, `VITE_WS_URL` |

Ninguna credencial vive en el repositorio — todas se inyectan como
variables de entorno en cada plataforma.

---

## 9. APIs del sistema

### 9.1 API REST de `backend/`

- **`POST /api/auth/login`**: login — recibe `{usuario, password}`, devuelve `{token, auth_uid, nombre, perfil, ...}`
- **`GET /api/education/perfil/:auth_uid`**: perfil financiero de un usuario
- **`GET /health`**: health check
- **`GET /api-docs`**: documentación interactiva (Swagger UI) del REST — generada desde `backend/src/openapi.ts`, incluye "Try it out" para probar cada endpoint desde el navegador

### 9.2 API WebSocket de `backend/` (`/ws`)

El canal del agente — no es REST, es un protocolo de mensajes bidireccional (ver 7.5 para la tabla completa de eventos).

### 9.3 API MCP de `mcp/` (`/mcp`)

Servidor MCP con las 10 tools de la sección 5.3. Solo la consume `backend/`, nunca es pública.

---

## 10. Flujo completo, de punta a punta

```
1. Login
   app-web  ──POST /api/auth/login──▶  backend
   backend  ──bcrypt.compare + JWT──▶  Azure PostgreSQL (tabla usuarios)
   backend  ──{ token, auth_uid, perfil }──▶  app-web

2. Entrar al módulo de Educación Financiera
   app-web  ──WebSocket: { type: 'init', auth_uid }──▶  backend

3. El agente decide qué mostrar
   backend  ──mensaje + tools disponibles──▶  DeepSeek
   DeepSeek ──tool_use: obtener_perfil_usuario──▶  backend
   backend  ──MCP tool call──▶  mcp/  ──SQL──▶  Azure PostgreSQL
   backend  ──resultado──▶  DeepSeek
   (se repite para las tools que el modelo necesite)
   DeepSeek ──tool_use: render_ui(pantalla)──▶  backend

4. Entrega al usuario
   backend  ──valida con Zod──▶  { type: 'pantalla', pantalla }──▶  app-web
   app-web  ──Renderer──▶  UI dibujada con el catálogo de componentes

5. El usuario toca un bloque
   app-web  ──{ type: 'tap', accion, parametros, pantalla_actual }──▶  backend
   (se repite el ciclo desde el paso 3, con la nueva intención)
```

---

## 11. Decisiones de arquitectura relevantes

| Decisión | Alternativa considerada | Por qué se eligió así |
|---|---|---|
| Loop manual de tool-calling | Conector nativo `mcp_servers`/`mcp` tool del proveedor | El conector nativo exige HTTPS público para `mcp/`; el loop manual ya resuelve el mismo problema sin esa exigencia |
| `mcp/` stateless (transport nuevo por request) | Sesión MCP persistente | Simplifica el despliegue; el agente igual re-consulta contexto en cada tap |
| Agente intercambiable (mock/real) | Solo el LLM real desde el inicio | Permitió construir y probar todo el sistema (frontend, protocolo, DB) sin depender de una API key ni gastar créditos, y sirve de respaldo |
| WebSocket en vez de REST para el canal del agente | Polling / REST simple | Permite transmitir en vivo el proceso del agente (qué tool llama, qué genera) — refuerza la narrativa de "cómo decide el agente" |
| `backend/`+`mcp/` en un solo servicio de Railway | Dos servicios separados con red privada | Evita depender de que el tier gratuito de Railway garantice IP de salida fija o resolución de red privada entre servicios |
| Validación tolerante en el frontend (por bloque) | Rechazar toda la pantalla si algo no valida | Un campo mal formado no debe romper la demo en vivo frente al jurado |
| Web puro (React) en vez de Expo/React Native | Continuar con la app móvil | Lo que se evalúa es el agente generando UI, no la app como producto — la web quita complejidad de despliegue/build nativo que no aporta al criterio de evaluación |

---

## 12. Resumen de seguridad

- Contraseñas nunca en texto plano — `bcrypt` con salt.
- Sesión de usuario vía JWT firmado, expiración de 2 horas.
- El LLM nunca ve ni maneja credenciales — solo recibe un `auth_uid` ya
  autenticado.
- `mcp/` nunca se expone públicamente — solo alcanzable desde `backend/`
  dentro del mismo contenedor.
- Variables de entorno para todo secreto (DB, JWT, API key del LLM); nunca
  en el repositorio (`.env` está en `.gitignore`).
- Firewall de Azure PostgreSQL restringido por IP durante desarrollo; ver
  notas de despliegue para la ventana de evaluación.
