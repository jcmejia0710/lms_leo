import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Calendar, Edit3, MessageSquare, FileText, CheckSquare, PlusCircle, ArrowLeft, FileVideo, ExternalLink } from 'lucide-react';

const CourseDetail = () => {
  const { id } = useParams();
  const { perfil, rolNombre } = useAuth();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [forums, setForums] = useState([]);
  const [entregas, setEntregas] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('modules');
  const [showAddModule, setShowAddModule] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newlyCreatedIds, setNewlyCreatedIds] = useState(new Set());
  const [newModule, setNewModule] = useState({ titulo: '', descripcion: '' });
  const [newTask, setNewTask] = useState({ titulo: '', instrucciones: '', puntaje_maximo: 100, fecha_entrega: '' });
  
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [taskViews, setTaskViews] = useState([]);
  const [allDeliveries, setAllDeliveries] = useState([]);
  const [showTracking, setShowTracking] = useState(null); // id_tarea para mostrar seguimiento

  const isTeacher = rolNombre === 'docente' || rolNombre === 'administrador';

  const fetchAll = async () => {
    try {
      setLoading(true);
      
      // Ejecutar consultas independientes en paralelo con manejo de errores individual
      const [cRes, mRes, tRes, qRes, fRes] = await Promise.all([
        supabase.from('cursos').select('*, perfiles!cursos_id_creador_fkey(nombres, apellidos), categorias_curso(nombre)').eq('id_curso', id).single(),
        supabase.from('modulos').select('*, materiales(*)').eq('id_curso', id).order('orden'),
        supabase.from('tareas').select('*').eq('id_curso', id),
        supabase.from('cuestionarios').select('*').eq('id_curso', id),
        supabase.from('foros').select('*, perfiles!foros_id_creador_fkey(nombres, apellidos)').eq('id_curso', id)
      ]);

      if (cRes.error) console.error('Error fetching course:', cRes.error);
      if (cRes.data) setCourse(cRes.data);
      if (mRes.data) setModules(mRes.data);
      
      const t = tRes.data || [];
      setTasks(t);
      if (qRes.data) setQuizzes(qRes.data);
      if (fRes.data) setForums(fRes.data);

      if (perfil) {
        if (rolNombre === 'estudiante') {
          const { data: e } = await supabase.from('entregas').select('id_tarea').eq('id_estudiante', perfil.id_usuario);
          if (e) setEntregas(new Set(e.map(x => x.id_tarea)));
        } else if (isTeacher) {
          // Consultas secundarias del docente en paralelo
          const teacherQueries = [
            supabase.from('inscripciones').select('*, perfiles(nombres, apellidos, id_usuario)').eq('id_curso', id)
          ];
          
          if (t.length > 0) {
            const taskIds = t.map(x => x.id_tarea);
            teacherQueries.push(supabase.from('vistas_tareas').select('*').in('id_tarea', taskIds));
            teacherQueries.push(supabase.from('entregas').select('*').in('id_tarea', taskIds));
          }

          const teacherRes = await Promise.all(teacherQueries.map(q => q.catch(e => ({ error: e, data: null }))));
          
          if (teacherRes[0]?.data) setEnrolledStudents(teacherRes[0].data.map(x => x.perfiles).filter(Boolean));
          
          if (t.length > 0) {
            if (teacherRes[1]?.data) setTaskViews(teacherRes[1].data);
            if (teacherRes[2]?.data) setAllDeliveries(teacherRes[2].data);
          }
        }
      }
    } catch (err) {
      console.error('CRITICAL ERROR in fetchAll:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, perfil?.id_usuario, rolNombre]);

  const handleAddModule = async (e) => {
    e.preventDefault();
    const nextOrder = modules.length + 1;
    const { data: m, error } = await supabase.from('modulos').insert({ 
      id_curso: id, 
      titulo: newModule.titulo, 
      descripcion: newModule.descripcion, 
      orden: nextOrder 
    }).select();
    if (!error) { 
      setShowAddModule(false); 
      setNewModule({ titulo: '', descripcion: '' }); 
      if (m?.[0]) setNewlyCreatedIds(prev => new Set([...prev, m[0].id_modulo]));
      fetchAll(); 
      alert(`✅ ¡Módulo "${newModule.titulo}" creado con éxito!`);
    } else {
      alert('Error al crear módulo: ' + error.message);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    const { data: t, error } = await supabase.from('tareas').insert({
      id_curso: id, id_creador: perfil.id_usuario, titulo: newTask.titulo,
      instrucciones: newTask.instrucciones, puntaje_maximo: newTask.puntaje_maximo,
      fecha_entrega: newTask.fecha_entrega || null, estado: 'activo'
    }).select();
    if (!error) { 
      setShowAddTask(false); 
      setNewTask({ titulo: '', instrucciones: '', puntaje_maximo: 100, fecha_entrega: '' }); 
      if (t?.[0]) {
        setNewlyCreatedIds(prev => new Set([...prev, t[0].id_tarea]));
        setTimeout(() => {
          setNewlyCreatedIds(prev => {
            const n = new Set(prev);
            n.delete(t[0].id_tarea);
            return n;
          });
        }, 10000);
      }
      fetchAll(); 
      alert(`✅ ¡Tarea "${newTask.titulo}" creada con éxito!`);
    }
    else alert('Error al crear tarea: ' + error.message);
  };

  const handleAddForum = async () => {
    const titulo = prompt('Título del foro:');
    if (!titulo) return;
    const descripcion = prompt('Descripción:') || '';
    await supabase.from('foros').insert({ id_curso: id, id_creador: perfil.id_usuario, titulo, descripcion });
    fetchAll();
  };

  if (loading) return <div className="loading-spinner"></div>;
  if (!course) return <div style={{ padding: '2rem' }}>Curso no encontrado.</div>;

  const tabs = [
    { key: 'modules', icon: <BookOpen size={16} />, label: 'Módulos' },
    { key: 'tasks', icon: <Edit3 size={16} />, label: `Tareas (${tasks.length})` },
    { key: 'quizzes', icon: <CheckSquare size={16} />, label: `Evaluaciones (${quizzes.length})` },
    { key: 'forum', icon: <MessageSquare size={16} />, label: `Foro (${forums.length})` },
  ];

  return (
    <div>
      {/* Header del curso */}
      <div className="glass-card" style={{ marginBottom: '2rem', overflow: 'hidden' }}>
        <div style={{ height: '8px', background: 'linear-gradient(90deg, var(--primary-color), var(--secondary-color))', margin: '-1.5rem -1.5rem 1.5rem' }}></div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen size={40} color="rgba(255,255,255,0.8)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-primary">{course.codigo}</span>
              <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--secondary-color)' }}>{course.categorias_curso?.nombre}</span>
              <span className="badge badge-success">{course.estado}</span>
            </div>
            <h1 style={{ marginBottom: '0.5rem', fontSize: '1.6rem' }}>{course.nombre}</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.6 }}>{course.descripcion}</p>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <BookOpen size={14} /> Docente: {course.perfiles?.nombres} {course.perfiles?.apellidos}
              </span>
              {course.fecha_inicio && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={14} /> {new Date(course.fecha_inicio).toLocaleDateString()} – {course.fecha_fin ? new Date(course.fecha_fin).toLocaleDateString() : 'Sin fecha fin'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Módulos */}
      {activeTab === 'modules' && (
        <div>
          {isTeacher && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button className="btn btn-primary" onClick={() => setShowAddModule(true)}>
                <PlusCircle size={16} />Agregar Módulo
              </button>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {modules.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                <BookOpen size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                <h3>Sin módulos aún</h3>
                {isTeacher && <p style={{ color: 'var(--text-muted)' }}>Agrega el primer módulo del curso.</p>}
              </div>
            ) : modules.map((mod, i) => (
              <div key={mod.id_modulo} className="glass-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '0.9rem', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {mod.titulo}
                      {newlyCreatedIds.has(mod.id_modulo) && <span className="badge badge-success" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>NUEVO</span>}
                    </h3>
                    {mod.descripcion && <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0', fontSize: '0.9rem' }}>{mod.descripcion}</p>}
                  </div>
                </div>
                <div style={{ borderLeft: '3px solid var(--border-color)', paddingLeft: '1rem' }}>
                  {mod.materiales?.length > 0 ? mod.materiales.map(mat => (
                    <div key={mat.id_material} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid var(--border-color)' }}>
                      <FileText size={16} color="var(--primary-color)" style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: '0.9rem' }}>{mat.titulo}</span>
                      {mat.url_recurso && <a href={mat.url_recurso} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}><ExternalLink size={12} />Ver</a>}
                    </div>
                  )) : <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay materiales en este módulo.</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Modal Agregar Módulo */}
          {showAddModule && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div className="glass-card" style={{ width: '100%', maxWidth: '480px', margin: '1rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Nuevo Módulo</h3>
                <form onSubmit={handleAddModule}>
                  <div className="form-group"><label>Título *</label><input className="form-control" required value={newModule.titulo} onChange={e => setNewModule(p => ({ ...p, titulo: e.target.value }))} /></div>
                  <div className="form-group"><label>Descripción</label><textarea className="form-control" rows={3} value={newModule.descripcion} onChange={e => setNewModule(p => ({ ...p, descripcion: e.target.value }))} /></div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Crear</button>
                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModule(false)}>Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tareas */}
      {activeTab === 'tasks' && (
        <div>
          {isTeacher && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button className="btn btn-primary" onClick={() => setShowAddTask(true)}>
                <PlusCircle size={16} />Nueva Tarea
              </button>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {tasks.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                <Edit3 size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                <h3>Sin tareas publicadas</h3>
              </div>
            ) : tasks.map(task => {
              const entregada = (rolNombre === 'estudiante' && entregas instanceof Set) ? entregas.has(task.id_tarea) : false;
              const viewsCount = taskViews.filter(v => v.id_tarea === task.id_tarea).length;
              const subCount = allDeliveries.filter(d => d.id_tarea === task.id_tarea).length;
              const daysLeft = task.fecha_entrega ? Math.ceil((new Date(task.fecha_entrega) - new Date()) / 86400000) : null;
              
              return (
                <div key={task.id_tarea} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {task.titulo}
                        {newlyCreatedIds.has(task.id_tarea) && <span className="badge badge-success" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>NUEVO</span>}
                      </h4>
                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span>🏆 {task.puntaje_maximo} pts</span>
                        {task.fecha_entrega && (
                          <span style={{ color: daysLeft !== null && daysLeft < 2 ? '#ef4444' : 'inherit' }}>
                            📅 {new Date(task.fecha_entrega).toLocaleDateString()}
                          </span>
                        )}
                        {isTeacher && (
                          <>
                            <span style={{ color: 'var(--secondary-color)' }}>👀 {viewsCount} vistos</span>
                            <span style={{ color: '#10b981' }}>📤 {subCount} entregados</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {rolNombre === 'estudiante' && entregada && (
                        <span style={{ color: '#10b981', fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckSquare size={14} /> Entregada
                        </span>
                      )}
                      
                      {isTeacher ? (
                        <button className="btn btn-secondary" onClick={() => setShowTracking(showTracking === task.id_tarea ? null : task.id_tarea)}>
                          {showTracking === task.id_tarea ? 'Ocultar Seguimiento' : 'Ver Seguimiento'}
                        </button>
                      ) : (
                        <Link to={`/task/${task.id_tarea}`} className="btn btn-secondary">Ver Tarea</Link>
                      )}
                    </div>
                  </div>

                  {/* Detalle de Seguimiento para Docente */}
                  {isTeacher && showTracking === task.id_tarea && (
                    <div className="glass-card" style={{ marginTop: '-0.5rem', background: 'rgba(0,0,0,0.1)', padding: '1.25rem' }}>
                      <h5 style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>Estado de Alumnos Inscritos ({enrolledStudents.length})</h5>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                        {enrolledStudents.map(student => {
                          const hasViewed = taskViews.find(v => v.id_tarea === task.id_tarea && v.id_estudiante === student.id_usuario);
                          const submission = allDeliveries.find(d => d.id_tarea === task.id_tarea && d.id_estudiante === student.id_usuario);
                          
                          return (
                            <div key={student.id_usuario} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                              <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                                {student.nombres?.charAt(0)}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {student.nombres} {student.apellidos}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                                  <span style={{ color: hasViewed ? 'var(--secondary-color)' : '#9ca3af' }}>{hasViewed ? '👀 Visto' : '⭕ No visto'}</span>
                                  <span style={{ color: submission ? '#10b981' : '#9ca3af' }}>{submission ? '✅ Entregado' : '❌ Pendiente'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Modal Agregar Tarea */}
          {showAddTask && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div className="glass-card" style={{ width: '100%', maxWidth: '520px', margin: '1rem', maxHeight: '90vh', overflow: 'auto' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Nueva Tarea</h3>
                <form onSubmit={handleAddTask}>
                  <div className="form-group"><label>Título *</label><input className="form-control" required value={newTask.titulo} onChange={e => setNewTask(p => ({ ...p, titulo: e.target.value }))} placeholder="Ej: Tarea 1 - ..." /></div>
                  <div className="form-group"><label>Instrucciones</label><textarea className="form-control" rows={4} value={newTask.instrucciones} onChange={e => setNewTask(p => ({ ...p, instrucciones: e.target.value }))} placeholder="Describe qué deben hacer los estudiantes..." /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group"><label>Puntaje Máximo</label><input className="form-control" type="number" min="1" value={newTask.puntaje_maximo} onChange={e => setNewTask(p => ({ ...p, puntaje_maximo: e.target.value }))} /></div>
                    <div className="form-group"><label>Fecha de Entrega</label><input className="form-control" type="datetime-local" value={newTask.fecha_entrega} onChange={e => setNewTask(p => ({ ...p, fecha_entrega: e.target.value }))} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Publicar</button>
                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddTask(false)}>Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Evaluaciones */}
      {activeTab === 'quizzes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {quizzes.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <CheckSquare size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <h3>Sin evaluaciones publicadas</h3>
            </div>
          ) : quizzes.map(quiz => (
            <div key={quiz.id_cuestionario} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--secondary-color)', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h4 style={{ marginBottom: '0.4rem' }}>{quiz.titulo}</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>{quiz.descripcion}</p>
                <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {quiz.tiempo_limite && <span>⏱ {quiz.tiempo_limite} min</span>}
                  <span>🔄 {quiz.numero_intentos || 1} intento(s)</span>
                </div>
              </div>
              <Link to={`/quiz/${quiz.id_cuestionario}`} className="btn btn-primary">Iniciar Evaluación</Link>
            </div>
          ))}
        </div>
      )}

      {/* Foro */}
      {activeTab === 'forum' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0 }}>Foros de Discusión</h2>
            <button className="btn btn-primary" onClick={handleAddForum}>
              <PlusCircle size={16} />Nuevo Tema
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {forums.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                <MessageSquare size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                <h3>Sin discusiones aún</h3>
                <p style={{ color: 'var(--text-muted)' }}>Sé el primero en iniciar un tema de discusión.</p>
              </div>
            ) : forums.map(forum => (
              <div key={forum.id_foro} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ marginBottom: '0.25rem' }}>{forum.titulo}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.3rem' }}>{forum.descripcion}</p>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Creado por: {forum.perfiles?.nombres}
                  </span>
                </div>
                <Link to={`/forum/${forum.id_foro}`} className="btn btn-secondary">Entrar al Foro</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetail;
