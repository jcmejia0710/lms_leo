import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Award, Clock, CheckCircle, XCircle, ArrowLeft, AlertCircle } from 'lucide-react';

const QuizDetail = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { perfil } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [prevAttempt, setPrevAttempt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    loadQuiz();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [quizId]);

  const loadQuiz = async () => {
    setLoading(true);
    const { data: quizData } = await supabase
      .from('cuestionarios')
      .select('*, cursos(nombre, id_curso)')
      .eq('id_cuestionario', quizId)
      .single();
    if (quizData) {
      setQuiz(quizData);
      if (quizData.tiempo_limite) setTimeLeft(quizData.tiempo_limite * 60);
    }

    const { data: qData } = await supabase
      .from('preguntas')
      .select('*, opciones_pregunta(*)')
      .eq('id_cuestionario', quizId)
      .order('orden');
    if (qData) setQuestions(qData);

    // Verificar intento previo
    const { data: prev } = await supabase
      .from('intentos_cuestionario')
      .select('*, calificaciones_cuestionarios(*)')
      .eq('id_cuestionario', quizId)
      .eq('id_estudiante', perfil.id_usuario)
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prev) setPrevAttempt(prev);

    setLoading(false);
  };

  // Temporizador
  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft, submitted]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSelect = (preguntaId, opcionId) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [preguntaId]: opcionId }));
  };

  const handleSubmit = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSaving(true);

    // Calcular puntaje
    let totalScore = 0;
    const answeredDetails = [];
    questions.forEach(q => {
      const selectedId = answers[q.id_pregunta];
      const correctOpt = q.opciones_pregunta?.find(o => o.es_correcta);
      const isCorrect = selectedId && correctOpt && selectedId === correctOpt.id_opcion;
      if (isCorrect) totalScore += parseFloat(q.puntaje || 0);
      answeredDetails.push({ q, selectedId, correctOpt, isCorrect });
    });

    // Guardar intento en BD
    const { data: intentoData } = await supabase
      .from('intentos_cuestionario')
      .insert({
        id_cuestionario: quizId,
        id_estudiante: perfil.id_usuario,
        fecha_fin: new Date().toISOString(),
        puntaje_total: totalScore,
        estado: 'completado'
      })
      .select()
      .single();

    if (intentoData) {
      // Guardar respuestas individuales
      const respuestas = answeredDetails.map(d => ({
        id_intento: intentoData.id_intento,
        id_pregunta: d.q.id_pregunta,
        id_opcion: d.selectedId || null,
        es_correcta: d.isCorrect || false,
        puntaje_obtenido: d.isCorrect ? parseFloat(d.q.puntaje || 0) : 0
      }));
      await supabase.from('respuestas_intento').insert(respuestas);

      // Guardar calificación
      await supabase.from('calificaciones_cuestionarios').insert({
        id_intento: intentoData.id_intento,
        puntaje_obtenido: totalScore
      });
    }

    setResult({ score: totalScore, details: answeredDetails });
    setSubmitted(true);
    setSaving(false);
  };

  if (loading) return <div className="loading-spinner"></div>;
  if (!quiz) return <div style={{ padding: '2rem' }}>Evaluación no encontrada.</div>;

  const totalPossible = questions.reduce((a, q) => a + parseFloat(q.puntaje || 0), 0);
  const pct = result ? Math.round((result.score / totalPossible) * 100) : 0;
  const answered = Object.keys(answers).length;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Link to={`/courses/${quiz.id_curso}`} className="btn btn-secondary" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <ArrowLeft size={16} /> Volver al Curso: {quiz.cursos?.nombre}
      </Link>

      {/* Header del Quiz */}
      <div className="glass-card" style={{ marginBottom: '2rem', textAlign: 'center', borderTop: '4px solid var(--secondary-color)' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{quiz.titulo}</h1>
        {quiz.descripcion && <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{quiz.descripcion}</p>}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          {quiz.tiempo_limite && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <Clock size={16} /> {quiz.tiempo_limite} minutos
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <Award size={16} /> {totalPossible} puntos totales
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <CheckCircle size={16} /> {questions.length} preguntas
          </div>
        </div>
      </div>

      {/* Intento previo */}
      {prevAttempt && !submitted && (
        <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={16} />
          <span>Ya realizaste esta evaluación el {new Date(prevAttempt.fecha_inicio).toLocaleDateString()}. Puntaje obtenido: <strong>{prevAttempt.puntaje_total} pts</strong>. Puedes intentarlo de nuevo.</span>
        </div>
      )}

      {/* Resultado final */}
      {submitted && result ? (
        <div>
          <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem', marginBottom: '2rem', borderTop: `4px solid ${pct >= 60 ? '#10b981' : '#ef4444'}` }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: pct >= 60 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              {pct >= 60 ? <Award size={40} color="#10b981" /> : <XCircle size={40} color="#ef4444" />}
            </div>
            <h2 style={{ color: pct >= 60 ? '#10b981' : '#ef4444', marginBottom: '0.5rem' }}>
              {pct >= 60 ? '¡Excelente trabajo!' : 'Sigue practicando'}
            </h2>
            <div style={{ fontSize: '3.5rem', fontWeight: '800', color: pct >= 60 ? '#10b981' : '#ef4444', lineHeight: 1 }}>{result.score}</div>
            <div style={{ color: 'var(--text-muted)', margin: '0.5rem 0 1.5rem' }}>de {totalPossible} puntos ({pct}%)</div>
            <div className="progress-container" style={{ maxWidth: '300px', margin: '0 auto 1.5rem' }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 60 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #ef4444, #dc2626)' }}></div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: '#10b981' }}>✅ Correctas: {result.details.filter(d => d.isCorrect).length}</span>
              <span style={{ color: '#ef4444' }}>❌ Incorrectas: {result.details.filter(d => !d.isCorrect).length}</span>
            </div>
          </div>

          {/* Revisión de respuestas */}
          <h3 style={{ marginBottom: '1rem' }}>Revisión de Respuestas</h3>
          {result.details.map((d, i) => (
            <div key={d.q.id_pregunta} className="glass-card" style={{ marginBottom: '1rem', borderLeft: `4px solid ${d.isCorrect ? '#10b981' : '#ef4444'}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {d.isCorrect ? <CheckCircle size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} /> : <XCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />}
                <h4 style={{ margin: 0, flex: 1 }}>{i + 1}. {d.q.texto_pregunta}</h4>
                <span style={{ fontWeight: 'bold', color: d.isCorrect ? '#10b981' : '#ef4444', whiteSpace: 'nowrap' }}>
                  {d.isCorrect ? `+${d.q.puntaje}` : '0'} pts
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '2rem' }}>
                {d.q.opciones_pregunta?.map(opt => {
                  const isSelected = opt.id_opcion === d.selectedId;
                  const isCorrectOpt = opt.es_correcta;
                  let bg = 'transparent';
                  let borderColor = 'var(--border-color)';
                  if (isCorrectOpt) { bg = 'rgba(16,185,129,0.1)'; borderColor = '#10b981'; }
                  else if (isSelected && !isCorrectOpt) { bg = 'rgba(239,68,68,0.1)'; borderColor = '#ef4444'; }
                  return (
                    <div key={opt.id_opcion} style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', background: bg, border: `1px solid ${borderColor}`, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isCorrectOpt && <CheckCircle size={14} color="#10b981" />}
                      {isSelected && !isCorrectOpt && <XCircle size={14} color="#ef4444" />}
                      {opt.texto_opcion}
                      {isSelected && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tu respuesta</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link to={`/courses/${quiz.id_curso}`} className="btn btn-primary">Volver al Curso</Link>
          </div>
        </div>
      ) : (
        /* Cuestionario activo */
        <div>
          {/* Barra de progreso y temporizador */}
          <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{answered} / {questions.length} respuestas</span>
              {timeLeft !== null && (
                <span style={{ fontWeight: 'bold', color: timeLeft < 60 ? '#ef4444' : 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={16} /> {formatTime(timeLeft)}
                </span>
              )}
            </div>
            <div className="progress-container">
              <div className="progress-fill" style={{ width: `${questions.length > 0 ? (answered / questions.length) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* Preguntas */}
          {questions.map((q, idx) => (
            <div key={q.id_pregunta} className="glass-card" style={{ marginBottom: '1.25rem', borderLeft: answers[q.id_pregunta] ? '4px solid var(--secondary-color)' : '4px solid var(--border-color)' }}>
              <h4 style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ width: '28px', height: '28px', background: answers[q.id_pregunta] ? 'var(--secondary-color)' : 'var(--border-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8rem', fontWeight: '700', flexShrink: 0 }}>{idx + 1}</span>
                <span style={{ flex: 1, paddingTop: '3px' }}>{q.texto_pregunta}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{q.puntaje} pts</span>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '0.5rem' }}>
                {q.opciones_pregunta?.sort((a, b) => a.orden - b.orden).map(opt => (
                  <label key={opt.id_opcion} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `1.5px solid ${answers[q.id_pregunta] === opt.id_opcion ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    background: answers[q.id_pregunta] === opt.id_opcion ? 'rgba(79,70,229,0.08)' : 'transparent',
                    cursor: 'pointer', transition: 'all 0.15s ease', userSelect: 'none'
                  }}>
                    <input type="radio" name={q.id_pregunta}
                      checked={answers[q.id_pregunta] === opt.id_opcion}
                      onChange={() => handleSelect(q.id_pregunta, opt.id_opcion)}
                      style={{ accentColor: 'var(--primary-color)', width: '16px', height: '16px' }} />
                    <span style={{ flex: 1 }}>{opt.texto_opcion}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* Botón enviar */}
          <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem', position: 'sticky', bottom: '1rem' }}>
            {answered < questions.length && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                ⚠️ Te faltan {questions.length - answered} pregunta(s) por responder
              </p>
            )}
            <button className="btn btn-primary" style={{ padding: '0.875rem 3rem', fontSize: '1rem' }}
              onClick={handleSubmit}
              disabled={saving || answered < questions.length}>
              {saving ? '💾 Guardando...' : `🚀 Entregar Evaluación (${answered}/${questions.length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizDetail;
