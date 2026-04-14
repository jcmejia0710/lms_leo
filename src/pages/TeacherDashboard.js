import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Book, Edit, Users, ClipboardList, Star } from 'lucide-react';

const TeacherDashboard = () => {
  const { perfil, rolNombre } = useAuth();
  const navigate = useNavigate();
  const [myCourses, setMyCourses] = useState([]);
  const [pendingEntregas, setPendingEntregas] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [taskViews, setTaskViews] = useState([]);
  const [allDeliveriesCount, setAllDeliveriesCount] = useState([]);
  const [tab, setTab] = useState('cursos');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nombre: '', codigo: '', descripcion: '' });
  const [saving, setSaving] = useState(false);
  const [newlyCreatedIds, setNewlyCreatedIds] = useState(new Set());

  useEffect(() => {
    if (rolNombre && rolNombre === 'estudiante') navigate('/dashboard');
    else if (perfil) fetchAll();
  }, [perfil, rolNombre]);

  const fetchData = async () => {
    // Cursos
    const { data: c } = await supabase.from('cursos').select('*, categorias_curso(nombre), inscripciones(count)').eq('id_creador', perfil.id_usuario);
    if (c) {
      setMyCourses(c.map(course => ({
        ...course,
        is_new: newlyCreatedIds.has(course.id_curso)
      })));
    }

    const courseIds = (c || []).map(x => x.id_curso);
    if (courseIds.length > 0) {
      // Tareas
      const { data: t } = await supabase.from('tareas').select('*, curso:id_curso(nombre)').in('id_curso', courseIds);
      if (t) {
        setMyTasks(t.map(task => ({
          ...task,
          is_new: newlyCreatedIds.has(task.id_tarea)
        })));

        // Inscripciones para tracking
        const { data: ins } = await supabase.from('inscripciones').select('id_curso, id_estudiante').in('id_curso', courseIds);
        if (ins) setEnrolledStudents(ins);

        // Vistas
        const taskIds = t.map(x => x.id_tarea);
        if (taskIds.length > 0) {
          const { data: v } = await supabase.from('vistas_tareas').select('*').in('id_tarea', taskIds);
          if (v) setTaskViews(v);

          const { data: dAll } = await supabase.from('entregas').select('id_tarea, id_estudiante').in('id_tarea', taskIds);
          if (dAll) setAllDeliveriesCount(dAll);
        }

        // Entregas Pendientes
        const { data: ent } = await supabase.from('entregas').select('*, tareas(titulo, id_curso, curso:id_curso(nombre)), perfiles!entregas_id_estudiante_fkey(nombres, apellidos)').in('tareas.id_curso', courseIds).eq('estado_revision', 'pendiente');
        if (ent) setPendingEntregas(ent.filter(e => e.tareas !== null));
      }
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    await fetchData();
    setLoading(false);
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.codigo) return;
    setSaving(true);
    const { data: cat } = await supabase.from('categorias_curso').select('id_categoria').limit(1).single();
    const { error } = await supabase.from('cursos').insert({
      nombre: form.nombre,
      codigo: form.codigo,
      descripcion: form.descripcion,
      id_creador: perfil.id_usuario,
      id_categoria: cat?.id_categoria,
      estado: 'activo',
      fecha_inicio: new Date().toISOString().split('T')[0],
    });
    if (error) alert('Error: ' + (error.message || 'Código duplicado'));
    else { 
      setShowModal(false); 
      setForm({ nombre: '', codigo: '', descripcion: '' }); 
      await fetchAll();
      alert(`¡Curso "${form.nombre}" creado con éxito!`);
    }
    setSaving(false);
  };

  const handleGrade = async (entregaId, puntaje, feedback) => {
    await supabase.from('calificaciones_tareas').upsert({
      id_entrega: entregaId,
      puntaje_obtenido: parseFloat(puntaje),
      retroalimentacion: feedback,
      id_docente: perfil.id_usuario,
    });
    await supabase.from('entregas').update({ estado_revision: 'revisado' }).eq('id_entrega', entregaId);
    fetchAll();
  };

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Portal del Docente</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Gestiona tus cursos, contenidos y calificaciones</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <PlusCircle size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Nuevo Curso
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button onClick={() => setTab('cursos')} className={`btn ${tab === 'cursos' ? 'btn-primary' : 'btn-secondary'}`} style={{ border: 'none' }}>
          <Book size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Mis Cursos ({myCourses.length})
        </button>
        <button onClick={() => setTab('entregas')} className={`btn ${tab === 'entregas' ? 'btn-primary' : 'btn-secondary'}`} style={{ border: 'none' }}>
          <ClipboardList size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          Revisar Entregas
          {pendingEntregas.length > 0 && (
            <span style={{ marginLeft: '0.5rem', background: 'var(--accent-color)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
              {pendingEntregas.length}
            </span>
          )}
        </button>
        <button onClick={() => setTab('tareas')} className={`btn ${tab === 'tareas' ? 'btn-primary' : 'btn-secondary'}`} style={{ border: 'none' }}>
          <Edit size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Mis Tareas ({myTasks.length})
        </button>
      </div>

      {/* Cursos */}
      {tab === 'cursos' && (
        <div className="grid">
          {myCourses.length === 0 ? (
            <div className="glass-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem' }}>
              <Book size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <h3>No tienes cursos creados</h3>
              <p style={{ color: 'var(--text-muted)' }}>Haz clic en "Nuevo Curso" para crear tu primer curso</p>
            </div>
          ) : myCourses.map(c => (
            <div key={c.id_curso} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Book size={24} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>{c.nombre}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.codigo} · {c.categorias_curso?.nombre}</span>
                </div>
              </div>
              <p style={{ color: 'var(--text-muted)', flex: 1, fontSize: '0.9rem', marginBottom: '1rem' }}>{c.descripcion}</p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ padding: '0.2rem 0.75rem', borderRadius: '20px', background: c.estado === 'activo' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: c.estado === 'activo' ? '#10b981' : '#ef4444', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {c.estado}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>👥 {enrolledStudents.filter(s => s.id_curso === c.id_curso).length} alumnos</span>
                {c.is_new && <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>NUEVO</span>}
              </div>
              <Link to={`/courses/${c.id_curso}`} className="btn btn-primary" style={{ textAlign: 'center' }}>
                <Edit size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Editar Contenido
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Mis Tareas */}
      {tab === 'tareas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {myTasks.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <h3>No has creado tareas</h3>
            </div>
          ) : myTasks.map(task => {
            const vCount = taskViews.filter(v => v.id_tarea === task.id_tarea).length;
            const sCount = allDeliveriesCount.filter(d => d.id_tarea === task.id_tarea).length;
            const totalStudents = enrolledStudents.filter(s => s.id_curso === task.id_curso).length;
            
            return (
              <div key={task.id_tarea} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0 }}>{task.titulo}</h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Curso: {task.curso?.nombre}
                    {task.is_new && <span className="badge badge-success" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>NUEVO</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--secondary-color)' }}>{vCount}/{totalStudents}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Visto</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#10b981' }}>{sCount}/{totalStudents}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Enviado</div>
                  </div>
                  <Link to={`/courses/${task.id_curso}`} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
                    Ver en Curso
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Revisar Entregas */}
      {tab === 'entregas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pendingEntregas.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <Star size={48} color="#10b981" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ color: '#10b981' }}>¡Todo al día!</h3>
              <p style={{ color: 'var(--text-muted)' }}>No hay entregas pendientes de revisión</p>
            </div>
          ) : pendingEntregas.map(ent => (
            <EntregaCard key={ent.id_entrega} entrega={ent} onGrade={handleGrade} />
          ))}
        </div>
      )}

      {/* Modal Nuevo Curso */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', margin: '1rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Crear Nuevo Curso</h2>
            <form onSubmit={handleCreateCourse}>
              <div className="form-group">
                <label>Nombre del Curso *</label>
                <input className="form-control" required value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Introducción a Python" />
              </div>
              <div className="form-group">
                <label>Código Único *</label>
                <input className="form-control" required value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value.toUpperCase() }))} placeholder="Ej: PYT-101" />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea className="form-control" rows={3} value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Describe de qué trata el curso..." />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'Guardando...' : 'Crear Curso'}</button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-componente para calificar entregas
const EntregaCard = ({ entrega, onGrade }) => {
  const [puntaje, setPuntaje] = useState('');
  const [feedback, setFeedback] = useState('');
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h4 style={{ marginBottom: '0.25rem' }}>{entrega.tareas?.titulo}</h4>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Estudiante: <strong>{entrega.perfiles?.nombres} {entrega.perfiles?.apellidos}</strong> | Curso: {entrega.tareas?.cursos?.nombre}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Enviado: {new Date(entrega.fecha_envio).toLocaleString()}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(!open)} style={{ whiteSpace: 'nowrap' }}>
          {open ? 'Cerrar' : '📝 Revisar'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius)' }}>
          {entrega.texto_entrega && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Texto enviado:</strong>
              <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', color: 'var(--text-color)' }}>{entrega.texto_entrega}</p>
            </div>
          )}
          {entrega.enlace_entrega && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Enlace:</strong> <a href={entrega.enlace_entrega} target="_blank" rel="noreferrer">{entrega.enlace_entrega}</a>
            </div>
          )}
          {entrega.archivo_url && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Archivo:</strong> <a href={entrega.archivo_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>Ver Archivo</a>
            </div>
          )}
          <hr style={{ borderColor: 'var(--border-color)', margin: '1rem 0' }} />
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0, flex: 1 }}>
              <label>Calificación (0-100)</label>
              <input type="number" className="form-control" min="0" max="100" value={puntaje} onChange={e => setPuntaje(e.target.value)} placeholder="Ej: 85" />
            </div>
            <div className="form-group" style={{ margin: 0, flex: 2 }}>
              <label>Retroalimentación</label>
              <input type="text" className="form-control" value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Comentarios para el estudiante..." />
            </div>
            <button className="btn btn-primary" onClick={() => onGrade(entrega.id_entrega, puntaje, feedback)} disabled={!puntaje}>
              Guardar Nota
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
