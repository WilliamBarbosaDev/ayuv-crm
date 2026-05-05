import { useEffect, useState } from 'react';
import { 
  RefreshCcw, X, MessageCircle, Calendar, 
  Search, LayoutDashboard, Users, LogOut, 
  UserPlus, TrendingUp, CalendarDays,
  Plus, Trash2, Phone, User as UserIcon
} from 'lucide-react';
import { supabase } from './supabase';
import './index.css';
import logo from './assets/logo.png';

// v1.3.2 - Official Branding (Logo Integration)
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
  const [activeTab, setActiveTab] = useState('kanban');
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
  
  // New Lead State
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [newLeadData, setNewLeadData] = useState({ name: '', phone: '', status: 'novo_lead', last_message: '' });

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
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase
        .from('leads')
        .insert([{
          ...newLeadData,
          updated_at: new Date().toISOString()
        }]);
      
      if (error) throw error;
      
      setShowNewLeadModal(false);
      setNewLeadData({ name: '', phone: '', status: 'novo_lead', last_message: '' });
      fetchLeads();
    } catch (err) {
      alert("Erro ao criar lead. Verifique se o telefone é único.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lead?")) return;
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
      fetchLeads();
      setSelectedLead(null);
    } catch (err) {
      alert("Erro ao excluir lead.");
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingLead || !scheduleDate) return;
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          scheduled_at: new Date(scheduleDate).toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', schedulingLead.id);
      if (error) throw error;
      setSchedulingLead(null);
      setScheduleDate('');
      fetchLeads();
    } catch (err) {
      alert("Erro ao agendar.");
    }
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${name}, tudo bem? Vi seu interesse e gostaria de conversar.`);
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
          <div style={{ margin: '0 auto 1.5rem auto', display: 'flex', justifyContent: 'center' }}>
            <img src={logo} alt="Ayuv Logo" style={{ height: '60px', width: 'auto', objectFit: 'contain' }} />
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
          <img src={logo} alt="Ayuv Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
          <span className="logo-text">Ayuv CRM</span>
        </div>
        
        <nav className="nav-links">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={18} /> Dashboards
          </div>
          <div className={`nav-item ${activeTab === 'kanban' ? 'active' : ''}`} onClick={() => setActiveTab('kanban')}>
            <TrendingUp size={18} /> Funil de Vendas
          </div>
          <div className={`nav-item ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>
            <CalendarDays size={18} /> Agendamentos
          </div>
          <div className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <Users size={18} /> Time / Usuários
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
            <button className="btn-secondary" onClick={fetchLeads} title="Atualizar dados">
              <RefreshCcw size={16} className={loading ? 'spin' : ''} />
            </button>
            <button className="btn-primary" onClick={() => setShowNewLeadModal(true)}>
              <Plus size={18} /> Novo Lead
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
              </div>
              <div className="metric-card">
                <span className="metric-label">Em Atendimento</span>
                <span className="metric-value">{stats.inProgress}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Novos Leads</span>
                <span className="metric-value">{stats.new}</span>
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
                        <div style={{ width: '100%', height: `${height}%`, minHeight: '4px', background: s.color, borderRadius: '4px 4px 0 0', transition: 'height 1s ease' }}></div>
                        <span style={{ fontSize: '0.6rem', fontWeight: 600, textAlign: 'center' }}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="metric-card">
                <span className="metric-label">Atividades Recentes</span>
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {leads.slice(0, 8).map(l => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUSES.find(s => s.id === l.status)?.color }}></div>
                      <span style={{ fontWeight: 600 }}>{l.name || 'Sem Nome'}</span>
                      <span style={{ color: 'var(--text-muted)' }}>em {STATUSES.find(s => s.id === l.status)?.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kanban' && (
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
                        <p className="lead-msg">{lead.last_message || 'Aguardando contato...'}</p>
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
        )}

        {activeTab === 'appointments' && (
          <div style={{ padding: '2rem', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '2rem', fontFamily: 'var(--font-title)' }}>Agenda de Atendimentos</h2>
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#f8fafc', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <tr>
                    <th style={{ padding: '1rem' }}>LEAD</th>
                    <th style={{ padding: '1rem' }}>DATA / HORA</th>
                    <th style={{ padding: '1rem' }}>STATUS</th>
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
                  {leads.filter(l => l.scheduled_at).length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum atendimento agendado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontFamily: 'var(--font-title)' }}>Time e Colaboradores</h2>
              <button className="btn-primary"><UserPlus size={18} /> Novo Usuário</button>
            </div>
            <div className="metric-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
              <div className="logo-box" style={{ width: 60, height: 60, fontSize: '1.5rem' }}>{session.user.email.charAt(0).toUpperCase()}</div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Administrador</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{session.user.email}</div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span className="count-badge" style={{ background: '#f0fdf4', color: '#16a34a' }}>Sessão Ativa</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals Section */}
      {showNewLeadModal && (
        <div className="modal-overlay" onClick={() => setShowNewLeadModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Novo Lead Manual</h2>
              <button className="modal-close" onClick={() => setShowNewLeadModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateLead}>
              <div className="modal-body">
                <div className="form-group">
                  <label><UserIcon size={14} /> Nome do Lead</label>
                  <input type="text" value={newLeadData.name} onChange={e => setNewLeadData({...newLeadData, name: e.target.value})} placeholder="Ex: João Silva" required />
                </div>
                <div className="form-group">
                  <label><Phone size={14} /> Telefone / WhatsApp</label>
                  <input type="text" value={newLeadData.phone} onChange={e => setNewLeadData({...newLeadData, phone: e.target.value})} placeholder="Ex: 11999999999" required />
                </div>
                <div className="form-group">
                  <label>Status Inicial</label>
                  <select value={newLeadData.status} onChange={e => setNewLeadData({...newLeadData, status: e.target.value})}>
                    {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowNewLeadModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Criando...' : 'Cadastrar Lead'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedLead && (
        <div className="modal-overlay" onClick={() => setSelectedLead(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Prontuário do Lead</h2>
              <button className="modal-close" onClick={() => setSelectedLead(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Nome</label><div className="btn-secondary" style={{ padding: '0.75rem' }}>{selectedLead.name || 'Pendente'}</div></div>
              <div className="form-group"><label>WhatsApp</label><div className="btn-secondary" style={{ padding: '0.75rem' }}>{selectedLead.phone}</div></div>
              <div className="form-group"><label>Última Mensagem</label><div style={{ padding: '1rem', background: '#f8fafc', borderRadius: 8, fontSize: '0.9rem', border: '1px solid #e2e8f0' }}>{selectedLead.last_message || 'Aguardando interação...'}</div></div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button className="btn-secondary" style={{ color: '#ef4444', borderColor: '#fecaca' }} onClick={() => handleDeleteLead(selectedLead.id)}>
                <Trash2 size={16} /> Excluir Lead
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-secondary" onClick={() => setSelectedLead(null)}>Fechar</button>
                <button className="btn-primary" onClick={() => handleWhatsApp(selectedLead.phone, selectedLead.name)}><MessageCircle size={18} /> Chamar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {schedulingLead && (
        <div className="modal-overlay" onClick={() => setSchedulingLead(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Agendar Atendimento</h2>
              <button className="modal-close" onClick={() => setSchedulingLead(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSchedule}>
              <div className="modal-body">
                <div className="form-group"><label>Data e Hora</label><input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} required /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setSchedulingLead(null)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar Agenda</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
