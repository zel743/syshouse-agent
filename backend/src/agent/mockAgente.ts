import { llamarHerramientaMcp } from './mcpClient';
import type { Agente, EmitirEvento } from './agente';
import type { Pantalla } from './schema';

// Decide la composición de la pantalla con reglas fijas en vez de un LLM.
// Es un *reemplazo temporal* de la Fase 3 real: usa las mismas tools de
// `mcp/` y debe devolver exactamente el mismo contrato `render_ui` que se
// le pide a Claude en `systemPrompt.md` — así que cambiar esta pieza por
// el loop real de Claude no debería tocar `ws.ts` ni el frontend.

type PerfilUsuario = {
  nombre: string;
  perfil: 'Deudor' | 'Inversor' | 'Ahorrativo' | 'Novato';
  racha_inversion: number;
};

type ResumenMensualRow = {
  mes: string;
  total_ingresos: string;
  total_gastos: string;
  saldo_calculado: string;
  total_deuda: string;
  total_ahorro: string;
  total_inversion: string;
};

type Balance = {
  ingresos: string;
  salidas: string;
  saldo_esperado: string;
  saldo_actual: string;
  diferencia: string | null;
};

type Ahorro = { ahorro: string; tasa_ahorro: number };

type Deuda = {
  nombre: string;
  tipo: string;
  saldo_pendiente: string;
  pago_periodico: string;
  tasa_interes: string;
  estado: string;
};

type Inversion = {
  tipo_inversion: string;
  nombre_instrumento: string;
  monto_invertido: string;
  valor_actual: string;
  rendimiento: string;
  rendimiento_pct: string;
  nivel_riesgo: string;
};

type Movimiento = { monto: string; fecha: string; categoria: string; descripcion: string };
type MovimientoConTipo = Movimiento & { tipo: string };
type Recomendacion = { tipo_plan: string; nivel: string; porcentaje: number };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function llamarConEventos<T>(
  emit: EmitirEvento,
  tool: string,
  args: Record<string, unknown>,
  resumir: (data: T) => string
): Promise<T> {
  emit({ type: 'tool_call', tool, args });
  await sleep(300);
  const { data } = await llamarHerramientaMcp<T>(tool, args);
  emit({ type: 'tool_result', tool, summary: resumir(data) });
  return data;
}

// Formato de cifras: kpi.valor sin signo ni "$" (el componente ya antepone
// "$" vía el campo `moneda`); lista.monto con signo y sin "$", tal como los
// ejemplos de systemPrompt.md ("-6,500" / "+18,000").
const plano = (n: number) => Math.round(n).toLocaleString('es-MX');
const conSigno = (n: number) => `${n >= 0 ? '+' : '-'}${plano(Math.abs(n))}`;
// `resumen_mensual.mes` viene de Postgres como timestamp ISO completo
// ("2026-09-01T06:00:00.000Z"); las tools de mcp/ solo aceptan 'YYYY-MM' o
// 'YYYY-MM-DD' — truncar antes de reenviarlo como parámetro.
const soloFecha = (mesIso: string) => mesIso.slice(0, 10);

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// Evita el bug clásico de `new Date('2026-09-01').toLocaleDateString()`:
// una fecha sin hora se parsea como medianoche UTC y, en zonas horarias
// detrás de UTC, se muestra como el mes anterior. Parseamos "YYYY-MM"
// directo, sin pasar por Date/timezone.
const mesLegible = (mesIso: string) => {
  const [anio, mesNum] = mesIso.slice(0, 7).split('-').map(Number);
  return `${MESES[mesNum - 1]} de ${anio}`;
};

export const mockAgente: Agente = async (ctx, emit) => {
  const { auth_uid, accion } = ctx;

  emit({ type: 'agent_status', text: 'Analizando tu perfil…' });
  const perfil = await llamarConEventos<PerfilUsuario>(
    emit,
    'obtener_perfil_usuario',
    { auth_uid },
    (p) => `${p.nombre} — perfil ${p.perfil}, racha de ${p.racha_inversion} meses`
  );

  if (accion === null || accion === 'ver_resumen') {
    return construirResumen(auth_uid, perfil, emit);
  }

  switch (accion) {
    case 'ver_ahorro':
      return construirAhorro(auth_uid, perfil, emit);
    case 'ver_deudas':
      return construirDeudas(auth_uid, emit);
    case 'ver_inversiones':
      return construirInversiones(auth_uid, emit);
    case 'ver_ingresos':
      return construirMovimientos(auth_uid, 'ingresos', emit);
    case 'ver_gastos':
      return construirMovimientos(auth_uid, 'gastos', emit, ctx.parametros);
    case 'ver_categoria':
      return construirMovimientos(auth_uid, 'gastos', emit, ctx.parametros);
    case 'ver_detalle_mes':
      return construirDetalleMes(auth_uid, perfil, emit, ctx.parametros);
    case 'ajustar_meta':
      return construirAjustarMeta(auth_uid, perfil, emit);
    case 'explicar_concepto':
      return construirExplicacion(ctx.parametros);
    default:
      return {
        pantalla_id: 'accion_no_reconocida',
        composicion: [
          {
            tipo: 'tarjeta',
            variante: 'info',
            titulo: 'No reconozco esa acción',
            descripcion: `"${accion}" no está mapeada todavía. Intenta con otra opción de la pantalla.`,
          },
        ],
      };
  }
};

async function construirResumen(auth_uid: string, perfil: PerfilUsuario, emit: EmitirEvento): Promise<Pantalla> {
  emit({ type: 'agent_status', text: 'Revisando tu resumen del mes…' });
  const historial = await llamarConEventos<ResumenMensualRow[]>(
    emit,
    'obtener_resumen_mensual',
    { auth_uid },
    (rows) => (rows.length > 0 ? `${rows.length} mes(es) con historial` : 'sin historial todavía')
  );

  const actual = historial[0];
  const sinActividad =
    !actual ||
    (Number(actual.total_ingresos) === 0 &&
      Number(actual.total_gastos) === 0 &&
      Number(actual.total_deuda) === 0 &&
      Number(actual.total_ahorro) === 0 &&
      Number(actual.total_inversion) === 0);

  if (sinActividad) {
    // Ejemplo E del doc: perfil novato, sin forzar kpi/chart vacíos ni
    // recomendar ningún plan.
    return {
      pantalla_id: 'home_resumen',
      composicion: [
        {
          tipo: 'tarjeta',
          variante: 'info',
          titulo: 'Aún no tenemos suficiente historial',
          descripcion: `En cuanto registres tus primeros movimientos podremos mostrarte tu resumen financiero, ${perfil.nombre}.`,
        },
        { tipo: 'texto', estilo: 'nota', contenido: 'Mientras tanto, aprende la diferencia entre ahorrar e invertir.' },
      ],
    };
  }

  emit({ type: 'agent_status', text: 'Calculando tu balance…' });
  const balance = await llamarConEventos<Balance>(
    emit,
    'obtener_balance',
    { auth_uid },
    (b) => `saldo esperado ${b.saldo_esperado}, saldo actual ${b.saldo_actual}`
  );

  const ingresos = parseFloat(actual.total_ingresos);
  const gastos = parseFloat(actual.total_gastos);
  const ahorro = parseFloat(actual.total_ahorro);
  const saldoActual = parseFloat(balance.saldo_actual);
  const diferencia = balance.diferencia !== null ? parseFloat(balance.diferencia) : 0;
  const tasaAhorro = ingresos > 0 ? (ahorro / ingresos) * 100 : 0;

  const anterior = historial[1];
  let tendencia: 'positivo' | 'negativo' | 'neutro' = 'neutro';
  let comparacion: string | undefined;
  if (anterior) {
    const saldoAnterior = parseFloat(anterior.saldo_calculado);
    const deltaPct = saldoAnterior !== 0 ? ((parseFloat(actual.saldo_calculado) - saldoAnterior) / Math.abs(saldoAnterior)) * 100 : 0;
    tendencia = deltaPct > 0 ? 'positivo' : deltaPct < 0 ? 'negativo' : 'neutro';
    comparacion = `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}% vs. mes anterior`;
  }

  emit({ type: 'agent_status', text: 'Armando tu resumen…' });

  const composicion: Pantalla['composicion'] = [
    { tipo: 'kpi', titulo: 'Saldo actual', valor: plano(saldoActual), moneda: 'MXN', tendencia, comparacion },
    {
      tipo: 'chart',
      subtipo: 'barra',
      titulo: 'Ingresos vs. gastos',
      series: [
        { nombre: 'Ingresos', datos: [ingresos] },
        { nombre: 'Gastos', datos: [gastos] },
      ],
    },
    {
      tipo: 'texto',
      estilo: 'parrafo',
      contenido: `Recibiste $${plano(ingresos)} y realizaste gastos por $${plano(gastos)}. Tu capacidad de ahorro fue de $${plano(ahorro)}, equivalente al ${tasaAhorro.toFixed(1)}% de tus ingresos.`,
    },
  ];

  // Un solo hallazgo destacado, con prioridad: deuda relevante > diferencia
  // de saldo sin explicar > inversión con rendimiento > buena tasa de
  // ahorro > tip educativo genérico. Nunca más de un par de tarjetas.
  const deudas = await llamarConEventos<Deuda[]>(emit, 'obtener_deudas', { auth_uid }, (rows) => `${rows.length} deuda(s)`);
  const pagoDeudaTotal = deudas.reduce((acc, d) => acc + parseFloat(d.pago_periodico || '0'), 0);
  const ratioDeuda = ingresos > 0 ? pagoDeudaTotal / ingresos : 0;

  if (ratioDeuda > 0.1) {
    composicion.push({
      tipo: 'tarjeta',
      variante: 'alerta',
      titulo: 'Tu deuda pesa en tu presupuesto',
      descripcion: `Destinas $${plano(pagoDeudaTotal)} al pago de deuda, ${(ratioDeuda * 100).toFixed(0)}% de tus ingresos.`,
      accion_sugerida: { texto: 'Ver mis deudas', accion: 'ver_deudas' },
    });
  } else if (Math.abs(diferencia) > Math.max(100, ingresos * 0.01)) {
    composicion.push({
      tipo: 'tarjeta',
      variante: 'info',
      titulo: 'Encontramos una diferencia en tu saldo',
      descripcion: `Esperábamos un saldo de $${plano(parseFloat(balance.saldo_esperado))} según tus ingresos y gastos registrados, pero tu saldo actual es $${plano(saldoActual)}. Te sugerimos revisar tus movimientos recientes.`,
      accion_sugerida: { texto: 'Ver movimientos', accion: 'ver_detalle_mes', parametros: { mes: soloFecha(actual.mes) } },
    });
  } else {
    const inversiones = await llamarConEventos<Inversion[]>(
      emit,
      'obtener_inversiones',
      { auth_uid },
      (rows) => `${rows.length} inversión(es)`
    );

    if (inversiones.length > 0 && parseFloat(inversiones[0].rendimiento) > 0) {
      composicion.push({
        tipo: 'tarjeta',
        variante: 'exito',
        titulo: 'Tu inversión está rindiendo frutos',
        descripcion: `${inversiones[0].nombre_instrumento} ha generado $${plano(parseFloat(inversiones[0].rendimiento))} (${inversiones[0].rendimiento_pct}%).`,
        accion_sugerida: { texto: 'Ver mis inversiones', accion: 'ver_inversiones' },
      });
    } else if (tasaAhorro >= 15) {
      composicion.push({
        tipo: 'tarjeta',
        variante: 'exito',
        titulo: 'Buen ritmo de ahorro',
        descripcion: 'Tu comportamiento actual indica una capacidad de ahorro saludable.',
      });
    } else {
      composicion.push({
        tipo: 'tarjeta',
        variante: 'educativa',
        titulo: 'Podrías aprender sobre invertir',
        descripcion: 'Tienes dinero disponible y ninguna inversión activa — conocer las diferencias entre ahorrar e invertir puede ayudarte a que tu dinero rinda más.',
        accion_sugerida: { texto: 'Ver mis opciones', accion: 'ver_inversiones' },
      });
    }
  }

  return { pantalla_id: 'home_resumen', composicion };
}

async function construirAhorro(auth_uid: string, perfil: PerfilUsuario, emit: EmitirEvento): Promise<Pantalla> {
  emit({ type: 'agent_status', text: 'Revisando tu capacidad de ahorro…' });
  const ahorro = await llamarConEventos<Ahorro>(emit, 'obtener_ahorro', { auth_uid }, (a) => `ahorro ${a.ahorro}, tasa ${a.tasa_ahorro}%`);
  const recos = await llamarConEventos<Recomendacion[]>(
    emit,
    'obtener_recomendaciones',
    { auth_uid },
    (rows) => `${rows.length} plan(es) de referencia`
  );

  const metaFacil = recos.find((r) => r.tipo_plan === 'ahorro' && r.nivel === 'facil')?.porcentaje ?? 10;

  if (ahorro.tasa_ahorro >= metaFacil) {
    return {
      pantalla_id: 'detalle_ahorro',
      composicion: [
        { tipo: 'kpi', titulo: 'Tasa de ahorro', valor: ahorro.tasa_ahorro.toFixed(1), moneda: undefined, tendencia: 'positivo' },
        {
          tipo: 'tarjeta',
          variante: 'exito',
          titulo: 'Vas bien con tu ahorro',
          descripcion: `Ahorraste $${plano(parseFloat(ahorro.ahorro))} este mes, por encima del ${metaFacil}% de referencia para tu perfil.`,
        },
      ],
    };
  }

  return {
    pantalla_id: 'detalle_ahorro',
    composicion: [
      {
        tipo: 'tarjeta',
        variante: 'alerta',
        titulo: 'Vas por debajo de tu meta',
        descripcion: `Este mes tu tasa de ahorro fue ${ahorro.tasa_ahorro.toFixed(1)}%, por debajo del ${metaFacil}% de referencia para tu perfil (${perfil.perfil}).`,
        accion_sugerida: { texto: 'Ajustar mi meta', accion: 'ajustar_meta' },
      },
      { tipo: 'boton', texto: 'Ajustar mi meta', accion: 'ajustar_meta', estilo: 'primario' },
    ],
  };
}

async function construirDeudas(auth_uid: string, emit: EmitirEvento): Promise<Pantalla> {
  emit({ type: 'agent_status', text: 'Revisando tus deudas…' });
  const deudas = await llamarConEventos<Deuda[]>(emit, 'obtener_deudas', { auth_uid }, (rows) => `${rows.length} deuda(s)`);

  if (deudas.length === 0) {
    return {
      pantalla_id: 'detalle_deudas',
      composicion: [
        { tipo: 'tarjeta', variante: 'exito', titulo: 'No tienes deudas registradas', descripcion: 'Sigue así.' },
      ],
    };
  }

  const total = deudas.reduce((acc, d) => acc + parseFloat(d.saldo_pendiente), 0);
  const masCostosa = [...deudas].sort((a, b) => parseFloat(b.tasa_interes || '0') - parseFloat(a.tasa_interes || '0'))[0];
  const pagoTotal = deudas.reduce((acc, d) => acc + parseFloat(d.pago_periodico || '0'), 0);
  // Interés mensual aproximado de la deuda más costosa = saldo pendiente ×
  // tasa anual ÷ 12, expresado como % del pago mensual total de deuda.
  const interesMensualMasCostosa = (parseFloat(masCostosa.saldo_pendiente) * parseFloat(masCostosa.tasa_interes)) / 100 / 12;
  const pctInteres = pagoTotal > 0 ? (interesMensualMasCostosa / pagoTotal) * 100 : 0;

  return {
    pantalla_id: 'detalle_deudas',
    composicion: [
      { tipo: 'kpi', titulo: 'Deuda total', valor: plano(total), moneda: 'MXN', tendencia: 'negativo' },
      {
        tipo: 'lista',
        titulo: 'Tus deudas',
        items: deudas.map((d) => ({ titulo: d.nombre, categoria: d.tipo, monto: `-${plano(parseFloat(d.saldo_pendiente))}` })),
      },
      {
        tipo: 'tarjeta',
        variante: 'alerta',
        titulo: `${masCostosa.nombre} tiene el mayor costo financiero`,
        descripcion: `Su tasa de interés es de ${masCostosa.tasa_interes}% anual, aproximadamente ${pctInteres.toFixed(0)}% de tu pago mensual de deuda corresponde a intereses.`,
      },
      { tipo: 'texto', estilo: 'nota', contenido: 'Aprende cómo funciona el interés de una deuda.' },
    ],
  };
}

async function construirInversiones(auth_uid: string, emit: EmitirEvento): Promise<Pantalla> {
  emit({ type: 'agent_status', text: 'Revisando tus inversiones…' });
  const inversiones = await llamarConEventos<Inversion[]>(
    emit,
    'obtener_inversiones',
    { auth_uid },
    (rows) => `${rows.length} inversión(es)`
  );

  if (inversiones.length === 0) {
    const ahorro = await llamarConEventos<Ahorro>(emit, 'obtener_ahorro', { auth_uid }, (a) => `ahorro ${a.ahorro}`);
    const tieneDisponible = parseFloat(ahorro.ahorro) > 0;

    return {
      pantalla_id: 'detalle_inversiones',
      composicion: [
        {
          tipo: 'tarjeta',
          variante: 'educativa',
          titulo: 'Aún no tienes inversiones activas',
          descripcion: tieneDisponible
            ? 'Tienes dinero disponible sin invertir — podrías aprender sobre las diferencias entre ahorrar e invertir.'
            : 'En cuanto generes capacidad de ahorro, este espacio te mostrará tus inversiones.',
        },
      ],
    };
  }

  const valorTotal = inversiones.reduce((acc, i) => acc + parseFloat(i.valor_actual), 0);

  const composicion: Pantalla['composicion'] = [
    { tipo: 'kpi', titulo: 'Valor total invertido', valor: plano(valorTotal), moneda: 'MXN', tendencia: 'positivo' },
    {
      tipo: 'lista',
      titulo: 'Tus inversiones',
      items: inversiones.map((i) => ({
        titulo: i.nombre_instrumento,
        categoria: i.tipo_inversion,
        monto: conSigno(parseFloat(i.rendimiento)),
      })),
    },
  ];

  if (inversiones.length === 1) {
    composicion.push({
      tipo: 'texto',
      estilo: 'nota',
      contenido: 'Tus inversiones están concentradas en un solo instrumento — aprende sobre diversificación y riesgo.',
    });
  }

  return { pantalla_id: 'detalle_inversiones', composicion };
}

async function construirMovimientos(
  auth_uid: string,
  tipo: 'ingresos' | 'gastos',
  emit: EmitirEvento,
  parametros?: Record<string, unknown>
): Promise<Pantalla> {
  const categoria = typeof parametros?.categoria === 'string' ? parametros.categoria : undefined;
  emit({ type: 'agent_status', text: `Revisando tus ${tipo}…` });

  const rows = await llamarConEventos<Movimiento[]>(
    emit,
    tipo === 'ingresos' ? 'obtener_ingresos' : 'obtener_gastos',
    categoria ? { auth_uid, categoria } : { auth_uid },
    (r) => `${r.length} movimiento(s)`
  );

  return {
    pantalla_id: categoria ? 'detalle_categoria' : `detalle_${tipo}`,
    composicion: [
      {
        tipo: 'lista',
        titulo: categoria ? `Gastos en ${categoria}` : tipo === 'ingresos' ? 'Tus ingresos' : 'Tus gastos',
        items:
          rows.length > 0
            ? rows.map((r) => ({
                titulo: r.descripcion || r.categoria,
                categoria: r.categoria,
                monto: tipo === 'ingresos' ? `+${plano(parseFloat(r.monto))}` : `-${plano(parseFloat(r.monto))}`,
                fecha: r.fecha,
              }))
            : [{ titulo: 'Sin movimientos registrados', monto: undefined }],
      },
    ],
  };
}

async function construirDetalleMes(
  auth_uid: string,
  perfil: PerfilUsuario,
  emit: EmitirEvento,
  parametros?: Record<string, unknown>
): Promise<Pantalla> {
  let mes = typeof parametros?.mes === 'string' ? soloFecha(parametros.mes) : undefined;

  if (!mes) {
    const historial = await llamarConEventos<ResumenMensualRow[]>(
      emit,
      'obtener_resumen_mensual',
      { auth_uid },
      (rows) => `${rows.length} mes(es)`
    );
    mes = historial[0] ? soloFecha(historial[0].mes) : undefined;
  }

  if (!mes) {
    return {
      pantalla_id: 'detalle_mes',
      composicion: [{ tipo: 'tarjeta', variante: 'info', titulo: 'Sin mes que mostrar', descripcion: 'Todavía no hay historial suficiente.' }],
    };
  }

  emit({ type: 'agent_status', text: `Buscando movimientos de ${mes}…` });
  const movimientos = await llamarConEventos<MovimientoConTipo[]>(
    emit,
    'obtener_historial_movimientos',
    { auth_uid, mes },
    (rows) => `${rows.length} movimiento(s)`
  );

  return {
    pantalla_id: 'detalle_mes',
    composicion: [
      {
        tipo: 'lista',
        titulo: `Movimientos de ${mesLegible(mes)}`,
        items:
          movimientos.length > 0
            ? movimientos.map((m) => ({
                titulo: m.descripcion || m.categoria,
                categoria: m.categoria,
                monto: m.tipo === 'ingreso' ? `+${plano(parseFloat(m.monto))}` : `-${plano(parseFloat(m.monto))}`,
                fecha: m.fecha,
              }))
            : [{ titulo: 'Sin movimientos este mes' }],
      },
    ],
  };
}

async function construirAjustarMeta(auth_uid: string, perfil: PerfilUsuario, emit: EmitirEvento): Promise<Pantalla> {
  emit({ type: 'agent_status', text: 'Consultando niveles de referencia…' });
  const recos = await llamarConEventos<Recomendacion[]>(
    emit,
    'obtener_recomendaciones',
    { auth_uid },
    (rows) => `${rows.length} nivel(es)`
  );

  return {
    pantalla_id: 'ajustar_meta',
    composicion: [
      {
        tipo: 'texto',
        estilo: 'nota',
        contenido: `Estos son los niveles de referencia para tu perfil (${perfil.perfil}) — los porcentajes son orientativos, no una meta obligatoria.`,
      },
      {
        tipo: 'lista',
        titulo: 'Niveles disponibles',
        items: recos.map((r) => ({ titulo: r.tipo_plan, categoria: r.nivel, monto: `${r.porcentaje}%` })),
      },
    ],
  };
}

const CONCEPTOS: Record<string, string> = {
  tasa_de_interes:
    'La tasa de interés es el costo de pedir dinero prestado, expresado como % anual sobre el saldo pendiente.',
  cat: 'El CAT (Costo Anual Total) incluye la tasa de interés más comisiones — es la forma más completa de comparar créditos.',
  diversificacion:
    'Diversificar significa repartir tu dinero entre varios instrumentos en vez de uno solo, para reducir el riesgo de perder todo si uno falla.',
  liquidez: 'La liquidez es qué tan rápido puedes convertir una inversión en efectivo disponible sin perder valor.',
  tasa_de_ahorro: 'La tasa de ahorro es el porcentaje de tus ingresos que logras ahorrar cada periodo (ahorro ÷ ingresos × 100).',
};

async function construirExplicacion(parametros?: Record<string, unknown>): Promise<Pantalla> {
  const concepto = typeof parametros?.concepto === 'string' ? parametros.concepto : '';
  const clave = concepto.toLowerCase().replace(/\s+/g, '_');
  const explicacion = CONCEPTOS[clave] ?? 'No tengo una explicación registrada para ese concepto todavía.';

  return {
    pantalla_id: 'explicacion',
    composicion: [{ tipo: 'texto', estilo: 'parrafo', contenido: explicacion }],
  };
}
