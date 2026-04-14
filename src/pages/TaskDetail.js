import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Edit3, ArrowLeft, UploadCloud, CheckCircle, Link2 } from 'lucide-react';

const TaskDetail = () => {
  const { taskId } = useParams();
  const { perfil } = useAuth();
  const [task, setTask] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [calificacion, setCalificacion] = useState(null);
  const [loading, setLoading] = useState(true);

  const [textInput, setTextInput] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchData(); }, [taskId]);

  const fetchData = async () => {
    setLoading(true);
    const { data: taskData } = await supabase
      .from('tareas')
      .select('*, cursos(nombre, id_curso)')
      .eq('id_tarea', taskId)
      .single();
    if (taskData) setTask(taskData);

    const { data: subData } = await supabase
      .from('entregas')
      .select('*, calificaciones_tareas(puntaje_obtenido, retroalimentacion)')
      .eq('id_tarea', taskId)
      .eq('id_estudiante', perfil.id_usuario)
      .maybeSingle();
    if (subData) {
      setSubmission(subData);
      if (subData.calificaciones_tareas?.length > 0) setCalificacion(subData.calificaciones_tareas[0]);
    }

    // Registrar vista si es alumno
    if (perfil && perfil.id_rol !== 'id_del_docente') { // Simplificamos o usamos rolNombre
      try {
        await supabase.from('vistas_tareas').upsert({ 
          id_tarea: taskId, 
          id_estudiante: perfil.id_usuario,
          fecha_vista: new Date().toISOString()
        }, { onConflict: 'id_tarea,id_estudiante' });
      } catch (e) {
        console.error("Error al registrar vista:", e);
      }
    }

    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!textInput.trim() && !file && !linkInput.trim()) {
      setError('Debes incluir texto, un enlace o un archivo.');
      return;
    }
    setError('');
    setUploading(true);
    let fileUrl = null;

    if (file) {
      const fileExt = file.name.split('.').pop();
      const filePath = `entregas/${taskId}/${perfil.id_usuario}_${Date.now()}.${fileExt}`;
      const { error: upErr } = await supabase.storage.from('archivos_lms').upload(filePath, file);
      if (upErr) { setError('Error al subir el archivo: ' + upErr.message); setUploading(false); return; }
      const { data } = supabase.storage.from('archivos_lms').getPublicUrl(filePath);
      fileUrl = data.publicUrl;
    }

    const { error: insErr } = await supabase.from('entregas').insert({
      id_tarea: taskId,
      id_estudiante: perfil.id_usuario,
      texto_entrega: textInput || null,
      enlace_entrega: linkInput || null,
      archivo_url: fileUrl,
      estado_revision: 'pendiente'
    });

    if (insErr) setError('Error al guardar tu entrega: ' + insErr.message);
    else fetchData();
    setUploading(false);
  };

  if (loading) return <div className="loading-spinner"></div>;
  if (!task) return <div style={{ padding: '2rem' }}>Tarea no encontrada.</div>;

  const daysLeft = task.fecha_entrega ? Math.ceil((new Date(task.fecha_entrega) - new Date()) / 86400000) : null;

  return (
    <div>
      <Link to={`/courses/${task.id_curso}`} className="btn btn-secondary" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <ArrowLeft size={16} /> Volver al Curso: {task.cursos?.nombre}
      </Link>

      {/* Encabezado de la tarea */}
      <div className="glass-card" style={{ marginBottom: '2rem', borderTop: '4px solid var(--secondary-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Edit3 size={28} color="var(--secondary-color)" />
              <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{task.titulo}</h1>
            </div>
            {task.instrucciones && (
              <p style={{ color: 'var(--text-color)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{task.instrucciones}</p>
            )}
            {task.criterios && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(79,70,229,0.06)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--primary-color)' }}>
                <strong style={{ color: 'var(--primary-color)' }}>Criterios de evaluación:</strong>
                <p style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{task.criterios}</p>
              </div>
            )}
          </div>
          <div style={{ background: 'var(--bg-color)', padding: '1.25rem', borderRadius: 'var(--radius)', textAlign: 'center', minWidth: '140px' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--secondary-color)', lineHeight: 1 }}>{task.puntaje_maximo}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>puntos</div>
            {task.fecha_entrega && (
              <>
                <hr style={{ borderColor: 'var(--border-color)', margin: '0.75rem 0' }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Vence</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: daysLeft !== null && daysLeft < 3 ? '#ef4444' : 'var(--text-color)' }}>
                  {new Date(task.fecha_entrega).toLocaleDateString()}
                </div>
                {daysLeft !== null && (
                  <div style={{ fontSize: '0.75rem', color: daysLeft < 3 ? '#ef4444' : 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {daysLeft < 0 ? 'Vencida' : daysLeft === 0 ? '¡Hoy!' : `${daysLeft} días`}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Entrega */}
      <div className="glass-card">
        <h3 style={{ marginBottom: '1rem' }}>Tu Entrega</h3>
        <hr style={{ borderColor: 'var(--border-color)', marginBottom: '1.5rem' }} />

        {submission ? (
          <div>
            <div style={{ padding: '1.5rem', background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--radius)', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center', marginBottom: '1.5rem' }}>
              <CheckCircle size={40} color="#10b981" style={{ marginBottom: '0.75rem' }} />
              <h3 style={{ margin: '0 0 0.5rem', color: '#10b981' }}>Entrega enviada</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Enviada el {new Date(submission.fecha_envio).toLocaleString()}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {submission.texto_entrega && (
                <div className="glass-card" style={{ padding: '1rem', background: 'rgba(0,0,0,0.15)' }}>
                  <strong>📝 Texto enviado:</strong>
                  <p style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap' }}>{submission.texto_entrega}</p>
                </div>
              )}
              {submission.enlace_entrega && (
                <div className="glass-card" style={{ padding: '1rem', background: 'rgba(0,0,0,0.15)' }}>
                  <strong>🔗 Enlace:</strong> <a href={submission.enlace_entrega} target="_blank" rel="noreferrer">{submission.enlace_entrega}</a>
                </div>
              )}
              {submission.archivo_url && (
                <div className="glass-card" style={{ padding: '1rem', background: 'rgba(0,0,0,0.15)' }}>
                  <strong>📁 Archivo adjunto:</strong>
                  <div style={{ marginTop: '0.5rem' }}>
                    <a href={submission.archivo_url} target="_blank" rel="noreferrer" className="btn btn-secondary">Ver archivo</a>
                  </div>
                </div>
              )}
            </div>

            {calificacion ? (
              <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(79,70,229,0.08)', borderRadius: 'var(--radius)', border: '1px solid rgba(79,70,229,0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--primary-color)', lineHeight: 1 }}>{calificacion.puntaje_obtenido}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>de {task.puntaje_maximo} puntos</div>
                {calificacion.retroalimentacion && (
                  <div style={{ marginTop: '1rem', fontStyle: 'italic', color: 'var(--text-color)' }}>
                    💬 "{calificacion.retroalimentacion}"
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(251,191,36,0.08)', borderRadius: 'var(--radius)', textAlign: 'center', color: '#f59e0b' }}>
                ⏳ En espera de calificación del docente
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius)', color: '#ef4444', marginBottom: '1.5rem', border: '1px solid rgba(239,68,68,0.3)' }}>⚠️ {error}</div>}

            <div className="form-group">
              <label>✏️ Texto de respuesta</label>
              <textarea className="form-control" rows={4} placeholder="Escribe tu respuesta..." value={textInput} onChange={e => setTextInput(e.target.value)} />
            </div>

            <div className="form-group">
              <label><Link2 size={14} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />Enlace (URL de drive, GitHub, etc.)</label>
              <input className="form-control" type="url" placeholder="https://..." value={linkInput} onChange={e => setLinkInput(e.target.value)} />
            </div>

            <div className="form-group">
              <label><UploadCloud size={16} style={{ verticalAlign: 'middle', marginRight: '0.4rem', color: 'var(--secondary-color)' }} />Archivo adjunto (PDF, DOCX, ZIP, JPG)</label>
              <div 
                style={{ 
                  border: '2px dashed var(--secondary-color)', 
                  padding: '3rem 2rem', 
                  textAlign: 'center', 
                  borderRadius: 'var(--radius)', 
                  background: 'rgba(16, 185, 129, 0.05)', 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  marginTop: '0.5rem'
                }}
                onDragOver={e => {
                  e.preventDefault();
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                }}
                onDragLeave={e => {
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.05)';
                  e.currentTarget.style.borderColor = 'var(--secondary-color)';
                }}
                onDrop={e => { 
                  e.preventDefault(); 
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.05)';
                  if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); 
                }}
                onClick={() => document.getElementById('fileInput').click()}
              >
                <UploadCloud size={48} color="var(--secondary-color)" style={{ marginBottom: '1rem', opacity: 0.8 }} />
                <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-color)' }}>
                  {file ? '¡Archivo listo!' : 'Selecciona o arrastra tu archivo'}
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  Sube documentos, imágenes o archivos comprimidos (máx 50MB)
                </p>
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx,.zip,.jpg,.png" 
                  onChange={e => e.target.files[0] && setFile(e.target.files[0])} 
                  style={{ display: 'none' }} 
                  id="fileInput" 
                />
                <div className="btn btn-secondary" style={{ pointerEvents: 'none' }}>
                  {file ? 'Cambiar archivo' : 'Buscar en mi equipo'}
                </div>
                {file && (
                  <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={16} color="#10b981" />
                    <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem' }}>{file.name}</span>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', marginTop: '0.5rem' }} disabled={uploading}>
              {uploading ? '⏳ Subiendo...' : '🚀 Enviar Tarea'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default TaskDetail;
