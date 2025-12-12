import { useState } from 'react';
import { api } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login({ email, password });
      
      // Guardar nome para a Navbar
      if (data.user && data.user.username) {
        localStorage.setItem('movieapp_user', data.user.username);
          if (data.user.is_admin) {
          localStorage.setItem('movieapp_is_admin', 'true');
        } else {
          localStorage.removeItem('movieapp_is_admin');
        }     
      }
      
      navigate('/movies'); 
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    // 1. AQUI: Usamos a classe 'auth-container' em vez de style={{...}}
    <div className="auth-container">
      <h2 style={{ marginBottom: '1.5rem' }}>Bem-vindo de volta! 👋</h2>
      
      {/* 2. AQUI: Usamos 'alert alert-error' para a mensagem vermelha */}
      {error && <div className="alert alert-error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        {/* 3. AQUI: Envolvemos cada input num 'form-group' para dar espaço */}
        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>
            Email
          </label>
          <input
            className="input-field" // <--- Classe do CSS global
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="exemplo@mail.com"
          />
        </div>
        
        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>
            Password
          </label>
          <input
            className="input-field" // <--- Classe do CSS global
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>
        
        {/* 4. AQUI: Botão com estilo 'btn btn-primary' */}
        <button 
          type="submit" 
          className="btn btn-primary" 
          style={{ width: '100%', marginTop: '10px' }} 
          disabled={loading}
        >
          {loading ? 'A entrar...' : 'Entrar'}
        </button>
      </form>

      <p style={{ marginTop: '20px', fontSize: '0.9rem', color: '#64748b' }}>
        Ainda não tens conta? <Link to="/register">Regista-te aqui</Link>
      </p>
    </div>
  );
}