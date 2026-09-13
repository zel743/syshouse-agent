import { useState } from 'react';
import type { FormEvent } from 'react';
import { Landmark } from 'lucide-react';
import { login, type LoginResponse } from '../services/api';
import { saveSession } from '../services/session';
import { DecorativeWave } from '../design/DecorativeWave';
import './LoginScreen.css';

type Props = {
  onLogin: (session: LoginResponse) => void;
};

export function LoginScreen({ onLogin }: Props) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!usuario.trim() || !password) {
      setError('Escribe tu usuario y contraseña.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const session = await login(usuario.trim(), password);
      saveSession(session);
      onLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-logo">
          <Landmark size={28} />
        </div>
        <h1 className="login-title">Bienvenido</h1>
        <p className="login-subtitle">Accede a tu espacio de educación financiera</p>
      </div>

      <form className="login-card" onSubmit={handleSubmit}>
        <h2 className="login-card-title">Inicia sesión</h2>

        <label className="login-label" htmlFor="usuario">
          Nombre de usuario
        </label>
        <input
          id="usuario"
          className="login-input"
          placeholder="Escribe tu usuario"
          value={usuario}
          onChange={(e) => {
            setUsuario(e.target.value);
            setError('');
          }}
          autoComplete="username"
        />

        <label className="login-label" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          className="login-input"
          placeholder="Escribe tu contraseña"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          autoComplete="current-password"
        />

        {error && <p className="login-error">{error}</p>}

        <button className="login-button" type="submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="login-demo">Demo: Luis / banorte2026</p>
      </form>

      <DecorativeWave />
    </div>
  );
}
