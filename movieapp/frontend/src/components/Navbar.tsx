import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export function Navbar() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const username = localStorage.getItem('movieapp_user');
  const isAdmin = localStorage.getItem('movieapp_is_admin') === 'true';

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error("Erro logout", error);
    } finally {
      localStorage.removeItem('movieapp_user');
      localStorage.removeItem('movieapp_is_admin');
      navigate('/login');
      setIsMenuOpen(false);
    }
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="nav-content">
        
        {/* 1. LOGO */}
        <Link to={username ? "/Movies" : "/"} className="logo" onClick={closeMenu}>
          🎬 MovieApp
        </Link>

        {/* 2. MENU DESKTOP */}
        {username && (
          <div className="desktop-links">
            <Link to="/movies">Filmes</Link>
            <Link to="/my-ratings">Minhas Avaliações</Link>
            <Link to="/recommendations">Recomendações</Link>
          </div>
        )}

        {/* 3. AÇÕES DESKTOP */}
        <div className="desktop-actions">
          {username ? (
            
            <>
            
              <span className="user-welcome">Olá, <strong>{username}</strong></span>
              {/* --- BOTÃO DE PERFIL (Novo) --- */}
              <Link 
                to="/profile" 
                className="btn btn-primary btn-sm"
                style={{ 
                  marginRight: '8px', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  textDecoration: 'none'
                }}
              >
                Perfil
              </Link>
              
              {isAdmin && (
                <Link to="/admin" className="btn btn-admin-desktop">
                  Painel Admin
                </Link>
              )}

              <button onClick={handleLogout} className="btn btn-danger btn-sm">
                Sair
              </button>
            </>
          ) : (
            <div className="auth-buttons">
               <Link to="/login" className="btn btn-outline">Login</Link>
               <Link to="/register" className="btn btn-primary">Registar</Link>
            </div>
          )}
        </div>

        {/* 4. BOTÃO HAMBÚRGUER (Mobile) */}
        <button 
          className="mobile-toggle" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* 5. MENU MOBILE */}
      <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
        {username ? (
          <>
            <div className="mobile-user-info">
              {/* Link para o perfil no mobile */}
              <Link to="/profile" onClick={closeMenu} style={{color: '#4f46e5', fontWeight: 'bold', textDecoration: 'none'}}>
                👤 {username} (Editar Perfil)
              </Link>
            </div>
            
            <Link to="/movies" onClick={closeMenu}>🍿 Filmes</Link>
            <Link to="/my-ratings" onClick={closeMenu}>⭐ Minhas Avaliações</Link>
            <Link to="/recommendations" onClick={closeMenu}>🔮 Recomendações</Link>
            
            <div className="mobile-divider"></div>
            
            {isAdmin && (
              <Link to="/admin" onClick={closeMenu} className="mobile-admin-link">
                🛠️ Painel Admin
              </Link>
            )}
            
            <button onClick={handleLogout} className="mobile-logout">
              Sair
            </button>
          </>
        ) : (
          <div className="mobile-auth">
            <Link to="/login" onClick={closeMenu} className="btn btn-outline block">Login</Link>
            <Link to="/register" onClick={closeMenu} className="btn btn-primary block">Registar</Link>
          </div>
        )}
      </div>

      <style>{`
        /* --- ESTILOS BASE --- */
        .navbar { 
          position: fixed; top: 20px; left: 50%; transform: translateX(-50%); 
          z-index: 1000; width: 90%; max-width: 1200px;
          border-radius: 16px; 
          background: rgba(255, 255, 255, 0.9); 
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08); border: 1px solid rgba(255, 255, 255, 0.5);
          transition: all 0.3s ease;
        }

        .nav-content { 
          padding: 0.8rem 1.5rem; 
          display: flex; justify-content: space-between; align-items: center; 
        }

        .logo { font-size: 1.4rem; font-weight: 800; color: #1e293b; text-decoration: none; }
        
        .desktop-links { display: flex; gap: 1.5rem; margin-left: 2rem; margin-right: auto; }
        .desktop-links a { color: #64748b; font-weight: 500; font-size: 0.95rem; transition: color 0.2s; }
        .desktop-links a:hover { color: #4f46e5; }

        .desktop-actions { display: flex; align-items: center; gap: 10px; }

        /* Botões */
        .btn-sm { padding: 0.5rem 1rem; font-size: 0.85rem; }
        
        .btn-admin-desktop {
          background-color: #1e293b; color: white;
          padding: 0.5rem 1rem; font-size: 0.85rem;
          text-decoration: none; display: inline-flex; align-items: center; gap: 5px;
          border-radius: 12px; /* Ajuste para combinar com o tema */
        }
        .btn-admin-desktop:hover { background-color: #0f172a; }

        .mobile-toggle { display: none; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #1e293b; }
        .mobile-menu { display: none; }

        /* --- RESPONSIVIDADE --- */
        @media (max-width: 900px) {
          .navbar { width: 95%; top: 10px; }
          .nav-content { padding: 0.8rem 1rem; }
          
          .desktop-links, .desktop-actions { display: none; }
          .mobile-toggle { display: block; }

          .mobile-menu {
            display: block; overflow: hidden;
            max-height: 0; opacity: 0;
            transition: all 0.3s ease-in-out;
            background: rgba(255, 255, 255, 0.98);
            border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;
          }
          
          .mobile-menu.open {
            max-height: 400px; opacity: 1;
            padding: 1rem 1.5rem 1.5rem 1.5rem;
            border-top: 1px solid #f1f5f9;
          }

          .mobile-menu a { 
            display: block; padding: 10px 0; 
            color: #334155; text-decoration: none; font-weight: 500; 
            border-bottom: 1px solid #f8fafc;
          }
          
          .mobile-user-info { margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #e2e8f0; }
          .mobile-divider { height: 10px; }
          .mobile-admin-link { color: #4f46e5 !important; font-weight: 700 !important; }
          
          .mobile-logout {
            width: 100%; margin-top: 15px; padding: 10px;
            background: #fee2e2; color: #ef4444; font-weight: 600;
            border: none; border-radius: 8px; cursor: pointer;
          }

          .mobile-auth { display: flex; flex-direction: column; gap: 10px; }
          .block { display: block; text-align: center; width: 100%; box-sizing: border-box; }
        }
      `}</style>
    </nav>
  );
}