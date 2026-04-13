import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, ArrowLeft, Send, Reply, User } from 'lucide-react';

const ForumDetail = () => {
  const { forumId } = useParams();
  const { perfil } = useAuth();
  const [forum, setForum] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => { fetchForum(); }, [forumId]);

  const fetchForum = async () => {
    setLoading(true);
    const { data: fData } = await supabase
      .from('foros')
      .select('*, perfiles!foros_id_creador_fkey(nombres, apellidos), cursos(nombre, id_curso)')
      .eq('id_foro', forumId)
      .single();
    if (fData) setForum(fData);

    const { data: mData } = await supabase
      .from('mensajes_foro')
      .select('*, perfiles!mensajes_foro_id_usuario_fkey(nombres, apellidos)')
      .eq('id_foro', forumId)
      .order('fecha_publicacion', { ascending: true });
    if (mData) setMessages(mData);
    setLoading(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);
    await supabase.from('mensajes_foro').insert({
      id_foro: forumId,
      id_usuario: perfil.id_usuario,
      id_mensaje_padre: replyingTo,
      contenido: newMessage.trim()
    });
    setNewMessage('');
    setReplyingTo(null);
    fetchForum();
    setSending(false);
  };

  if (loading) return <div className="loading-spinner"></div>;
  if (!forum) return <div style={{ padding: '2rem' }}>Foro no encontrado.</div>;

  // Organizar mensajes en árbol
  const rootMessages = messages.filter(m => !m.id_mensaje_padre);
  const getReplies = (parentId) => messages.filter(m => m.id_mensaje_padre === parentId);

  // Colores para avatares
  const avatarColors = ['#4f46e5', '#10b981', '#f43f5e', '#f59e0b', '#06b6d4', '#8b5cf6'];
  const getUserColor = (id) => avatarColors[(id?.charCodeAt(0) || 0) % avatarColors.length];

  const replyingToMsg = replyingTo ? messages.find(m => m.id_mensaje === replyingTo) : null;

  const MessageNode = ({ msg, level = 0 }) => {
    const replies = getReplies(msg.id_mensaje);
    const isOwn = msg.id_usuario === perfil?.id_usuario;
    const color = getUserColor(msg.id_usuario);

    return (
      <div style={{ marginLeft: level > 0 ? '2.5rem' : 0, marginTop: level === 0 ? '1rem' : '0.75rem' }}>
        <div style={{
          background: isOwn ? 'rgba(79,70,229,0.06)' : 'var(--card-bg)',
          border: `1px solid ${isOwn ? 'rgba(79,70,229,0.2)' : 'var(--border-color)'}`,
          borderRadius: 'var(--radius)',
          padding: '1rem 1.25rem',
          borderLeft: level > 0 ? `3px solid ${color}` : undefined,
          boxShadow: 'var(--shadow)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '0.75rem', flexShrink: 0 }}>
                {msg.perfiles?.nombres?.charAt(0)}
              </div>
              <strong style={{ color: isOwn ? 'var(--primary-color)' : 'var(--text-color)', fontSize: '0.9rem' }}>
                {msg.perfiles?.nombres} {msg.perfiles?.apellidos}
                {isOwn && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: '0.4rem' }}>(tú)</span>}
              </strong>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {new Date(msg.fecha_publicacion).toLocaleString()}
            </span>
          </div>

          <p style={{ margin: 0, lineHeight: 1.65, color: 'var(--text-color)', wordBreak: 'break-word' }}>{msg.contenido}</p>

          <button
            onClick={() => setReplyingTo(msg.id_mensaje)}
            style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0', fontFamily: 'inherit', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--secondary-color)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <Reply size={14} /> Responder
          </button>
        </div>

        {/* Respuestas anidadas */}
        {replies.length > 0 && (
          <div style={{ borderLeft: `2px solid ${color}30`, marginLeft: '1rem', paddingLeft: '0.5rem' }}>
            {replies.map(r => <MessageNode key={r.id_mensaje} msg={r} level={level + 1} />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <Link to={`/courses/${forum.cursos?.id_curso}`} className="btn btn-secondary" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <ArrowLeft size={16} /> Volver a: {forum.cursos?.nombre}
      </Link>

      {/* Encabezado del Foro */}
      <div className="glass-card" style={{ marginBottom: '2rem', borderTop: '4px solid var(--primary-color)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MessageSquare size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>{forum.titulo}</h1>
            {forum.descripcion && <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{forum.descripcion}</p>}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Creado por {forum.perfiles?.nombres} {forum.perfiles?.apellidos} · {messages.length} participaciones
            </span>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      <div style={{ marginBottom: '2rem' }}>
        {rootMessages.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <MessageSquare size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <h3 style={{ color: 'var(--text-muted)' }}>Aún no hay mensajes</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>¡Sé el primero en participar en esta discusión!</p>
          </div>
        ) : (
          rootMessages.map(msg => <MessageNode key={msg.id_mensaje} msg={msg} />)
        )}
      </div>

      {/* Formulario de respuesta */}
      <div className="glass-card" style={{ position: 'sticky', bottom: '1rem', borderTop: '3px solid var(--primary-color)' }}>
        {replyingTo && replyingToMsg && (
          <div style={{ padding: '0.6rem 1rem', background: 'rgba(79,70,229,0.06)', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Reply size={14} /> Respondiendo a <strong>{replyingToMsg.perfiles?.nombres}</strong>: &ldquo;{replyingToMsg.contenido.slice(0, 60)}...&rdquo;
            </span>
            <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}>✖</button>
          </div>
        )}

        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div className="avatar" style={{ flexShrink: 0, alignSelf: 'flex-end' }}>
            {perfil?.nombres?.charAt(0)}{perfil?.apellidos?.charAt(0)}
          </div>
          <textarea
            className="form-control"
            rows={2}
            style={{ flex: 1, resize: 'none', margin: 0 }}
            placeholder={replyingTo ? 'Escribe tu respuesta...' : 'Escribe un mensaje al foro...'}
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
          />
          <button type="submit" className="btn btn-primary" disabled={!newMessage.trim() || sending} style={{ alignSelf: 'flex-end', flexShrink: 0 }}>
            <Send size={16} /> {sending ? '...' : 'Enviar'}
          </button>
        </form>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', paddingLeft: '3rem' }}>
          Enter para enviar · Shift+Enter para nueva línea
        </div>
      </div>
    </div>
  );
};

export default ForumDetail;
