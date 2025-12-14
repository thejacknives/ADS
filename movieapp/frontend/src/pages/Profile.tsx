// src/pages/Profile.tsx
import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function Profile() {
  const [formData, setFormData] = useState({ username: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getProfile();
      setFormData({ username: data.username, email: data.email });
    } catch (err) {
      setMessage({ text: 'Erro ao carregar dados.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    try {
      const updatedUser = await api.updateProfile(formData);
      
      // Atualizar o nome na Navbar (LocalStorage) se mudou
      if (updatedUser.username) {
        localStorage.setItem('movieapp_user', updatedUser.username);
        // Disparar evento para a Navbar atualizar (opcional, ou apenas refresh)
        window.dispatchEvent(new Event('storage'));
      }

      setMessage({ text: 'Perfil atualizado com sucesso! 🎉', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Erro ao atualizar.', type: 'error' });
    }
  };

  if (loading) return <div className="text-center mt-10">A carregar...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>👤 O Meu Perfil</h2>

      <div style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        
        {message && (
          <div style={{ 
            padding: '10px', marginBottom: '20px', borderRadius: '6px',
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b'
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#64748b' }}>Nome de Utilizador</label>
            <input 
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#64748b' }}>Email</label>
            <input 
              type="email"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              required
            />
          </div>

          <button 
            type="submit" 
            style={{ 
              marginTop: '10px', padding: '12px', background: '#4f46e5', color: 'white', 
              border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#4338ca')}
            onMouseOut={e => (e.currentTarget.style.background = '#4f46e5')}
          >
            Guardar Alterações
          </button>
        </form>
      </div>
    </div>
  );
}