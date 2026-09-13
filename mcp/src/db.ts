import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Conexión propia del servidor MCP hacia Azure PostgreSQL — independiente
// de la conexión que usa `backend/`, cada capa administra la suya.
export const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  ssl: {
    rejectUnauthorized: true,
  },
});

pool.on('error', (err) => {
  console.error('Error inesperado en el cliente de PostgreSQL (mcp)', err);
  process.exit(-1);
});
