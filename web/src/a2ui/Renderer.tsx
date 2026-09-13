import type { Bloque, Pantalla } from './schema';
import { KpiBlockView } from './components/KpiBlockView';
import { TarjetaBlockView } from './components/TarjetaBlockView';
import { ListaBlockView } from './components/ListaBlockView';
import { ChartBlockView } from './components/ChartBlockView';
import { BotonBlockView } from './components/BotonBlockView';
import { TextoBlockView } from './components/TextoBlockView';
import './renderer.css';

export type OnAction = (accion: string, parametros?: Record<string, unknown>) => void;

type Props = {
  pantalla: Pantalla;
  onAction: OnAction;
};

export function Renderer({ pantalla, onAction }: Props) {
  return (
    <div className="a2ui-canvas">
      {pantalla.composicion.map((bloque, index) => (
        <BloqueView key={index} bloque={bloque} onAction={onAction} />
      ))}
    </div>
  );
}

function BloqueView({ bloque, onAction }: { bloque: Bloque; onAction: OnAction }) {
  switch (bloque.tipo) {
    case 'kpi':
      return <KpiBlockView bloque={bloque} onAction={onAction} />;
    case 'chart':
      return <ChartBlockView bloque={bloque} onAction={onAction} />;
    case 'lista':
      return <ListaBlockView bloque={bloque} onAction={onAction} />;
    case 'tarjeta':
      return <TarjetaBlockView bloque={bloque} onAction={onAction} />;
    case 'boton':
      return <BotonBlockView bloque={bloque} onAction={onAction} />;
    case 'texto':
      return <TextoBlockView bloque={bloque} />;
  }
}
