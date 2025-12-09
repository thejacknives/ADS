// src/components/ApiTester.tsx
import { useState } from 'react';
import { api } from '../services/api';

export function ApiTester() {
  const [logs, setLogs] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', border: '2px dashed #333' }}>
      <h2>🛠️ Área de Testes da API</h2>
      <div style={{ marginBottom: '15px' }}>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ marginRight: '5px' }} />
        <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ marginRight: '5px' }} />
        <button onClick={handleLogin}>Testar Login</button>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={handleGetRatings}>Testar "Meus Ratings"</button>
        <button onClick={handleLogout} style={{ backgroundColor: '#ffcccc' }}>Testar Logout</button>
      </div>
      <div style={{ backgroundColor: '#1e1e1e', color: '#00ff00', padding: '10px', borderRadius: '5px', height: '300px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px' }}>
        {logs.length === 0 ? <p>// Resultados aparecem aqui...</p> : logs.map((l, i) => (
          <div key={i} style={{ borderBottom: '1px solid #333', padding: '5px 0', whiteSpace: 'pre-wrap' }}>{l}</div>
        ))}
      </div>
    </div>
  );
}