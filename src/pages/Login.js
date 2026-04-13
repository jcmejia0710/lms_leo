import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Por favor completa todos los campos.'); return; }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Error: ' + err.message);
    }
    setLoading(false);
  };

  const quickLogin = async (e, em) => {
    e.preventDefault();
    setEmail(em);
    setPassword('123456');
    setLoading(true);
    setError('');
    try {
      await login(em, '123456');
      navigate('/dashboard');
    } catch (err) {
      setError('Error al iniciar sesión rápida.');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #4f46e5, #10b981)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <BookOpen size={30} color="white" />
          </div>
          <h1 style={{ color: 'white', fontSize: '2rem', marginBottom: '0.25rem' }}>LMS LEO</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Plataforma Educativa Inteligente</p>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem', borderRadius: '10px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label style={{ color: 'rgba(255,255,255,0.8)' }}>Correo Electrónico</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              <input className="form-control" type="email" autoComplete="email"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'white', paddingLeft: '2.5rem' }}
                placeholder="tu@correo.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label style={{ color: 'rgba(255,255,255,0.8)' }}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              <input className="form-control" type={showPwd ? 'text' : 'password'} autoComplete="current-password"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'white', paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                placeholder="••••••"
                value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          
          <div style={{ textAlign: 'right', marginBottom: '1.25rem', marginTop: '-0.5rem' }}>
            <Link to="/forgot-password" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', textDecoration: 'none' }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '0.875rem', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', marginTop: '0.5rem', transition: 'all 0.2s ease', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
            {loading ? '⏳ Ingresando...' : '🚀 Iniciar Sesión'}
          </button>
        </form>

        {/* Accesos rápidos de demo */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', textAlign: 'center', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cuentas de demostración</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { label: '🛡️ Administrador', email: 'admin@example.com', color: '#ef4444' },
              { label: '👩‍🏫 Docente', email: 'docente@example.com', color: '#10b981' },
              { label: '🎓 Estudiante', email: 'estudiante@example.com', color: '#4f46e5' },
            ].map(acc => (
              <button key={acc.email} onClick={e => quickLogin(e, acc.email)} disabled={loading}
                style={{ width: '100%', padding: '0.65rem 1rem', background: `${acc.color}18`, color: acc.color, border: `1px solid ${acc.color}33`, borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.2s', fontFamily: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{acc.label}</span>
                <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>{acc.email}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
            ¿No tienes cuenta?{' '}
            <Link to="/register" style={{ color: '#a5b4fc', fontWeight: '600', textDecoration: 'none' }}>
              Regístrate aquí →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
