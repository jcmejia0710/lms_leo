import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, CheckCircle, Clock, MessageSquare, Award, Bell, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { perfil, rolNombre } = useAuth();
  const [quote, setQuote] = useState({ text: '', author: '' });
  const [stats, setStats] = useState({ courses: 0, tasks: 0, pending: 0, quizzes: 0 });
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // API Externa: Frases Motivacionales (usando una que devuelva en español si es posible, o una lista local robusta)
    const frasesEspanol = [
      { text: "La educación es el arma más poderosa que puedes usar para cambiar el mundo.", author: "Nelson Mandela" },
      { text: "Lo que con mucho trabajo se adquiere, más se ama.", author: "Aristóteles" },
      { text: "Cree en ti mismo y en lo que eres. Sé consciente de que hay algo dentro de ti que es más grande que cualquier obstáculo.", author: "Christian D. Larson" },
      { text: "El aprendizaje es un tesoro que seguirá a su dueño a todas partes.", author: "Proverbio chino" },
      { text: "Nunca consideres el estudio como una obligación, sino como una oportunidad para penetrar en el bello y maravilloso mundo del saber.", author: "Albert Einstein" },
      { text: "Tus talentos y habilidades mejorarán con el tiempo, pero para eso debes empezar.", author: "Martin Luther King" }
    ];
    
    // Intento de fetch a una cita aleatoria (si falla o es inglés, usamos la lista en español)
    fetch('https://dummyjson.com/quotes/random')
      .then(r => r.json())
      .then(d => {
        // Como dummyjson suele estar en inglés, preferimos nuestra lista cuidada para asegurar calidad en español
        const randomEspanol = frasesEspanol[Math.floor(Math.random() * frasesEspanol.length)];
        setQuote(randomEspanol);
      })
      .catch(() => {
        const randomEspanol = frasesEspanol[Math.floor(Math.random() * frasesEspanol.length)];
        setQuote(randomEspanol);
      });

    if (perfil) fetchDashboardData();
  }, [perfil]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (rolNombre === 'estudiante') {
        // Cursos inscritos
        const { count: cursosCount } = await supabase
          .from('inscripciones').select('*', { count: 'exact', head: true }).eq('id_estudiante', perfil.id_usuario);

        // Tareas entregadas
        const { count: tareasCount } = await supabase
          .from('entregas').select('*', { count: 'exact', head: true }).eq('id_estudiante', perfil.id_usuario);

        // Cuestionarios
        const { count: quizCount } = await supabase
          .from('intentos_cuestionario').select('*', { count: 'exact', head: true }).eq('id_estudiante', perfil.id_usuario);

        // Tareas próximas a vencer en mis cursos
        const { data: inscrData } = await supabase
          .from('inscripciones').select('id_curso').eq('id_estudiante', perfil.id_usuario);
        
        const courseIds = (inscrData || []).map(i => i.id_curso);
        
        let upcoming = [];
        if (courseIds.length > 0) {
          const now = new Date().toISOString();
          const { data: tData } = await supabase
            .from('tareas')
            .select('*, curso:id_curso(nombre)')
            .in('id_curso', courseIds)
            .gte('fecha_entrega', now)
            .order('fecha_entrega', { ascending: true })
            .limit(5);
          if (tData) upcoming = tData;
        }

        setStats({ courses: cursosCount || 0, tasks: tareasCount || 0, pending: upcoming.length, quizzes: quizCount || 0 });
        setUpcomingTasks(upcoming);

      } else if (rolNombre === 'docente') {
        const { count: cursosCount } = await supabase
          .from('cursos').select('*', { count: 'exact', head: true }).eq('id_creador', perfil.id_usuario);
        const { count: pendingCount } = await supabase
          .from('entregas').select('*', { count: 'exact', head: true }).eq('estado_revision', 'pendiente');

        setStats({ courses: cursosCount || 0, tasks: 0, pending: pendingCount || 0, quizzes: 0 });
      } else {
        // Admin
        const { count: cursosCount } = await supabase.from('cursos').select('*', { count: 'exact', head: true });
        const { count: usersCount } = await supabase.from('perfiles').select('*', { count: 'exact', head: true });
        setStats({ courses: cursosCount || 0, tasks: usersCount || 0, pending: 0, quizzes: 0 });
      }

      // Mensajes recientes del foro
      const { data: msgs } = await supabase
        .from('mensajes_foro')
        .select('*, perfiles(nombres), foros(titulo)')
        .order('fecha_publicacion', { ascending: false })
        .limit(4);
      if (msgs) setRecentMessages(msgs);

    } catch (err) {
      console.error('Dashboard error:', err);
    }
    setLoading(false);
  };

  const daysUntil = (dateStr) => {
    const diff = new Date(dateStr) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div>
      {/* Frase Motivacional */}
      <div className="glass-card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--primary-color)', background: 'linear-gradient(135deg, rgba(79,70,229,0.08), rgba(16,185,129,0.05))' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>💡 Inspiración del día</div>
        <p style={{ fontStyle: 'italic', fontSize: '1.1rem', margin: '0 0 0.5rem', lineHeight: 1.6 }}>"{quote.text || 'Cargando...'}"</p>
        <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--primary-color)' }}>— {quote.author}</div>
      </div>

      <h2 style={{ marginBottom: '1.5rem' }}>
        {rolNombre === 'administrador' ? '🛡️ Resumen del Sistema' : rolNombre === 'docente' ? '👨‍🏫 Mi Panel Docente' : '🎓 Mi Actividad Académica'}
      </h2>

      {/* Métricas */}
      <div className="grid-metrics" style={{ marginBottom: '2rem' }}>
        <div className="glass-card metric-card">
          <div className="metric-icon"><BookOpen size={24} /></div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {rolNombre === 'estudiante' ? 'Cursos Inscritos' : rolNombre === 'docente' ? 'Cursos Creados' : 'Total Cursos'}
            </div>
            <div className="metric-value">{stats.courses}</div>
          </div>
        </div>
        <div className="glass-card metric-card">
          <div className="metric-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><CheckCircle size={24} /></div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {rolNombre === 'estudiante' ? 'Tareas Entregadas' : rolNombre === 'administrador' ? 'Total Usuarios' : 'Entregas Revisadas'}
            </div>
            <div className="metric-value">{stats.tasks}</div>
          </div>
        </div>
        <div className="glass-card metric-card">
          <div className="metric-icon" style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--accent-color)' }}><Clock size={24} /></div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {rolNombre === 'estudiante' ? 'Tareas Próximas' : 'Entregas Pendientes'}
            </div>
            <div className="metric-value" style={{ color: stats.pending > 0 ? 'var(--accent-color)' : 'inherit' }}>{stats.pending}</div>
          </div>
        </div>
        {rolNombre === 'estudiante' && (
          <div className="glass-card metric-card">
            <div className="metric-icon" style={{ background: 'rgba(251,191,36,0.1)', color: '#f59e0b' }}><Award size={24} /></div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Evaluaciones Hechas</div>
              <div className="metric-value">{stats.quizzes}</div>
            </div>
          </div>
        )}
      </div>

      {/* Contenido divisado */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

        {/* Tareas próximas / Links rápidos */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} color="var(--accent-color)" />
            {rolNombre === 'estudiante' ? 'Próximas Entregas' : 'Acciones Rápidas'}
          </h3>
          {rolNombre === 'estudiante' ? (
            upcomingTasks.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>🎉 No tienes entregas próximas</p>
            ) : upcomingTasks.map(t => {
              const days = daysUntil(t.fecha_entrega);
              return (
                <Link key={t.id_tarea} to={`/task/${t.id_tarea}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)', textDecoration: 'none', color: 'inherit' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{t.titulo}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.cursos?.nombre}</div>
                  </div>
                  <span style={{ padding: '0.2rem 0.5rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: days <= 2 ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)', color: days <= 2 ? '#ef4444' : '#f59e0b', whiteSpace: 'nowrap' }}>
                    {days === 0 ? '¡Hoy!' : `${days}d`}
                  </span>
                </Link>
              );
            })
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {rolNombre === 'docente' && (
                <>
                  <Link to="/teacher" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <BookOpen size={16} /> Ver mis Cursos
                  </Link>
                  <Link to="/teacher" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <CheckCircle size={16} /> Revisar Entregas ({stats.pending})
                  </Link>
                </>
              )}
              {rolNombre === 'administrador' && (
                <>
                  <Link to="/admin" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <BookOpen size={16} /> Gestionar Cursos
                  </Link>
                  <Link to="/admin" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <CheckCircle size={16} /> Gestionar Usuarios
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        {/* Mensajes Recientes del Foro */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={18} color="var(--secondary-color)" /> Actividad en Foros
          </h3>
          {recentMessages.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>Sin mensajes recientes</p>
          ) : recentMessages.map(msg => (
            <div key={msg.id_mensaje} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--primary-color)' }}>{msg.perfiles?.nombres}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(msg.fecha_publicacion).toLocaleDateString()}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>En: {msg.foros?.titulo}</div>
              <p style={{ margin: 0, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.contenido}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Acciones rápidas para estudiante */}
      {rolNombre === 'estudiante' && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
          <Link to="/courses" className="btn btn-primary" style={{ flex: 1, minWidth: '150px', textAlign: 'center', padding: '1rem' }}>
            📚 Ver Mis Cursos
          </Link>
          <Link to="/grades" className="btn btn-secondary" style={{ flex: 1, minWidth: '150px', textAlign: 'center', padding: '1rem' }}>
            📊 Mis Calificaciones
          </Link>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
