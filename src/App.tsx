import { useEffect, useState } from 'react';
import { 
  RefreshCcw, Leaf, X, MessageCircle, Calendar, 
  Search, LayoutDashboard, Users, Settings, LogOut, 
  Filter, UserPlus, AlertCircle, TrendingUp, CalendarDays
} from 'lucide-react';
import { supabase } from './supabase';
import './index.css';

// v1.3.0 - Multi-Module CRM (Dashboard, Kanban, Appointments, Users)
interface Lead {
  id: string;
  phone: string;
  name: string;
  status: string;
  last_message: string;
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
}

const STATUSES = [
  { id: 'novo_lead', label: 'Novo Lead', color: 'var(--status-novo)' },
  { id: 'em_atendimento', label: 'Em Atendimento', color: 'var(--status-atendimento)' },
  { id: 'qualificado', label: 'Qualificado', color: 'var(--status-qualificado)' },
  { id: 'reuniao_marcada', label: 'Agendado', color: 'var(--status-reuniao)' },
  { id: 'concluido', label: 'Concluído', color: 'var(--status-concluido)' }
];

function App() {
  const [activeTab, setActiveTab] = useState('kanban'); // dashboard, kanban, appointments, users
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [schedulingLead, setSchedulingLead] = useState<Lead | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
    if (session) fetchLeads();
  }, [session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError('Credenciais inválidas.');
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleDrop = async (id: string, statusId: string) => {
    const previousLeads = [...leads];
    setLeads(leads.map(lead => 
      lead.id === id ? { ...lead, status: statusId, updated_at: new Date().toISOString() } : lead
    ));

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: statusId, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      setLeads(previousLeads);
      alert("Erro ao atualizar status.");
    }
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${name}, tudo bem? Estou entrando em contato para darmos continuidade ao seu atendimento.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
  };

  const filteredLeads = leads.filter(lead => 
    lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    lead.phone?.includes(searchTerm)
  );

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'novo_lead').length,
    inProgress: leads.filter(l => l.status === 'em_atendimento').length,
    scheduled: leads.filter(l => l.scheduled_at).length,
    concluded: leads.filter(l => l.status === 'concluido').length,
    today: leads.filter(l => {
      if (!l.scheduled_at) return false;
      const today = new Date().toISOString().split('T')[0];
      return l.scheduled_at.startsWith(today);
    }).length
  };

  if (authLoading) return <div className="login-wrap">Sincronizando Ayuv CRM...</div>;

  if (!session) {
    return (
      <div className="login-wrap">
        <div className="login-box">
          <div className="logo-box" style={{ margin: '0 auto 1.5rem auto' }}>
            <Leaf size={24} />
          </div>
          <h2>Ayuv CRM v1.3</h2>
          <p>Gestão Inteligente de Atendimentos</p>
          <form onSubmit={handleLogin}>
            {authError && <div className="auth-error">{authError}</div>}
            <div className="form-group">
              <label>Usuário (E-mail)</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ex: diretor@ayuv.com" required />
            </div>
            <div className="form-group">
              <label>Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Entrar no Painel</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="logo-area">
          <div className="logo-box">
            <Leaf size={20} />
          </div>
          <span className="logo-text">Ayuv CRM</span>
        </div>
        
        <nav className="nav-links">
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} /> Dashboards
          </div>
          <div 
            className={`nav-item ${activeTab === 'kanban' ? 'active' : ''}`}
            onClick={() => setActiveTab('kanban')}
          >
            <TrendingUp size={18} /> Funil de Vendas
          </div>
          <div 
            className={`nav-item ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            <CalendarDays size={18} /> Agendamentos
          </div>
          <div 
            className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={18} /> Time / Usuários
          </div>
          <div className="nav-item" onClick={() => setActiveTab('settings')}>
            <Settings size={18} /> Configurações
          </div>
        </nav>

        <div className="sidebar-footer">
          <div style={{ marginBottom: '1rem', padding: '0 1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>LOGADO COMO</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {session.user.email}
            </div>
          </div>
          <button className="nav-item" style={{ width: '100%', border: 'none', background: 'none' }} onClick={handleLogout}>
            <LogOut size={18} /> Sair com Segurança
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div className="search-bar">
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Pesquisar leads, telefones..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="header-actions">
            <button className="btn-secondary" onClick={fetchLeads}>
              <RefreshCcw size={16} className={loading ? 'spin' : ''} />
            </button>
            <button className="btn-primary" onClick={() => setActiveTab('kanban')}>
              Novo Lead Manual
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div style={{ padding: '2rem', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem', fontFamily: 'var(--font-title)' }}>Performance do CRM</h2>
            <div className="metrics-row" style={{ padding: 0, border: 'none', marginBottom: '2rem' }}>
              <div className="metric-card">
                <span className="metric-label">Conversão Finalizada</span>
                <span className="metric-value">{stats.concluded}</span>
                <div style={{ fontSize: '0.7rem', color: 'var(--brand-primary)' }}>+12% este mês</div>
              </div>
              <div className="metric-card">
                <span className="metric-label">Em Atendimento</span>
                <span className="metric-value">{stats.inProgress}</span>
                <div style={{ fontSize: '0.7rem', color: 'var(--status-atendimento)' }}>{Math.round((stats.inProgress/stats.total)*100)}% do volume</div>
              </div>
              <div className="metric-card">
                <span className="metric-label">Pendentes / Novos</span>
                <span className="metric-value">{stats.new}</span>
                <div style={{ fontSize: '0.7rem', color: 'var(--status-novo)' }}>Aguardando ação</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="metric-card" style={{ height: '300px' }}>
                <span className="metric-label">Volume por Status</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '1rem', padding: '1rem 0' }}>
                  {STATUSES.map(s => {
                    const count = leads.filter(l => l.status === s.id).length;
                    const height = stats.total > 0 ? (count / stats.total) * 100 : 0;
                    return (
                      <div key={s.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '100%', height: `${height}%`, minHeight: '4px', background: s.color, borderRadius: '4px 4px 0 0' }}></div>
                        <span style={{ fontSize: '0.6rem', fontWeight: 600, textAlign: 'center' }}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="metric-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="metric-label">Atividades Recentes</span>
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {leads.slice(0, 5).map(l => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUSES.find(s => s.id === l.status)?.color }}></div>
                      <span style={{ fontWeight: 600 }}>{l.name || 'Sem Nome'}</span>
                      <span style={{ color: 'var(--text-muted)' }}>entrou em {STATUSES.find(s => s.id === l.status)?.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kanban' && (
          <>
            <section className="metrics-row">
              <div className="metric-card">
                <span className="metric-label">Agendados Hoje</span>
                <span className="metric-value">{stats.today}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Total no Funil</span>
                <span className="metric-value">{stats.total}</span>
              </div>
            </section>
            <div className="board-wrapper">
              {STATUSES.map(status => {
                const columnLeads = filteredLeads.filter(l => l.status === status.id);
                return (
                  <div key={status.id} className="column" onDragOver={e => e.preventDefault()} onDrop={e => {
                    e.preventDefault();
                    if (draggedLeadId) handleDrop(draggedLeadId, status.id);
                  }}>
                    <div className="column-header">
                      <div className="column-title">
                        <div className="column-dot" style={{ backgroundColor: status.color }}></div>
                        {status.label}
                      </div>
                      <span className="count-badge">{columnLeads.length}</span>
                    </div>
                    <div className="cards-container">
                      {columnLeads.map(lead => (
                        <div key={lead.id} className="lead-card" draggable onDragStart={() => setDraggedLeadId(lead.id)} onClick={() => setSelectedLead(lead)}>
                          <div className="card-top">
                            <span className="lead-name">{lead.name || 'Sem Nome'}</span>
                            <span className="lead-phone">{lead.phone}</span>
                          </div>
                          <p className="lead-msg">{lead.last_message || 'Lead pendente de contato...'}</p>
                          {lead.scheduled_at && (
                            <div className="lead-schedule">
                              <Calendar size={12} /> {formatDate(lead.scheduled_at)}
                            </div>
                          )}
                          <div className="card-actions-row" onClick={e => e.stopPropagation()}>
                            <button className="mini-btn wa" onClick={() => handleWhatsApp(lead.phone, lead.name)}>
                              <MessageCircle size={14} /> WhatsApp
                            </button>
                            <button className="mini-btn sc" onClick={() => setSchedulingLead(lead)}>
                              <Calendar size={14} /> Agendar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'appointments' && (
          <div style={{ padding: '2rem', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontFamily: 'var(--font-title)' }}>Agenda de Atendimentos</h2>
              <div className="btn-secondary" style={{ display: 'flex', gap: '0.5rem' }}>
                <Filter size={16} /> Todos os Períodos
              </div>
            </div>
            
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#f8fafc', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <tr>
                    <th style={{ padding: '1rem' }}>LEAD</th>
                    <th style={{ padding: '1rem' }}>DATA / HORA</th>
                    <th style={{ padding: '1rem' }}>STATUS ATUAL</th>
                    <th style={{ padding: '1rem' }}>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.filter(l => l.scheduled_at).sort((a,b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime()).map(l => (
                    <tr key={l.id} style={{ borderTop: '1px solid #f1f5f9', fontSize: '0.9rem' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600 }}>{l.name || 'Sem Nome'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.phone}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand-primary)', fontWeight: 600 }}>
                          <Calendar size={14} /> {formatDate(l.scheduled_at!)}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className="count-badge" style={{ background: STATUSES.find(s => s.id === l.status)?.color + '20', color: STATUSES.find(s => s.id === l.status)?.color }}>
                          {STATUSES.find(s => s.id === l.status)?.label}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="mini-btn wa" onClick={() => handleWhatsApp(l.phone, l.name)}>WhatsApp</button>
                          <button className="mini-btn" onClick={() => setSelectedLead(l)}>Detalhes</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontFamily: 'var(--font-title)' }}>Time e Usuários</h2>
              <button className="btn-primary">
                <UserPlus size={18} /> Novo Usuário
              </button>
            </div>
            
            <div className="metric-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
              <div className="logo-box" style={{ width: 60, height: 60, fontSize: '1.5rem' }}>W</div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>William Barbosa (Admin)</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{session.user.email}</div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span className="count-badge" style={{ background: '#f0fdf4', color: '#16a34a' }}>Ativo agora</span>
                  <span className="count-badge">Proprietário</span>
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '2rem', padding: '2rem', border: '1px dashed var(--border-subtle)', borderRadius: 16, textAlign: 'center' }}>
              <AlertCircle size={32} style={{ color: 'var(--text-light)', marginBottom: '1rem' }} />
              <div style={{ fontWeight: 600 }}>Gestão de Time Avançada</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0.5rem auto' }}>
                Para adicionar mais vendedores e limitar o que cada um vê, você precisará configurar o módulo de Permissions no Supabase.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Details Modal */}
      {selectedLead && (
        <div className="modal-overlay" onClick={() => setSelectedLead(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Prontuário do Lead</h2>
              <button className="modal-close" onClick={() => setSelectedLead(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="metric-card" style={{ flex: 1, textAlign: 'center' }}>
                  <span className="metric-label">Status Atual</span>
                  <div style={{ fontWeight: 700, color: STATUSES.find(s => s.id === selectedLead.status)?.color }}>
                    {STATUSES.find(s => s.id === selectedLead.status)?.label}
                  </div>
                </div>
                <div className="metric-card" style={{ flex: 1, textAlign: 'center' }}>
                  <span className="metric-label">Agendamento</span>
                  <div style={{ fontWeight: 700 }}>{selectedLead.scheduled_at ? formatDate(selectedLead.scheduled_at) : 'Nenhum'}</div>
                </div>
              </div>
              <div className="form-group">
                <label>Nome do Contato</label>
                <div className="btn-secondary" style={{ padding: '0.75rem', cursor: 'default' }}>{selectedLead.name || 'Pendente'}</div>
              </div>
              <div className="form-group">
                <label>Número do WhatsApp</label>
                <div className="btn-secondary" style={{ padding: '0.75rem', cursor: 'default' }}>{selectedLead.phone}</div>
              </div>
              <div className="form-group">
                <label>Histórico da Conversa (IA)</label>
                <div style={{ maxHeight: '150px', overflowY: 'auto', padding: '1rem', background: '#f8fafc', borderRadius: 8, fontSize: '0.9rem', border: '1px solid #e2e8f0' }}>
                  {selectedLead.last_message || 'Aguardando primeira interação...'}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedLead(null)}>Fechar</button>
              <button className="btn-primary" onClick={() => handleWhatsApp(selectedLead.phone, selectedLead.name)}>
                <MessageCircle size={18} /> Chamar no WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {schedulingLead && (
        <div className="modal-overlay" onClick={() => setSchedulingLead(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Novo Agendamento</h2>
              <button className="modal-close" onClick={() => setSchedulingLead(null)}><X size={20} /></button>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              if (schedulingLead && scheduleDate) {
                supabase.from('leads').update({ 
                  scheduled_at: new Date(scheduleDate).toISOString(),
                  updated_at: new Date().toISOString() 
                }).eq('id', schedulingLead.id).then(() => {
                  setSchedulingLead(null);
                  setScheduleDate('');
                  fetchLeads();
                });
              }
            }}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Data e Hora do Atendimento</label>
                  <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setSchedulingLead(null)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar na Agenda</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
