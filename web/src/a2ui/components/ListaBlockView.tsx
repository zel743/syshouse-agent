import type { ListaBlock } from '../schema';

type Props = {
  bloque: ListaBlock;
  onAction: (accion: string, parametros?: Record<string, unknown>) => void;
};

const NIVELES_CHIP = new Set(['facil', 'fácil', 'medio', 'dificil', 'difícil']);

function nivelClass(categoria: string): string {
  const n = categoria.toLowerCase();
  if (n === 'facil' || n === 'fácil') return 'a2ui-chip-facil';
  if (n === 'dificil' || n === 'difícil') return 'a2ui-chip-dificil';
  return 'a2ui-chip-medio';
}

// El monto ya llega formateado con signo ("+18,000" / "-6,500") — el color
// es semántico según el signo, nunca decorativo (regla 3 del sistema de
// diseño).
function montoClass(monto: string): string {
  if (monto.trim().startsWith('-')) return 'a2ui-monto-negativo';
  if (monto.trim().startsWith('+')) return 'a2ui-monto-positivo';
  return '';
}

export function ListaBlockView({ bloque, onAction }: Props) {
  return (
    <div className="a2ui-lista">
      {bloque.titulo && <h3 className="a2ui-lista-titulo">{bloque.titulo}</h3>}
      <ul>
        {bloque.items.map((item, index) => {
          const esNivel = item.categoria ? NIVELES_CHIP.has(item.categoria.toLowerCase()) : false;
          const clickable = Boolean(item.accion);

          return (
            <li
              key={index}
              className={clickable ? 'a2ui-clickable' : undefined}
              onClick={clickable ? () => onAction(item.accion!, item.parametros) : undefined}
            >
              <div className="a2ui-lista-izquierda">
                <span className="a2ui-lista-etiqueta">{item.titulo}</span>
                {item.categoria &&
                  (esNivel ? (
                    <span className={`a2ui-chip ${nivelClass(item.categoria)}`}>{item.categoria}</span>
                  ) : (
                    <span className="a2ui-lista-categoria">{item.categoria}</span>
                  ))}
                {item.fecha && <span className="a2ui-lista-fecha">{item.fecha}</span>}
              </div>
              {item.monto && <span className={`a2ui-lista-monto ${montoClass(item.monto)}`}>{item.monto}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
