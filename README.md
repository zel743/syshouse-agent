# Agente de Educación Financiera

**Banorte Challenge** — HackMTY / Tec de Monterrey

Un agente de IA que **genera la interfaz de usuario dinámicamente** a
partir de los datos financieros reales de la persona, en vez de mostrar
pantallas fijas con plantillas. No hay texto libre: cada toque sobre la
pantalla es una intención que el agente interpreta, decidiendo qué datos
traer y cómo componer la siguiente pantalla con un catálogo de componentes
ya diseñado.

```
Usuario (tap) ──▶ Frontend (React) ──WebSocket──▶ Backend (Express)
                                                        │
                                                        ▼
                                                  LLM (DeepSeek)
                                              ╱                ╲
                                    Tools de MCP          render_ui (A2UI)
                                             │
                                    Azure PostgreSQL
```

Documentación técnica completa (arquitectura, decisiones, dataset) en
[`.context/`](#documentación) — este README es la puerta de entrada rápida.

---

## Estructura del repo

```
syshouse-agent/
├── web/          Frontend — React + Vite + TypeScript
├── backend/      Orquestador — Node.js + Express + TypeScript
├── mcp/          Servidor de datos — Node.js + Express + MCP SDK
├── package.json  Orquesta backend/+mcp/ como un solo servicio (deploy en Railway)
└── railway.json  Configuración de build/deploy para Railway
```

## Piezas no negociables

- **LLM** ([DeepSeek](https://platform.deepseek.com), API compatible con OpenAI) — interpreta la intención y decide qué mostrar.
- **MCP** (`mcp/`) — expone los datos financieros reales como *tools* estandarizadas.
- **A2UI** (`render_ui`) — el protocolo con el que el agente describe la pantalla, no texto plano.

## Correrlo en local

Se necesitan **3 terminales**, cada una con su propio `npm install` la primera vez:

```bash
# Terminal 1 — datos
cd mcp && cp .env.example .env   # llena las credenciales de Azure Postgres
npm install
npm run dev                       # http://localhost:8000/mcp

# Terminal 2 — backend/agente
cd backend && cp .env.example .env   # DB, JWT_SECRET, MCP_URL, DEEPSEEK_API_KEY...
npm install
npm run dev                       # http://localhost:3000  (WS en /ws, docs en /api-docs)

# Terminal 3 — frontend
cd web && cp .env.example .env
npm install
npm run dev                       # http://localhost:5173
```

Sin `DEEPSEEK_API_KEY` configurada en `backend/.env`, el sistema sigue
funcionando de punta a punta con un agente basado en reglas
(`mockAgente.ts`) en vez del LLM real — útil para desarrollar sin gastar
créditos.

### Credenciales de demo

| Usuario | Contraseña | Perfil |
|---|---|---|
| `Luis` | `banorte2026` | Novato (sin historial) |
| `Ana` | `banorte2026` | Deudor |
| `Carlos` | `banorte2026` | Inversor |
| `Marta` | `banorte2026` | Ahorrativo |

## Pruebas

```bash
cd web && npm run test      # Vitest — catálogo A2UI y validación defensiva
```

## Despliegue

| Servicio | Dónde | Notas |
|---|---|---|
| `backend/` + `mcp/` | Railway (un solo servicio) | Se comunican por `localhost`; `mcp/` nunca se expone públicamente |
| `web/` | Vercel | `Root Directory: web/`, build estático de Vite |
| Base de datos | Azure Database for PostgreSQL | Firewall restringido por IP |

Detalle completo de variables de entorno y pasos de despliegue en
`.context/documentacion-tecnica.md`, sección 8.

## Documentación

Todo en [`.context/`](.context/):

- **`documentacion-tecnica.md`** — arquitectura completa, stack, MCP, A2UI, agente/LLM, infraestructura, decisiones de diseño.
- **`documentacion-dataset.md`** — esquema de base de datos (queries `CREATE TABLE`/`INSERT` listas para recrear desde cero) y datos de demo.
- **`context.md`** / **`db_changes.md`** — bitácora de desarrollo (qué se construyó, bugs reales encontrados y cómo se arreglaron).

## Stack

React 19 + Vite · TypeScript · Zod · Recharts · Node.js + Express · PostgreSQL
(`pg`) · `@modelcontextprotocol/sdk` · DeepSeek (SDK `openai`) · WebSocket
(`ws`) · JWT + bcrypt · Railway · Vercel · Azure Database for PostgreSQL.
