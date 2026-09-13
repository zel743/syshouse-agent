import type { TarjetaBlock } from '../schema';

type Props = {
  bloque: TarjetaBlock;
  onAction: (accion: string, parametros?: Record<string, unknown>) => void;
};

export function TarjetaBlockView({ bloque, onAction }: Props) {
  return (
    <div className={`a2ui-tarjeta a2ui-variante-${bloque.variante}`}>
      <h3 className="a2ui-tarjeta-titulo">{bloque.titulo}</h3>
      {bloque.descripcion && <p className="a2ui-tarjeta-desc">{bloque.descripcion}</p>}
      {bloque.accion_sugerida && (
        <button
          className="a2ui-tarjeta-accion"
          onClick={() => onAction(bloque.accion_sugerida!.accion, bloque.accion_sugerida!.parametros)}
        >
          {bloque.accion_sugerida.texto}
        </button>
      )}
    </div>
  );
}
