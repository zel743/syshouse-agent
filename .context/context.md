# Contexto de sesión — de app móvil a plataforma web con agente A2UI (MCP + Renderer)

Documento de trabajo (no arquitectónico) que resume lo que se hizo en esta
sesión, por qué se hizo así, y en qué estado quedó el proyecto. Complementa
—no reemplaza— los documentos en `.ai/` (arquitectura general del reto,
brief del hackathon y schema de la base de datos).

---

## 1. Punto de partida

Al iniciar la sesión, el repo tenía:

- La estructura monorepo (`app-mobil/`, `backend/`, `mcp/`) ya creada, pero
  con **restos de la reestructuración anterior sin confirmar en git**
  (archivos sueltos en la raíz marcados como `deleted` porque ya habían
  sido movidos a `app-mobil/` en el filesystem, pero nunca se hizo `git
  add`).
- Un **proyecto Expo duplicado completo** dentro de
  `app-mobil/educacion-financiera/` (con su propio `App.tsx`, `package.json`,
  pantallas, assets) que no era usado por el punto de entrada real de la
  app — puro leftover de un scaffolding anterior.
- `backend/src/routes/auth.js` **vacío** (0 bytes) — nunca se implementó el
  login, pese a que `contexto-proyecto-banorte-hackathon.md` ya documentaba
  cómo debía construirse.
- `HomeScreen.tsx` con un login **mock** hardcodeado
  (`banorte` / `123456`), sin conexión real al backend.
- Un bug de path: `app-mobil/services/api.ts` llamaba a
  `${API_URL}/educacion/perfil/...` (español) pero la ruta real del backend
  es `/api/education/perfil/...` (inglés) — 404 garantizado.
- La base de datos en Azure **ya generada** (ver `.ai/db_context.md`), con 4
  usuarios demo (`usuarios`: Luis/Ana/Carlos/Marta) pero **sin columna de
  password** — el login documentado con bcrypt no podía funcionar contra el
  schema real tal cual.

## 2. Lo que se decidió (y por qué)

- **Auth con password real**, no solo selección de usuario demo. El
  usuario del proyecto pidió explícitamente agregar password "ya que se
  omitió al principio", así que se agregó `password_hash` a `usuarios` en
  vez de dejar un login sin contraseña.
- **Username = `nombre` de la tabla, no `auth_uid`.** Se eligió que el
  usuario final loguee con un nombre legible, con una sola contraseña demo
  compartida (`banorte2026`) para las 4 cuentas — más fácil de mostrar en
  vivo que recordar 4 contraseñas distintas.
- **`nombre` se simplificó a solo el primer nombre** (`Luis`, `Ana`,
  `Carlos`, `Marta`), quitando el sufijo `(Novato)` / `(Deudor)` / etc. Ese
  sufijo era **redundante** con la columna `perfil`, que ya guarda esa
  misma información de forma estructurada. Se hizo un `UPDATE` directo en
  la tabla `usuarios` de Azure (con confirmación explícita del usuario del
  proyecto antes de ejecutarlo, por ser una escritura a una base de datos
  compartida real).
- **`expo-secure-store` no tiene implementación web** (su módulo `.web.ts`
  es literalmente `export default {}`). Al probar el login en navegador
  (`expo start` → `w`), cualquier llamada tronaba con
  `ExpoSecureStore.default.setValueWithKeyAsync is not a function`. Se
  resolvió con un wrapper (`services/session.ts`) que usa `localStorage` en
  web y `SecureStore` en nativo (iOS/Android), en vez de forzar al usuario
  a probar solo en simulador/dispositivo.
- **Limpieza de restos**: se borró el `auth.js` vacío, el proyecto Expo
  duplicado, un `holamundo.txt` suelto, y se hizo `git add -A` para que git
  reconociera el movimiento de archivos como renames (sin hacer commit —
  eso se deja a criterio del usuario).

## 3. Cambios concretos hechos en esta sesión

### Base de datos (Azure PostgreSQL, tabla `usuarios`)
- `ALTER TABLE usuarios ADD COLUMN password_hash TEXT` + seed con bcrypt
  hash de `banorte2026` para los 4 usuarios.
- `UPDATE usuarios SET nombre = TRIM(SPLIT_PART(nombre, '(', 1))` para
  dejar `nombre` como solo el primer nombre.

### `backend/`
- **Bug fix crítico**: `backend/.env` tenía `DB_HOST` mal formado como URL
  JDBC (`jdbc:postgresql://banrt.postgres.database.azure.com:5432/postgres`)
  en vez de un hostname plano, y `DB_USER` con un espacio final
  (`banadmin `). Esto hacía fallar la conexión a Azure por completo — ya
  quedó corregido y verificado (`SELECT` real contra la tabla `usuarios`
  funcionando).
- Se agregó `JWT_SECRET` a `.env` (generado con `openssl rand -hex 32`).
- `backend/src/routes/auth.ts` (nuevo, reemplaza el `auth.js` vacío):
  `POST /api/auth/login` — busca por `nombre` con
  `LOWER(TRIM(nombre)) = LOWER(TRIM($1))` (tolerante a mayúsculas/espacios),
  compara con `bcrypt.compare`, firma JWT de 2h con `usuario_id` y
  `auth_uid`.
- Montado en `backend/src/index.ts` como `/api/auth`.
- Instaladas dependencias: `bcrypt`, `jsonwebtoken`, `@types/bcrypt`,
  `@types/jsonwebtoken`.

### `app-mobil/`
- `services/api.ts`: fix del path (`educacion` → `education`), + nueva
  función `login(usuario, password)` que llama a `/auth/login`.
- `services/session.ts` (nuevo): `saveSession` / `getSession` /
  `clearSession`, con fallback a `localStorage` en web y `SecureStore` en
  nativo.
- `HomeScreen.tsx`: login real (llama a `login()`, guarda la sesión,
  navega a `EducacionFinancieraMenu` pasando el usuario autenticado como
  parámetro de ruta). Se quitó el mock `banorte/123456`. Muestra loading
  state y errores del backend tal cual.
- `App.tsx`: `RootStackParamList` ahora tipa `EducacionFinancieraMenu` y
  `EducacionFinanciera` con `{ usuario: LoginResponse }` — el usuario
  autenticado viaja por la navegación para que la siguiente fase (agente +
  MCP) ya tenga `auth_uid` / `perfil` disponibles sin rehacer el login.
  También se agregó `headerRight` en ambas pantallas mostrando el nombre
  del usuario logueado en la esquina superior derecha.
- `EducacionFinancieraMenuScreen.tsx`: botón de **"Cerrar sesión"** —
  limpia la sesión guardada y hace `navigation.reset` de vuelta a `Home`
  (evita que el botón "atrás" regrese a una pantalla con sesión ya
  invalidada).
- `EducacionFinancieraScreen.tsx`: sigue siendo placeholder, pero ahora
  tipado para recibir `usuario` y mostrarlo (`"Aquí va Educación Financiera
  para {usuario.nombre}"`), como prueba de que el dato llega correctamente.
- Se instaló `expo-secure-store` (`npx expo install`, para la versión
  correcta del SDK 57).
- Limpieza: borrado `app-mobil/educacion-financiera/` (proyecto duplicado)
  y `app-mobil/holamundo.txt`.

### Git
- `git add -A` en la raíz para que el movimiento del layout viejo hacia
  `app-mobil/` quede reflejado como renames. **No se hizo commit** — queda
  pendiente de que el usuario decida el mensaje y confirme.

## 4. Estado actual (verificado, no solo "debería funcionar")

- Conexión a Azure Postgres: **verificada** con una query real
  (`SELECT auth_uid, nombre, perfil FROM usuarios`).
- Login: **verificado con curl** contra el backend corriendo — credenciales
  correctas devuelven token + datos de usuario, contraseña incorrecta
  devuelve 401, y el matching es tolerante a mayúsculas/espacios.
- `usuario_id`/`auth_uid` devuelto por el login **verificado** que alimenta
  correctamente `/api/education/perfil/:auth_uid`.
- `tsc --noEmit` limpio tanto en `backend/` como en `app-mobil/` después de
  cada cambio.
- Flujo de login en la app: **confirmado por el usuario que funciona**
  (incluyendo el fix de `expo-secure-store` en web).
- Botón de logout y el username en la esquina superior derecha: agregados
  y tipados correctamente, pendientes de verificación visual por el
  usuario (no hay herramienta de browser conectada en esta sesión).

## 5. Qué NO se tocó (fuera de alcance, a propósito)

- **`app-mobil/` queda congelado tal cual** — el proyecto pivoteó a web
  puro (ver sección 8) y `app-mobil/` ya no es el frontend activo. Sigue
  en el repo como referencia/histórico, sin más inversión de ingeniería.
- El loop real del agente contra un LLM (Claude/Ollama) sigue sin
  conectarse — `backend/src/agent/mockAgente.ts` es una implementación por
  reglas que cumple el mismo contrato, a propósito, para no bloquear el
  resto en no tener todavía una API key de Anthropic (ver secciones 8.3 y 9).
- Deployment real (Vercel/Netlify para `web/`, Railway/Render para
  `backend/`+`mcp/`) — todavía no se ejecuta, solo se dejó documentado y
  preparado qué falta (ver sección 8.4 y, para Railway específicamente, el
  fix de `MCP_PORT`/`railway.json`/`package.json` raíz descrito en la
  conversación pero no repetido aquí en detalle).
- **Piezas del sistema de diseño que no son parte del contrato `render_ui`**:
  `progress_ring`, `gauge_semicircle`, `segmented_toggle` y
  `module_icon_circular` (sección 3 de
  `.context/sistema-diseno-app-bancaria (2).md`) no se implementaron como
  tal — el agente no tiene forma de pedirlos porque no existen como campo
  en el schema `render_ui` de `agente-educacion-financiera-CLAUDE.md`
  (sección 11.2, que solo define `kpi/chart/lista/tarjeta/boton/texto`). Ver
  sección 9.3 para el detalle de la decisión.

## 6. Pendientes / próximos pasos sugeridos

- [x] Deployment real: `backend/`+`mcp/` en Railway (un solo servicio,
      `railway.json` + `MCP_PORT`) y verificado — login y el loop del
      agente contra Azure Postgres funcionan en producción. `web/` en
      Vercel apuntando a la URL de Railway. Ver sección 10 para el detalle
      de dos bugs de configuración encontrados y corregidos en Railway.
- [ ] Decidir mensaje de commit y confirmar el `git add -A` (o ajustarlo)
      antes de comitear — ahora también incluye `web/`,
      `backend/src/agent/` (incluyendo `deepseekAgente.ts`), las tools
      nuevas de `mcp/`, y el fix de deploy de Railway.
- [x] Conectar el LLM real — **cambio de proveedor**: ya no es Claude, es
      **DeepSeek** (API compatible con OpenAI), por decisión del usuario
      ("por motivos de arquitectura"). `backend/src/agent/deepseekAgente.ts`
      ya implementa el loop de tool-calling; falta la API key de DeepSeek
      para probarlo en vivo (ver sección 10).
- [ ] Antes de la demo: abrir temporalmente el firewall de Azure Postgres a
      `0.0.0.0/0` (decisión ya cerrada, ver
      `.context/contexto-para-claude-code.md`), y cerrarlo después de
      probar todo.
- [ ] Verificación visual en navegador real del flujo completo
      login → menú → canvas → tap con el nuevo sistema de diseño (esta
      sesión solo pudo verificar por `tsc`, `vitest` y clientes de
      WebSocket de prueba — sin browser tool conectado).
- [ ] Si se decide que el agente sí pueda pedir `progress_ring` /
      `gauge_semicircle` / `segmented_toggle`, hay que extender el schema
      `render_ui` (ambas copias, frontend y backend) para soportarlos —
      hoy no es posible porque el contrato no los contempla.

## 7. Fase MCP — servidor de datos/tools (construido en esta sesión)

### 7.1 Qué se construyó

Se creó `mcp/` desde cero como un servidor MCP real (no un placeholder),
usando `@modelcontextprotocol/sdk` sobre HTTP, **antes** de tener decidido
qué LLM se va a usar — el pedido explícito fue "que el MCP esté listo para
cuando se integre la LLM".

- `mcp/src/db.ts` — pool propio de PostgreSQL hacia el mismo Azure DB,
  independiente del pool de `backend/` (mismo principio de "cada capa
  administra su propia conexión" ya documentado en `.ai/`).
- `mcp/src/tools.ts` — 4 tools registradas con `server.registerTool` (API
  no-deprecated del SDK), todas parametrizadas por `auth_uid` (el mismo
  identificador que ya devuelve `/api/auth/login`), mapeadas 1:1 al schema
  real de `.ai/db_context.md`:
  - `obtener_perfil_usuario(auth_uid)` → nombre, perfil, racha_inversion.
  - `obtener_resumen_mensual(auth_uid, mes?)` → historial completo si no
    se pasa `mes`, o el mes específico si se pasa.
  - `obtener_transacciones(auth_uid, tipo?, limite?)` → detalle de
    movimientos, más recientes primero.
  - `obtener_recomendaciones(auth_uid)` → planes activos de
    `recomendaciones_ia` (ahorro/inversión, niveles fácil/medio/difícil).
  - Caso "usuario no encontrado" devuelve `isError: true` con mensaje
    JSON, no un texto libre — para que el agente lo pueda distinguir de una
    respuesta válida.
- `mcp/src/server.ts` / `mcp/src/index.ts` — `McpServer` expuesto por
  Express con `StreamableHTTPServerTransport` en modo **stateless**: cada
  `POST /mcp` crea su propio `server` + `transport` (patrón oficial del
  SDK para este modo), sin sesión compartida entre llamadas. `GET`/`DELETE`
  a `/mcp` devuelven 405 explícito (no hay sesión que streamear o cerrar).
  También expone `/health`.
- Dependencias: `@modelcontextprotocol/sdk`, `express`, `cors`, `pg`, `zod`,
  `dotenv`. Se fijó `typescript@5.9.3` y `express@4` a propósito — `npm
  install` había resuelto por default `typescript@7.0.2` (el nuevo
  compilador nativo, recién publicado) y `express@5`, ninguno usado todavía
  en `backend/` ni probado con `ts-node-dev`; se bajaron para no introducir
  una variable nueva sin necesidad.

### 7.2 Por qué es "agnóstico al LLM"

MCP es un protocolo estándar de transporte de tools/contexto — no le
importa qué modelo lo consume. `mcp/` no tiene ninguna dependencia de
Anthropic/OpenAI/etc. Cuando se decida el LLM, lo único que falta es que
`backend/` actúe como **cliente MCP** (con el SDK del proveedor que se
elija, o con el `Client`/`StreamableHTTPClientTransport` del propio SDK de
MCP) apuntando a `http://localhost:8000/mcp` — el servidor ya no necesita
cambios para eso.

### 7.3 Verificación real (no solo "debería funcionar")

Se probó con un cliente MCP real (`@modelcontextprotocol/sdk` `Client` +
`StreamableHTTPClientTransport`), no solo revisando el código:

- `listTools()` devolvió las 4 tools correctamente.
- `callTool()` sobre las 4 tools, usando `auth_uid: 'uid_2'` (Ana/Deudor),
  devolvió datos reales y correctos de la base (perfil, resumen mensual,
  transacciones, recomendaciones — coinciden con los datos sembrados en
  `.ai/db_context.md` / `.context/db_changes.md`).
- El caso "usuario no encontrado" (`auth_uid: 'no_existe'`) devolvió
  `isError: true` con el mensaje esperado.

**Incidente durante la verificación (no relacionado al código):** a mitad
de la prueba, la conexión a Azure empezó a fallar con
`ECONNREFUSED` — se descartó que fuera un bug de `mcp/` porque **la misma
conexión directa que ya había funcionado antes en la sesión** (usada para
las migraciones de `password_hash` y `nombre`) también empezó a fallar
igual, y un `nc -zv` directo al puerto 5432 confirmaba rechazo a nivel TCP.
Causa real: el usuario del proyecto cambió de ubicación física y su IP
pública nueva ya no estaba en el firewall de Azure Postgres. Se resolvió
del lado del usuario (agregó la nueva IP en el firewall de Azure); una vez
hecho eso, se re-corrió la prueba completa del cliente MCP y todo devolvió
datos reales correctamente. **Queda como recordatorio para el resto del
proyecto**: cualquiera que desarrolle desde una red distinta (o cuando se
despliegue `mcp/`/`backend/` a un servicio en la nube) va a necesitar que
su IP (o la IP saliente del servicio) esté autorizada en el firewall de
Azure Postgres.

## 8. Pivot a web puro — nuevo frontend + catálogo A2UI + agente listo para Claude

El proyecto cambió de enfoque a mitad de sesión: de app móvil (Expo/React
Native) a **web puro** (React + Vite). Motivo dado por el usuario: el
objeto de evaluación real es el renderer/A2UI, no la app móvil, y esta
última no aportaba nada al criterio de evaluación mientras costaba tiempo
de ingeniería (React Navigation, `expo-secure-store`, particularidades de
`react-native-web`, deployment con `eas`/Expo Go/QR).

Alcance acordado explícitamente con el usuario para esta sesión:
- Frontend + renderer: completos y probados.
- Backend/agente: **todo el andamiaje listo** (cliente MCP, WebSocket,
  system prompt, "agente" intercambiable), pero **sin conectar Claude
  todavía** — eso espera a que haya API key.
- Deployment: **no se ejecuta** todavía, pero tiene que quedar listo
  (scripts de build, variables de entorno documentadas) para cuando se
  decida hacerlo.

### 8.1 Frontend nuevo: `web/`

Scaffold con `npm create vite@latest web -- --template react-ts`. Se fijó
`typescript@5.9.3` y `express` no aplica aquí (no hay backend en `web/`).
Sin router — con solo 3 pantallas (login/menú/canvas) el estado
condicional de React en `App.tsx` (`vista: 'login' | 'menu' | 'canvas'`)
es suficiente y más simple que instalar `react-router`.

- `services/api.ts` — mismo `login()` / `fetchPerfilFinanciero()` que tenía
  `app-mobil/`, sin cambios de lógica, solo `import.meta.env.VITE_API_URL`
  en vez de `process.env.EXPO_PUBLIC_API_URL`.
- `services/session.ts` — **simplificado a solo `localStorage`**. Ya no
  existe la rama nativa (`SecureStore`) ni el `Platform.OS === 'web'` que
  tenía que resolver esa bifurcación en `app-mobil/` — al no haber build
  nativo, esa complejidad completa dejó de tener sentido.
- `screens/LoginScreen.tsx` / `MenuScreen.tsx` / `CanvasScreen.tsx` —
  reescritura visual en HTML/CSS plano (sin RN), misma lógica: login real
  contra el backend, botón de "Cerrar sesión", nombre de usuario en la
  esquina superior derecha del header, y ahora `CanvasScreen` como la
  pantalla que hospeda el Renderer (reemplaza al placeholder de
  `EducacionFinancieraScreen.tsx` de `app-mobil/`).
- Deliberadamente sin pulir demasiado el diseño de login/menú — el pedido
  explícito del usuario fue "que quede simple y no les robe tiempo del
  renderer", que es la pieza que sí se evalúa.

### 8.2 Catálogo A2UI + Renderer (`web/src/a2ui/`) — la pieza central

- `schema.ts` — 5 tipos de bloque con Zod (mismo patrón que ya usa
  `mcp/src/tools.ts`, así que no es herramienta nueva para el equipo):
  `kpi`, `tarjeta`, `lista`, `chart` (línea/barra/pastel, vía Recharts —
  elegido sobre Nivo por ser la opción más simple de las dos que sugirió
  el usuario), `boton`. Unión discriminada por `type`.
- Cualquier bloque interactivo trae un `actionId` opcional (`boton` lo
  trae obligatorio) — ese es el mecanismo completo de "lo que la persona
  toca regresa como contexto": el `Renderer` recibe un `onAction(actionId)`
  y lo dispara tal cual al tocar el bloque.
- **Validación defensiva** (pedida explícitamente, "importante porque esto
  se evalúa en vivo"): `safeParsePantalla()` valida cada bloque por
  separado con `BloqueSchema.safeParse` y **descarta solo los inválidos**
  (con un `console.warn`) en vez de tirar toda la pantalla por un campo
  mal formado. Si no queda ni un bloque utilizable, degrada a una tarjeta
  de texto plano reutilizando el propio componente `tarjeta` — no hace
  falta un componente de "error" aparte.
- **Verificación real, no solo tsc**: como esta sesión no tiene browser
  tool conectado (el usuario declinó la extensión de Chrome), se armó un
  harness de pruebas automatizadas con Vitest + Testing Library
  (`Renderer.test.tsx`, 7 casos) en vez de solo confiar en que "debería
  funcionar": los 5 tipos de bloque renderizan, el tap dispara el
  `actionId` correcto (incluyendo en el `chart`), y ambas rutas de
  degradación defensiva (bloque individual descartado / fallback total a
  texto plano) quedaron confirmadas contra el DOM real, no solo leyendo el
  código.

### 8.3 Backend/agente — andamiaje completo, Claude todavía no conectado

Se subió de prioridad esta capa (el usuario la calificó como "el corazón
de la demo"), pero sin cambiar su arquitectura ya decidida: sigue siendo
agnóstica al LLM, backend-como-cliente-MCP. Lo nuevo en
`backend/src/agent/`:

- `mcpClient.ts` — wrapper delgado sobre el `Client`/
  `StreamableHTTPClientTransport` del SDK de MCP, apuntando a `MCP_URL`
  (default `http://localhost:8000/mcp`). Abre conexión nueva por llamada
  porque `mcp/` es stateless.
- `schema.ts` / `protocol.ts` — **espejos intencionales** de
  `web/src/a2ui/schema.ts` y `web/src/agent/protocol.ts` (mismos tipos,
  duplicados a mano porque son paquetes npm independientes sin workspace
  compartido). El backend valida la `Pantalla` con este mismo schema
  *antes* de mandarla por WebSocket — no depende solo de la validación
  defensiva del cliente.
- `agente.ts` — define el tipo `Agente`: `(ctx, emit) => Promise<Pantalla>`.
  Este es el contrato que cualquier implementación debe cumplir.
- `mockAgente.ts` — la implementación de **hoy**: reglas fijas, sin LLM,
  que llaman a las 4 tools reales de `mcp/` y deciden la composición
  **a partir de los números reales del mes** (ej. `deuda/ingresos > 10%` →
  tarjeta de alerta, no solo "si perfil == Deudor"), replicando el ejemplo
  de ahorro documentado en `.ai/contexto-proyecto-banorte-hackathon.md`.
  Cuando se conecte Claude, `claudeAgente.ts` implementa el mismo tipo
  `Agente` y ni `ws.ts` ni el frontend deberían necesitar cambios.
- `ws.ts` — `WebSocketServer` de la librería `ws`, montado en `/ws` sobre
  el mismo `http.Server` que ya usa Express (se cambió `app.listen(...)`
  por `http.createServer(app)` + `server.listen(...)` en `index.ts`).
  Transmite en vivo `agent_status` / `tool_call` / `tool_result` mientras
  el agente arma la pantalla — el pedido explícito del usuario de "mostrar
  el proceso, no solo el resultado final", para reforzar frente al jurado
  la narrativa de "miren cómo decide el agente".
- `systemPrompt.md` — el `.md` real que se le va a dar a Claude después:
  documenta las 4 tools, los 5 tipos de bloque (qué es cada uno, cuándo
  usarlo y cuándo NO — ej. "chart nunca para un solo número, para eso es
  kpi"), la regla de interpretación de taps, y few-shot examples con los
  4 perfiles demo reales (Luis/Ana/Carlos/Marta) más el caso de tap sobre
  un bloque. `mockAgente.ts` ya cumple exactamente este contrato.
- `.env`: se agregó `MCP_URL` y se dejaron documentados (sin usar todavía)
  `ANTHROPIC_API_KEY` y `OLLAMA_HOST` para cuando se conecte la Fase 3
  real — el usuario confirmó que **todavía no tiene la API key**.

**Verificación real, end-to-end, contra la base de Azure de verdad** (no
solo tsc): se escribió un cliente de WebSocket de prueba que hace login →
`init` → recibe los eventos de progreso + la `Pantalla` final → `tap` →
recibe la siguiente `Pantalla`. Confirmado para los 4 perfiles:
- **Luis (Novato)** → tarjeta de bienvenida + kpi en cero.
- **Ana (Deudor)** → tarjeta de alerta (deuda 15% de ingresos, calculado en
  vivo) → tap "ver mis transacciones" → lista real con sus 3 movimientos.
- **Carlos (Inversor)** → kpi de racha + chart de ahorro/inversión → tap →
  lista de detalle.
- **Marta (Ahorrativo)** → mismo patrón que Carlos, con sus propios
  números.

**Bug real encontrado y corregido durante esta verificación**: la lógica
inicial de "sin historial → pantalla de bienvenida" solo revisaba si
`resumen_mensual` no tenía ninguna fila para el usuario. Pero el seed real
(`.ai/db_context.md`) sí inserta una fila para Luis (id=1), solo que con
todos los montos en cero — así que Luis caía en la rama "neutral"
genérica en vez de la de bienvenida. Se corrigió `mockAgente.ts` para
tratar un mes con todos los montos en cero igual que "sin historial".

### 8.4 Deployment — documentado, no ejecutado todavía

Por pedido explícito del usuario ("primero se va a probar todo, pero
tiene que estar listo"), no se corrió ningún deploy real esta sesión, pero
quedó lo necesario para que sea trivial cuando se decida:

- `web/`: build estándar de Vite (`npm run build` → `dist/`), sin
  `react-native-web` ni particularidades — Vercel/Netlify lo detectan
  automáticamente. Falta configurar en el hosting: `VITE_API_URL` /
  `VITE_WS_URL` apuntando al backend ya desplegado (con `wss://` en vez de
  `ws://` si el backend queda detrás de HTTPS).
- `backend/` y `mcp/`: ya tenían scripts `build` (`tsc`) y `start` (`node
  dist/...`) desde antes — Railway/Render los detectan sin config
  adicional. Falta configurar ahí las variables de `.env` de cada uno
  (incluyendo `MCP_URL` en `backend/` apuntando a la URL pública de
  `mcp/` una vez desplegado, no a `localhost`).
- Recordatorio ya anotado en la sección 6: el firewall de Azure Postgres
  va a necesitar la IP saliente de donde sea que se desplieguen
  `backend/`/`mcp/`.
- No se crearon archivos de configuración de plataforma (`vercel.json`,
  etc.) sin haberlos probado contra un deploy real — mejor documentar qué
  falta que inventar configuración no verificada.

## 9. Alineación con los dos documentos de diseño/agente entregados por el usuario

El usuario entregó dos documentos externos que se volvieron la referencia
autoritativa para esta fase: `.context/sistema-diseno-app-bancaria (2).md`
(sistema de diseño visual) y `.context/agente-educacion-financiera-CLAUDE.md`
(instrucciones del agente + contrato `render_ui`, mucho más rico que el que
se había diseñado antes en esta misma sesión). El pedido fue "modifica lo
que falte en el repo para que funcione con estos componentes y esta
lógica" — esto implicó reescribir el contrato `render_ui` de punta a punta
(no solo ajustarlo), agregar tablas nuevas a la base, y reescribir
`mockAgente.ts` con lógica bastante más rica.

### 9.1 Base de datos: tablas nuevas

El usuario aclaró explícitamente que las tools "propuestas" del doc del
agente (`obtener_deudas`, `obtener_inversiones`, etc.) correspondían a
**tablas que faltaban y había que agregar**, no solo a wrappers sobre
`transacciones`. Se agregaron `deudas`, `inversiones` y
`usuarios.saldo_actual` — ver `.context/db_changes.md` sección 6 para el
detalle completo (schema + seed por perfil, incluyendo un desfase
deliberado de -$200 en el saldo de Ana para poder demostrar el caso de
"diferencia sin explicar" que pide el principio 18 del agente).

### 9.2 `mcp/`: de 4 a 10 tools

`mcp/src/tools.ts` se reescribió para exponer el catálogo completo que pide
`systemPrompt.md` sección 9: `obtener_perfil_usuario`,
`obtener_resumen_mensual`, `obtener_balance` (nueva), `obtener_ingresos` /
`obtener_gastos` (nuevas, filtran `transacciones` por `tipo`),
`obtener_ahorro` (nueva, calcula `tasa_ahorro`), `obtener_deudas` /
`obtener_inversiones` (nuevas, leen las tablas de 9.1),
`obtener_historial_movimientos` (nueva), `obtener_recomendaciones`. Se
quitó la tool genérica anterior `obtener_transacciones` en favor de este
set más granular y sin ambigüedad. Probado con un cliente MCP real contra
los 4 usuarios demo — todos los números coinciden con lo sembrado (ej.
`obtener_balance` de Ana devuelve `diferencia: "-200.00"` tal cual se
sembró).

### 9.3 Contrato `render_ui`: reescritura completa (no solo ajuste)

El contrato que ya existía en esta sesión (`Bloque`/`Pantalla` con `type`,
`bloques`, `actionId`) **no coincidía** con el que define
`agente-educacion-financiera-CLAUDE.md` (`tipo`, `composicion`,
`pantalla_id`, `accion`/`parametros`, un tipo de bloque `texto` que no
existía). Se reescribió `web/src/a2ui/schema.ts` y su espejo
`backend/src/agent/schema.ts` para que coincidan exactamente con la sección
11.2 del doc del agente — 6 tipos de bloque (`kpi`, `chart`, `lista`,
`tarjeta`, `boton`, `texto`), con los nombres de campo tal cual los usa el
documento (en español, sin traducir a inglés). El protocolo de WebSocket
(`agent/protocol.ts`, ambas copias) también cambió: el tap ahora manda
`{auth_uid, pantalla_actual, accion, parametros}` en vez del `actionId`
simple de antes, siguiendo la sección 4 del doc del agente al pie de la
letra.

**Decisión de diseño no trivial — cómo mapear el sistema de diseño visual
(14 componentes) al contrato `render_ui` (6 tipos de bloque):** los dos
documentos catalogan cosas distintas — uno describe *widgets visuales*
(`top_app_bar`, `progress_ring`, `gauge_semicircle`, `donut_chart_with_legend`,
`traffic_light_chip`, `segmented_toggle`, `decorative_wave_footer`...), el
otro describe *el JSON que el agente puede producir*. Se reconciliaron así:

| Pieza del sistema de diseño | Cómo se implementó |
|---|---|
| `top_app_bar`, `back_button_circular`, `decorative_wave_footer` | Chrome fijo de pantalla (`web/src/design/TopAppBar.tsx`, `DecorativeWave.tsx`), no algo que el agente pida — vive en las screens, no en el Renderer. |
| `container_card` | Estilo base compartido por `kpi`/`tarjeta`/`lista`/`chart` en `renderer.css`. |
| `highlight_metric_card` | Es el bloque `kpi` (icono + cifra + flecha de tendencia coloreada por signo). |
| `donut_chart_with_legend` | `chart` con `subtipo: "dona"` — centro con total + leyenda con % (`ChartBlockView.tsx`). |
| `traffic_light_chip` | Un item de `lista` cuya `categoria` es exactamente `"facil"/"medio"/"dificil"` se dibuja como chip semáforo en vez de texto — así el agente puede pedirlo sin que exista un tipo de bloque nuevo. |
| `category_cta_button` | Es el bloque `boton` (`estilo: primario/secundario`). |
| `progress_ring`, `gauge_semicircle`, `segmented_toggle`, `module_icon_circular` | **No implementados.** No hay ningún campo en el contrato `render_ui` (sección 11.2 del doc del agente) que le permita al agente pedirlos — implementarlos igual habría sido inventar UI que el agente nunca puede disparar. Si se quiere que el agente los use, primero hay que extender el schema. |

Colores de categoría/serie (regla "el mismo nombre de categoría siempre el
mismo color en toda la app"): se resolvió con un hash determinístico
(`web/src/design/dataPalette.ts`) sobre el nombre, en vez de armar un
registro central categoría→color — mismo resultado, menos mantenimiento
para una demo con datos ya conocidos.

Se instaló `lucide-react` (iconografía que pide el doc de diseño) y se
agregó Plus Jakarta Sans + Inter vía Google Fonts en `index.html`.

### 9.4 `mockAgente.ts`: reescritura de la lógica de decisión

Ya no decide solo por `perfil.perfil` (la etiqueta guardada) — sigue la
prioridad de "hallazgo destacado" que documenta `systemPrompt.md` sección 8:
deuda relevante (>10% de ingresos en pago periódico) > diferencia de saldo
sin explicar > inversión con rendimiento positivo > buena tasa de ahorro
(≥15%) > tip educativo genérico. Nunca más de un hallazgo a la vez. Se
implementaron handlers para 9 de las intenciones de la tabla de la sección
4 del doc (`ver_resumen`, `ver_ahorro`, `ver_deudas`, `ver_inversiones`,
`ver_ingresos`, `ver_gastos`/`ver_categoria`, `ver_detalle_mes`,
`ajustar_meta`, `explicar_concepto`), con un fallback para `accion`
desconocida.

**Bugs reales encontrados durante la verificación end-to-end (no solo
tsc):**
- El cálculo de "% del pago mensual que es interés" estaba mal — para una
  sola deuda se simplificaba matemáticamente a devolver siempre la misma
  tasa de interés anual (ej. "45%" en vez de ~35%), en vez de calcular el
  interés mensual real (`saldo_pendiente × tasa ÷ 12`) como fracción del
  pago periódico total. Corregido y verificado contra la deuda real de Ana
  (da 35%, coincidiendo con el número exacto del ejemplo del propio
  documento del agente).
- `ver_detalle_mes` sin `mes` explícito truena: `resumen_mensual.mes` viene
  de Postgres como timestamp ISO completo
  (`"2026-09-01T06:00:00.000Z"`), pero las tools de `mcp/` solo aceptan
  `'YYYY-MM'`/`'YYYY-MM-DD'` — se mandaba el timestamp completo sin
  truncar y la tool lo rechazaba. Corregido con un helper `soloFecha()`
  aplicado en los dos lugares donde un `mes` de `resumen_mensual` se
  reenvía como parámetro de otra tool.
- El título "Movimientos de {mes}" mostraba el **mes anterior** (agosto en
  vez de septiembre): bug clásico de JS —
  `new Date('2026-09-01').toLocaleDateString()` parsea la fecha como
  medianoche UTC, y en una zona horaria detrás de UTC el mes se corre hacia
  atrás al formatear en hora local. Corregido con un formateador que
  parsea `"YYYY-MM"` directo (sin pasar por `Date`/timezone).

Los tres bugs se encontraron corriendo un cliente de WebSocket real contra
los 4 perfiles y varias acciones (no adivinando desde el código), y se
re-verificaron después del fix con el mismo cliente.

### 9.5 `systemPrompt.md`: reemplazado por una versión corregida del doc del usuario

Se tomó `.context/agente-educacion-financiera-CLAUDE.md` casi verbatim como
nuevo `backend/src/agent/systemPrompt.md`, con estas correcciones puntuales:
`usuario_id` → `auth_uid` en todos los ejemplos (consistente con el resto
del proyecto), y la sección 9 (catálogo de tools) reescrita para reflejar
los nombres/parámetros reales ya implementados en 9.2, en vez de las tools
"propuestas" con nombres provisionales de la v1. Los ejemplos few-shot de
la sección 12 se reemplazaron por salidas reales verificadas de
`mockAgente.ts` contra los 4 usuarios demo (no inventadas), para que el
documento sea a la vez la especificación y una prueba de que el mock ya la
cumple.

## 10. Deploy a Railway + Vercel, y cambio de LLM: Claude → DeepSeek

### 10.1 Deploy a Railway — bugs reales encontrados (no solo config)

Se desplegó `backend/`+`mcp/` como un solo servicio de Railway (root del
repo, `railway.json`, ver conversación anterior para el detalle completo
de esa preparación). Al probarlo en vivo aparecieron dos problemas, ambos
de **configuración en el dashboard de Railway, no del código**:

1. **"Generate Domain" pidió elegir entre el puerto 8000 y el 8080.**
   Railway detectó los dos procesos escuchando en el mismo contenedor.
   8000 es `mcp/` (fijo vía `MCP_PORT`, a propósito interno, nunca debe
   exponerse); 8080 era el `PORT` dinámico que Railway le asignó a
   `backend/` esa vez. Se confirmó el número correcto leyendo el log de
   arranque (`Servidor Backend corriendo en http://localhost:<PORT>`) en
   vez de adivinar, y se expuso ese puerto.
2. **Login devolvía 500 en producción.** El log de Railway mostró
   `getaddrinfo ENOTFOUND http://banrt.postgres.database.azure.com/` — la
   variable `DB_HOST` en Railway se había cargado con un `http://` y `/`
   de más (mismo tipo de error que el bug original de `jdbc:postgresql://`
   en el `.env` local, sección 3 de este documento, pero esta vez en el
   dashboard de Railway). Se corrigió a solo `banrt.postgres.database.azure.com`
   y el login empezó a funcionar contra Azure real en producción.

Verificado con `curl` real contra la URL pública de Railway: `/health` 200,
login de Luis devuelve token real, y un cliente WebSocket real contra
`wss://.../ws` confirmó que el loop `backend → mcp/ → Azure Postgres`
también funciona en producción (no solo local).

**3. `systemPrompt.md` no llegaba a `dist/` (bug real de build, no de
Railway).** Al conectar `deepseekAgente.ts` y redeployar, el contenedor
crasheaba en el arranque con
`ENOENT: no such file or directory, open '/app/backend/dist/agent/systemPrompt.md'`.
Causa: `tsc` solo compila archivos `.ts` — nunca copia archivos sueltos
como `.md` a `dist/`. Funcionaba en local porque el modo dev
(`ts-node-dev`) corre directo contra `src/`, donde el `.md` sí vive.
Arreglado agregando un paso al `build` de `backend/package.json`:
`tsc && node -e "require('fs').copyFileSync('src/agent/systemPrompt.md','dist/agent/systemPrompt.md')"`
— portable (no depende de `cp` de shell), verificado localmente que
`dist/agent/systemPrompt.md` aparece después de `npm run build`.

**4. `ReferenceError: crypto is not defined` en Node 18 (bug real de
compatibilidad, encontrado ya con el fix anterior desplegado).** El
contenedor de Railway corre **Node 18.20.5** por default; el SDK de MCP
(`@modelcontextprotocol/sdk`, usado tanto por `mcp/` como por el cliente
en `backend/`) usa el `crypto` global del Web Crypto API, disponible por
default solo desde **Node 20**. En local nunca apareció porque la máquina
de desarrollo ya tiene Node 24. Arreglado con dos capas: `"engines":
{"node": ">=20"}` agregado a los 3 `package.json` (raíz, `backend/`,
`mcp/`) para que Nixpacks aprovisione Node 20+, y un polyfill defensivo al
inicio de `mcp/src/index.ts` y `backend/src/index.ts`
(`if (typeof globalThis.crypto === 'undefined') globalThis.crypto =
require('crypto').webcrypto`) como red de seguridad si algún build cacheado
igual usara Node 18. Verificado de nuevo con la simulación local completa
(build + start con las variables exactas de Railway) — el loop completo
`DeepSeek → mcp/ → Azure Postgres → render_ui` sigue funcionando después
del fix.

**Nota para la próxima vez que algo falle solo en Railway y no en local:**
los primeros dos bugs de esta sección (rutas de host, puerto público) y
estos dos últimos (build incompleto, versión de Node) comparten un patrón
— algo que el entorno de desarrollo local oculta porque es más permisivo
(Node más nuevo, correr contra `src/` en vez de `dist/`, un solo dev
corriendo en su propia red). Cuando algo funciona en local y falla solo en
Railway, sospechar primero de esas diferencias de entorno antes que del
código en sí.

### 10.2 Cambio de proveedor de LLM: Claude → DeepSeek

Hasta este punto de la conversación, el plan (incluyendo
`.context/contexto-para-claude-code.md`, sección 3) era usar **Claude**
como LLM de producción. El usuario pidió cambiarlo a **DeepSeek** "por
motivos de arquitectura" (razón dada tal cual, sin más detalle en la
conversación). Cambio ejecutado:

- Se quitó `@anthropic-ai/sdk` de `backend/` y se instaló `openai` — la
  API de DeepSeek es **compatible con la API de OpenAI** (Chat Completions
  + function calling), así que no hace falta un SDK propio de DeepSeek,
  solo apuntar el cliente de `openai` a `baseURL: 'https://api.deepseek.com'`.
- `backend/src/agent/claudeAgente.ts` (que se había escrito y probado por
  tipos, pero nunca contra una key real) se **reemplazó** por
  `backend/src/agent/deepseekAgente.ts` — mismo contrato `Agente`, mismo
  loop de tool-calling manual (llama tools de `mcp/` hasta que el modelo
  invoca `render_ui`), pero con el formato de mensajes/tools de OpenAI
  (`tool_calls` con `role: 'tool'` para los resultados) en vez del formato
  de bloques de contenido de Anthropic.
- `ws.ts` ahora elige el agente según `DEEPSEEK_API_KEY` (antes era
  `ANTHROPIC_API_KEY`) — si no está configurada, sigue cayendo a
  `mockAgente.ts` automáticamente, sin romper nada.
- `backend/.env` / `.env.example`: `ANTHROPIC_API_KEY`/`OLLAMA_HOST` →
  `DEEPSEEK_API_KEY`/`DEEPSEEK_MODEL` (default `deepseek-chat`).
- `systemPrompt.md` actualizado para mencionar `deepseekAgente.ts` en vez
  de Claude — el contenido del prompt en sí (catálogo de componentes,
  reglas, few-shot) no cambió, es agnóstico al proveedor.

**Verificado en vivo contra los 4 usuarios demo** (cliente WebSocket real,
no solo tsc): `deepseekAgente.ts` funciona correctamente end-to-end
(DeepSeek → tools de `mcp/` → Azure Postgres → `render_ui` validado por
Zod → WS). Luis (Novato) respeta la regla de "sin historial" (sin
kpi/chart forzado); Ana/Carlos generan pantallas ricas y coherentes,
con texto genuinamente personalizado y hasta `accion` nuevas inventadas
por el modelo (ej. `ver_detalle_deuda`, `ver_plan_deuda`) que
`mockAgente.ts` nunca tuvo — prueba de que el LLM real está componiendo,
no repitiendo una plantilla. `DEEPSEEK_API_KEY` sigue solo en
`backend/.env` local — todavía falta agregarla a las variables de Railway
para que el agente real también funcione en producción (hoy Railway sigue
cayendo a `mockAgente.ts` porque no tiene esa variable).
