import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import educationRoutes from './routes/education';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Permite peticiones desde tu app Expo
app.use(express.json()); // Permite parsear JSON en el body de las peticiones

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/education', educationRoutes);

// Ruta de prueba de estado
app.get('/health', (req, res) => {
  res.json({ status: 'API funcionando correctamente' });
});

app.listen(port, () => {
  console.log(`Servidor Backend corriendo en http://localhost:${port}`);
});