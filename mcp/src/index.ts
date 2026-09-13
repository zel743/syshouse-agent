// Polyfill defensivo: @modelcontextprotocol/sdk usa el Web Crypto global
// (`crypto.randomUUID()`, etc.), disponible por default solo desde Node 20+.
// `engines.node` en package.json ya pide >=20, pero esto evita un crash
// silencioso si algún entorno (cache de build, etc.) igual usa Node 18.
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = require('crypto').webcrypto;
}

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Servidor MCP en modo stateless: cada request crea su propio McpServer +
// transport (no se comparte sesión entre llamadas). Suficiente para el
// caso de uso — el backend/agente reconsulta el contexto en cada tap.
app.post('/mcp', async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on('close', () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error manejando request MCP:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Error interno del servidor MCP' },
        id: null,
      });
    }
  }
});

// El transporte stateless no soporta GET (streams de servidor) ni DELETE
// (cierre de sesión) porque no hay sesión que mantener.
app.get('/mcp', (_req, res) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed: este servidor MCP es stateless' },
    id: null,
  });
});

app.delete('/mcp', (_req, res) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed: este servidor MCP es stateless' },
    id: null,
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'MCP server funcionando correctamente' });
});

// OJO: usa MCP_PORT, no PORT — cuando `backend/` y `mcp/` corren juntos en
// el mismo servicio de Railway, PORT lo asigna la plataforma para el
// puerto público (el de `backend/`); si `mcp/` también leyera PORT
// pelearían por el mismo puerto. `mcp/` nunca se expone públicamente.
const PORT = process.env.MCP_PORT || 8000;
app.listen(PORT, () => {
  console.log(`Servidor MCP corriendo en http://localhost:${PORT}/mcp`);
});
