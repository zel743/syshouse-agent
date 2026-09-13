import { Renderer } from '../a2ui/Renderer';
import type { useAgentSession } from '../agent/useAgentSession';
import { TopAppBar } from '../design/TopAppBar';
import { DecorativeWave } from '../design/DecorativeWave';
import { Spinner } from '../design/Spinner';
import './CanvasScreen.css';

type Props = {
  /** Salir del canvas por completo, de vuelta al menú. */
  onExit: () => void;
  session: ReturnType<typeof useAgentSession>;
};

export function CanvasScreen({ onExit, session }: Props) {
  const { pantalla, conectado, cargando, sendAction, goBack, atRoot } = session;

  // "Atrás" primero intenta regresar dentro del propio historial del
  // canvas (sin red, sin regenerar nada); solo sale al menú cuando ya no
  // hay nada más atrás que la pantalla raíz.
  const handleBack = () => {
    if (atRoot) {
      onExit();
    } else {
      goBack();
    }
  };

  return (
    <div className="canvas-page">
      <TopAppBar title="Educación financiera" onBack={handleBack} />

      <div className="canvas-body">
        {!pantalla && (
          <Spinner label={!conectado ? 'Conectando con el agente…' : 'Armando tu pantalla…'} />
        )}

        {pantalla && (
          <div className="canvas-pantalla-wrap">
            <Renderer pantalla={pantalla} onAction={sendAction} />
            {cargando && <Spinner overlay label="Armando tu pantalla…" />}
          </div>
        )}
      </div>

      <DecorativeWave />
    </div>
  );
}
