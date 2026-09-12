# Contexto del proyecto — Banorte Challenge (HackMTY / Tec de Monterrey)

Documento de referencia que resume las decisiones de arquitectura, el estado
actual del proyecto y los pasos seguidos hasta ahora. Sirve como memoria
del equipo para no repetir discusiones ya resueltas.

---

## 1. El reto

Track "Banorte Challenge" de HackMTY. La idea central: que un agente de IA
no solo responda preguntas, sino que decida **qué información necesita el
usuario** y **qué interfaz mostrarle**, usando:

- **MCP (Model Context Protocol)** — para exponer al agente datos y
  herramientas.
- **A2UI (Agent-to-UI)** — un protocolo propio (no un producto que se
  instala) para representar y transmitir la interfaz que arma el agente.

Restricción particular del equipo: la app es **móvil** y el usuario **no
escribe texto**. Todo pasa por taps — cada tap se traduce en una intención
implícita que recibe el agente.

Dominio elegido: **educación financiera**, con datos generados/gestionados
por el propio equipo (no hay acceso a datos reales de Banorte).

Criterios de evaluación relevantes para las decisiones técnicas:
- 25% cumplimiento y utilidad para el usuario
- 20% calidad y adaptabilidad de la **UI generada**
- 15% calidad de la solución de IA
- 15% arquitectura e ingeniería
- 10% UX y diseño / 10% innovación / 5% presentación

El punto de los "20% adaptabilidad de la UI" es clave: la pantalla debe
**recomponerse** según la intención detectada, no ser una plantilla fija
donde solo cambian los números.

---

## 2. Arquitectura actual (monorepo, 3 capas)

El proyecto vive en un **único repositorio git**, con tres servicios
independientes como carpetas hermanas:

```
syshouse-agent/               <- raíz del proyecto, aquí vive el único repo git
├── app-mobil/                <- Frontend: React Native + Expo
├── backend/                  <- Orquestador: Node.js + Express
└── mcp/                      <- Servidor de datos: Node.js + Express + MCP SDK
```

> **Nota de evolución:** en una etapa anterior de esta conversación se
> exploró un `mcp/` en **Python** (con `FastMCP`) consultando un dataset
> sintético en JSON/SQLite generado por el propio equipo. La versión
> **vigente** (documento de arquitectura `syshouse-agent`) cambia esto por
> **Node.js/Express**, conectado a una base de datos **real** en **Azure
> PostgreSQL**. Si el equipo sigue usando la versión Python en paralelo,
> hay que decidir cuál es la definitiva — este documento describe la
> versión Node/Postgres, que es la más reciente.

### Responsabilidad de cada capa

**`app-mobil/` — Presentación / A2UI**
- No se conecta directo a la base de datos (por seguridad: expondría
  credenciales al compilar).
- Envía los eventos del usuario (taps) al `backend`.
- Actúa como la A2UI: escucha los *tool calls* que manda el agente y
  dibuja componentes nativos (chart, lista, tarjeta, botón, kpi) en vez de
  texto plano.

**`backend/` — Orquestación**
- Oculta las API keys (Anthropic/OpenAI) — el móvil nunca las toca.
- Recibe la intención del usuario, consulta al LLM, se comunica con `mcp/`
  para obtener contexto financiero, y transmite en tiempo real (stream)
  qué interfaz renderizar.
- **También aquí vive el login** (ver sección 6) — es un endpoint REST
  normal, no pasa por el agente ni por MCP.

**`mcp/` — Datos y herramientas**
- Implementa el estándar Model Context Protocol.
- Se conecta de forma segura a Azure PostgreSQL.
- Expone consultas específicas como tools estandarizadas
  (`obtener_resumen_mensual`, `obtener_recomendaciones_perfil`, etc.) que
  el LLM invoca para nutrir su contexto antes de responder.

### Flujo de desarrollo local (3 terminales)

```bash
# Terminal 1 — Datos
cd mcp && npm start

# Terminal 2 — Cerebro
cd backend && npm run dev

# Terminal 3 — UI
cd app-mobil && npx expo start
```

---

## 3. El concepto de A2UI / `render_ui` (a fondo)

`render_ui` **no es una tool de MCP** — MCP da datos/acciones reales;
`render_ui` es la tool (definida en la propia llamada al LLM) que el
modelo usa para **describir en JSON la pantalla** que se debe mostrar, en
vez de responder con texto. El backend intercepta esa llamada (no la
"ejecuta") y reenvía el JSON tal cual al móvil.

**Tiempo de diseño (una sola vez):**
- Se define el schema de `render_ui`: qué tipos de componente existen
  (`chart`, `lista`, `tarjeta`, `kpi`, `boton`...) y qué campos acepta cada
  uno.
- Se construye, una sola vez, el widget visual de cada tipo en la app
  (diseño, colores, tipografía ya resueltos).

**Tiempo de ejecución (cada tap):**
1. Llega el evento de tap al backend.
2. El backend arma el prompt con la intención + contexto acumulado.
3. El LLM llama 0 o varias tools de MCP para traer datos.
4. El LLM llama `render_ui` con el JSON de la pantalla: qué componentes
   usar, cuántos, en qué orden, con qué datos y texto.
5. El backend reenvía ese JSON al móvil (WebSocket/stream).
6. El renderer genérico de la app dibuja cada componente con el widget ya
   construido para ese `tipo`.

**Punto clave — respondiendo a "¿las ventanas ya están definidas y solo
cambian los datos?":** No exactamente. Hay tres niveles posibles:

| Nivel | Qué pasa | Recomendado |
|---|---|---|
| 0 | Pantallas completas fijas, solo cambian números | ❌ no cumple "adaptabilidad de la UI" |
| 1 | Paleta de componentes fija (diseño ya resuelto), pero el agente decide cuáles usar, cuántos, en qué orden y con qué datos/texto en cada tap | ✅ el objetivo del reto |
| 2 | El agente inventa layout/CSS libremente | ❌ riesgo de romperse en demo, ni los productos comerciales de generative UI lo hacen así |

Ejemplo con el apartado de ahorro:
- Si el usuario va bien respecto a su meta → `chart` + `texto` de
  felicitación.
- Si va mal → `tarjeta` de alerta + `boton` de "ajustar mi meta" (puede
  que ni aparezca la gráfica).
- Si toca el detalle de un mes → `lista` de movimientos, no una gráfica.

La instrucción para el `.md` del agente debe dejar claro que el modelo
**decide la composición**, no solo llena una plantilla — con ejemplos
few-shot mostrando distintas combinaciones para el mismo apartado.

---

## 4. Estado actual de `app-mobil/`

- Stack: React Native + Expo.
- Pantalla inicial: **login** (originalmente se planeó como "Home" y
  después evolucionó a login) con usuario/contraseña **predeterminados
  (mock)**, sin backend real todavía.
- Después del login: pantalla con botón **"Educación Financiera"** que
  navega a la sección correspondiente (por ahora placeholder, ahí se va a
  insertar después el renderer dinámico de A2UI).
- Navegación con `@react-navigation` (native stack).

**Pendiente:** conectar el login real contra `backend/` (ver sección 6) en
vez del mock actual.

---

## 5. Cómo se construyó `mcp/` (versión Node.js + Azure PostgreSQL)

### Paso 1 — Inicializar el proyecto

```bash
cd mcp
npm init -y
npm install @modelcontextprotocol/sdk express pg zod dotenv
```

En `package.json`: agregar `"type": "module"`.

### Paso 2 — Variables de entorno (`mcp/.env`, en `.gitignore`)

```
DATABASE_URL=postgresql://usuario:password@tuservidor.postgres.database.azure.com:5432/tubasededatos?sslmode=require
PORT=8000
```

### Paso 3 — Conexión a la base de datos (`mcp/db.js`)

```js
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // requerido por Azure Postgres
});

export default pool;
```

### Paso 4 — Servidor MCP y tools (`mcp/server.js`)

```js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import pool from './db.js';

const server = new McpServer({
  name: 'banorte-educacion-financiera',
  version: '1.0.0'
});

server.tool(
  'obtener_resumen_mensual',
  'Devuelve el resumen de ahorro mensual de un usuario',
  { usuario_id: z.string() },
  async ({ usuario_id }) => {
    const result = await pool.query(
      `SELECT mes, monto_total FROM ahorro_mensual WHERE usuario_id = $1 ORDER BY mes`,
      [usuario_id]
    );
    return { content: [{ type: 'text', text: JSON.stringify(result.rows) }] };
  }
);

server.tool(
  'obtener_recomendaciones_perfil',
  'Devuelve recomendaciones financieras según el perfil del usuario',
  { usuario_id: z.string() },
  async ({ usuario_id }) => {
    const result = await pool.query(
      `SELECT recomendacion FROM recomendaciones WHERE usuario_id = $1`,
      [usuario_id]
    );
    return { content: [{ type: 'text', text: JSON.stringify(result.rows) }] };
  }
);

export default server;
```

> Los nombres de tabla/columnas son de ejemplo — hay que ajustarlos al
> esquema real de la base de datos en Azure.

### Paso 5 — Exponerlo por HTTP (`mcp/index.js`)

```js
import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import server from './server.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });
  res.on('close', () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`MCP server corriendo en el puerto ${PORT}`));
```

### Paso 6 — Script de arranque (`mcp/package.json`)

```json
"scripts": {
  "start": "node index.js"
}
```

### Paso 7 — Probarlo aislado

```bash
npm start
# en otra terminal:
npx @modelcontextprotocol/inspector
```
Apuntar el Inspector a `http://localhost:8000/mcp` y probar
`obtener_resumen_mensual` y `obtener_recomendaciones_perfil` con un
`usuario_id` real antes de conectarlo al backend.

### Seguridad

- Firewall de Azure Postgres restringido solo a las IPs necesarias.
- `.env` siempre en `.gitignore`, nunca en el repo.

---

## 6. Login — por qué NO va por MCP, y cómo sí se hace

**Por qué no usar MCP para el login:**
- MCP existe para que el agente decida qué tool llamar según su
  razonamiento; el login necesita ser una verificación determinista
  (sí/no), no algo sujeto a la interpretación de un LLM.
- Nunca se deben pasar contraseñas por el contexto de un LLM — las tools
  de MCP regresan texto que el modelo "lee", no es el canal para
  credenciales.
- El login debe ocurrir **antes** de cualquier conversación con el agente,
  no depender de que el agente decida invocar la tool correcta.

**Flujo correcto:**
```
app-mobil  →  POST /login (backend)  →  Postgres  →  responde token
```
Y solo después de autenticado, el `usuario_id` resultante es el que
alimenta las tools de MCP durante la conversación con el agente.

### Tabla de usuarios

```sql
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  usuario VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);
```

### Conexión propia en `backend/` (independiente de la de `mcp/`)

```js
// backend/db.js
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default pool;
```

### Endpoint de login

```bash
npm install bcrypt jsonwebtoken
```

```js
// backend/routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;

  const result = await pool.query(
    'SELECT id, password_hash FROM usuarios WHERE usuario = $1',
    [usuario]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  const passwordValida = await bcrypt.compare(password, result.rows[0].password_hash);
  if (!passwordValida) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  const token = jwt.sign(
    { usuario_id: result.rows[0].id },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
  res.json({ token, usuario_id: result.rows[0].id });
});

export default router;
```

`backend/.env` necesita además:
```
JWT_SECRET=alguna_clave_larga_y_aleatoria
```

### Crear un usuario de prueba (contraseña hasheada)

```js
// backend/scripts/crear_usuario_prueba.js
import bcrypt from 'bcrypt';
import pool from '../db.js';

const hash = await bcrypt.hash('mipassword123', 10);
await pool.query(
  'INSERT INTO usuarios (usuario, password_hash) VALUES ($1, $2)',
  ['demo', hash]
);
console.log('Usuario de prueba creado');
process.exit();
```
```bash
node backend/scripts/crear_usuario_prueba.js
```

### En `app-mobil/`

Reemplazar la validación local mock por una llamada real:
```
POST http://tu-backend/login  { usuario, password }
```
Guardar el `token` y `usuario_id` devueltos (ej. en `SecureStore` de
Expo), y usar ese `usuario_id` en cada request posterior hacia el agente.

---

## 7. Organización del repositorio (comandos usados, PowerShell/Windows)

Para pasar de una app suelta en una carpeta a la estructura de monorepo:

```powershell
mkdir app-mobil
Get-ChildItem -Path . -Exclude app-mobil -Force | Move-Item -Destination .\app-mobil
cd app-mobil
Get-ChildItem -Force            # revisar si quedó un .git suelto
Remove-Item -Recurse -Force .git   # solo si existe
cd ..
mkdir mcp
mkdir backend
git init                          # ÚNICO git init de todo el proyecto, en la raíz
```

Reglas:
- Un solo `git init`, en la raíz del monorepo.
- Cada carpeta (`app-mobil/`, `backend/`, `mcp/`) es independiente en
  dependencias (node_modules propios, `.env` propios), pero todas viven
  bajo el mismo repo.
- Los commits se hacen siempre desde la raíz (`git add .` / `git commit`
  desde ahí, no desde adentro de una subcarpeta).

---

## 8. Pendientes / próximos pasos

- [ ] Decidir definitivamente MCP en Node/Postgres vs. la versión Python
      con datos sintéticos (no dejar las dos a medias).
- [ ] Confirmar el esquema real de la base de datos en Azure y ajustar
      las queries de `obtener_resumen_mensual` / `obtener_recomendaciones_perfil`.
- [ ] Conectar `app-mobil/` al endpoint real de `/login` en `backend/`
      (quitar el mock).
- [ ] Construir el endpoint del `backend/` que arma el prompt a partir de
      cada tap, llama al LLM con `mcp_servers` apuntando a `mcp/`, y
      transmite el `render_ui` resultante por stream/WebSocket al móvil.
- [ ] Construir el renderer genérico en `app-mobil/` (switch por `tipo` de
      componente) que reemplace el placeholder de "Educación Financiera".
- [ ] Escribir/afinar el `.md` de instrucciones del agente: catálogo de
      tools, schema completo de `render_ui`, regla de interpretación de
      taps, ejemplos few-shot de composición variable.
- [ ] Desplegar `mcp/` y `backend/` (Railway/Render) una vez validado
      localmente.
