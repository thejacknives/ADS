import { useEffect, useState } from 'react';
import { api } from '../services/api';

// --- Interfaces ---
interface Notification {
  message: string;
  type: 'success' | 'error';
}

export function AdminDashboard() {
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- Estados de Interface (Substituem os Alerts) ---
  const [notification, setNotification] = useState<Notification | null>(null);
  
  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); // Novo modal para apagar
  
  // Dados em edição/apagar
  const [editingMovie, setEditingMovie] = useState<any>(null); 
  const [movieToDelete, setMovieToDelete] = useState<number | null>(null); // Guarda o ID para apagar
  
  const [formData, setFormData] = useState({
    title: '', genre: '', description: '', 
    year: '', director: '', poster_url: ''
  });

  // Debounce na pesquisa
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadMovies();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // --- Helper para mostrar notificações ---
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    // Remove a notificação automaticamente após 3 segundos
    setTimeout(() => setNotification(null), 3000);
  };

  const loadMovies = async () => {
    try {
      setLoading(true);
      let data;
      if (searchTerm.trim()) {
        data = await api.searchMovies({ q: searchTerm });
      } else {
        data = await api.getMovies();
      }
      setMovies(data.movies || []);
    } catch (err) {
      console.error(err);
      // Aqui não precisamos de notificação visual intrusiva, basta o log
    } finally {
      setLoading(false);
    }
  };

  // --- Lógica de Apagar (Passo 1: Abrir Modal) ---
  const handleDeleteClick = (id: number) => {
    setMovieToDelete(id);
    setIsDeleteModalOpen(true);
  };

  // --- Lógica de Apagar (Passo 2: Confirmar) ---
  const confirmDelete = async () => {
    if (!movieToDelete) return;

    try {
      await api.deleteMovie(movieToDelete);
      showNotification('Filme apagado com sucesso!', 'success');
      loadMovies();
    } catch (err: any) {
      console.error(err);
      showNotification(`Erro ao apagar: ${err.message || 'Erro desconhecido.'}`, 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setMovieToDelete(null);
    }
  };

  // --- Lógica de Editar/Criar ---
  const handleOpenModal = (movie?: any) => {
    if (movie) {
      setEditingMovie(movie);
      setFormData({
        title: movie.title, 
        genre: movie.genre, 
        description: movie.description || '',
        year: movie.year || '',
        director: movie.director || '',
        poster_url: movie.poster_url || ''
      });
    } else {
      setEditingMovie(null);
      setFormData({ title: '', genre: '', description: '', year: '', director: '', poster_url: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      if (editingMovie) {
        await api.updateMovie(editingMovie.id, formData);
        showNotification('Filme atualizado com sucesso!', 'success');
      } else {
        await api.addMovie(formData);
        showNotification('Novo filme adicionado!', 'success');
      }
      setIsModalOpen(false);
      loadMovies();
    } catch (err: any) {
      console.error(err);
      showNotification(`Erro ao guardar: ${err.message || 'Verifique os dados.'}`, 'error');
    }
  };

  return (
    <div className="admin-container">
      
      {/* --- NOTIFICAÇÃO FLUTUANTE (TOAST) --- */}
      {notification && (
        <div className={`notification-toast ${notification.type}`}>
          {notification.type === 'success' ? '✅' : '❌'} {notification.message}
        </div>
      )}

      <header className="admin-header">
        <div>
          <h2>🛠️ Painel de Admin</h2>
          <p>Gerir filmes da base de dados</p>
        </div>
        <button className="btn-add" onClick={() => handleOpenModal()}>
          + Novo Filme
        </button>
      </header>

      <div className="search-row">
        <input 
          className="search-input"
          placeholder="Pesquisar filme na base de dados..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{textAlign: 'center', marginTop: '50px', color: '#64748b'}}>
          🔄 A carregar dados...
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{width: '50px'}}>ID</th>
                <th>Filme</th>
                <th>Género</th>
                <th style={{textAlign: 'right'}}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {movies.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{textAlign: 'center', padding: '20px', color: '#94a3b8'}}>
                    {searchTerm ? `Nenhum filme encontrado para "${searchTerm}"` : 'Ainda não existem filmes.'}
                  </td>
                </tr>
              ) : (
                movies.map(m => (
                  <tr key={m.id}>
                    <td>{m.id}</td>
                    <td>
                      <strong>{m.title}</strong>
                      {m.year && <span style={{fontSize:'0.8rem', color:'#64748b', marginLeft:'5px'}}>({m.year})</span>}
                    </td>
                    <td><span className="genre-tag">{m.genre}</span></td>
                    <td style={{textAlign: 'right'}}>
                      <button className="btn-icon" onClick={() => handleOpenModal(m)}>✏️</button>
                      <button className="btn-icon delete" onClick={() => handleDeleteClick(m.id)}>🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- MODAL DE EDIÇÃO/CRIAÇÃO --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingMovie ? 'Editar Filme' : 'Adicionar Filme'}</h3>
            <form onSubmit={handleSubmit} className="modal-form">
              <input required placeholder="Título" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              
              <div className="row">
                <input required placeholder="Género" value={formData.genre} onChange={e => setFormData({...formData, genre: e.target.value})} />
                <input placeholder="Ano (Opcional)" type="number" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} />
              </div>
              
              <input placeholder="Realizador (Opcional)" value={formData.director} onChange={e => setFormData({...formData, director: e.target.value})} />
              <input placeholder="URL do Poster (Opcional)" value={formData.poster_url} onChange={e => setFormData({...formData, poster_url: e.target.value})} />
              
              <textarea placeholder="Descrição" rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-save">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE CONFIRMAÇÃO DE APAGAR --- */}
      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '400px', textAlign: 'center'}}>
            <div style={{fontSize: '3rem', marginBottom: '10px'}}>⚠️</div>
            <h3 style={{marginTop: 0}}>Tem a certeza?</h3>
            <p style={{color: '#64748b'}}>Esta ação não pode ser desfeita. O filme será removido permanentemente.</p>
            
            <div className="modal-actions" style={{justifyContent: 'center', marginTop: '20px'}}>
              <button 
                type="button" 
                className="btn-cancel" 
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn-delete-confirm"
                onClick={confirmDelete}
              >
                Sim, apagar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* --- ESTILOS DO PAINEL --- */
        .admin-container { max-width: 1000px; margin: 0 auto; padding: 20px 40px; }
        .admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .admin-header h2 { margin: 0; color: #1e293b; }
        .admin-header p { margin: 0; color: #64748b; font-size: 0.9rem; }
        
        /* Botões */
        .btn-add { background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .btn-add:hover { background: #4338ca; }
        
        .btn-delete-confirm { background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; }
        .btn-delete-confirm:hover { background: #dc2626; }

        .search-row { margin-bottom: 20px; }
        .search-input { width: 100%; max-width: 300px; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; outline: none; }
        .search-input:focus { border-color: #4f46e5; }

        /* Tabela */
        .table-wrapper { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .admin-table { width: 100%; border-collapse: collapse; }
        .admin-table th { background: #f8fafc; padding: 12px 20px; text-align: left; color: #64748b; font-size: 0.85rem; border-bottom: 1px solid #e2e8f0; }
        .admin-table td { padding: 15px 20px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .genre-tag { background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; color: #64748b; }
        
        .btn-icon { background: white; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 6px; cursor: pointer; margin-left: 8px; }
        .btn-icon:hover { background: #f8fafc; border-color: #94a3b8; }
        .btn-icon.delete:hover { background: #fef2f2; border-color: #ef4444; color: #ef4444; }

        /* Modais */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 999; }
        .modal-content { background: white; padding: 30px; border-radius: 12px; width: 500px; box-shadow: 0 20px 25px rgba(0,0,0,0.1); }
        .modal-form { display: flex; flex-direction: column; gap: 15px; margin-top: 20px; }
        .modal-form input, .modal-form textarea { padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-family: inherit; }
        .row { display: flex; gap: 10px; } .row input { flex: 1; }
        
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
        .btn-cancel { background: none; border: none; color: #64748b; cursor: pointer; font-weight: 500; }
        .btn-save { background: #16a34a; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; }
        .btn-save:hover { background: #15803d; }

        /* --- NOTIFICAÇÃO TOAST --- */
        .notification-toast {
          position: fixed; top: 20px; right: 20px; z-index: 2000;
          padding: 12px 24px; border-radius: 8px;
          color: white; font-weight: 600;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideIn 0.3s ease-out;
        }
        .notification-toast.success { background-color: #10b981; }
        .notification-toast.error { background-color: #ef4444; }

        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}