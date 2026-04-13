import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, BookOpen, Users, Settings, Moon, Sun, Award, ChevronRight, Bell, Shield } from 'lucide-react';

const Layout = () => {
  const { perfil, rolNombre, logout } = useAuth();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { setDarkMode(true); document.documentElement.setAttribute('data-theme', 'dark'); }
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) { document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme', 'light'); }
  };

  const handleLogout = async () => { try { await logout(); } catch (e) { console.error(e); } };

  if (!perfil) return <Navigate to="/login" replace />;

  const isTeacher = rolNombre === 'docente' || rolNombre === 'administrador';
  const isAdmin = rolNombre === 'administrador';

  const navLink = (to, icon, label, extra) => {
    const active = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));
    return (
      <Link to={to} className={`nav-link ${active ? 'active' : ''}`} style={extra}>
        {icon} <span>{label}</span>
      </Link>
    );
  };

  const getRolColor = () => {
    if (rolNombre === 'administrador') return '#ef4444';
    if (rolNombre === 'docente') return '#10b981';
    return 'var(--primary-color)';
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar glass">
        <div className="sidebar-logo">
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen color="white" size={20} />
          </div>
          <span style={{ fontWeight: '800', fontSize: '1.2rem', background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LMS LEO</span>
        </div>

        {/* Perfil del usuario */}
        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius)', margin: '0 0 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '1rem', flexShrink: 0, border: `2px solid ${getRolColor()}` }}>
              {perfil.nombres?.charAt(0)}{perfil.apellidos?.charAt(0)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{perfil.nombres} {perfil.apellidos}</div>
              <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: '20px', background: `${getRolColor()}22`, color: getRolColor(), fontWeight: 'bold', textTransform: 'capitalize' }}>
                {rolNombre}
              </span>
            </div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0.5rem 0', paddingLeft: '0.75rem' }}>Principal</div>
          {navLink('/dashboard', <LayoutDashboard size={18} />, 'Dashboard')}
          {navLink('/courses', <BookOpen size={18} />, 'Cursos')}
          {rolNombre === 'estudiante' && navLink('/grades', <Award size={18} />, 'Mis Calificaciones')}

          {isTeacher && (
            <>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0.75rem 0 0.25rem', paddingLeft: '0.75rem' }}>Docente</div>
              {navLink('/teacher', <Users size={18} />, 'Portal Docente', { borderLeft: `3px solid ${getRolColor()}`, background: `${getRolColor()}10` })}
            </>
          )}

          {isAdmin && (
            <>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0.75rem 0 0.25rem', paddingLeft: '0.75rem' }}>Administración</div>
              {navLink('/admin', <Shield size={18} />, 'Panel Admin', { borderLeft: '3px solid #ef4444', background: 'rgba(239,68,68,0.08)' })}
            </>
          )}
        </nav>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navLink('/settings', <Settings size={18} />, 'Configuración')}
          <button className="nav-link" onClick={handleLogout} style={{ width: '100%', textAlign: 'left', color: '#ef4444' }}>
            <LogOut size={18} /> <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar glass-card" style={{ padding: '0.75rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: '600' }}>
              {location.pathname === '/dashboard' ? `Bienvenido, ${perfil.nombres} 👋` :
               location.pathname === '/courses' ? '📚 Catálogo de Cursos' :
               location.pathname.startsWith('/courses/') ? '📖 Detalle del Curso' :
               location.pathname.startsWith('/forum/') ? '💬 Foro de Discusión' :
               location.pathname.startsWith('/task/') ? '📝 Detalle de Tarea' :
               location.pathname.startsWith('/quiz/') ? '📋 Evaluación' :
               location.pathname === '/grades' ? '🏆 Mis Calificaciones' :
               location.pathname === '/teacher' ? '👩‍🏫 Portal Docente' :
               location.pathname === '/admin' ? '🛡️ Panel de Administración' :
               location.pathname === '/settings' ? '⚙️ Configuración' : 'LMS LEO'}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="theme-toggle" onClick={toggleTheme} title={darkMode ? 'Modo claro' : 'Modo oscuro'}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
