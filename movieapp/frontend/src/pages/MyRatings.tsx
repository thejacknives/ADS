import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

// 1. Interfaces atualizadas para a estrutura aninhada (Server-Side Join)
interface MovieDetails {
  id: number;
  title: string;
  year: number;
  genre: string;
  poster_url?: string;
  description?: string;
  director?: string;
}

interface Rating {
  rating_id: number;
  score: number;
  created_at?: string;
  movie: MovieDetails; // <--- O filme vem completo aqui dentro
}

// --- Componentes de Estrela ---
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadRatings();
  }, []);

  const loadRatings = async () => {
    try {
      setLoading(true);
      // Chama o endpoint "PESADO" que traz os detalhes todos (Capa, Director, etc)
      const data = await api.getMyRatingsDetails();
      const lista = Array.isArray(data) ? data : (data.ratings || []);
      setRatings(lista);
    } catch (err: any) {
      console.error(err);
      setError('Não foi possível carregar as avaliações.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{textAlign: 'center', marginTop: '100px'}}>⏳ A carregar as tuas notas...</div>;

  return (
    <div style={{ width: '100%', padding: '0 40px', boxSizing: 'border-box' }}>
      
      {/* HEADER */}
      <header style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        marginBottom: '2rem', maxWidth: '1400px', margin: '0 auto 2rem auto' 
      }}>
        <h2>⭐ As Minhas Avaliações</h2>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn btn-outline" 
            onClick={() => setEditMode(!editMode)}
            style={{ 
              borderColor: editMode ? '#fbbf24' : undefined, 
              backgroundColor: editMode ? '#fffbeb' : undefined,
              color: editMode ? '#d97706' : undefined
            }}
          >
            {editMode ? 'Concluir' : 'Gerir Avaliações'}
          </button>
          <Link to="/movies" className="btn btn-primary">Avaliar Novo Filme</Link>
        </div>
      </header>

      {error && <div className="alert alert-error" style={{maxWidth: '1400px', margin: '0 auto 1rem auto'}}>{error}</div>}

      {ratings.length === 0 && !error ? (
        <div style={{textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1', maxWidth: '1400px', margin: '0 auto'}}>
          <h3 style={{color: '#64748b'}}>Ainda sem avaliações 🍿</h3>
          <p>Vai ao menu Filmes para começares a tua coleção!</p>
        </div>
      ) : (
        <div className="ratings-list">
          {ratings.map((rating) => {
            const movie = rating.movie; 

            return (
              <div key={rating.rating_id} className={`rating-row ${editMode ? 'editing' : ''}`}>
                
                {/* LADO ESQUERDO: Poster e Info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flex: 1 }}>
                  <div className="movie-poster">
                    {movie?.poster_url ? (
                       <img src={movie.poster_url} alt={movie.title} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                    ) : (
                       <span style={{fontSize:'2rem'}}>🎬</span>
                    )}
                  </div>
                  
                  <div style={{ paddingRight: '20px' }}>
                    <h3 className="movie-title">{movie.title}</h3>
                    
                    {/* Tags Cinzentas (Consistente com Movies.tsx) */}
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.85rem', color: '#64748b', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span className="tag">{movie.year}</span>
                      <span className="tag">{movie.genre}</span>
                      {movie.director && <span className="tag">🎥 {movie.director}</span>}
                    </div>

                    {/* Descrição */}
                    {movie.description && (
                       <p style={{ 
                         margin: '10px 0 0 0', 
                         fontSize: '0.9rem', 
                         color: '#64748b', 
                         lineHeight: '1.4',
                         display: '-webkit-box', 
                         WebkitLineClamp: 2, 
                         WebkitBoxOrient: 'vertical', 
                         overflow: 'hidden' 
                       }}>
                         {movie.description}
                       </p>
                    )}
                  </div>
                </div>

                {/* LADO DIREITO: Nota e Data */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  
                  {/* Botão de Remover (Aparece só no Edit Mode) */}
                  {editMode && (
                    <button 
                      className="btn-delete"
                      onClick={() => alert('Funcionalidade de eliminar por implementar (chamar api.deleteRating)')}
                    >
                      🗑️ Remover
                    </button>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', minWidth: '120px' }}>
                    <StarRating score={rating.score} />
                    
                    <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end'}}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#475569' }}>
                        {rating.score} / 5
                      </span>
                      <small style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '2px' }}>
                         {rating.created_at ? new Date(rating.created_at).toLocaleDateString() : ''}
                      </small>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .ratings-list { display: flex; flex-direction: column; gap: 1rem; width: 100%; max-width: 1400px; margin: 0 auto; }
        
        .rating-row {
          width: 100%;
          box-sizing: border-box;
          background: white; padding: 1.5rem; 
          border-radius: 16px;
          box-shadow: var(--shadow); border: 1px solid #f1f5f9;
          display: flex; justify-content: space-between; align-items: center;
          transition: transform 0.2s, border-color 0.2s;
        }
        
        .rating-row.editing { border-color: #fbbf24; background-color: #fffdf5; }
        .rating-row:hover { transform: translateY(-2px); border-color: var(--primary); z-index: 10; }

        .movie-poster {
          width: 80px; height: 120px; /* Um pouco maior para se ver bem */
          background: #e0e7ff; border-radius: 8px;
          overflow: hidden; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .movie-title { margin: 0; font-size: 1.25rem; color: var(--text-main); font-weight: 700; line-height: 1.2; }
        
        .star-icon { width: 24px; height: 24px; }
        
        /* Estilo das Tags igual ao Movies.tsx */
        .tag { 
          background: #f1f5f9; 
          color: #64748b; 
          padding: 2px 8px; 
          border-radius: 4px; 
          font-size: 0.8rem; 
          font-weight: 600; 
        }

        .btn-delete {
          background: none; border: 1px solid #fecaca; 
          color: #ef4444; padding: 5px 10px; border-radius: 6px; 
          cursor: pointer; font-size: 0.85rem; font-weight: 600;
          transition: all 0.2s;
        }
        .btn-delete:hover { background: #fef2f2; border-color: #ef4444; }

        @media (max-width: 768px) {
          .rating-row { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .rating-row > div:last-child { width: 100%; border-top: 1px solid #f1f5f9; padding-top: 10px; flex-direction: row; justify-content: space-between; }
        }
      `}</style>
    </div>
  );
}