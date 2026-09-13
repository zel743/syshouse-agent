// Polyfill defensivo: el SDK de MCP (cliente) y `openai` usan el Web Crypto
// global, disponible por default solo desde Node 20+. `engines.node` ya
// pide >=20, esto es solo una red de seguridad adicional.
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = require('crypto').webcrypto;
}

import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import educationRoutes from './routes/education';
import authRoutes from './routes/auth';
import { setupWebSocket } from './agent/ws';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Permite peticiones desde el frontend web
app.use(express.json()); // Permite parsear JSON en el body de las peticiones

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/education', educationRoutes);

// Ruta de prueba de estado
app.get('/health', (req, res) => {
  res.json({ status: 'API funcionando correctamente' });
});

// El WebSocket (/ws) comparte el mismo servidor HTTP que Express, en vez
// de levantar un puerto aparte.
const server = http.createServer(app);
setupWebSocket(server);

server.listen(port, () => {
  console.log(`Servidor Backend corriendo en http://localhost:${port} (WS en /ws)`);
});
