import type { TextoBlock } from '../schema';

type Props = {
  bloque: TextoBlock;
};

export function TextoBlockView({ bloque }: Props) {
  if (bloque.estilo === 'titulo') {
    return <h2 className="a2ui-texto-titulo">{bloque.contenido}</h2>;
  }
  if (bloque.estilo === 'nota') {
    return <p className="a2ui-texto-nota">{bloque.contenido}</p>;
  }
  return <p className="a2ui-texto-parrafo">{bloque.contenido}</p>;
}
