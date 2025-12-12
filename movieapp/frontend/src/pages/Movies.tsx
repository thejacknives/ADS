import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

interface Movie {
  id: number;
  title: string;
  year: number;
  genre: string;
  poster_url?: string;
  description?: string;
  director?: string;
  average_rating?: number;
}

interface MyRatingData {
  rating_id: number;
  movie_id: number;
  score: number;
}

function InteractiveStarRating({ onRate, currentScore }: { onRate: (score: number) => void, currentScore: number }) {
  const [hover, setHover] = useState(0);

  return (
    <div style={{ display: 'flex', gap: '4px', cursor: 'pointer' }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onMouseEnter={() => setHover(star)}
          onClick={() => onRate(star)}
          style={{
            fontSize: '1.8rem',
            transition: 'transform 0.1s',
            transform: hover === star ? 'scale(1.2)' : 'scale(1)',
            color: star <= (hover || currentScore) ? '#fbbf24' : '#e2e8f0'
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function Movies() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados de Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    genre: '',
    year_min: '',
    year_max: '',
    rating_min: 0,
    sort: 'title'
  });

  const [myRatingsMap, setMyRatingsMap] = useState<Record<number, MyRatingData>>({});
  const [successMap, setSuccessMap] = useState<Record<number, string>>({});

  useEffect(() => {
    loadRatings();
    fetchMovies(); 
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchMovies();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, filters]);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const hasFilters = searchTerm || filters.genre || filters.year_min || filters.year_max || filters.rating_min > 0 || filters.sort !== 'title';
      
      let data;
      if (!hasFilters) {
        data = await api.getMovies();
        if (availableGenres.length === 0 && data.movies) {
           const genres = Array.from(new Set(data.movies.map((m: Movie) => m.genre).filter(Boolean))) as string[];
           setAvailableGenres(genres.sort());
        }
      } else {
        data = await api.searchMovies({
          q: searchTerm,
          genre: filters.genre,
          year_min: filters.year_min ? parseInt(filters.year_min) : undefined,
          year_max: filters.year_max ? parseInt(filters.year_max) : undefined,
          rating_min: filters.rating_min > 0 ? filters.rating_min : undefined,
          sort: filters.sort
        });
      }
      setMovies(data.movies || []);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar filmes.');
    } finally {
      setLoading(false);
    }
  };

  const loadRatings = async () => {
    try {
      const ratingsData = await api.getMyRatings();
      const ratingsList = ratingsData.ratings || [];
      const map: Record<number, MyRatingData> = {};
      ratingsList.forEach((r: any) => {
        map[r.movie_id] = { movie_id: r.movie_id, rating_id: r.rating_id, score: r.score };
      });
      setMyRatingsMap(map);
    } catch (err) { console.error("Erro ratings", err); }
  };

  const handleRate = async (movieId: number, score: number) => {
    const existingRating = myRatingsMap[movieId];
    const tempRatingId = existingRating?.rating_id || -1;
    setMyRatingsMap(prev => ({ ...prev, [movieId]: { movie_id: movieId, rating_id: tempRatingId, score: score } }));

    try {
      if (existingRating && existingRating.rating_id !== -1) {
         await api.editRating(existingRating.rating_id, score);
      } else {
         const res = await api.rateMovie(movieId, score);
         if (res.rating && res.rating.rating_id) {
            setMyRatingsMap(prev => ({
              ...prev,
              [movieId]: { movie_id: movieId, rating_id: res.rating.rating_id, score: score }
            }));
         }
      }
      
      // Feedback Visual Temporário
      setSuccessMap(prev => ({ ...prev, [movieId]: 'Guardado!' }));
      setTimeout(() => {
        setSuccessMap(prev => { const n = { ...prev }; delete n[movieId]; return n; });
      }, 2000);

    } catch (err: any) {
      console.error(err);
      if (existingRating) setMyRatingsMap(prev => ({ ...prev, [movieId]: existingRating }));
      else setMyRatingsMap(prev => { const n = {...prev}; delete n[movieId]; return n; });
      alert('Erro ao guardar avaliação.');
    }
  };

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="page-container">
      
      {/* --- HEADER E CONTROLO --- */}
      <section className="controls-section">
        
        <div className="top-bar">
          <div className="page-title-group">
            <h2 className="page-title">🍿 Catálogo</h2>
            <span className="page-subtitle">Explora todos os filmes disponíveis</span>
          </div>
          
          <div className="actions-group">
             <div className="search-wrapper">
               <span className="search-icon">🔍</span>
               <input 
                type="text" 
                placeholder="Pesquisar..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="search-input"
              />
             </div>
            
            <button 
              className={`btn-toggle-filter ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <span style={{fontSize: '1.1rem'}}>🌪️</span>
              <span>Filtros</span>
            </button>
          </div>
        </div>

        {/* --- PAINEL DE FILTROS (Slide Down) --- */}
        <div className={`filters-drawer ${showFilters ? 'open' : ''}`}>
          <div className="filters-content">
            
            <div className="filter-item">
              <label>Género</label>
              <select
                value={filters.genre}
                onChange={e => handleFilterChange('genre', e.target.value)}
              >
                <option value="">Todos</option>
                {availableGenres.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label>Ano</label>
              <div className="row-inputs">
                <input 
                  type="number" placeholder="Min" 
                  value={filters.year_min}
                  onChange={e => handleFilterChange('year_min', e.target.value)}
                />
                <span style={{color:'#cbd5e1'}}>-</span>
                <input 
                  type="number" placeholder="Max" 
                  value={filters.year_max}
                  onChange={e => handleFilterChange('year_max', e.target.value)}
                />
              </div>
            </div>

            <div className="filter-item">
              <label>Rating Mínimo: <span className="highlight-val">{filters.rating_min}★</span></label>
              <input 
                type="range" min="0" max="5" step="0.5"
                value={filters.rating_min}
                onChange={e => handleFilterChange('rating_min', parseFloat(e.target.value))}
                className="range-input"
              />
            </div>

            <div className="filter-item">
              <label>Ordenar</label>
              <select 
                value={filters.sort}
                onChange={e => handleFilterChange('sort', e.target.value)}
              >
                <option value="title">A-Z</option>
                <option value="year">Mais Recentes</option>
                <option value="rating">Melhor Nota</option>
              </select>
            </div>
            
            <div className="filter-actions">
              <button 
                className="btn-link-reset" 
                onClick={() => {
                  setFilters({genre: '', year_min: '', year_max: '', rating_min: 0, sort: 'title'});
                  setSearchTerm('');
                }}
              >
                Limpar filtros
              </button>
            </div>

          </div>
        </div>
      </section>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div style={{textAlign: 'center', margin: '50px 0'}}>
           <span style={{fontSize: '1.2rem', color: '#64748b'}}>🔄 A carregar...</span>
        </div>
      )}

      {!loading && movies.length === 0 ? (
        <div className="empty-state">
          <h3>Nenhum filme encontrado.</h3>
          <p>Tenta uma pesquisa diferente ou limpa os filtros.</p>
        </div>
      ) : (
        <div className="movies-grid">
          {movies.map((movie) => {
            const mId = movie.id;
            const myRatingData = myRatingsMap[mId];
            const myScore = myRatingData?.score;
            const successMsg = successMap[mId];
            const cardClass = myScore ? "movie-card rated" : "movie-card";

            return (
              <div key={mId} className={cardClass}>
                
                <Link to={`/movies/${mId}`} className="poster-area">
                  {movie.poster_url ? (
                    <img src={movie.poster_url} alt={movie.title} />
                  ) : (
                    <div className="poster-placeholder">🎬</div>
                  )}
                </Link>

                <div className="info-area">
                  <div style={{ flex: 1 }}>
                    <h3 className="card-title">
                      <Link to={`/movies/${mId}`}>{movie.title}</Link>
                    </h3>
                    
                    <div className="tags-row">
                      <span className="pill">{movie.year}</span>
                      <span className="pill">{movie.genre}</span>
                      {movie.director && <span className="pill director-pill">🎥 {movie.director}</span>}
                    </div>

                    <p className="description">
                      {movie.description || 'Sem descrição.'}
                    </p>
                  </div>

                  <div className="actions-footer">
                     <div className="left-action">
                       {successMsg ? (
                         <span className="msg-success">✓ Guardado!</span>
                       ) : myScore ? (
                         <div className="user-score-badge">
                           ✓ Tu: <strong>{myScore}★</strong>
                         </div>
                       ) : (
                         <div className="rate-interactive">
                           <span className="rate-label">Classificar:</span>
                           <InteractiveStarRating 
                             currentScore={0} 
                             onRate={(score) => handleRate(mId, score)} 
                           />
                         </div>
                       )}
                     </div>

                     {movie.average_rating !== undefined && (
                        <div className="global-score" title="Média Global">
                          ⭐ {Number(movie.average_rating).toFixed(1)}
                        </div>
                     )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        /* --- LAYOUT GLOBAL --- */
        .page-container {
          width: 100%; max-width: 1400px; margin: 0 auto;
          padding: 0 40px 60px 40px; box-sizing: border-box;
        }

        /* --- HEADER & CONTROLOS --- */
        .controls-section { margin-bottom: 2rem; background: white; }
        
        .top-bar { 
          display: flex; justify-content: space-between; align-items: center; 
          flex-wrap: wrap; gap: 20px; padding: 10px 0; 
        }
        
        .page-title { margin: 0; font-size: 2rem; color: #1e293b; letter-spacing: -0.5px; }
        .page-subtitle { color: #64748b; font-size: 0.95rem; margin-left: 2px; }
        
        .actions-group { display: flex; gap: 12px; align-items: center; }

        .search-wrapper { position: relative; display: flex; align-items: center; }
        .search-icon { position: absolute; left: 12px; color: #94a3b8; font-size: 0.9rem; pointer-events: none; }
        .search-input { 
          padding: 10px 15px 10px 36px; border: 1px solid #cbd5e1; border-radius: 8px; 
          font-size: 0.95rem; width: 280px; outline: none; transition: all 0.2s; color: #1e293b; 
        }
        .search-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }

        .btn-toggle-filter { 
          display: flex; align-items: center; gap: 6px; padding: 10px 16px; 
          background: white; border: 1px solid #cbd5e1; border-radius: 8px; 
          color: #475569; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; 
        }
        .btn-toggle-filter:hover { background: #f8fafc; border-color: #94a3b8; }
        .btn-toggle-filter.active { background: #eef2ff; border-color: #4f46e5; color: #4f46e5; }

        /* --- FILTROS (Igual ao anterior) --- */
        .filters-drawer { max-height: 0; overflow: hidden; transition: max-height 0.3s ease-in-out, opacity 0.3s; opacity: 0; }
        .filters-drawer.open { max-height: 300px; opacity: 1; margin-top: 10px; }
        .filters-content { 
          background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; 
          padding: 20px 25px; display: flex; alignItems: flex-end; gap: 25px; flex-wrap: wrap; 
        }
        .filter-item { display: flex; flexDirection: column; gap: 6px; }
        .filter-item label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .filter-item select, .filter-item input[type="number"] { 
          padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; 
          font-size: 0.9rem; color: #334155; background: white; outline: none; 
        }
        .filter-item select:focus, .filter-item input:focus { border-color: #4f46e5; }
        .row-inputs { display: flex; align-items: center; gap: 8px; }
        .row-inputs input { width: 70px; }
        .highlight-val { color: #4f46e5; font-weight: 700; }
        .range-input { accent-color: #4f46e5; cursor: pointer; }
        .filter-actions { margin-left: auto; padding-bottom: 2px; }
        .btn-link-reset { 
          background: none; border: none; color: #64748b; font-size: 0.85rem; 
          font-weight: 600; cursor: pointer; text-decoration: underline; transition: color 0.2s; 
        }
        .btn-link-reset:hover { color: #ef4444; }

        /* --- GRELHA DE FILMES (A CORREÇÃO) --- */
        .movies-grid {
          display: grid;
          /* FORÇA 2 COLUNAS: Como 600px * 3 = 1800px (>1400px), o browser só permite 2 colunas. */
          grid-template-columns: repeat(auto-fill, minmax(600px, 1fr));
          gap: 1.5rem;
        }

        .movie-card {
          background: white; border-radius: 16px; border: 1px solid #f1f5f9;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;
          display: flex; 
          height: 220px; /* Altura fixa voltou para alinhar tudo */
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .movie-card:hover { 
          transform: translateY(-4px); 
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); 
          border-color: #e2e8f0; 
        }
        .movie-card.rated { background-color: #fafbfc; opacity: 0.95; }

        .poster-area { 
          width: 150px; flex-shrink: 0; background: #e0e7ff; position: relative; 
        }
        .poster-area img { width: 100%; height: 100%; object-fit: cover; }
        .poster-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem; color: #a5b4fc; }

        .info-area {
          flex-grow: 1; padding: 1.2rem;
          display: flex; flex-direction: column; 
          justify-content: space-between; /* Garante footer no fundo */
          overflow: hidden;
        }

        .card-title { margin: 0; font-size: 1.2rem; font-weight: 700; line-height: 1.2; }
        .card-title a { color: #1e293b; text-decoration: none; transition: color 0.2s; }
        .card-title a:hover { color: #4f46e5; }

        .tags-row { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
        .pill { 
          background: #f1f5f9; color: #64748b; padding: 2px 8px; 
          border-radius: 4px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; 
        }
        
        .description {
          font-size: 0.9rem; color: #64748b; margin: 10px 0; line-height: 1.5;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }

        .actions-footer {
          border-top: 1px solid #f1f5f9; padding-top: 10px; margin-top: auto;
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0; /* Nunca encolhe */
        }

        .user-score-badge { background: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; white-space: nowrap; }
        .rate-interactive { display: flex; align-items: center; gap: 5px; }
        .rate-label { font-size: 0.7rem; text-transform: uppercase; color: #94a3b8; font-weight: 700; }
        .msg-success { color: #16a34a; font-weight: bold; font-size: 0.9rem; }
        .global-score { font-weight: 600; color: #334155; font-size: 0.9rem; background: #f8fafc; padding: 4px 8px; border-radius: 6px; white-space: nowrap; }
        .empty-state { text-align: center; color: #64748b; margin-top: 50px; padding: 40px; border: 2px dashed #e2e8f0; border-radius: 16px; }

        @media (max-width: 768px) {
          .page-container { padding: 0 20px 40px; }
          .movies-grid { grid-template-columns: 1fr; } /* 1 coluna em mobile */
          .movie-card { height: auto; flexDirection: column; min-height: 380px; }
          .poster-area { width: 100%; height: 250px; }
          
          .top-bar { flex-direction: column; align-items: stretch; gap: 15px; }
          .actions-group { width: 100%; }
          .search-wrapper { flex-grow: 1; }
          .search-input { width: 100%; }
          .filters-content { flex-direction: column; align-items: stretch; gap: 15px; }
          .filter-actions { margin-left: 0; margin-top: 10px; }
        }
      `}</style>
    </div>
  );
}