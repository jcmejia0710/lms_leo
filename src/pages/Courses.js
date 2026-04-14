import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Search, Filter, Star, Clock, Users, PlusCircle } from 'lucide-react';

const COLORS = [
  'linear-gradient(135deg, #4f46e5, #7c3aed)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f43f5e, #e11d48)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #06b6d4, #0891b2)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
];

const Courses = () => {
  const { perfil, rolNombre } = useAuth();
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [myOnly, setMyOnly] = useState(false);
  const [inscritosIds, setInscritosIds] = useState(new Set());
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({ 
    nombre: '', 
    codigo: '', 
    descripcion: '', 
    id_categoria: '',
    fecha_inicio: '',
    fecha_fin: ''
  });

  const isTeacher = rolNombre === 'docente' || rolNombre === 'administrador';

  useEffect(() => {
    fetchData();
  }, [perfil]);

  const fetchData = async () => {
    setLoading(true);

    const { data: cats } = await supabase.from('categorias_curso').select('*');
    if (cats) setCategories(cats);

    const { data: c } = await supabase
      .from('cursos')
      .select('*, categorias_curso(nombre), perfiles!cursos_id_creador_fkey(nombres, apellidos)')
      .eq('estado', 'activo')
      .order('nombre');
    if (c) setCourses(c);

    // IDs donde está inscrito
    if (perfil && rolNombre === 'estudiante') {
      const { data: ins } = await supabase
        .from('inscripciones')
        .select('id_curso')
        .eq('id_estudiante', perfil.id_usuario);
      if (ins) setInscritosIds(new Set(ins.map(i => i.id_curso)));
    }

    setLoading(false);
  };

  const handleInscribirse = async (courseId, e) => {
    e.preventDefault();
    if (!perfil) return;
    const { error } = await supabase.from('inscripciones').insert({
      id_curso: courseId, id_estudiante: perfil.id_usuario, estado: 'activo'
    });
    if (!error) setInscritosIds(prev => new Set([...prev, courseId]));
    else alert('Ya estás inscrito en este curso.');
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!perfil) return;
    
    const { error } = await supabase.from('cursos').insert({
      ...newCourse,
      id_creador: perfil.id_usuario,
      estado: 'activo'
    });

    if (!error) {
      setShowAddCourse(false);
      setNewCourse({ nombre: '', codigo: '', descripcion: '', id_categoria: '', fecha_inicio: '', fecha_fin: '' });
      fetchData();
    } else {
      alert('Error al crear curso: ' + error.message);
    }
  };

  const filtered = courses.filter(c => {
    const matchSearch = c.nombre.toLowerCase().includes(search.toLowerCase()) ||
                        c.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
                        c.codigo?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCat || c.id_categoria === selectedCat;
    const matchMy = !myOnly || (rolNombre === 'estudiante' ? inscritosIds.has(c.id_curso) : c.id_creador === perfil?.id_usuario);
    return matchSearch && matchCat && matchMy;
  });

  return (
    <div>
      {/* Búsqueda y filtros */}
      <div className="glass-card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-control" style={{ paddingLeft: '2.5rem', margin: 0 }}
            placeholder="Buscar cursos por nombre, código..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <select className="form-control" style={{ width: 'auto', minWidth: '160px' }}
          value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
        </select>

        <button onClick={() => setMyOnly(!myOnly)}
          className={`btn ${myOnly ? 'btn-primary' : 'btn-secondary'}`}>
          <Filter size={15} />
          {rolNombre === 'estudiante' ? 'Mis cursos' : 'Mis creaciones'}
        </button>

        {isTeacher && (
          <button onClick={() => setShowAddCourse(true)} className="btn btn-primary" style={{ background: 'linear-gradient(90deg, var(--secondary-color), #059668)' }}>
            <PlusCircle size={16} /> Nuevo Curso
          </button>
        )}
      </div>

      {/* Resultados */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0 }}>
          {myOnly ? (rolNombre === 'estudiante' ? 'Mis Cursos Inscritos' : 'Mis Cursos Creados') : 'Catálogo de Cursos'}
        </h2>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? <div className="loading-spinner"></div> : (
        <div className="grid">
          {filtered.length === 0 ? (
            <div className="glass-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem' }}>
              <BookOpen size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <h3>No se encontraron cursos</h3>
              <p style={{ color: 'var(--text-muted)' }}>Prueba con otros términos de búsqueda o cambia los filtros.</p>
            </div>
          ) : filtered.map((course, i) => {
            const inscrito = inscritosIds.has(course.id_curso);
            const color = COLORS[i % COLORS.length];
            return (
              <Link to={`/courses/${course.id_curso}`} key={course.id_curso} className="glass-card course-card" style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit', position: 'relative' }}>
                {/* Banner */}
                <div className="course-banner" style={{ background: color }}>
                  <BookOpen size={48} color="rgba(255,255,255,0.3)" />
                  {inscrito && (
                    <span style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(16,185,129,0.9)', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', padding: '0.2rem 0.5rem', borderRadius: '20px' }}>
                      ✓ Inscrito
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{course.codigo}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{course.categorias_curso?.nombre}</span>
                  </div>

                  <h3 style={{ marginBottom: '0.5rem', fontSize: '1.05rem' }}>{course.nombre}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {course.descripcion || 'Sin descripción disponible.'}
                  </p>

                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Users size={13} /> {course.perfiles?.nombres}
                    </span>
                    {rolNombre === 'estudiante' && !inscrito && (
                      <button onClick={e => handleInscribirse(course.id_curso, e)} className="btn btn-primary" style={{ padding: '0.35rem 0.875rem', fontSize: '0.8rem' }}>
                        Inscribirme
                      </button>
                    )}
                    {inscrito && <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '600' }}>✅ En progreso</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Modal Agregar Curso */}
      {showAddCourse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PlusCircle size={20} color="var(--primary-color)" /> Nuevo Curso
            </h3>
            <form onSubmit={handleCreateCourse}>
              <div className="form-group">
                <label>Nombre del Curso *</label>
                <input className="form-control" required value={newCourse.nombre} onChange={e => setNewCourse(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Matemáticas Avanzadas" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Código *</label>
                  <input className="form-control" required value={newCourse.codigo} onChange={e => setNewCourse(p => ({ ...p, codigo: e.target.value }))} placeholder="MAT-101" />
                </div>
                <div className="form-group">
                  <label>Categoría *</label>
                  <select className="form-control" required value={newCourse.id_categoria} onChange={e => setNewCourse(p => ({ ...p, id_categoria: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    {categories.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea className="form-control" rows={3} value={newCourse.descripcion} onChange={e => setNewCourse(p => ({ ...p, descripcion: e.target.value }))} placeholder="Breve descripción del curso..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Fecha Inicio</label>
                  <input className="form-control" type="date" value={newCourse.fecha_inicio} onChange={e => setNewCourse(p => ({ ...p, fecha_inicio: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Fecha Fin</label>
                  <input className="form-control" type="date" value={newCourse.fecha_fin} onChange={e => setNewCourse(p => ({ ...p, fecha_fin: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Crear Curso</button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddCourse(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;
