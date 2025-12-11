import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

interface Rating {
  id: number;
  movie?: number;
  movie_id?: number;
  score: number;
  review?: string;
  created_at?: string;
}

interface MovieDetails {
  id: number;
  title: string;
  year?: number;
  genre?: string;
  poster_url?: string;
  description?: string;
}

// --- Componente de Estrela ---
function StarIcon({ fill }: { fill: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="star-icon">
      <defs>
        <linearGradient id={`grad-${fill}`}>
          <stop offset={`${fill}%`} stopColor="#fbbf24" />
          <stop offset={`${fill}%`} stopColor="#e2e8f0" />
        </linearGradient>
      </defs>
      <path fill={`url(#grad-${fill})`} d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"/>
    </svg>
  );
}

function StarRating({ score }: { score: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((index) => {
        let fill = 0;
        if (score >= index) fill = 100;
        else if (score >= index - 0.5) fill = 50;
        return <StarIcon key={index} fill={fill} />;
      })}
    </div>
  );
}

export function MyRatings() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [moviesCache, setMoviesCache] = useState<Record<number, MovieDetails>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // NOVO: Estado para controlar o modo de edição
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadRatingsAndMovies();
  }, []);

  const loadRatingsAndMovies = async () => {
    try {
      const data = await api.getMyRatings();
      const listaRatings = Array.isArray(data) ? data : (data.ratings || []);
      setRatings(listaRatings.reverse());

      const movieIds = [...new Set(listaRatings.map((r: Rating) => r.movie || r.movie_id))];
      const newMoviesCache: Record<number, MovieDetails> = {};
      
      await Promise.all(
        movieIds.map(async (id) => {
          if (!id) return;
          try {
            const movieData = await api.getMovie(id as number);
            newMoviesCache[id as number] = movieData;
          } catch (e) {
            newMoviesCache[id as number] = { id: id as number, title: `Filme #${id}` };
          }
        })
      );
      setMoviesCache(newMoviesCache);

    } catch (err: any) {
      setError('Sessão expirada ou erro de ligação.');
    } finally {
      setLoading(false);
    }
  };

  // Simulação de clique no editar (futuramente abre modal)
  const handleEditClick = (movieTitle: string) => {
    alert(`Editar review de "${movieTitle}"? \n(Esta funcionalidade será ligada ao endpoint de update em breve)`);
  };

  if (loading) return <div style={{textAlign: 'center', marginTop: '100px'}}>⏳ A carregar a tua biblioteca...</div>;

  return (
    <div style={{ width: '100%', padding: '0 40px', boxSizing: 'border-box' }}>
      
      <header style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        marginBottom: '2rem', maxWidth: '90%', margin: '0 auto 2rem auto' 
      }}>
        <h2>As Minhas Avaliações</h2>
        
        {/* NOVO GRUPO DE BOTÕES */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          
          {/* Botão de Alterar (Toggle Edit Mode) */}
          <button 
            className="btn btn-outline" 
            onClick={() => setEditMode(!editMode)}
            style={{ 
              borderColor: editMode ? '#fbbf24' : undefined, 
              backgroundColor: editMode ? '#fffbeb' : undefined,
              color: editMode ? '#d97706' : undefined
            }}
          >
            {editMode ? 'Concluir Edição' : 'Alterar Review'}
          </button>

          {/* Botão de Adicionar */}
          <Link to="/movies" className="btn btn-primary">Avaliar Novo Filme</Link>
        </div>
      </header>

      {error && <div className="alert alert-error" style={{maxWidth: '1400px', margin: '0 auto 1rem auto'}}>{error}</div>}

      {ratings.length === 0 && !error ? (
        <div style={{textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1', maxWidth: '1400px', margin: '0 auto'}}>
          <h3 style={{color: '#64748b'}}>Ainda sem avaliações 🍿</h3>
          <p>Começa a dar notas aos teus filmes favoritos!</p>
        </div>
      ) : (
        <div className="ratings-list">
          {ratings.map((rating) => {
            const movieId = rating.movie || rating.movie_id;
            const movie = movieId ? moviesCache[movieId] : null;

            return (
              <div key={rating.id} className={`rating-row ${editMode ? 'editing' : ''}`}>
                
                {/* Lado Esquerdo */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flex: 1 }}>
                  <div className="movie-poster">
                    {movie?.poster_url ? (
                       <img src={movie.poster_url} alt={movie.title} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                    ) : (
                       <span style={{fontSize:'2rem'}}>🎬</span>
                    )}
                  </div>
                  
                  <div style={{ paddingRight: '20px' }}>
                    <h3 className="movie-title">{movie ? movie.title : `A carregar...`}</h3>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.85rem', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
                      {movie?.year && <span className="meta-tag">{movie.year}</span>}
                      {movie?.genre && <span className="meta-tag">{movie.genre}</span>}
                    </div>
                    {movie?.description && (
                      <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: '#475569', lineHeight: '1.4', maxWidth: '600px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {movie.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Lado Direito: Estrelas e Botão de Editar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  
                  {/* Se Edit Mode estiver ON, mostra botão de editar específico */}
                  {editMode && (
                    <button 
                      onClick={() => handleEditClick(movie?.title || 'Filme')}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'white',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: '#475569',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        display: 'flex', alignItems: 'center', gap: '5px'
                      }}
                    >
                      ✏️ Editar
                    </button>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', minWidth: '120px' }}>
                    {!editMode && <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>Your rating</p>}
                    <StarRating score={rating.score} />
                    <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end'}}>
                      <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#475569' }}>{rating.score} / 5</span>
                      {!editMode && (
                        <small style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '2px' }}>
                          {rating.created_at ? new Date(rating.created_at).toLocaleDateString() : ''}
                        </small>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .ratings-list { display: flex; flex-direction: column; gap: 1rem; width: 90%; max-width: 1400px; margin: 0 auto; }
        
        .rating-row {
          width: 100%;
          box-sizing: border-box;
          background: white; padding: 1.5rem; 
          border-radius: 16px;
          box-shadow: var(--shadow); border: 1px solid #f1f5f9;
          display: flex; justify-content: space-between; align-items: center;
          transition: transform 0.2s, border-color 0.2s;
        }
        
        /* Destaque visual quando em modo de edição */
        .rating-row.editing {
          border-color: #fbbf24;
          background-color: #fffdf5;
        }
        
        .rating-row:hover { transform: translateY(-2px); border-color: var(--primary); z-index: 10; }

        .movie-poster {
          width: 70px; height: 105px;
          background: #e0e7ff; border-radius: 8px;
          overflow: hidden; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .movie-title { margin: 0; font-size: 1.25rem; color: var(--text-main); font-weight: 700; }
        .star-icon { width: 24px; height: 24px; }
        .meta-tag { background: #f1f5f9; padding: 2px 8px; border-radius: 4px; color: #475569; font-size: 0.8rem; }

        @media (max-width: 768px) {
          .rating-row { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .rating-row > div:last-child { 
            align-items: center; width: 100%; 
            border-top: 1px solid #f1f5f9; padding-top: 10px; 
            flex-direction: row; justify-content: space-between; 
          }
        }
      `}</style>
    </div>
  );
}