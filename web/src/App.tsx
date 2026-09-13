import { useEffect, useState } from 'react';
import type { LoginResponse } from './services/api';
import { clearSession, getSession } from './services/session';
import { useAgentSession } from './agent/useAgentSession';
import { LoginScreen } from './screens/LoginScreen';
import { MenuScreen } from './screens/MenuScreen';
import { CanvasScreen } from './screens/CanvasScreen';

type Vista = 'login' | 'menu' | 'canvas';

export default function App() {
  const [usuario, setUsuario] = useState<LoginResponse | null>(null);
  const [vista, setVista] = useState<Vista>('login');

  // Vive aquí (no en CanvasScreen) para que la sesión del agente —
  // conexión, historial de pantallas y caché — sobreviva a salir al menú
  // y volver a entrar, en vez de reconectar y regenerar todo de cero.
  const agentSession = useAgentSession(usuario?.auth_uid ?? null);

  useEffect(() => {
    const session = getSession();
    if (session) {
      setUsuario(session);
      setVista('menu');
    }
  }, []);

  const handleLogin = (session: LoginResponse) => {
    setUsuario(session);
    setVista('menu');
  };

  const handleLogout = () => {
    clearSession();
    setUsuario(null);
    setVista('login');
  };

  if (vista === 'login' || !usuario) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (vista === 'canvas') {
    return <CanvasScreen onExit={() => setVista('menu')} session={agentSession} />;
  }

  return <MenuScreen usuario={usuario} onEnterCanvas={() => setVista('canvas')} onLogout={handleLogout} />;
}
