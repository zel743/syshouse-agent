import type { BotonBlock } from '../schema';

type Props = {
  bloque: BotonBlock;
  onAction: (accion: string, parametros?: Record<string, unknown>) => void;
};

export function BotonBlockView({ bloque, onAction }: Props) {
  return (
    <button
      className={`a2ui-boton a2ui-boton-${bloque.estilo ?? 'primario'}`}
      onClick={() => onAction(bloque.accion, bloque.parametros)}
    >
      {bloque.texto}
    </button>
  );
}
