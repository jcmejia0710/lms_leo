import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [rolNombre, setRolNombre] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchPerfil(session.user.id);
      }
      setLoading(false);
    };
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        if (event === 'SIGNED_IN') await fetchPerfil(session.user.id);
      } else {
        setUser(null);
        setPerfil(null);
        setRolNombre('');
      }
      setLoading(false);
    });

    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  const fetchPerfil = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*, roles(nombre)')
        .eq('id_usuario', userId)
        .single();

      if (!error && data) {
        setPerfil(data);
        const rol = data.roles?.nombre || 'estudiante';
        setRolNombre(rol);
      }
    } catch (err) {
      console.error('Error fetching perfil:', err);
    }
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const refreshPerfil = () => {
    if (user) fetchPerfil(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, perfil, rolNombre, loading, login, logout, refreshPerfil }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
