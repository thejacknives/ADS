import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export function Navbar() {
  const navigate = useNavigate();
  const username = localStorage.getItem('movieapp_user');

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error("Erro logout", error);
    } finally {
      localStorage.removeItem('movieapp_user');
      navigate('/login');
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-content">
        {/* Esquerda */}
        <div className="nav-left">
          <Link to={username ? "/movies" : "/"} className="logo">🎬 MovieApp</Link>
          
          {username && (
            <div className="nav-links">
              <Link to="/movies">Filmes</Link>
              <Link to="/my-ratings">Minhas Avaliações</Link>
            </div>
          )}
        </div>

        {/* Direita */}
        <div className="nav-right">
          {username ? (
            <>
              <span className="user-welcome">Olá, <strong>{username}</strong></span>
              <button onClick={handleLogout} className="btn btn-danger" style={{padding: '0.5rem 1rem', fontSize: '0.85rem'}}>
                Sair
              </button>
            </>
          ) : (
            <div className="nav-auth">
               <Link to="/login" className="btn btn-outline" style={{marginRight: '10px'}}>Login</Link>
               <Link to="/register" className="btn btn-primary">Registar</Link>
            </div>
          )}
        </div>
      </div>

      {/* CSS Específico da Navbar (Pode ir para index.css se preferires) */}
      <style>{`
        .navbar { 
          /* Posição Flutuante */
          position: fixed; 
          top: 20px; 
          left: 50%; 
          transform: translateX(-50%); 
          z-index: 1000; 

          /* Tamanho e Forma */
          width: 90%; 
          max-width: 1000px; 
          border-radius: 16px; 
          
          /* Visual Moderno (Vidro) */
          background: rgba(255, 255, 255, 0.85); 
          backdrop-filter: blur(12px); 
          -webkit-backdrop-filter: blur(12px); /* Para Safari */
          
<<<<<<< HEAD
          /* Sombra Suave */
=======
          /* Sombra Suave */j
>>>>>>> frontend_rosendo
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.5);
          
          transition: all 0.3s ease;
        }

        /* Layout Interno */
        .nav-content { 
          padding: 0.8rem 2rem; /* Um pouco mais compacto */
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
        }

        .nav-left { display: flex; align-items: center; gap: 2rem; }
        
        .logo { 
          font-size: 1.4rem; 
          font-weight: 800; 
          color: var(--text-main); 
          text-decoration: none; 
          letter-spacing: -0.5px;
        }
        
        .nav-links { display: flex; gap: 1.5rem; }
        .nav-links a { 
          color: var(--text-secondary); 
          font-weight: 500;
          font-size: 0.95rem;
          transition: color 0.2s; 
        }
        .nav-links a:hover { color: var(--primary); }
        
        .nav-right { display: flex; align-items: center; gap: 1rem; }
        .user-welcome { color: var(--text-secondary); font-size: 0.9rem; margin-right: 5px; }

        /* Responsividade para telemóvel */
        @media (max-width: 768px) {
          .navbar { width: 95%; top: 10px; }
          .nav-content { padding: 0.8rem 1rem; }
          .user-welcome { display: none; } /* Esconde o "Olá user" em ecrãs pequenos */
        }
      `}</style>
    </nav>
  );
}