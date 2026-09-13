const API_URL = import.meta.env.VITE_API_URL;

export type LoginResponse = {
  token: string;
  usuario_id: number;
  auth_uid: string;
  nombre: string;
  perfil: 'Deudor' | 'Inversor' | 'Ahorrativo' | 'Novato';
  racha_inversion: number;
};

export const login = async (usuario: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ usuario, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Error HTTP: ${response.status}`);
  }

  return data;
};

export const fetchPerfilFinanciero = async (authUid: string) => {
  const response = await fetch(`${API_URL}/education/perfil/${authUid}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Error HTTP: ${response.status}`);
  }

  return response.json();
};
