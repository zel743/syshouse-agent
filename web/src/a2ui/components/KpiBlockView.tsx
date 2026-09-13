import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import type { KpiBlock } from '../schema';

type Props = {
  bloque: KpiBlock;
  onAction: (accion: string, parametros?: Record<string, unknown>) => void;
};

// "Tarjeta de métrica destacada" (sección 3 del sistema de diseño): icono +
// etiqueta + cifra grande + indicador de variación coloreado según signo.
export function KpiBlockView({ bloque, onAction }: Props) {
  const clickable = Boolean(bloque.accion);
  const TrendIcon = bloque.tendencia === 'negativo' ? TrendingDown : bloque.tendencia === 'positivo' ? TrendingUp : null;

  return (
    <div
      className={`a2ui-kpi a2ui-tendencia-${bloque.tendencia ?? 'neutro'}${clickable ? ' a2ui-clickable' : ''}`}
      onClick={clickable ? () => onAction(bloque.accion!, bloque.parametros) : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <div className="a2ui-kpi-icon">
        <Wallet size={18} />
      </div>
      <div className="a2ui-kpi-body">
        <span className="a2ui-kpi-titulo">{bloque.titulo}</span>
        <span className="a2ui-kpi-valor">
          {bloque.moneda ? '$' : ''}
          {bloque.valor}
        </span>
        {bloque.comparacion && (
          <span className="a2ui-kpi-comparacion">
            {TrendIcon && <TrendIcon size={14} />}
            {bloque.comparacion}
          </span>
        )}
      </div>
    </div>
  );
}
