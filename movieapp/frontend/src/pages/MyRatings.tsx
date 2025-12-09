import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

// Definimos o formato dos dados que vêm do backend
interface Rating {
  id: number;       // O ID da avaliação
  movie: number;    // O ID do filme (o backend por enquanto manda o ID)
  score: number;    // A nota (1-5)
  review?: string;  // Comentário (se existir)
  created_at?: string; // Data (se o backend enviar)
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
      
      // O backend pode devolver um array direto [...] ou um objeto { ratings: [...] }
      // Este código funciona para os dois casos para não dar erro:
      const lista = Array.isArray(data) ? data : (data.ratings || []);
      
      setRatings(lista);
    } catch (err: any) {
      setError('Não foi possível carregar as avaliações. Tenta fazer login novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>⏳ A carregar as tuas notas...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', fontFamily: 'Arial, sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          ⭐ As Minhas Avaliações
        </h2>
        <Link to="/movies" style={{ textDecoration: 'none', color: '#3498db', fontWeight: 'bold' }}>
          + Avaliar novos filmes
        </Link>
      </div>

      {error && (
        <div style={{ backgroundColor: '#ffe6e6', color: '#d63031', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {ratings.length === 0 && !error ? (
        <div style={{ textAlign: 'center', color: '#7f8c8d', marginTop: '40px' }}>
          <h3>Ainda não avaliaste nenhum filme. 🍿</h3>
          <p>Vai ao feed de filmes e começa a dar a tua opinião!</p>
          <Link to="/movies">
            <button style={{ marginTop: '10px', padding: '10px 20px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              Ver Filmes
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {ratings.map((rating) => (
            <div key={rating.id} style={{ 
              border: '1px solid #ddd', 
              borderRadius: '8px', 
              padding: '20px', 
              backgroundColor: 'white',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>
                  Filme #{rating.movie} 
                  {/* Nota: No futuro, o teu colega pode fazer com que o backend envie o "title" do filme em vez de só o ID */}
                </h3>
                {rating.review && <p style={{ color: '#7f8c8d', margin: 0 }}>"{rating.review}"</p>}
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f1c40f' }}>
                  {rating.score} ★
                </div>
                {rating.created_at && (
                  <small style={{ color: '#bdc3c7' }}>
                    {new Date(rating.created_at).toLocaleDateString()}
                  </small>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}