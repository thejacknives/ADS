import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function Profile() {
  const [user, setUser] = useState({ username: '', email: '' });
  
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success'|'error' } | null>(null);

  useEffect(() => {
    api.getProfile()
      .then(data => setUser({ username: data.username, email: data.email }))
      .catch(() => setMsg({ text: 'Erro ao carregar.', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent, includePassword = false) => {
    e.preventDefault();
    setMsg(null);

    const payload: any = { ...user };

    if (includePassword) {
      if (passwords.new !== passwords.confirm) {
        setMsg({ text: 'As novas passwords não coincidem.', type: 'error' });
        return;
      }
      if (passwords.new.length < 8) {
        setMsg({ text: 'Mínimo 8 caracteres na password.', type: 'error' });
        return;
      }
      payload.old_password = passwords.old;
      payload.new_password = passwords.new;
    }

    try {
      const updated = await api.updateProfile(payload);
      
      if (updated.username) {
        localStorage.setItem('movieapp_user', updated.username);
        window.dispatchEvent(new Event('storage'));
        setUser({ username: updated.username, email: updated.email });
      }

      setMsg({ text: 'Perfil atualizado com sucesso! ✅', type: 'success' });
      
      if (includePassword) {
        setPasswords({ old: '', new: '', confirm: '' });
        setShowPass(false);
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Erro ao guardar.', type: 'error' });
    }
  };

  if (loading) return <div style={{textAlign: 'center', padding: '50px'}}>A carregar...</div>;

  return (
    <div className="container">
      <h2 style={{ marginBottom: '1.5rem', color: '#1e293b' }}>👤 O Meu Perfil</h2>

      {msg && (
        <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {msg.text}
        </div>
      )}

      {/* BLOCO 1: Dados Pessoais */}
      <div className="card">
        <h3 className="section-title">Dados Pessoais</h3>
        <form onSubmit={(e) => handleSave(e, false)}>
          
          <div className="form-group">
            <label className="label">Nome de Utilizador</label>
            <input 
              className="input-field"
              value={user.username}
              onChange={e => setUser({...user, username: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="label">Email</label>
            <input 
              className="input-field"
              type="email"
              value={user.email}
              onChange={e => setUser({...user, email: e.target.value})}
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Guardar Dados
          </button>
        </form>
      </div>

      {/* BLOCO 2: Segurança */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
          <h3 className="section-title" style={{marginBottom: 0}}>Segurança</h3>
          <button 
            type="button"
            className="btn btn-outline"
            onClick={() => setShowPass(!showPass)}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
          >
            {showPass ? 'Cancelar' : 'Alterar Password'}
          </button>
        </div>

        {showPass && (
          <form onSubmit={(e) => handleSave(e, true)}>
            <div className="form-group">
              <label className="label">Password Atual</label>
              <input 
                type="password"
                className="input-field"
                placeholder="Insere a tua password atual"
                value={passwords.old}
                onChange={e => setPasswords({...passwords, old: e.target.value})}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label className="label">Nova Password</label>
                <input 
                  type="password"
                  className="input-field"
                  placeholder="Mínimo 8 caracteres"
                  value={passwords.new}
                  onChange={e => setPasswords({...passwords, new: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Confirmar Nova</label>
                <input 
                  type="password"
                  className="input-field"
                  placeholder="Repete a nova password"
                  value={passwords.confirm}
                  onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#f59e0b' }}>
              Atualizar Password
            </button>
          </form>
        )}
      </div>

      {/* CSS Local para ajustes específicos deste cartão */}
      <style>{`
        .card {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }
        .section-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #334155;
          margin-bottom: 1rem;
          border-bottom: 2px solid #f1f5f9;
          padding-bottom: 0.5rem;
        }
        .label {
          display: block;
          margin-bottom: 6px;
          font-weight: 600;
          font-size: 0.9rem;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}