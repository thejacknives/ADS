import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface MovieDetailData {
  id: number;
  title: string;
  year: number;
  genre: string;
  poster_url?: string;
  description?: string;
  director?: string;
  average_rating?: number; // Agora já vai funcionar!
  rating_count?: number;   // Agora já vai funcionar!
  user_rating?: number | null;
  user_rating_id?: number | null;
}

// Estrela (Estilo Global)
function StarIcon({ fill, onClick, onMouseEnter, isInteractive }: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" 
      onClick={onClick} onMouseEnter={onMouseEnter}
      style={{ 
        cursor: isInteractive ? 'pointer' : 'default', 
        transform: isInteractive ? 'scale(1.1)' : 'scale(1)', 
        transition: 'all 0.1s',
        filter: isInteractive ? 'drop-shadow(0px 2px 3px rgba(251, 191, 36, 0.5))' : 'none'
      }}
    >
      <defs>
        <linearGradient id={`grad-${fill}-lg`}>
          <stop offset={`${fill}%`} stopColor="#fbbf24" />
          <stop offset={`${fill}%`} stopColor="#e2e8f0" />
        </linearGradient>
      </defs>
      <path fill={`url(#grad-${fill}-lg)`} d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"/>
    </svg>
  );
}

export function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<MovieDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (id) loadMovie(parseInt(id));
  }, [id]);

  const loadMovie = async (movieId: number) => {
    try {
      setLoading(true);
      const data = await api.getMovie(movieId);
      setMovie(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (score: number) => {
    if (!movie) return;

    try {
      if (movie.user_rating_id) {
        await api.editRating(movie.user_rating_id, score);
      } else {
        const res = await api.rateMovie(movie.id, score);
        if (res.rating?.rating_id) {
            setMovie(prev => prev ? { ...prev, user_rating_id: res.rating.rating_id } : null);
        }
      }
      
      setMovie(prev => prev ? { ...prev, user_rating: score } : null);
      setFeedback('Guardado! ✓');
      setTimeout(() => setFeedback(''), 3000);
      
      // Pequeno delay para atualizar a média global vinda do servidor
      setTimeout(() => loadMovie(movie.id), 500);

    } catch (err) {
      alert('Erro ao guardar avaliação.');
    }
  };

  if (loading) return <div style={{textAlign: 'center', marginTop: '100px', color: '#64748b'}}>⏳ A carregar detalhes...</div>;
  if (!movie) return <div style={{textAlign: 'center', marginTop: '100px'}}>Filme não encontrado.</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 60px 20px' }}>
      
      {/* Botão Voltar (Estilo Link Simples) */}
      <button onClick={() => navigate(-1)} className="btn-back">
        ← Voltar à lista
      </button>

      <div className="detail-layout">
        
        {/* Lado Esquerdo: Poster (Sem moldura, só sombra) */}
        <div className="poster-container">
          {movie.poster_url ? (
            <img src={movie.poster_url} alt={movie.title} />
          ) : (
            <div className="poster-placeholder">🎬</div>
          )}
        </div>

        {/* Lado Direito: Informação (Tipografia alinhada com o site) */}
        <div className="info-container">
          
          <h1 className="movie-title">{movie.title}</h1>
          
          {/* Metadados com as tags cinzentas padrão */}
          <div className="meta-data-row">
            <span className="tag">{movie.year}</span>
            <span className="tag">{movie.genre}</span>
            {movie.director && <span className="tag">🎥 {movie.director}</span>}
          </div>

          {/* Rating Global */}
          <div className="global-rating-row">
             <div className="rating-badge">
               ⭐ <strong>{Number(movie.average_rating || 0).toFixed(1)}</strong> / 5
             </div>
             <span className="rating-count">
               ({movie.rating_count || 0} avaliações da comunidade)
             </span>
          </div>

          {/* Sinopse */}
          <div className="description-box">
            <h3 className="section-label">SINOPSE</h3>
            <p className="text-body">{movie.description || 'Sem descrição disponível.'}</p>
          </div>

          {/* Área de Avaliação do User */}
          <div className="user-rating-section">
            <h3 className="section-label" style={{marginBottom: '12px'}}>A TUA AVALIAÇÃO</h3>
            
            <div className="stars-wrapper">
              <div style={{display: 'flex', gap: '6px'}} onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const currentVal = hoverRating > 0 ? hoverRating : (movie.user_rating || 0);
                  let fill = 0;
                  if (currentVal >= star) fill = 100;
                  else if (currentVal >= star - 0.5) fill = 50;

                  return (
                    <StarIcon 
                      key={star} 
                      fill={fill} 
                      isInteractive={true}
                      onMouseEnter={() => setHoverRating(star)}
                      onClick={() => handleRate(star)}
                    />
                  );
                })}
              </div>
              
              {feedback ? (
                <span className="feedback-msg">{feedback}</span>
              ) : movie.user_rating ? (
                <span className="user-score-display">{movie.user_rating}/5</span>
              ) : (
                <span className="cta-text">Clica nas estrelas para avaliar</span>
              )}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        /* CORES GLOBAIS (Igual ao Index.css e Movies.tsx) */
        .btn-back {
          background: none; border: none; cursor: pointer;
          color: #64748b; font-weight: 600; font-size: 0.95rem;
          margin-bottom: 30px; display: inline-block;
          transition: color 0.2s;
        }
        .btn-back:hover { color: #4f46e5; }

        .detail-layout { display: flex; gap: 60px; align-items: flex-start; }

        .poster-container {
          width: 320px; flex-shrink: 0;
          border-radius: 12px; overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .poster-container img { width: 100%; display: block; }
        .poster-placeholder { 
          width: 100%; height: 480px; background: #e0e7ff; 
          display: flex; align-items: center; justify-content: center; 
          font-size: 4rem; color: #a5b4fc; 
        }

        .info-container { flex-grow: 1; padding-top: 10px; }

        /* Título Principal */
        .movie-title { 
          margin: 0 0 15px 0; font-size: 3rem; 
          color: #1e293b; font-weight: 800; line-height: 1.1; letter-spacing: -1px;
        }

        /* Tags (Igual ao Movies.tsx) */
        .meta-data-row {
          display: flex; align-items: center; flex-wrap: wrap; gap: 10px;
          margin-bottom: 25px;
        }
        .tag { 
          background: #f1f5f9; color: #64748b; 
          padding: 4px 12px; border-radius: 6px; 
          font-size: 0.9rem; font-weight: 600; 
        }

        /* Rating Badge */
        .global-rating-row {
          display: flex; align-items: center; gap: 12px; margin-bottom: 40px;
        }
        .rating-badge {
          font-size: 1.1rem; font-weight: 600; color: #1e293b;
          background: #f8fafc; border: 1px solid #e2e8f0;
          padding: 6px 12px; border-radius: 8px;
        }
        .rating-count { color: #94a3b8; font-size: 0.95rem; }

        /* Texto Descritivo */
        .section-label { 
          font-size: 0.75rem; color: #94a3b8; letter-spacing: 1.2px; 
          margin-bottom: 8px; font-weight: 700; text-transform: uppercase;
        }
        .text-body { 
          font-size: 1.05rem; line-height: 1.7; color: #334155; 
          max-width: 800px; margin-bottom: 40px;
        }

        /* User Rating */
        .user-rating-section {
          padding-top: 20px; border-top: 1px solid #f1f5f9;
        }
        .stars-wrapper { display: flex; align-items: center; gap: 15px; }
        .feedback-msg { color: #16a34a; font-weight: bold; font-size: 0.9rem; animation: fadeIn 0.3s; }
        .user-score-display { font-size: 1.5rem; font-weight: 700; color: #fbbf24; }
        .cta-text { color: #cbd5e1; font-size: 0.9rem; font-weight: 500; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 900px) {
          .detail-layout { flex-direction: column; gap: 30px; }
          .poster-container { width: 220px; margin: 0 auto; }
          .movie-title { font-size: 2rem; text-align: center; }
          .meta-data-row, .global-rating-row { justify-content: center; }
          .info-container { text-align: center; }
          .text-body { margin: 0 auto; text-align: left;}
          .user-rating-section { display: flex; flex-direction: column; align-items: center; }
        }
      `}</style>
    </div>
  );
}