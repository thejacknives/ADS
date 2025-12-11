// src/services/api.ts

const API_BASE_URL = '/api';

async function request(endpoint: string, options: RequestInit = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    headers: { ...defaultHeaders, ...options.headers },
    credentials: 'include' as RequestCredentials,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

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
  login: (data: { email: string; password: string }) => 
    request('/auth/login/', { method: 'POST', body: JSON.stringify(data) }),

  register: (data: { username: string; email: string; password: string }) => 
    request('/auth/register/', { method: 'POST', body: JSON.stringify(data) }),

  logout: () => request('/auth/logout/', { method: 'POST' }),

  // Devolve { user_id, ratings: [{ rating_id, score, movie_id, ... }] }
  getMyRatings: () => request('/ratings/mine/'),

  getMyRatingsDetails: () => request('/ratings/mine/details/'),

  getMovies: () => request('/movies/'),

  searchMovies: (params: SearchParams) => {
    const searchParams = new URLSearchParams();
    
    if (params.q) searchParams.append('q', params.q);
    if (params.genre) searchParams.append('genre', params.genre);
    if (params.year_min) searchParams.append('year_min', params.year_min.toString());
    if (params.year_max) searchParams.append('year_max', params.year_max.toString());
    if (params.rating_min) searchParams.append('rating_min', params.rating_min.toString());
    if (params.sort) searchParams.append('sort', params.sort);

    return request(`/movies/search/?${searchParams.toString()}`);
  },

  rateMovie: (movieId: number, score: number) => 
    request(`/ratings/${movieId}/`, { 
      method: 'POST', 
      body: JSON.stringify({ rating: score }) 
    }),

  editRating: (ratingId: number, score: number) => 
    request(`/ratings/${ratingId}/edit/`, { 
      method: 'PUT', 
      body: JSON.stringify({ rating: score }) 
    }),

    deleteRating: (ratingId: number) => 
    request(`/ratings/${ratingId}/delete/`, { 
      method: 'DELETE' 
    }),
};