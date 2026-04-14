import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, Shield, CheckCircle, XCircle, Edit2 } from 'lucide-react';

const AdminPanel = () => {
  const { perfil, rolNombre } = useAuth();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [roles, setRoles] = useState([]);
  const [tab, setTab] = useState('usuarios');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [newRolId, setNewRolId] = useState('');

  useEffect(() => {
    if (rolNombre && rolNombre !== 'administrador') navigate('/dashboard');
    else fetchAll();
  }, [rolNombre]);

  const fetchAll = async () => {
    setLoading(true);
    const { data: u } = await supabase
      .from('perfiles')
      .select('*, roles(nombre)')
      .order('nombres');
    if (u) setUsuarios(u);

    const { data: c } = await supabase
      .from('cursos')
      .select('*, perfiles!cursos_id_creador_fkey(nombres, apellidos), categorias_curso(nombre)')
      .order('nombre');
    if (c) setCursos(c);

    const { data: r } = await supabase.from('roles').select('*');
    if (r) setRoles(r);

    setLoading(false);
  };

  const handleChangeRol = async (idUsuario) => {
    if (!newRolId) return;
    await supabase.from('perfiles').update({ id_rol: newRolId }).eq('id_usuario', idUsuario);
    setEditingUser(null);
    setNewRolId('');
    fetchAll();
  };

  const handleToggleCurso = async (curso) => {
    const nuevoEstado = curso.estado === 'activo' ? 'inactivo' : 'activo';
    await supabase.from('cursos').update({ estado: nuevoEstado }).eq('id_curso', curso.id_curso);
    fetchAll();
  };

  const getRolColor = (nombre) => {
    const map = { administrador: '#ef4444', docente: '#10b981', estudiante: 'var(--primary-color)' };
    return map[nombre] || '#888';
  };

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Shield size={32} color="var(--accent-color)" />
        <div>
          <h1 style={{ margin: 0 }}>Panel de Administración</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Gestión de usuarios y cursos del sistema</p>
        </div>
      </div>

      {/* Métricas rápidas */}
      <div className="grid-metrics" style={{ marginBottom: '2rem' }}>
        <div className="glass-card metric-card">
          <div className="metric-icon"><Users size={24} /></div>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Usuarios Totales</div>
            <div className="metric-value">{usuarios.length}</div>
          </div>
        </div>
        <div className="glass-card metric-card">
          <div className="metric-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><BookOpen size={24} /></div>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Cursos Activos</div>
            <div className="metric-value">{cursos.filter(c => c.estado === 'activo').length}</div>
          </div>
        </div>
        <div className="glass-card metric-card">
          <div className="metric-icon" style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--accent-color)' }}><Shield size={24} /></div>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Administradores</div>
            <div className="metric-value">{usuarios.filter(u => u.roles?.nombre === 'administrador').length}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button onClick={() => setTab('usuarios')} className={`btn ${tab === 'usuarios' ? 'btn-primary' : 'btn-secondary'}`} style={{ border: 'none' }}>
          <Users size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Usuarios ({usuarios.length})
        </button>
        <button onClick={() => setTab('cursos')} className={`btn ${tab === 'cursos' ? 'btn-primary' : 'btn-secondary'}`} style={{ border: 'none' }}>
          <BookOpen size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Cursos ({cursos.length})
        </button>
      </div>

      {/* Usuarios */}
      {tab === 'usuarios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {usuarios.map(u => (
            <div key={u.id_usuario} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem' }}>
              <div className="avatar" style={{ width: '44px', height: '44px', fontSize: '1rem', flexShrink: 0 }}>
                {u.nombres?.charAt(0)}{u.apellidos?.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>{u.nombres} {u.apellidos}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID: {u.id_usuario.slice(0, 8)}…</div>
              </div>
              <span style={{ padding: '0.2rem 0.75rem', borderRadius: '20px', background: `${getRolColor(u.roles?.nombre)}22`, color: getRolColor(u.roles?.nombre), fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'capitalize' }}>
                {u.roles?.nombre || 'sin rol'}
              </span>
              {editingUser === u.id_usuario ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select value={newRolId} onChange={e => setNewRolId(e.target.value)}
                    style={{ padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-color)' }}>
                    <option value="">Seleccionar rol...</option>
                    {roles.map(r => <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>)}
                  </select>
                  <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem' }} onClick={() => handleChangeRol(u.id_usuario)}>Guardar</button>
                  <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem' }} onClick={() => setEditingUser(null)}>✖</button>
                </div>
              ) : (
                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem' }} onClick={() => { setEditingUser(u.id_usuario); setNewRolId(''); }}>
                  <Edit2 size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />Rol
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cursos */}
      {tab === 'cursos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
            <button className="btn btn-primary" onClick={() => navigate('/courses')}>
              <BookOpen size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> Administrar en Catálogo
            </button>
          </div>
          {cursos.map(c => (
            <div key={c.id_curso} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>{c.nombre}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Código: {c.codigo} | Docente: {c.perfiles?.nombres} {c.perfiles?.apellidos} | Categoría: {c.categorias_curso?.nombre}
                </div>
              </div>
              <span style={{ padding: '0.2rem 0.75rem', borderRadius: '20px', background: c.estado === 'activo' ? 'rgba(16,185,129,0.15)' : 'rgba(156,163,175,0.15)', color: c.estado === 'activo' ? '#10b981' : '#9ca3af', fontSize: '0.8rem', fontWeight: 'bold' }}>
                {c.estado}
              </span>
              <button
                onClick={() => handleToggleCurso(c)}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.75rem' }}
                title={c.estado === 'activo' ? 'Desactivar' : 'Activar'}
              >
                {c.estado === 'activo' ? <XCircle size={16} color="#ef4444" /> : <CheckCircle size={16} color="#10b981" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
