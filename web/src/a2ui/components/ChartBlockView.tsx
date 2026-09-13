import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartBlock } from '../schema';
import { colorForLabel } from '../../design/dataPalette';

type Props = {
  bloque: ChartBlock;
  onAction: (accion: string, parametros?: Record<string, unknown>) => void;
};

export function ChartBlockView({ bloque, onAction }: Props) {
  const clickable = Boolean(bloque.accion);
  const handleClick = clickable ? () => onAction(bloque.accion!, bloque.parametros) : undefined;

  return (
    <div className={`a2ui-chart${clickable ? ' a2ui-clickable' : ''}`} onClick={handleClick}>
      <h3 className="a2ui-chart-titulo">{bloque.titulo}</h3>
      {bloque.subtipo === 'dona' ? <DonutChart bloque={bloque} /> : <TrendOrComparisonChart bloque={bloque} />}
    </div>
  );
}

/** "Donut chart con leyenda" (sección 3): total al centro + leyenda con % */
function DonutChart({ bloque }: { bloque: ChartBlock }) {
  const datos = bloque.series.map((s) => ({ nombre: s.nombre, valor: s.datos[0] ?? 0 }));
  const total = datos.reduce((acc, d) => acc + d.valor, 0);

  return (
    <div className="a2ui-donut-wrap">
      <div className="a2ui-donut-chart">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Tooltip />
            <Pie data={datos} dataKey="valor" nameKey="nombre" innerRadius={55} outerRadius={80} paddingAngle={2}>
              {datos.map((d) => (
                <Cell key={d.nombre} fill={colorForLabel(d.nombre)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="a2ui-donut-total">
          <span className="a2ui-donut-total-valor">${total.toLocaleString('es-MX')}</span>
        </div>
      </div>
      <ul className="a2ui-donut-leyenda">
        {datos.map((d) => (
          <li key={d.nombre}>
            <span className="a2ui-donut-punto" style={{ background: colorForLabel(d.nombre) }} />
            <span className="a2ui-donut-nombre">{d.nombre}</span>
            <span className="a2ui-donut-monto">${d.valor.toLocaleString('es-MX')}</span>
            <span className="a2ui-donut-pct">{total > 0 ? Math.round((d.valor / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * línea/área/barra. Si `categorias` viene con la misma longitud que los
 * datos de cada serie, es una tendencia (varios puntos en el tiempo). Si
 * cada serie trae un solo dato, es una comparación puntual entre series
 * (ej. Ingresos vs. Gastos de un mes) y se dibuja como barras, sin
 * importar el `subtipo` pedido (una línea de 1 punto no comunica nada).
 */
function TrendOrComparisonChart({ bloque }: { bloque: ChartBlock }) {
  const esTendencia = Boolean(bloque.categorias?.length) && bloque.series.every((s) => s.datos.length > 1);

  if (!esTendencia) {
    const datos = bloque.series.map((s) => ({ categoria: s.nombre, valor: s.datos[0] ?? 0 }));
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={datos}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="categoria" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
            {datos.map((d) => (
              <Cell key={d.categoria} fill={colorForLabel(d.categoria)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const datos = (bloque.categorias ?? []).map((cat, i) => {
    const punto: Record<string, string | number> = { categoria: cat };
    bloque.series.forEach((s) => {
      punto[s.nombre] = s.datos[i] ?? 0;
    });
    return punto;
  });

  const ejes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
      <XAxis dataKey="categoria" tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
    </>
  );

  if (bloque.subtipo === 'barra') {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={datos}>
          {ejes}
          {bloque.series.map((s) => (
            <Bar key={s.nombre} dataKey={s.nombre} fill={colorForLabel(s.nombre)} radius={[6, 6, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (bloque.subtipo === 'area') {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={datos}>
          {ejes}
          {bloque.series.map((s) => (
            <Area
              key={s.nombre}
              type="monotone"
              dataKey={s.nombre}
              stroke={colorForLabel(s.nombre)}
              fill={colorForLabel(s.nombre)}
              fillOpacity={0.15}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={datos}>
        {ejes}
        {bloque.series.map((s) => (
          <Line
            key={s.nombre}
            type="monotone"
            dataKey={s.nombre}
            stroke={colorForLabel(s.nombre)}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
