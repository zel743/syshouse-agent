import { useEffect, useState } from 'react';
import type { LoginResponse } from './services/api';
import { clearSession, getSession } from './services/session';
import { LoginScreen } from './screens/LoginScreen';
import { MenuScreen } from './screens/MenuScreen';
import { CanvasScreen } from './screens/CanvasScreen';

type Vista = 'login' | 'menu' | 'canvas';

export default function App() {
  const [usuario, setUsuario] = useState<LoginResponse | null>(null);
  const [vista, setVista] = useState<Vista>('login');

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
    return <CanvasScreen usuario={usuario} onBack={() => setVista('menu')} />;
  }

  return <MenuScreen usuario={usuario} onEnterCanvas={() => setVista('canvas')} onLogout={handleLogout} />;
}
