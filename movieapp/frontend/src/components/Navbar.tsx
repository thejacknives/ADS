import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export function Navbar() {
  const navigate = useNavigate();
  // Vamos buscar o nome do utilizador guardado (se existir)
  const username = localStorage.getItem('movieapp_user');

  const handleLogout = async () => {
    try {
      await api.logout();
      // Limpar o nome do utilizador do browser
      localStorage.removeItem('movieapp_user');
      // Redirecionar para o login
      navigate('/login');
    } catch (error) {
      console.error("Erro ao sair", error);
    }
  };

  return (
    <nav style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '1rem 2rem', 
      backgroundColor: '#2c3e50', 
      color: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      {/* LADO ESQUERDO: Logo e Links */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>🎬 MovieApp</h2>
        
        {/* Só mostramos os links se estiver logado */}
        {username && (
          <>
            <Link to="/movies" style={linkStyle}>Filmes</Link>
            <Link to="/my-ratings" style={linkStyle}>Minhas Avaliações</Link>
          </>
        )}
      </div>

      {/* LADO DIREITO: Info do User e Logout */}
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        {username ? (
          <>
            <span style={{ fontWeight: 'bold' }}>Olá, {username}</span>
            <button 
              onClick={handleLogout} 
              style={{
                padding: '8px 15px',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Sair
            </button>
          </>
        ) : (
          // Se não estiver logado, mostra Login/Registo
          <div style={{ display: 'flex', gap: '10px'}}>
             <Link to="/login" style={linkStyle}>Login</Link>
             <Link to="/register" style={{...linkStyle, backgroundColor: '#3498db', padding: '5px 10px', borderRadius: '4px'}}>Registar</Link>
          </div>
        )}
      </div>
    </nav>
  );
}

// Estilo simples para os links
const linkStyle = {
  color: 'white',
  textDecoration: 'none',
  fontSize: '1rem',
  transition: 'opacity 0.2s',
};