import type { LoginResponse } from '../services/api';
import { TopAppBar } from '../design/TopAppBar';
import { DecorativeWave } from '../design/DecorativeWave';
import './MenuScreen.css';

type Props = {
  usuario: LoginResponse;
  onEnterCanvas: () => void;
  onLogout: () => void;
};

export function MenuScreen({ usuario, onEnterCanvas, onLogout }: Props) {
  return (
    <div className="menu-page">
      <TopAppBar title="Inicio" />

      <div className="menu-content">
        <span className="menu-saludo">Hola, {usuario.nombre}</span>

        <button className="menu-button" onClick={onEnterCanvas}>
          Educación financiera
        </button>

        <button className="menu-logout" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>

      <DecorativeWave />
    </div>
  );
}
