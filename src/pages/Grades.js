import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Award, CheckCircle, Clock, TrendingUp, BookOpen } from 'lucide-react';

const Grades = () => {
  const { perfil, rolNombre } = useAuth();
  const [entregas, setEntregas] = useState([]);
  const [intentos, setIntentos] = useState([]);
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('resumen');

  useEffect(() => {
    if (perfil) fetchGrades();
  }, [perfil]);

  const fetchGrades = async () => {
    setLoading(true);

    // Entregas (tareas)
    const { data: entregasData } = await supabase
      .from('entregas')
      .select('*, tareas(titulo, puntaje_maximo, cursos(nombre)), calificaciones_tareas(puntaje_obtenido, retroalimentacion)')
      .eq('id_estudiante', perfil.id_usuario)
      .order('fecha_envio', { ascending: false });

    if (entregasData) setEntregas(entregasData);

    // Intentos de cuestionarios
    const { data: intentosData } = await supabase
      .from('intentos_cuestionario')
      .select('*, cuestionarios(titulo, cursos(nombre))')
      .eq('id_estudiante', perfil.id_usuario)
      .order('fecha_inicio', { ascending: false });

    if (intentosData) setIntentos(intentosData);

    // Inscripciones
    const { data: inscrData } = await supabase
      .from('inscripciones')
      .select('*, cursos(nombre, codigo, tareas(id_tarea), cuestionarios(id_cuestionario))')
      .eq('id_estudiante', perfil.id_usuario);

    if (inscrData) setInscripciones(inscrData);

    setLoading(false);
  };

  const getPromedioEntregas = () => {
    const calificadas = entregas.filter(e => e.calificaciones_tareas?.length > 0);
    if (!calificadas.length) return null;
    const suma = calificadas.reduce((acc, e) => acc + (e.calificaciones_tareas[0]?.puntaje_obtenido || 0), 0);
    return (suma / calificadas.length).toFixed(1);
  };

  const getEstadoBadge = (estado) => {
    const estilos = {
      pendiente: { bg: 'rgba(251,191,36,0.15)', color: '#f59e0b', text: 'Pendiente revisión' },
      revisado: { bg: 'rgba(79,70,229,0.15)', color: 'var(--primary-color)', text: 'Revisado' },
      enviado: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', text: 'Enviado' },
    };
    const s = estilos[estado] || estilos.pendiente;
    return (
      <span style={{ padding: '0.2rem 0.75rem', borderRadius: '20px', background: s.bg, color: s.color, fontSize: '0.8rem', fontWeight: 'bold' }}>
        {s.text}
      </span>
    );
  };

  if (loading) return <div className="loading-spinner"></div>;

  const promedio = getPromedioEntregas();

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Mis Calificaciones y Progreso</h1>

      {/* Métricas rápidas */}
      <div className="grid-metrics" style={{ marginBottom: '2rem' }}>
        <div className="glass-card metric-card">
          <div className="metric-icon"><BookOpen size={24} /></div>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Cursos Inscritos</div>
            <div className="metric-value">{inscripciones.length}</div>
          </div>
        </div>
        <div className="glass-card metric-card">
          <div className="metric-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><CheckCircle size={24} /></div>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tareas Enviadas</div>
            <div className="metric-value">{entregas.length}</div>
          </div>
        </div>
        <div className="glass-card metric-card">
          <div className="metric-icon" style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--accent-color)' }}><TrendingUp size={24} /></div>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Evaluaciones Hechas</div>
            <div className="metric-value">{intentos.length}</div>
          </div>
        </div>
        <div className="glass-card metric-card">
          <div className="metric-icon" style={{ background: 'rgba(251,191,36,0.1)', color: '#f59e0b' }}><Award size={24} /></div>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Promedio General</div>
            <div className="metric-value">{promedio ? `${promedio}` : '—'}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {['resumen', 'tareas', 'evaluaciones'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none', textTransform: 'capitalize' }}>
            {t === 'resumen' ? '📊 Resumen' : t === 'tareas' ? '📝 Tareas' : '📋 Evaluaciones'}
          </button>
        ))}
      </div>

      {/* Tab: Resumen por curso */}
      {tab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {inscripciones.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <BookOpen size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <h3>No estás inscrito en ningún curso</h3>
            </div>
          ) : inscripciones.map(insc => {
            const tareasDelCurso = insc.cursos?.tareas?.length || 0;
            const entregasCurso = entregas.filter(e => e.tareas?.cursos?.nombre === insc.cursos?.nombre).length;
            const pct = tareasDelCurso > 0 ? Math.round((entregasCurso / tareasDelCurso) * 100) : 0;
            return (
              <div key={insc.id_inscripcion} className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ marginBottom: '0.25rem' }}>{insc.cursos?.nombre}</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Código: {insc.cursos?.codigo}</span>
                  </div>
                  <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(79,70,229,0.1)', color: 'var(--primary-color)', borderRadius: '20px', fontSize: '0.8rem' }}>
                    {pct}% completado
                  </span>
                </div>
                <div className="progress-container">
                  <div className="progress-fill" style={{ width: `${pct}%`, transition: 'width 1s ease' }}></div>
                </div>
                <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>📝 Tareas en el curso: {tareasDelCurso}</span>
                  <span>✅ Entregadas: {entregasCurso}</span>
                  <span>📋 Cuestionarios: {insc.cursos?.cuestionarios?.length || 0}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Tareas */}
      {tab === 'tareas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {entregas.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <Clock size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <h3>Aún no has entregado ninguna tarea</h3>
            </div>
          ) : entregas.map(ent => {
            const cal = ent.calificaciones_tareas?.[0];
            return (
              <div key={ent.id_entrega} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ marginBottom: '0.25rem' }}>{ent.tareas?.titulo || 'Tarea sin nombre'}</h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Curso: {ent.tareas?.cursos?.nombre} | Enviado: {new Date(ent.fecha_envio).toLocaleDateString()}
                  </div>
                  {cal?.retroalimentacion && (
                    <div style={{ padding: '0.5rem', background: 'rgba(79,70,229,0.05)', borderRadius: 'var(--radius)', fontSize: '0.85rem', borderLeft: '3px solid var(--primary-color)' }}>
                      💬 <em>{cal.retroalimentacion}</em>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', marginLeft: '1rem' }}>
                  {getEstadoBadge(ent.estado_revision)}
                  {cal && (
                    <div style={{ marginTop: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--secondary-color)' }}>
                      {cal.puntaje_obtenido}<span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/{ent.tareas?.puntaje_maximo}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Evaluaciones */}
      {tab === 'evaluaciones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {intentos.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <Award size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <h3>Aún no has respondido ninguna evaluación</h3>
            </div>
          ) : intentos.map(int => (
            <div key={int.id_intento} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ marginBottom: '0.25rem' }}>{int.cuestionarios?.titulo}</h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Curso: {int.cuestionarios?.cursos?.nombre} | Fecha: {new Date(int.fecha_inicio).toLocaleDateString()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: int.puntaje_total >= 60 ? '#10b981' : '#ef4444' }}>
                  {int.puntaje_total ?? '—'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>puntos</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Grades;
