import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [rolNombre, setRolNombre] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Safety timeout to prevent infinite loading (increased to 8s)
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('AuthContext: Safety timeout reached. Forcing loading to false.');
        setLoading(false);
      }
    }, 8000);

    // Get initial session explicitly to bypass potential lag in onAuthStateChange
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            fetchPerfil(session.user.id);
          }
          // We don't set loading false here because onAuthStateChange will also fire
        }
      } catch (err) {
        console.error('AuthContext: Error getting initial session:', err);
      }
    };

    initSession();

    // Get initial session and subscribe to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        // Only fetch profile if it's a new session or sign-in event
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          fetchPerfil(session.user.id);
        }
      } else {
        setUser(null);
        setPerfil(null);
        setRolNombre('');
      }
      
      setLoading(false);
      clearTimeout(safetyTimeout);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
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
