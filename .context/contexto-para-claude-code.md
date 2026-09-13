# Contexto del proyecto — Banorte Hackathon (para retomar con Claude Code)

Documento de contexto, no de arquitectura formal. Resume el estado y las
decisiones tomadas hasta ahora para que quien retome el trabajo (incluido
Claude Code) no tenga que re-derivar nada de esto ni reabrir decisiones ya
cerradas.

---

## 1. Qué es el proyecto

App de educación financiera para un hackathon de Banorte. Monorepo con:
`backend/` (Node.js/TypeScript + Express), `mcp/` (servidor MCP en
TypeScript), `app-mobil/` (Expo/React Native — **congelado**, ver sección 6),
y una base de datos ya hospedada en Azure PostgreSQL.

## 2. Qué se evalúa (esto es lo que más importa)

El jurado evalúa **la capacidad del agente de generar UI dinámicamente a
partir de los datos de la base de datos**, con libertad total de framework
de frontend. No se evalúa la app como producto terminado ni la experiencia
mobile. Esto es la razón detrás de casi todas las decisiones de las
secciones 3 y 4: todo lo que no sea "el agente decide qué mostrar y cómo"
es plomería de soporte, y se prioriza que esa plomería estorbe lo menos
posible.

## 3. Arquitectura actual

- **Frontend**: pivotado de Expo/React Native a **web puro (React + Vite,
  sin framework de servidor tipo Next.js)**. Carpeta nueva a crear (sugerido:
  `web/` o `frontend/`, aún no decidido/creado). Solo necesita: pantalla de
  login simple, y un **renderer de `render_ui`** que recorra un catálogo de
  componentes (`chart`, `tarjeta`, `lista`, `kpi`, `botón`) devuelto por el
  agente y despache cada bloque a su componente — **esta pieza es la más
  importante del proyecto y todavía no existe** (el placeholder anterior era
  `EducacionFinancieraScreen.tsx` en la app mobile). Validar el JSON del
  agente con Zod antes de renderizar (mismo patrón que ya usan en `mcp/`);
  si no cumple el schema, degradar a texto plano en vez de romper la
  pantalla.
- **Backend** (`backend/`): actúa como **cliente MCP** hacia `mcp/` (loop
  manual de tool-calling, no el connector nativo `mcp_servers` de
  Anthropic/OpenAI — se descartó ese connector porque exige el servidor MCP
  público vía HTTPS, y el loop manual ya está verificado funcionando). Ya
  tiene login real (`POST /api/auth/login`, bcrypt + JWT de 2h,
  `LOWER(TRIM(nombre))` tolerante a mayúsculas/espacios) y
  `/api/education/perfil/:auth_uid`. Falta construir el endpoint que arma el
  prompt con las tools de `mcp/`, llama a Claude, ejecuta las tool calls, y
  transmite el `render_ui` final (posible WebSocket para mostrar en vivo qué
  tool está llamando el agente, no solo el resultado final — refuerza la
  narrativa de evaluación).
- **`mcp/`**: servidor MCP ya construido y verificado (`@modelcontextprotocol/sdk`,
  `StreamableHTTPServerTransport` en modo stateless), deliberadamente
  agnóstico al LLM. 4 tools registradas, todas parametrizadas por `auth_uid`:
  - `obtener_perfil_usuario(auth_uid)`
  - `obtener_resumen_mensual(auth_uid, mes?)`
  - `obtener_transacciones(auth_uid, tipo?, limite?)`
  - `obtener_recomendaciones(auth_uid)`
  Pool de Postgres propio, independiente del de `backend/`.
- **Base de datos**: Azure PostgreSQL. Tabla `usuarios` con `password_hash`
  agregado y `nombre` simplificado a solo el primer nombre (ver
  `db_changes.md` del proyecto para el detalle). 4 usuarios demo, todos con
  password `banorte2026`:

  | auth_uid | nombre | perfil |
  |---|---|---|
  | uid_1 | Luis | Novato (sin histórico) |
  | uid_2 | Ana | Deudor |
  | uid_3 | Carlos | Inversor |
  | uid_4 | Marta | Ahorrativo |

  Estos 4 perfiles son el caso de demo central: mismo agente, mismo catálogo
  de componentes, cuatro UIs distintas porque los datos son distintos.
- **LLM**: **Claude (Anthropic API)** para la versión desplegada/entregada.
  **Ollama** (modelo local, ej. `qwen3.5:9b-mlx` en Apple Silicon) como
  opción para desarrollo local sin gastar créditos de API — mismo loop de
  código, solo cambia el cliente HTTP.

## 4. Decisiones de despliegue (ya cerradas)

- **Backend + `mcp/`**: **Railway**, ambos procesos en un solo servicio
  hablándose por `localhost` interno (sin exponer `mcp/` públicamente).
- **Frontend**: **Vercel**, build estático de Vite.
- **Firewall de Azure Postgres**: se evaluó usar Azure App Service (que
  hubiera resuelto esto con el toggle "Allow public access from any Azure
  service") pero se descartó por el costo de tiempo de armar un Dockerfile
  para el monorepo con dos servicios, dado el tiempo limitado y que esa
  pieza no es lo que se evalúa. Solución elegida: **abrir temporalmente el
  firewall de Azure Postgres a `0.0.0.0/0`** durante la ventana de
  evaluación (aceptable porque son datos de demo, no reales), y cerrarlo
  después. Railway/tiers gratuitos no garantizan IP de salida estática, por
  eso no se intenta autorizar una IP específica.
- El frontend en Vercel necesita su variable de entorno (`VITE_API_URL` o
  el nombre que se le dé) apuntando a la URL pública que dé Railway, no a
  `localhost`.

## 5. Pendiente / próximos pasos

- [ ] Crear el frontend web (React + Vite) desde cero — login + renderer.
- [ ] Definir el JSON Schema del catálogo `render_ui` (chart, tarjeta,
      lista, kpi, botón) con Zod, compartido entre el system prompt del
      agente y el renderer del frontend.
- [ ] Escribir el `.md` de system prompt del agente, documentando cuándo
      usar cada tool de `mcp/` y el schema esperado de salida.
- [ ] Construir el loop backend ↔ Claude ↔ `mcp/` (tool calling manual).
- [ ] Desplegar en Railway (backend+mcp) y Vercel (frontend).
- [ ] Abrir el firewall de Azure Postgres a `0.0.0.0/0` antes de la demo,
      cerrarlo después.
- [ ] Descripción del proyecto para el submission (requisito 2 del
      hackathon): la narrativa ahora es "agente que genera interfaces
      dinámicamente a partir de los datos financieros del usuario", con el
      exploratorio mobile-first mencionado como contexto, no como el
      producto final.

## 6. Decisiones descartadas (para no reabrirlas sin motivo nuevo)

- **App mobile (Expo/React Native)**: descartada como frontend activo tras
  el cambio de criterio de evaluación. El código queda en `app-mobil/` sin
  borrar, pero no se le sigue invirtiendo tiempo de ingeniería.
- **Microsoft Azure AI Foundry Agent Service**: descartado como plataforma
  de agente — exige servidor MCP público, más infraestructura de Azure
  (proyecto, modelo desplegado, regiones limitadas), y no resuelve nada que
  el loop manual backend-como-cliente-MCP no resuelva ya, dado que de todas
  formas hay que parsear la salida a mano para el `render_ui`.
- **Connector nativo `mcp_servers` (Anthropic) / `mcp` tool (OpenAI
  Responses API)**: descartado por ahora — exige HTTPS público en `mcp/`,
  y el loop manual ya está verificado funcionando sin ese requisito.
- **Azure App Service para el despliegue**: considerado seriamente (resuelve
  el firewall de raíz), descartado por el costo de tiempo de Dockerizar el
  monorepo bajo la presión de tiempo del hackathon.

## 7. Notas históricas breves

- Bug ya resuelto: `DB_HOST` mal formado como URL JDBC en vez de hostname
  plano, y `DB_USER` con espacio final — ya corregido y verificado.
- `expo-secure-store` no tiene implementación web; se resolvió (cuando
  mobile todavía era el plan) con un wrapper a `localStorage` en web — ya
  no es relevante con el pivot a web puro, pero explica por qué el login
  real ya se había probado exitosamente en navegador antes del pivot.
- Incidente de firewall de Azure Postgres durante desarrollo: un cambio de
  red del dueño del proyecto tumbó el acceso hasta autorizar la nueva IP —
  es el mismo tipo de problema que motiva la decisión de la sección 4.
