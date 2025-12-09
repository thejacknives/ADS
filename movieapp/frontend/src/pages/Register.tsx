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
  const [success, setSuccess] = useState(''); // <--- Nova variável para sucesso
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
      
      // Em vez de alert, mostramos a mensagem na página
      setSuccess('Conta criada com sucesso! A redirecionar para o login...');
      
      // Esperamos 2 segundos para o utilizador ler, e só depois mudamos de página
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta.');
      setLoading(false); // Só paramos o loading se der erro (no sucesso mantemos para não deixar editar)
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <h2>📝 Criar Nova Conta</h2>
      
      {/* Mensagem de Erro (Vermelho) */}
      {error && (
        <div style={{ 
          color: '#721c24', 
          backgroundColor: '#f8d7da', 
          border: '1px solid #f5c6cb', 
          marginBottom: '15px', 
          padding: '10px', 
          borderRadius: '4px' 
        }}>
          {error}
        </div>
      )}

      {/* Mensagem de Sucesso (Verde) */}
      {success && (
        <div style={{ 
          color: '#155724', 
          backgroundColor: '#d4edda', 
          border: '1px solid #c3e6cb', 
          marginBottom: '15px', 
          padding: '10px', 
          borderRadius: '4px' 
        }}>
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input
          name="username"
          placeholder="Nome de Utilizador"
          value={formData.username}
          onChange={handleChange}
          required
          disabled={loading || success !== ''} // Bloqueia inputs durante o loading ou sucesso
          style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          disabled={loading || success !== ''}
          style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          disabled={loading || success !== ''}
          style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        
        <button 
          type="submit" 
          disabled={loading || success !== ''} 
          style={{ 
            padding: '12px', 
            cursor: (loading || success !== '') ? 'not-allowed' : 'pointer',
            backgroundColor: success ? '#28a745' : '#2196F3', // Fica verde se tiver sucesso
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            transition: 'background-color 0.3s'
          }}
        >
          {success ? 'Sucesso!' : (loading ? 'A criar conta...' : 'Registar')}
        </button>
      </form>

      <p style={{ marginTop: '20px', color: '#666' }}>
        Já tens conta? <Link to="/login" style={{ color: '#2196F3', textDecoration: 'none' }}>Entra aqui</Link>
      </p>
    </div>
  );
}