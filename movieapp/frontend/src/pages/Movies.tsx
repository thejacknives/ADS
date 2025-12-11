import { useEffect, useState } from 'react';
import { api } from '../services/api';

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
  
  // NOVO: Estado para guardar os géneros únicos encontrados
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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
        
        // NOVO: Extrair géneros únicos quando carregamos a lista completa
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

  const showSuccessMessage = (movieId: number) => {
    setSuccessMap(prev => ({ ...prev, [movieId]: 'Guardado!' }));
    setTimeout(() => {
      setSuccessMap(prev => { const n = { ...prev }; delete n[movieId]; return n; });
    }, 2000);
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
      showSuccessMessage(movieId);
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

  // MUDANÇA: Removemos o sortedMovies complexo. 
  // Agora usamos a lista 'movies' tal como vem do backend (respeitando o filtro de ordenação 'sort')
  const moviesToDisplay = movies;

  return (
    <div style={{ width: '100%', padding: '0 40px', boxSizing: 'border-box' }}>
      
      <header style={{ marginBottom: '2rem', maxWidth: '1400px', margin: '0 auto 2rem auto' }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px'}}>
          <h2>🍿 Filmes Disponíveis</h2>
          
          <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
             <input 
              type="text" 
              placeholder="Pesquisar título, realizador..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ width: '300px', padding: '10px 15px' }}
            />
            
            <button 
              className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setShowFilters(!showFilters)}
              style={{display: 'flex', alignItems: 'center', gap: '5px'}}
            >
              🌪️ Filtros
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filter-group">
              <label>Género:</label>
              {/* MUDANÇA: Select em vez de Input */}
              <select
                value={filters.genre}
                onChange={e => handleFilterChange('genre', e.target.value)}
                className="input-field small"
              >
                <option value="">Todos</option>
                {availableGenres.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Ano (Min - Max):</label>
              <div style={{display:'flex', gap:'5px'}}>
                <input 
                  type="number" placeholder="1900" 
                  value={filters.year_min}
                  onChange={e => handleFilterChange('year_min', e.target.value)}
                  className="input-field small" style={{width: '70px'}}
                />
                <input 
                  type="number" placeholder="2025" 
                  value={filters.year_max}
                  onChange={e => handleFilterChange('year_max', e.target.value)}
                  className="input-field small" style={{width: '70px'}}
                />
              </div>
            </div>

            <div className="filter-group">
              <label>Rating Mínimo ({filters.rating_min}★):</label>
              <input 
                type="range" min="0" max="5" step="0.5"
                value={filters.rating_min}
                onChange={e => handleFilterChange('rating_min', parseFloat(e.target.value))}
                style={{cursor: 'pointer'}}
              />
            </div>

            <div className="filter-group">
              <label>Ordenar por:</label>
              <select 
                value={filters.sort}
                onChange={e => handleFilterChange('sort', e.target.value)}
                className="input-field small"
              >
                <option value="title">Título (A-Z)</option>
                <option value="year">Ano (Recentes)</option>
                <option value="rating">Melhor Avaliados</option>
              </select>
            </div>
            
            <button 
              className="btn btn-outline" 
              style={{fontSize: '0.8rem', padding: '5px 10px'}}
              onClick={() => {
                setFilters({genre: '', year_min: '', year_max: '', rating_min: 0, sort: 'title'});
                setSearchTerm('');
              }}
            >
              Limpar
            </button>
          </div>
        )}
      </header>

      {error && <div className="alert alert-error" style={{maxWidth: '1400px', margin: '0 auto 1rem auto'}}>{error}</div>}

      {loading && (
        <div style={{textAlign: 'center', margin: '50px 0'}}>
           <span style={{fontSize: '1.2rem', color: '#64748b'}}>🔄 A pesquisar...</span>
        </div>
      )}

      {!loading && moviesToDisplay.length === 0 ? (
        <div style={{textAlign: 'center', color: '#64748b', marginTop: '50px'}}>
          Nenhum filme encontrado com estes filtros.
        </div>
      ) : (
        <div className="movies-list">
          {moviesToDisplay.map((movie) => {
            const mId = movie.id;
            const myRatingData = myRatingsMap[mId];
            const myScore = myRatingData?.score;
            const successMsg = successMap[mId];
            const cardClass = myScore ? "movie-card rated" : "movie-card";

            return (
              <div key={mId} className={cardClass}>
                <div className="poster-wrapper">
                  {movie.poster_url ? (
                    <img src={movie.poster_url} alt={movie.title} />
                  ) : (
                    <div className="poster-placeholder">🎬</div>
                  )}
                </div>

                <div className="card-content">
                  <div style={{ flex: 1 }}>
                    <h3 className="card-title">{movie.title}</h3>
                    <div className="meta-tags">
                      <span className="tag">{movie.year}</span>
                      <span className="tag">{movie.genre}</span>
                      {movie.director && <span className="tag">🎥 {movie.director}</span>}
                    </div>
                    <p className="card-desc">
                      {movie.description || 'Sem descrição.'}
                    </p>
                  </div>

                  <div className="card-footer">
                     <div style={{flex: 1}}>
                       {successMsg ? (
                         <div style={{color: '#16a34a', fontWeight: 'bold', fontSize: '0.9rem'}}>
                           ✓ {successMsg}
                         </div>
                       ) : myScore ? (
                         <div className="rating-success">
                           ✓ A tua avaliação: <strong style={{marginLeft:'5px', color:'#b45309'}}>{myScore} ★</strong>
                         </div>
                       ) : (
                         <div className="rating-area">
                           <span style={{fontSize: '0.75rem', color: '#94a3b8', marginRight: '5px', textTransform: 'uppercase'}}>Classificar:</span>
                           <InteractiveStarRating 
                             currentScore={0} 
                             onRate={(score) => handleRate(mId, score)} 
                           />
                         </div>
                       )}
                     </div>

                     {movie.average_rating !== undefined && (
                        <div className="global-rating" title="Média Global">
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
        .filters-panel {
          background: white;
          padding: 1.5rem;
          margin-top: 1rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          display: flex;
          gap: 2rem;
          align-items: flex-end;
          flex-wrap: wrap;
          animation: slideDown 0.2s ease-out;
        }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        .filter-group { display: flex; flex-direction: column; gap: 5px; }
        .filter-group label { font-size: 0.85rem; font-weight: 600; color: #64748b; }
        .input-field.small { padding: 8px 10px; font-size: 0.9rem; }

        .movies-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(450px, 1fr)); gap: 1.5rem; max-width: 1400px; margin: 0 auto; }
        .movie-card { background: white; border-radius: 16px; overflow: hidden; box-shadow: var(--shadow); border: 1px solid #f1f5f9; transition: transform 0.2s; display: flex; flexDirection: row; height: 240px; }
        .movie-card.rated { opacity: 0.9; background-color: #f8fafc; }
        .movie-card:hover { transform: translateY(-4px); border-color: var(--primary); opacity: 1; }
        .poster-wrapper { width: 160px; height: 100%; background: #e0e7ff; flex-shrink: 0; }
        .poster-wrapper img { width: 100%; height: 100%; object-fit: cover; }
        .poster-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem; color: #a5b4fc; }
        .card-content { padding: 1.2rem; display: flex; flexDirection: column; flex-grow: 1; justify-content: space-between; }
        .card-title { margin: 0; font-size: 1.2rem; color: var(--text-main); font-weight: 700; }
        .meta-tags { display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
        .tag { background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
        .card-desc { font-size: 0.9rem; color: #64748b; margin: 12px 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .card-footer { border-top: 1px solid #f1f5f9; padding-top: 10px; display: flex; align-items: center; justify-content: space-between; }
        .rating-success { background: #fef3c7; color: #92400e; padding: 8px 12px; border-radius: 8px; font-size: 0.9rem; display: inline-flex; align-items: center; }
        .rating-area { display: flex; align-items: center; }
        .global-rating { font-weight: 700; color: #1e293b; background: #f1f5f9; padding: 4px 8px; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: center; gap: 4px; }
        @media (max-width: 600px) { .movies-list { grid-template-columns: 1fr; } .movie-card { height: auto; flexDirection: column; } .poster-wrapper { width: 100%; height: 200px; } }
      `}</style>
    </div>
  );
}