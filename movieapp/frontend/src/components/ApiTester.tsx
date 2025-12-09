// src/components/ApiTester.tsx
import { useState } from 'react';
import { api } from '../services/api';

export function ApiTester() {
  const [logs, setLogs] = useState<string[]>([]);
  
  // Dados para Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Dados para Registo (Novo)
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const log = (message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const dataStr = data ? JSON.stringify(data, null, 2) : '';
    setLogs(prev => [`[${timestamp}] ${message} ${dataStr}`, ...prev]);
    console.log(`[${timestamp}] ${message}`, data || '');
  };

  const handleLogin = async () => {
    try {
      log(`⏳ A tentar login com ${email}...`);
      const res = await api.login({ email, password });
      log('✅ Login Sucesso!', res);
    } catch (error: any) {
      log('❌ Erro no Login:', error.message);
    }
  };

  const handleRegister = async () => {
    try {
      log(`⏳ A registar utilizador ${newUsername}...`);
      // Usa uma password fixa para teste, ou cria um campo se preferires
      const res = await api.register({ 
        username: newUsername, 
        email: newEmail, 
        password: 'pvaz' 
      });
      log('✅ Registo Sucesso! Podes fazer login agora.', res);
    } catch (error: any) {
      log('❌ Erro no Registo:', error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      log('👋 Logout feito.');
    } catch (error: any) {
      log('❌ Erro Logout:', error.message);
    }
  };

  const handleGetRatings = async () => {
    try {
      const res = await api.getMyRatings();
      log('⭐ Minhas Avaliações:', res);
    } catch (error: any) {
      log('❌ Erro ao buscar avaliações (Estás logado?):', error.message);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', border: '2px dashed #333', marginBottom: '20px' }}>
      <h2>🛠️ Área de Testes da API (V2)</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        
        {/* Coluna 1: Login */}
        <div style={{ border: '1px solid #ccc', padding: '10px', backgroundColor: '#fff' }}>
          <h3>🔑 Testar Login</h3>
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ display: 'block', marginBottom: '5px', width: '90%' }} />
          <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ display: 'block', marginBottom: '5px', width: '90%' }} />
          <button onClick={handleLogin} style={{ backgroundColor: '#4CAF50', color: 'white' }}>Entrar</button>
          <button onClick={handleLogout} style={{ marginLeft: '5px', backgroundColor: '#f44336', color: 'white' }}>Sair</button>
        </div>

        {/* Coluna 2: Registo */}
        <div style={{ border: '1px solid #ccc', padding: '10px', backgroundColor: '#fff' }}>
          <h3>📝 Testar Registo</h3>
          <input placeholder="Novo Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} style={{ display: 'block', marginBottom: '5px', width: '90%' }} />
          <input placeholder="Novo Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} style={{ display: 'block', marginBottom: '5px', width: '90%' }} />
          <button onClick={handleRegister} style={{ backgroundColor: '#2196F3', color: 'white' }}>Criar Conta</button>
          <small style={{ display: 'block', marginTop: '5px' }}>(Password será: PasswordTeste123)</small>
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <button onClick={handleGetRatings}>Testar "Meus Ratings"</button>
      </div>

      <div style={{ backgroundColor: '#1e1e1e', color: '#00ff00', padding: '10px', borderRadius: '5px', height: '200px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px' }}>
        {logs.length === 0 ? <p>// Resultados aparecem aqui...</p> : logs.map((l, i) => (
          <div key={i} style={{ borderBottom: '1px solid #333', padding: '5px 0', whiteSpace: 'pre-wrap' }}>{l}</div>
        ))}
      </div>
    </div>
  );
}