import type { LoginResponse } from '../services/api';
import { Renderer } from '../a2ui/Renderer';
import { useAgentSession } from '../agent/useAgentSession';
import { TopAppBar } from '../design/TopAppBar';
import { DecorativeWave } from '../design/DecorativeWave';
import './CanvasScreen.css';

type Props = {
  usuario: LoginResponse;
  onBack: () => void;
};

export function CanvasScreen({ usuario, onBack }: Props) {
  const { pantalla, conectado, sendAction } = useAgentSession(usuario.auth_uid);

  return (
    <div className="canvas-page">
      <TopAppBar title="Educación financiera" onBack={onBack} />

      <div className="canvas-body">
        {!conectado && <p className="canvas-status">Conectando con el agente…</p>}

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
