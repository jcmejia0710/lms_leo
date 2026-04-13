import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { User, Mail, Camera, Save, CheckCircle } from 'lucide-react';

const Settings = () => {
  const { perfil, refreshPerfil } = useAuth();
  const [form, setForm] = useState({ nombres: '', apellidos: '', avatar_url: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (perfil) {
      setForm({ nombres: perfil.nombres || '', apellidos: perfil.apellidos || '', avatar_url: perfil.avatar_url || '' });
      if (perfil.avatar_url) setPreview(perfil.avatar_url);
    }
  }, [perfil]);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setAvatarFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombres.trim()) { setError('El nombre no puede estar vacío.'); return; }
    setSaving(true);
    setError('');
    setSuccess(false);

    let avatarUrl = form.avatar_url;

    if (avatarFile) {
      const path = `avatars/${perfil.id_usuario}.${avatarFile.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('archivos_lms').upload(path, avatarFile, { upsert: true });
      if (!upErr) {
        const { data } = supabase.storage.from('archivos_lms').getPublicUrl(path);
        avatarUrl = data.publicUrl;
      }
    }

    const { error: updErr } = await supabase.from('perfiles').update({
      nombres: form.nombres,
      apellidos: form.apellidos,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString()
    }).eq('id_usuario', perfil.id_usuario);

    if (updErr) setError('Error al guardar: ' + updErr.message);
    else { setSuccess(true); refreshPerfil(); setTimeout(() => setSuccess(false), 3000); }
    setSaving(false);
  };

  if (!perfil) return <div className="loading-spinner"></div>;

  const iniciales = `${perfil.nombres?.charAt(0) || ''}${perfil.apellidos?.charAt(0) || ''}`;

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Configuración de Perfil</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Actualiza tu información personal y foto de perfil</p>

      {success && (
        <div className="alert alert-success">
          <CheckCircle size={18} /> ¡Perfil actualizado correctamente!
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Avatar */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          {preview ? (
            <img src={preview} alt="Avatar" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary-color)' }} />
          ) : (
            <div className="avatar" style={{ width: '90px', height: '90px', fontSize: '2rem' }}>{iniciales}</div>
          )}
          <label htmlFor="avatarInput" style={{ position: 'absolute', bottom: 0, right: 0, width: '30px', height: '30px', background: 'var(--primary-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid var(--card-bg)' }}>
            <Camera size={14} color="white" />
          </label>
          <input id="avatarInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
        <div>
          <h3 style={{ margin: '0 0 0.25rem' }}>{perfil.nombres} {perfil.apellidos}</h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
            Rol: {perfil.roles?.nombre || 'Sin rol'}
          </span>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
            Haz clic en el ícono de cámara para cambiar tu foto
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="glass-card">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label><User size={14} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />Nombres</label>
              <input className="form-control" value={form.nombres} onChange={e => setForm(p => ({ ...p, nombres: e.target.value }))} placeholder="Tu nombre" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Apellidos</label>
              <input className="form-control" value={form.apellidos} onChange={e => setForm(p => ({ ...p, apellidos: e.target.value }))} placeholder="Tus apellidos" />
            </div>
          </div>

          <div className="form-group">
            <label><Mail size={14} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />Correo Electrónico</label>
            <input className="form-control" value={perfil.id_usuario} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>El correo no puede ser modificado desde aquí.</small>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', marginTop: '0.5rem', fontSize: '1rem' }} disabled={saving}>
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>

      {/* Info de la cuenta */}
      <div className="glass-card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Información de la cuenta</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { label: 'ID de usuario', value: perfil.id_usuario },
            { label: 'Estado', value: perfil.estado || 'activo' },
            { label: 'Miembro desde', value: new Date(perfil.created_at).toLocaleDateString() },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
              <span style={{ fontWeight: '500', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;
