import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { BookOpen, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombres: '', apellidos: '', email: '', password: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.nombres.trim()) return 'El nombre es obligatorio.';
    if (!form.email.trim()) return 'El correo es obligatorio.';
    if (form.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    if (form.password !== form.confirmPassword) return 'Las contraseñas no coinciden.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validErr = validate();
    if (validErr) { setError(validErr); return; }

    setLoading(true);
    setError('');

    // 1. Crear usuario en auth
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { nombres: form.nombres, apellidos: form.apellidos }
      }
    });

    if (signUpErr) {
      setError(signUpErr.message === 'User already registered'
        ? 'Este correo ya está registrado. Prueba iniciando sesión.'
        : signUpErr.message);
      setLoading(false);
      return;
    }

    // 2. El trigger creará el perfil, pero hacemos upsert para asegurarnos
    if (data?.user) {
      const { data: rolData } = await supabase.from('roles').select('id_rol').eq('nombre', 'estudiante').single();
      await supabase.from('perfiles').upsert({
        id_usuario: data.user.id,
        id_rol: rolData?.id_rol,
        nombres: form.nombres,
        apellidos: form.apellidos,
        estado: 'activo'
      });
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => navigate('/login'), 3000);
  };

  if (success) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div style={{ width: '72px', height: '72px', background: 'rgba(16,185,129,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <CheckCircle size={40} color="#10b981" />
          </div>
          <h2 style={{ color: 'white', marginBottom: '0.75rem' }}>¡Cuenta creada!</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem' }}>
            Tu cuenta ha sido creada exitosamente. Serás redirigido al inicio de sesión en unos segundos.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', justifyContent: 'center' }}>
            Ir al inicio de sesión →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: '480px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #4f46e5, #10b981)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <BookOpen size={28} color="white" />
          </div>
          <h1 style={{ color: 'white', fontSize: '1.75rem', marginBottom: '0.25rem' }}>Crear Cuenta</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Únete a LMS LEO como estudiante</p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Nombre y apellido en grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem' }}>Nombres *</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                <input name="nombres" className="form-control" required value={form.nombres} onChange={handleChange}
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'white', paddingLeft: '2.2rem', fontSize: '0.9rem' }}
                  placeholder="Tu nombre" />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem' }}>Apellidos</label>
              <input name="apellidos" className="form-control" value={form.apellidos} onChange={handleChange}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '0.9rem' }}
                placeholder="Apellidos" />
            </div>
          </div>

          <div className="form-group">
            <label style={{ color: 'rgba(255,255,255,0.8)' }}>Correo Electrónico *</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input name="email" type="email" className="form-control" required value={form.email} onChange={handleChange}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'white', paddingLeft: '2.5rem' }}
                placeholder="tu@correo.com" />
            </div>
          </div>

          <div className="form-group">
            <label style={{ color: 'rgba(255,255,255,0.8)' }}>Contraseña *</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input name="password" type={showPwd ? 'text' : 'password'} className="form-control" required value={form.password} onChange={handleChange}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'white', paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                placeholder="Mínimo 6 caracteres" />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {/* Indicador de fuerza */}
            {form.password && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '0.4rem' }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: form.password.length >= i * 3 ? (form.password.length >= 10 ? '#10b981' : '#f59e0b') : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label style={{ color: 'rgba(255,255,255,0.8)' }}>Confirmar Contraseña *</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input name="confirmPassword" type="password" className="form-control" required value={form.confirmPassword} onChange={handleChange}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: `1.5px solid ${form.confirmPassword ? (form.password === form.confirmPassword ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)') : 'rgba(255,255,255,0.12)'}`,
                  color: 'white', paddingLeft: '2.5rem'
                }}
                placeholder="Repite la contraseña" />
            </div>
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.3rem' }}>Las contraseñas no coinciden</p>
            )}
          </div>

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '0.875rem', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', marginTop: '0.5rem', opacity: loading ? 0.7 : 1, fontFamily: 'inherit', transition: 'all 0.2s' }}>
            {loading ? '⏳ Creando cuenta...' : '🎓 Crear cuenta de Estudiante'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: '#a5b4fc', fontWeight: '600', textDecoration: 'none' }}>
              Inicia sesión aquí →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
