import { Renderer } from '../a2ui/Renderer';
import type { useAgentSession } from '../agent/useAgentSession';
import { TopAppBar } from '../design/TopAppBar';
import { DecorativeWave } from '../design/DecorativeWave';
import './CanvasScreen.css';

type Props = {
  /** Salir del canvas por completo, de vuelta al menú. */
  onExit: () => void;
  session: ReturnType<typeof useAgentSession>;
};

export function CanvasScreen({ onExit, session }: Props) {
  const { pantalla, conectado, sendAction, goBack, atRoot } = session;

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
        {!conectado && !pantalla && <p className="canvas-status">Conectando con el agente…</p>}

        {pantalla ? (
          <Renderer pantalla={pantalla} onAction={sendAction} />
        ) : (
          conectado && <p className="canvas-status">Armando tu pantalla…</p>
        )}
      </div>

      <DecorativeWave />
    </div>
  );
}
