import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// Endpoint de ejemplo para obtener perfiles o datos de educación financiera
router.get('/perfil/:auth_uid', async (req, res) => {
  const { auth_uid } = req.params;

  try {
    const result = await pool.query(
      'SELECT nombre, perfil, racha_inversion FROM usuarios WHERE auth_uid = $1',
      [auth_uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al consultar la base de datos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;