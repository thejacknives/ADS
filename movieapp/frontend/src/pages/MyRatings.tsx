import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

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
  movie: MovieDetails;
}

interface Feedback {
  type: 'success' | 'error';
  message: string;
}

// --- Componentes de Estrela ---
function StarIcon({ fill, onClick, onMouseEnter, isInteractive }: { fill: number, onClick?: () => void, onMouseEnter?: () => void, isInteractive?: boolean }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" viewBox="0 0 24 24" 
      className="star-icon"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{ 
        cursor: isInteractive ? 'pointer' : 'default', 
        transform: isInteractive ? 'scale(1.15)' : 'scale(1)',
        filter: isInteractive ? 'drop-shadow(0px 2px 3px rgba(251, 191, 36, 0.5))' : 'none',
        transition: 'all 0.1s'
      }}
    >
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

function StarRating({ score, onRate, isEditing }: { score: number, onRate?: (n: number) => void, isEditing: boolean }) {
  const [hover, setHover] = useState(0);

  return (
    <div style={{ display: 'flex', gap: '2px' }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((index) => {
        const currentVal = isEditing && hover > 0 ? hover : score;
        let fill = 0;
        if (currentVal >= index) fill = 100;
        else if (currentVal >= index - 0.5) fill = 50;

        return (
          <StarIcon 
            key={index} 
            fill={fill} 
            isInteractive={isEditing}
            onMouseEnter={() => isEditing && setHover(index)}
            onClick={() => isEditing && onRate && onRate(index)}
          />
        );
      })}
    </div>
  );
}

export function MyRatings() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');
  
  // Modos de Edição
  const [manageMode, setManageMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [feedbackMap, setFeedbackMap] = useState<Record<number, Feedback>>({});
  const [deleteConfirmMap, setDeleteConfirmMap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadRatings();
  }, []);

  const loadRatings = async () => {
    try {
      setLoading(true);
      const data = await api.getMyRatingsDetails();
      const lista = Array.isArray(data) ? data : (data.ratings || []);
      setRatings(lista);
    } catch (err: any) {
      setGlobalError('Não foi possível carregar as avaliações.');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (ratingId: number, type: 'success' | 'error', message: string) => {
    setFeedbackMap(prev => ({ ...prev, [ratingId]: { type, message } }));
    setTimeout(() => {
      setFeedbackMap(prev => { const n = { ...prev }; delete n[ratingId]; return n; });
    }, 3000);
  };

  const handleDeleteClick = (ratingId: number) => {
    if (!deleteConfirmMap[ratingId]) {
      setDeleteConfirmMap(prev => ({ ...prev, [ratingId]: true }));
      setTimeout(() => {
        setDeleteConfirmMap(prev => { const n = { ...prev }; delete n[ratingId]; return n; });
      }, 3000);
      return;
    }
    handleDeleteConfirm(ratingId);
  };

  const handleDeleteConfirm = async (ratingId: number) => {
    try {
      setRatings(prev => prev.filter(r => r.rating_id !== ratingId));
      await api.deleteRating(ratingId);
    } catch (err) {
      loadRatings();
      setGlobalError('Erro ao apagar. Tenta novamente.');
    }
  };

  const handleUpdateScore = async (ratingId: number, newScore: number) => {
    const originalRating = ratings.find(r => r.rating_id === ratingId);
    try {
      setRatings(prev => prev.map(r => r.rating_id === ratingId ? { ...r, score: newScore } : r));
      setEditingId(null);
      await api.editRating(ratingId, newScore);
      showFeedback(ratingId, 'success', 'Atualizado!');
    } catch (err) {
      if (originalRating) setRatings(prev => prev.map(r => r.rating_id === ratingId ? originalRating : r));
      showFeedback(ratingId, 'error', 'Erro ao guardar.');
    }
  };

  if (loading) return <div style={{textAlign: 'center', marginTop: '100px'}}>A carregar as tuas notas...</div>;

  return (
    <div style={{ width: '100%', padding: '0 40px', boxSizing: 'border-box' }}>
      
      <header style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        marginBottom: '2rem', maxWidth: '1400px', margin: '0 auto 2rem auto' 
      }}>
        <h2>⭐ As Minhas Avaliações</h2>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn btn-outline" 
            onClick={() => { setManageMode(!manageMode); setEditingId(null); }}
            style={{ 
              borderColor: manageMode ? '#fbbf24' : undefined, 
              backgroundColor: manageMode ? '#fffbeb' : undefined,
              color: manageMode ? '#d97706' : undefined,
              fontWeight: 600
            }}
          >
            {manageMode ? 'Concluir Edição' : '✏️ Gerir Edições'}
          </button>
          <Link to="/movies" className="btn btn-primary">Avaliar Novo Filme</Link>
        </div>
      </header>

      {globalError && <div className="alert alert-error" style={{maxWidth: '1400px', margin: '0 auto 1rem auto'}}>{globalError}</div>}

      {ratings.length === 0 && !globalError ? (
        <div style={{textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1', maxWidth: '1400px', margin: '0 auto'}}>
          <h3 style={{color: '#64748b'}}>Ainda sem avaliações 🍿</h3>
          <p>Vai ao menu Filmes para começares a tua coleção!</p>
        </div>
      ) : (
        <div className="ratings-list">
          {ratings.map((rating) => {
            const movie = rating.movie; 
            const feedback = feedbackMap[rating.rating_id];
            const isDeleting = deleteConfirmMap[rating.rating_id];
            const isEditingThis = editingId === rating.rating_id;

            return (
              <div key={rating.rating_id} className={`rating-row ${isEditingThis ? 'active-edit' : ''}`}>
                
                {/* LADO ESQUERDO: Poster e Info (Agora com Links) */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flex: 1 }}>
                  
                  {/* Poster Link */}
                  <Link to={`/movies/${movie.id}`} className="movie-poster">
                    {movie?.poster_url ? (
                       <img src={movie.poster_url} alt={movie.title} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                    ) : (
                       <span style={{fontSize:'2rem'}}>🎬</span>
                    )}
                  </Link>
                  
                  <div style={{ paddingRight: '20px' }}>
                    {/* Título Link */}
                    <h3 className="movie-title">
                      <Link to={`/movies/${movie.id}`} style={{textDecoration: 'none', color: 'inherit'}}>
                        {movie.title}
                      </Link>
                    </h3>
                    
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.85rem', color: '#64748b', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span className="tag">{movie.year}</span>
                      <span className="tag">{movie.genre}</span>
                      {movie.director && <span className="tag">🎥 {movie.director}</span>}
                    </div>
                    {movie.description && (
                       <p style={{ margin: '10px 0 0 0', fontSize: '0.9rem', color: '#64748b', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                         {movie.description}
                       </p>
                    )}
                  </div>
                </div>

                {/* LADO DIREITO: Ações e Estrelas */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  
                  {manageMode && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button 
                        className={`btn-action btn-edit ${isEditingThis ? 'active' : ''}`}
                        onClick={() => setEditingId(isEditingThis ? null : rating.rating_id)}
                      >
                        {isEditingThis ? 'Cancelar' : '✏️ Editar'}
                      </button>

                      <button 
                        className={`btn-action btn-delete ${isDeleting ? 'confirm' : ''}`}
                        onClick={() => handleDeleteClick(rating.rating_id)}
                      >
                        {isDeleting ? 'Confirma?' : '🗑️ Remover'}
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', minWidth: '130px' }}>
                    
                    {feedback && (
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: feedback.type === 'success' ? '#16a34a' : '#dc2626' }}>
                        {feedback.type === 'success' ? '✓ ' : '✕ '}{feedback.message}
                      </span>
                    )}

                    <StarRating 
                      score={rating.score} 
                      isEditing={isEditingThis} 
                      onRate={(newScore) => handleUpdateScore(rating.rating_id, newScore)}
                    />
                    
                    <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end'}}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: isEditingThis ? '#fbbf24' : '#475569' }}>
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
          width: 100%; box-sizing: border-box;
          background: white; padding: 1.5rem; border-radius: 16px;
          box-shadow: var(--shadow); border: 1px solid #f1f5f9;
          display: flex; justify-content: space-between; align-items: center;
          transition: all 0.2s;
        }
        
        .rating-row.active-edit { border-color: #fbbf24; background-color: #fffdf5; transform: scale(1.01); }
        .rating-row:hover { border-color: var(--primary); z-index: 10; }

        .movie-poster { 
          width: 80px; height: 120px; background: #e0e7ff; 
          border-radius: 8px; overflow: hidden; display: flex; 
          align-items: center; justify-content: center; flex-shrink: 0; 
          box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
          text-decoration: none; /* Importante para o Link */
        }
        
        .movie-title { margin: 0; font-size: 1.25rem; color: var(--text-main); font-weight: 700; line-height: 1.2; }
        .movie-title a:hover { color: var(--primary) !important; }

        .star-icon { width: 24px; height: 24px; transition: transform 0.1s; }
        .tag { background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; }

        .btn-action {
          padding: 6px 12px; border-radius: 6px; cursor: pointer; 
          font-size: 0.8rem; font-weight: 600; width: 105px; text-align: center;
          transition: all 0.2s;
        }

        .btn-edit { background: white; border: 1px solid #cbd5e1; color: #475569; }
        .btn-edit:hover { background: #f1f5f9; }
        .btn-edit.active { background: #fbbf24; border-color: #fbbf24; color: white; }

        .btn-delete { background: white; border: 1px solid #fecaca; color: #ef4444; }
        .btn-delete:hover { background: #fef2f2; border-color: #ef4444; }
        .btn-delete.confirm { background: #ef4444; color: white; border-color: #ef4444; animation: pulse 0.5s; }

        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }

        @media (max-width: 768px) {
          .rating-row { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .rating-row > div:last-child { width: 100%; border-top: 1px solid #f1f5f9; padding-top: 10px; flex-direction: row; justify-content: space-between; }
        }
      `}</style>
    </div>
  );
}