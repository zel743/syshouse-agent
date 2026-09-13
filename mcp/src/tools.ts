import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { pool } from './db';

const jsonResult = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data) }],
});

const notFound = (auth_uid: string) => ({
  content: [{ type: 'text' as const, text: JSON.stringify({ error: `No existe un usuario con auth_uid=${auth_uid}` }) }],
  isError: true,
});

async function usuarioIdPorAuthUid(auth_uid: string): Promise<number | null> {
  const { rows } = await pool.query('SELECT id FROM usuarios WHERE auth_uid = $1', [auth_uid]);
  return rows.length > 0 ? rows[0].id : null;
}

const mesSchema = z
  .string()
  .regex(/^\d{4}-\d{2}(-\d{2})?$/)
  .describe("Mes en formato 'YYYY-MM' o 'YYYY-MM-DD'");

export function registerTools(server: McpServer) {
  server.registerTool(
    'obtener_perfil_usuario',
    {
      title: 'Obtener perfil de usuario',
      description:
        'Devuelve el perfil financiero de un usuario (nombre, perfil detectado: Deudor/Inversor/Ahorrativo/Novato, racha de inversión).',
      inputSchema: {
        auth_uid: z.string().describe('Identificador del usuario autenticado (auth_uid devuelto por /api/auth/login)'),
      },
    },
    async ({ auth_uid }) => {
      const { rows } = await pool.query(
        'SELECT auth_uid, nombre, perfil, racha_inversion, fecha_registro FROM usuarios WHERE auth_uid = $1',
        [auth_uid]
      );

      if (rows.length === 0) return notFound(auth_uid);
      return jsonResult(rows[0]);
    }
  );

  server.registerTool(
    'obtener_resumen_mensual',
    {
      title: 'Obtener resumen mensual (historial multi-mes)',
      description:
        'Devuelve el resumen mensual (ingresos, gastos, deuda, ahorro, inversión) de un usuario. Si no se especifica mes, devuelve el historial completo — úsala para comparar periodos.',
      inputSchema: {
        auth_uid: z.string().describe('Identificador del usuario autenticado'),
        mes: mesSchema.optional().describe('Si se omite, se devuelven todos los meses disponibles, del más reciente al más antiguo.'),
      },
    },
    async ({ auth_uid, mes }) => {
      const usuarioId = await usuarioIdPorAuthUid(auth_uid);
      if (usuarioId === null) return notFound(auth_uid);

      const { rows } = mes
        ? await pool.query(
            `SELECT mes, total_ingresos, total_gastos, saldo_calculado, total_deuda, total_ahorro, total_inversion
             FROM resumen_mensual
             WHERE usuario_id = $1 AND date_trunc('month', mes) = date_trunc('month', $2::date)`,
            [usuarioId, mes]
          )
        : await pool.query(
            `SELECT mes, total_ingresos, total_gastos, saldo_calculado, total_deuda, total_ahorro, total_inversion
             FROM resumen_mensual
             WHERE usuario_id = $1
             ORDER BY mes DESC`,
            [usuarioId]
          );

      return jsonResult(rows);
    }
  );

  server.registerTool(
    'obtener_balance',
    {
      title: 'Obtener balance (saldo esperado vs. saldo actual)',
      description:
        'Devuelve ingresos, salidas, saldo esperado (calculado) y saldo actual (real) del mes más reciente o de un mes específico, más la diferencia entre ambos si existe. Nunca infieras la causa de una diferencia que esta tool no explique.',
      inputSchema: {
        auth_uid: z.string().describe('Identificador del usuario autenticado'),
        mes: mesSchema.optional().describe('Si se omite, usa el mes más reciente con datos.'),
      },
    },
    async ({ auth_uid, mes }) => {
      const usuarioId = await usuarioIdPorAuthUid(auth_uid);
      if (usuarioId === null) return notFound(auth_uid);

      const { rows } = mes
        ? await pool.query(
            `SELECT total_ingresos, total_gastos, saldo_calculado
             FROM resumen_mensual
             WHERE usuario_id = $1 AND date_trunc('month', mes) = date_trunc('month', $2::date)`,
            [usuarioId, mes]
          )
        : await pool.query(
            `SELECT total_ingresos, total_gastos, saldo_calculado
             FROM resumen_mensual
             WHERE usuario_id = $1
             ORDER BY mes DESC
             LIMIT 1`,
            [usuarioId]
          );

      const { rows: usuarioRows } = await pool.query('SELECT saldo_actual FROM usuarios WHERE id = $1', [usuarioId]);
      const saldoActual = parseFloat(usuarioRows[0]?.saldo_actual ?? '0');

      if (rows.length === 0) {
        return jsonResult({ ingresos: 0, salidas: 0, saldo_esperado: 0, saldo_actual: saldoActual, diferencia: null });
      }

      const saldoEsperado = parseFloat(rows[0].saldo_calculado);

      return jsonResult({
        ingresos: rows[0].total_ingresos,
        salidas: rows[0].total_gastos,
        saldo_esperado: rows[0].saldo_calculado,
        saldo_actual: saldoActual.toFixed(2),
        diferencia: (saldoActual - saldoEsperado).toFixed(2),
      });
    }
  );

  server.registerTool(
    'obtener_ingresos',
    {
      title: 'Obtener ingresos',
      description: 'Devuelve los movimientos de ingreso de un usuario, más recientes primero.',
      inputSchema: {
        auth_uid: z.string().describe('Identificador del usuario autenticado'),
        mes: mesSchema.optional().describe('Filtrar solo por este mes'),
      },
    },
    async ({ auth_uid, mes }) => {
      const usuarioId = await usuarioIdPorAuthUid(auth_uid);
      if (usuarioId === null) return notFound(auth_uid);

      const { rows } = mes
        ? await pool.query(
            `SELECT monto, fecha, categoria, descripcion FROM transacciones
             WHERE usuario_id = $1 AND tipo = 'ingreso' AND date_trunc('month', fecha) = date_trunc('month', $2::date)
             ORDER BY fecha DESC`,
            [usuarioId, mes]
          )
        : await pool.query(
            `SELECT monto, fecha, categoria, descripcion FROM transacciones
             WHERE usuario_id = $1 AND tipo = 'ingreso'
             ORDER BY fecha DESC`,
            [usuarioId]
          );

      return jsonResult(rows);
    }
  );

  server.registerTool(
    'obtener_gastos',
    {
      title: 'Obtener gastos',
      description: 'Devuelve los movimientos de gasto de un usuario, opcionalmente filtrados por categoría, más recientes primero.',
      inputSchema: {
        auth_uid: z.string().describe('Identificador del usuario autenticado'),
        mes: mesSchema.optional().describe('Filtrar solo por este mes'),
        categoria: z.string().optional().describe('Filtrar solo por esta categoría'),
      },
    },
    async ({ auth_uid, mes, categoria }) => {
      const usuarioId = await usuarioIdPorAuthUid(auth_uid);
      if (usuarioId === null) return notFound(auth_uid);

      const condiciones = ["usuario_id = $1", "tipo = 'gasto'"];
      const params: unknown[] = [usuarioId];

      if (mes) {
        params.push(mes);
        condiciones.push(`date_trunc('month', fecha) = date_trunc('month', $${params.length}::date)`);
      }
      if (categoria) {
        params.push(categoria);
        condiciones.push(`categoria = $${params.length}`);
      }

      const { rows } = await pool.query(
        `SELECT monto, fecha, categoria, descripcion FROM transacciones WHERE ${condiciones.join(' AND ')} ORDER BY fecha DESC`,
        params
      );

      return jsonResult(rows);
    }
  );

  server.registerTool(
    'obtener_ahorro',
    {
      title: 'Obtener capacidad y tasa de ahorro',
      description: 'Devuelve el monto ahorrado y la tasa de ahorro (% de los ingresos) del mes más reciente o de un mes específico.',
      inputSchema: {
        auth_uid: z.string().describe('Identificador del usuario autenticado'),
        mes: mesSchema.optional().describe('Si se omite, usa el mes más reciente con datos.'),
      },
    },
    async ({ auth_uid, mes }) => {
      const usuarioId = await usuarioIdPorAuthUid(auth_uid);
      if (usuarioId === null) return notFound(auth_uid);

      const { rows } = mes
        ? await pool.query(
            `SELECT total_ingresos, total_ahorro FROM resumen_mensual
             WHERE usuario_id = $1 AND date_trunc('month', mes) = date_trunc('month', $2::date)`,
            [usuarioId, mes]
          )
        : await pool.query(
            `SELECT total_ingresos, total_ahorro FROM resumen_mensual
             WHERE usuario_id = $1 ORDER BY mes DESC LIMIT 1`,
            [usuarioId]
          );

      if (rows.length === 0) return jsonResult({ ahorro: 0, tasa_ahorro: 0 });

      const ingresos = parseFloat(rows[0].total_ingresos);
      const ahorro = parseFloat(rows[0].total_ahorro);
      const tasa = ingresos > 0 ? (ahorro / ingresos) * 100 : 0;

      return jsonResult({ ahorro: ahorro.toFixed(2), tasa_ahorro: Number(tasa.toFixed(1)) });
    }
  );

  server.registerTool(
    'obtener_deudas',
    {
      title: 'Obtener deudas',
      description: 'Devuelve las deudas del usuario (tarjeta, préstamo, crédito, etc.) con saldo pendiente, tasa de interés y condiciones de pago.',
      inputSchema: {
        auth_uid: z.string().describe('Identificador del usuario autenticado'),
      },
    },
    async ({ auth_uid }) => {
      const usuarioId = await usuarioIdPorAuthUid(auth_uid);
      if (usuarioId === null) return notFound(auth_uid);

      const { rows } = await pool.query(
        `SELECT nombre, tipo, saldo_pendiente, monto_original, pago_periodico, periodicidad_pago,
                tasa_interes, cat, fecha_corte, fecha_limite, pagos_restantes, cuenta_asociada, estado
         FROM deudas WHERE usuario_id = $1 ORDER BY saldo_pendiente DESC`,
        [usuarioId]
      );

      return jsonResult(rows);
    }
  );

  server.registerTool(
    'obtener_inversiones',
    {
      title: 'Obtener inversiones',
      description: 'Devuelve las inversiones activas del usuario con monto invertido, valor actual y rendimiento.',
      inputSchema: {
        auth_uid: z.string().describe('Identificador del usuario autenticado'),
      },
    },
    async ({ auth_uid }) => {
      const usuarioId = await usuarioIdPorAuthUid(auth_uid);
      if (usuarioId === null) return notFound(auth_uid);

      const { rows } = await pool.query(
        `SELECT tipo_inversion, nombre_instrumento, monto_invertido, valor_actual, rendimiento, rendimiento_pct,
                fecha_inicio, fecha_vencimiento, plazo, nivel_riesgo, liquidez
         FROM inversiones WHERE usuario_id = $1 ORDER BY valor_actual DESC`,
        [usuarioId]
      );

      return jsonResult(rows);
    }
  );

  server.registerTool(
    'obtener_historial_movimientos',
    {
      title: 'Obtener historial de movimientos de un mes',
      description: 'Devuelve el detalle completo de movimientos (ingresos y gastos) de un mes específico — úsala cuando el usuario quiera ver el detalle de un mes.',
      inputSchema: {
        auth_uid: z.string().describe('Identificador del usuario autenticado'),
        mes: mesSchema.describe('Mes a consultar'),
      },
    },
    async ({ auth_uid, mes }) => {
      const usuarioId = await usuarioIdPorAuthUid(auth_uid);
      if (usuarioId === null) return notFound(auth_uid);

      const { rows } = await pool.query(
        `SELECT tipo, monto, fecha, categoria, descripcion FROM transacciones
         WHERE usuario_id = $1 AND date_trunc('month', fecha) = date_trunc('month', $2::date)
         ORDER BY fecha DESC`,
        [usuarioId, mes]
      );

      return jsonResult(rows);
    }
  );

  server.registerTool(
    'obtener_recomendaciones',
    {
      title: 'Obtener recomendaciones del agente',
      description:
        'Devuelve los planes de ahorro/inversión activos recomendados para el usuario (niveles fácil/medio/difícil con su porcentaje), ya filtrados según su perfil.',
      inputSchema: {
        auth_uid: z.string().describe('Identificador del usuario autenticado'),
      },
    },
    async ({ auth_uid }) => {
      const usuarioId = await usuarioIdPorAuthUid(auth_uid);
      if (usuarioId === null) return notFound(auth_uid);

      const { rows } = await pool.query(
        `SELECT tipo_plan, nivel, porcentaje
         FROM recomendaciones_ia
         WHERE usuario_id = $1 AND activa = TRUE
         ORDER BY tipo_plan, porcentaje`,
        [usuarioId]
      );

      return jsonResult(rows);
    }
  );
}
