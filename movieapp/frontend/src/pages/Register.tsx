import { useState } from 'react';
import { api } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';

export function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.register(formData);
      
      setSuccess('Conta criada com sucesso! A redirecionar...');
      
      // Espera 2 segundos antes de ir para o login
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2 style={{ marginBottom: '1.5rem' }}>📝 Criar Nova Conta</h2>
      
      {/* Mensagens de Alerta usando classes CSS */}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        
        {/* Campo Username */}
        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>
            Nome de Utilizador
          </label>
          <input
            className="input-field"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            disabled={loading || success !== ''}
            placeholder="Escolhe um nome único"
          />
        </div>

        {/* Campo Email */}
        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>
            Email
          </label>
          <input
            className="input-field"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={loading || success !== ''}
            placeholder="exemplo@mail.com"
          />
        </div>

        {/* Campo Password */}
        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>
            Password
          </label>
          <input
            className="input-field"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={loading || success !== ''}
            placeholder="Mínimo 8 caracteres"
          />
        </div>
        
        {/* Botão de Ação */}
        <button 
          type="submit" 
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '10px' }}
          disabled={loading || success !== ''}
        >
          {success ? 'Sucesso! 🚀' : (loading ? 'A criar conta...' : 'Registar')}
        </button>
      </form>

      <p style={{ marginTop: '20px', fontSize: '0.9rem', color: '#64748b' }}>
        Já tens conta? <Link to="/login">Entra aqui</Link>
      </p>
    </div>
  );
}