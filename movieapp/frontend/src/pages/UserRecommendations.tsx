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
}

interface RecommendationItem {
  id: number;
  predicted_score: number;
  movie: Movie;
}

export function UserRecommendations() {
  const [recs, setRecs] = useState<RecommendationItem[]>([]);
  const [hasHistory, setHasHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [recsData, ratingsData] = await Promise.all([
        api.getUserRecommendations(),
        api.getMyRatings()
      ]);

      const userRatingCount = ratingsData.total_ratings || 0;
      setHasHistory(userRatingCount > 0);

      setRecs(recsData.recommendations || []);
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar as sugestões.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{textAlign: 'center', marginTop: '100px', color: '#64748b'}}>A procurar filmes...</div>;

  return (
    <div style={{ width: '100%', padding: '0 40px', boxSizing: 'border-box' }}>
      
      {/* HEADER DINÂMICO */}
      <header style={{ marginBottom: '2rem', maxWidth: '1400px', margin: '0 auto 2rem auto' }}>
        {hasHistory ? (
          <>
            <h2 style={{color: '#1e293b'}}>✨ Sugestões para Ti</h2>
            <p style={{color: '#64748b', marginTop: '-5px'}}>
              Baseado nos teus gostos, achamos que vais adorar estes filmes.
            </p>
          </>
        ) : (
          <div className="welcome-banner">
            <h2 style={{color: '#1e293b', marginTop: 0}}>🏆 Top 10 da Comunidade</h2>
            <p style={{color: '#475569', lineHeight: '1.5'}}>
              Como ainda não avaliaste nenhum filme, selecionámos os <strong>melhores classificados globalmente</strong> para começares.
              <br/>
              <span style={{fontSize: '0.9rem', color: '#64748b'}}>
                (Dica: Avalia alguns filmes na lista principal para receberes sugestões personalizadas!)
              </span>
            </p>
          </div>
        )}
      </header>

      {error && <div className="alert alert-error" style={{maxWidth: '1400px', margin: '0 auto 1rem auto'}}>{error}</div>}

      {recs.length === 0 && !error ? (
        <div style={{textAlign: 'center', padding: '4rem', color: '#64748b'}}>
          Não existem filmes disponíveis no sistema.
        </div>
      ) : (
        <div className="movies-list">
          {recs.map((item) => {
            const movie = item.movie;
            const matchPercent = Math.round((item.predicted_score / 5) * 100);

            return (
              <div key={item.id} className="movie-card">
                
                <Link to={`/movies/${movie.id}`} className="poster-wrapper">
                  {movie.poster_url ? (
                    <img src={movie.poster_url} alt={movie.title} />
                  ) : (
                    <div className="poster-placeholder">🎬</div>
                  )}
                  
                  {/* Badge de Match só aparece se for personalizado */}
                  {hasHistory && (
                    <div className="match-badge">
                      {matchPercent}% Match
                    </div>
                  )}
                </Link>

                <div className="card-content">
                  <div style={{ flex: 1 }}>
                    <h3 className="card-title">
                      <Link to={`/movies/${movie.id}`} style={{textDecoration: 'none', color: 'inherit'}}>
                        {movie.title}
                      </Link>
                    </h3>
                    
                    <div className="meta-tags">
                      <span className="tag">{movie.year}</span>
                      <span className="tag">{movie.genre}</span>
                    </div>

                    <p className="card-desc">
                      {movie.description || 'Sem descrição.'}
                    </p>
                  </div>

                  <div className="card-footer">
                     {/* MUDANÇA AQUI: Mostra o Score com Labels diferentes */}
                     {hasHistory ? (
                       <span style={{fontSize: '0.9rem', color: '#4f46e5', fontWeight: 600}}>
                         Previsão: {item.predicted_score.toFixed(1)} ⭐
                       </span>
                     ) : (
                       <span style={{fontSize: '0.9rem', color: '#1e293b', fontWeight: 600}}>
                         Média Global: ⭐ {item.predicted_score.toFixed(1)}
                       </span>
                     )}
                     
                     <Link to={`/movies/${movie.id}`} style={{fontSize: '0.9rem', color: '#64748b', textDecoration: 'none', fontWeight: 500}}>
                       Ver →
                     </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .welcome-banner {
          background: #f0f9ff; border: 1px solid #e0f2fe;
          padding: 20px; border-radius: 12px;
        }

        .movies-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(450px, 1fr)); gap: 1.5rem; max-width: 1400px; margin: 0 auto; }
        
        .movie-card { 
          background: white; border-radius: 16px; overflow: hidden; 
          box-shadow: var(--shadow); border: 1px solid #f1f5f9; 
          transition: transform 0.2s; display: flex; flex-direction: row; height: 240px; 
        }
        .movie-card:hover { transform: translateY(-4px); border-color: var(--primary); }

        .poster-wrapper { 
          width: 160px; height: 100%; background: #e0e7ff; flex-shrink: 0; position: relative;
        }
        .poster-wrapper img { width: 100%; height: 100%; object-fit: cover; }
        .poster-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem; color: #a5b4fc; }

        .match-badge {
          position: absolute; top: 10px; left: 10px;
          background: #4f46e5; color: white; padding: 4px 8px;
          border-radius: 6px; font-size: 0.8rem; font-weight: 700;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .card-content { padding: 1.2rem; display: flex; flex-direction: column; flex-grow: 1; justify-content: space-between; }
        .card-title { margin: 0; font-size: 1.2rem; color: var(--text-main); font-weight: 700; line-height: 1.2; }
        .card-title a:hover { color: var(--primary) !important; }

        .meta-tags { display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
        .tag { background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }

        .card-desc { margin: 10px 0; font-size: 0.9rem; color: #64748b; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        .card-footer { border-top: 1px solid #f1f5f9; padding-top: 10px; display: flex; align-items: center; justify-content: space-between; }

        @media (max-width: 600px) { 
          .movies-list { grid-template-columns: 1fr; } 
          .movie-card { height: auto; flexDirection: column; } 
          .poster-wrapper { width: 100%; height: 200px; } 
        }
      `}</style>
    </div>
  );
}