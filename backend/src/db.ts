import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configuración del Pool de conexiones hacia Azure
export const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: {
    // Azure exige conexiones seguras mediante SSL
    rejectUnauthorized: true,
  },
});

pool.on('error', (err) => {
  console.error('Error inesperado en el cliente de PostgreSQL', err);
  process.exit(-1);
});