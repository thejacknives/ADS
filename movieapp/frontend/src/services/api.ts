// src/services/api.ts

// 1. Determine the Backend URL based on the environment
// On Render: It will read the VITE_API_URL variable you set in the dashboard.
// On Localhost: It defaults to http://localhost:8000
const BASE_URL = 'https://movieapp-backend-tsu0.onrender.com/'


// 2. Add the /api prefix
// Final Result: "https://your-backend.onrender.com/api"
const API_BASE_URL = `${BASE_URL}/api`;

console.log("API IS CONNECTING TO:", API_BASE_URL); // Debug log to see in browser console

async function request(endpoint: string, options: RequestInit = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    headers: { ...defaultHeaders, ...options.headers },
    credentials: 'include' as RequestCredentials,
  };

  // 3. Use the dynamic API_BASE_URL
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (response.status === 401 && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
    window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Ocorreu um erro no servidor');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Ensure SearchParams interface is defined (or imported if you have it in types.ts)
interface SearchParams {
  q?: string;
  genre?: string;
  year_min?: number;
  year_max?: number;
  rating_min?: number;
  sort?: string;
}

export const api = {
  login: (data: { email: string; password: string }) => 
    request('/auth/login/', { method: 'POST', body: JSON.stringify(data) }),

  register: (data: { username: string; email: string; password: string }) => 
    request('/auth/register/', { method: 'POST', body: JSON.stringify(data) }),

  logout: () => request('/auth/logout/', { method: 'POST' }),

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

    getMovie: (id: number) => request(`/movies/${id}/`),

    getUserRecommendations: () => request('/recommendations/mine/'),

    addMovie: (movieData: any) => 
    request('/admin/movies/add/', { 
      method: 'POST', 
      body: JSON.stringify(movieData) 
    }),

  updateMovie: (id: number, movieData: any) => 
    request(`/admin/movies/${id}/edit/`, { 
      method: 'PUT', 
      body: JSON.stringify(movieData) 
    }),

  deleteMovie: (id: number) => 
    request(`/admin/movies/${id}/delete/`, { 
      method: 'DELETE' 
    }),
};