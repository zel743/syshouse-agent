import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db';

const router = Router();

router.post('/login', async (req, res) => {
  const { usuario, password } = req.body as { usuario?: string; password?: string };

  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  try {
    const result = await pool.query(
      'SELECT id, auth_uid, nombre, perfil, racha_inversion, password_hash FROM usuarios WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))',
      [usuario]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const user = result.rows[0];
    const passwordValida = await bcrypt.compare(password, user.password_hash);

    if (!passwordValida) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET no está configurado');
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    const token = jwt.sign({ usuario_id: user.id, auth_uid: user.auth_uid }, jwtSecret, {
      expiresIn: '2h',
    });

    res.json({
      token,
      usuario_id: user.id,
      auth_uid: user.auth_uid,
      nombre: user.nombre,
      perfil: user.perfil,
      racha_inversion: user.racha_inversion,
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
