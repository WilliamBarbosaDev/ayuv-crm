import { useEffect, useState } from 'react';
import { RefreshCcw, Leaf, X, Clock } from 'lucide-react';
import { supabase } from './supabase';
import './index.css';
// v1.0.1 - Authentication and Logout fix


interface Lead {
  id: string;
  phone: string;
  name: string;
  status: string;
  last_message: string;
  created_at: string;
  updated_at: string;
}

const STATUSES = [
  { id: 'novo_lead', label: 'Novo Lead' },
  { id: 'em_atendimento', label: 'Em Atendimento' },
  { id: 'qualificado', label: 'Qualificado' },
  { id: 'reuniao_marcada', label: 'Reunião Marcada' },
  { id: 'concluido', label: 'Concluído' }
];

function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchLeads = async () => {
    if (!session) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error("Error fetching leads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    
    fetchLeads();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          console.log('Realtime update received!', payload);
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setAuthError('E-mail ou senha incorretos.');
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLeadId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    if (!draggedLeadId) return;

    const previousLeads = [...leads];
    setLeads(leads.map(lead => 
      lead.id === draggedLeadId ? { ...lead, status: statusId, updated_at: new Date().toISOString() } : lead
    ));

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: statusId, updated_at: new Date().toISOString() })
        .eq('id', draggedLeadId);

      if (error) throw error;
    } catch (err) {
      console.error(err);
      setLeads(previousLeads);
      alert("Erro ao atualizar lead. Verifique se o RLS está configurado corretamente no Supabase para usuários autenticados.");
    }
    
    setDraggedLeadId(null);
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', { 
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
    }).format(d);
  };

  if (authLoading) {
    return <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Carregando...</div>;
  }

  if (!session) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="logo-icon" style={{ margin: '0 auto 1.5rem auto', width: '50px', height: '50px' }}>
            <Leaf size={28} />
          </div>
          <h2>Acesso ao Ayuv CRM</h2>
          <p className="login-subtitle">Entre com suas credenciais para gerenciar seus leads.</p>
          
          <form onSubmit={handleLogin}>
            {authError && <div className="auth-error">{authError}</div>}
            
            <div className="form-group">
              <label>E-mail</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha secreta"
                required
              />
            </div>
            
            <button type="submit" className="btn btn-block" disabled={authLoading}>
              {authLoading ? 'Entrando...' : 'Entrar no CRM'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header>
        <div className="logo-container">
          <div className="logo-icon">
            <Leaf size={24} />
          </div>
          <h1>Ayuv CRM</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn" onClick={fetchLeads}>
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
          <button className="btn btn-outline" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <div className="kanban-board">
        {STATUSES.map(status => {
          const columnLeads = leads.filter(l => l.status === status.id);
          
          return (
            <div 
              key={status.id} 
              className="kanban-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status.id)}
            >
              <div className="column-header">
                {status.label}
                <span className="badge">{columnLeads.length}</span>
              </div>
              
              <div className="kanban-cards">
                {columnLeads.map(lead => (
                  <div 
                    key={lead.id} 
                    className="card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <div className="card-header">
                      <span className="card-name">{lead.name || 'Sem Nome'}</span>
                      <span className="card-phone">{lead.phone}</span>
                    </div>
                    <div className="card-message">
                      {lead.last_message || 'Nenhuma mensagem.'}
                    </div>
                    <div className="card-footer">
                      <Clock size={12} /> Modificado em {formatDate(lead.updated_at)}
                    </div>
                  </div>
                ))}
                {columnLeads.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1rem 0' }}>
                    Nenhum lead
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedLead && (
        <div className="modal-overlay" onClick={() => setSelectedLead(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalhes do Lead</h2>
              <button className="modal-close" onClick={() => setSelectedLead(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-field">
                <label>Nome</label>
                <p>{selectedLead.name || 'Sem Nome'}</p>
              </div>
              <div className="modal-field">
                <label>Telefone / WhatsApp</label>
                <p>{selectedLead.phone}</p>
              </div>
              <div className="modal-field">
                <label>Última Mensagem</label>
                <p>{selectedLead.last_message || 'Nenhuma mensagem registrada.'}</p>
              </div>
              <div className="modal-field">
                <label>Status</label>
                <p>{STATUSES.find(s => s.id === selectedLead.status)?.label || selectedLead.status}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setSelectedLead(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
