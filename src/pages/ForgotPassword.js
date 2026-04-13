import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Por favor ingresa tu correo.'); return; }
    setLoading(true);
    setError('');

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings`,
    });

    if (resetErr) {
      setError('Error: ' + resetErr.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: 'white', fontSize: '1.75rem', marginBottom: '0.5rem' }}>Recuperar Contraseña</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Enviaremos un enlace a tu correo para restablecerla</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: 'rgba(16,185,129,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle size={36} color="#10b981" />
            </div>
            <p style={{ color: 'white', marginBottom: '1.5rem' }}>
              Enlace enviado. Por favor revisa tu bandeja de entrada.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Volver al Inicio
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}
            <div className="form-group">
              <label style={{ color: 'rgba(255,255,255,0.8)' }}>Correo Electrónico</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input 
                  className="form-control" 
                  type="email" 
                  required 
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'white', paddingLeft: '2.5rem' }}
                  placeholder="tu@correo.com"
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', marginTop: '0.5rem' }}>
              {loading ? 'Enviando...' : 'Enviar Enlace'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Link to="/login" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={14} /> Volver al Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
