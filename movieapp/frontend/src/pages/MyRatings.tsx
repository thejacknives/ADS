import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

interface Rating {
  id: number;
  movie: number;
  score: number;
  review?: string;
  created_at?: string;
}

export function MyRatings() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRatings();
  }, []);

  const loadRatings = async () => {
    try {
      const data = await api.getMyRatings();
      const lista = Array.isArray(data) ? data : (data.ratings || []);
      setRatings(lista);
    } catch (err: any) {
      setError('Sessão expirada. Por favor faz login novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{textAlign: 'center', marginTop: '50px'}}>⏳ A carregar...</div>;

  return (
    <div className="container">
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
        <h2>As Minhas Avaliações</h2>
        <Link to="/movies" className="btn btn-primary">Avaliar Novo Filme</Link>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {ratings.length === 0 && !error ? (
        <div style={{textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1'}}>
          <h3 style={{color: '#64748b'}}>Ainda sem avaliações 🍿</h3>
          <p>Começa a dar notas aos teus filmes favoritos!</p>
        </div>
      ) : (
        <div className="ratings-grid">
          {ratings.map((rating) => (
            <div key={rating.id} className="rating-card">
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                <span className="movie-tag">Filme #{rating.movie}</span>
                <span className="score-badge">★ {rating.score}</span>
              </div>
              
              {rating.review ? (
                <p style={{color: '#475569', fontSize: '0.95rem', lineHeight: '1.5'}}>"{rating.review}"</p>
              ) : (
                <p style={{color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem'}}>Sem comentário escrito.</p>
              )}
              
              <div style={{marginTop: '15px', borderTop: '1px solid #f1f5f9', paddingTop: '10px'}}>
                <small style={{color: '#94a3b8'}}>
                  {rating.created_at ? new Date(rating.created_at).toLocaleDateString() : 'Data desconhecida'}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CSS Local para a Grid */}
      <style>{`
        .ratings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
        .rating-card { background: white; padding: 1.5rem; borderRadius: 12px; box-shadow: var(--shadow); transition: transform 0.2s; border: 1px solid #f1f5f9; }
        .rating-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        .score-badge { background: #fef3c7; color: #d97706; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 0.9rem; }
        .movie-tag { background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; }
      `}</style>
    </div>
  );
}