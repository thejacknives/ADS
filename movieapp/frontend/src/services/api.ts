// src/services/api.ts
const API_BASE_URL = ((import.meta as any).env?.VITE_API_URL) || 'http://localhost:8000';

async function request(endpoint: string, options: RequestInit = {}) {
  const defaultHeaders: Record<string,string> = {
    'Content-Type': 'application/json',
  };

  // Allow callers to override credentials; default to NOT sending credentials to avoid CORS/credential issues.
  const credentials = (options as any).credentials ?? 'omit';

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials,
  };

  // debug: log what URL and credentials mode we'll use (remove in production)
  // console.log('API request', `${API_BASE_URL}${endpoint}`, 'credentials=', credentials);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // If unauthorized, redirect (keeps previous behaviour)
  if (response.status === 401 && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
    window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  // Try to read body safely (handle empty responses)
  const text = await response.text().catch(() => '');
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { /* keep text if not JSON */ }

  if (!response.ok) {
    const errorData = (json && typeof json === 'object') ? json : {};
    throw new Error(errorData.error || `Erro ${response.status} ${response.statusText}`);
  }

  return json;
}

export const api = {
  login: (data: { email: string; password: string }) =>
    request('/api/auth/login/', { method: 'POST', body: JSON.stringify(data), credentials: 'include' }),

  register: (data: { username: string; email: string; password: string }) =>
    request('/api/auth/register/', { method: 'POST', body: JSON.stringify(data), credentials: 'include' }),

  logout: () =>
    request('/api/auth/logout/', { method: 'POST', credentials: 'include' }),

  getProfile: () => request('/api/profile/', { credentials: 'include' }),
  getProfileRatings: () => request('/api/profile/ratings/', { credentials: 'include' }),
  getProfileRecommendations: () => request('/api/profile/recommendations/', { credentials: 'include' }),

  listMovies: () => request('/api/movies/'), // <-- no credentials by default
  getMovie: (id: number) => request(`/api/movies/${id}/`),
  getMovieRatings: (id: number) => request(`/api/movies/${id}/ratings/`),

  getMyRatings: () => request('/api/ratings/mine/', { credentials: 'include' }),
  createRating: (movieId: number, rating: number) =>
    request(`/api/ratings/${movieId}/`, { method: 'POST', body: JSON.stringify({ rating }), credentials: 'include' }),
  editRating: (ratingId: number, rating: number) =>
    request(`/api/ratings/${ratingId}/edit/`, { method: 'PUT', body: JSON.stringify({ rating }), credentials: 'include' }),
  deleteRating: (ratingId: number) =>
    request(`/api/ratings/${ratingId}/delete/`, { method: 'DELETE', credentials: 'include' }),

  getMyRecommendations: () => request('/api/recommendations/mine/', { credentials: 'include' }),
  getUserRecommendations: (userId: number) => request(`/api/users/${userId}/recommendations/`, { credentials: 'include' }),

  listUsers: () => request('/api/users/'),

  addMovie: (data: any) => request('/api/admin/movies/add/', { method: 'POST', body: JSON.stringify(data), credentials: 'include' }),
  editMovie: (movieId: number, data: any) =>
    request(`/api/admin/movies/${movieId}/edit/`, { method: 'PUT', body: JSON.stringify(data), credentials: 'include' }),
  deleteMovie: (movieId: number) =>
    request(`/api/admin/movies/${movieId}/delete/`, { method: 'DELETE', credentials: 'include' }),
  getStatistics: () => request('/api/admin/statistics/', { credentials: 'include' }),
};
