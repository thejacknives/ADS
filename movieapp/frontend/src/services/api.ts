// src/services/api.ts

const API_BASE_URL = '/api';

async function request(endpoint: string, options: RequestInit = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include' as RequestCredentials, // OBRIGATÓRIO para funcionar com Django Session
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // Se o backend disser que não estamos logados (401), redireciona para login
  if (response.status === 401 && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
    window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Ocorreu um erro no servidor');
  }

  return response.json();
}

export const api = {
  // --- A TUA PARTE (AUTH) ---
  login: (data: { email: string; password: string }) => 
    request('/auth/login/', { method: 'POST', body: JSON.stringify(data) }),

  register: (data: { username: string; email: string; password: string }) => 
    request('/auth/register/', { method: 'POST', body: JSON.stringify(data) }),

  logout: () => 
    request('/auth/logout/', { method: 'POST' }),

  getMyRatings: () => 
    request('/ratings/mine/'),

  // --- O RESTO (Para o teu colega usar depois) ---
  getMovies: (endpoint: string) => request(endpoint), // Genérico
};