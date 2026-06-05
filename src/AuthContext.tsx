import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, type AppUser } from './supabase';
import { Session } from '@supabase/supabase-js';
import { setGuestMode } from './dataService';

interface AuthContextType {
  session: Session | null;
  user: AppUser | null;
  loading: boolean;
  isGuest: boolean;
  signOut: () => Promise<void>;
  updateUserContext: (data: Partial<AppUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        syncUser(session);
        setGuestMode(false);
        setIsGuest(false);
      } else {
        setGuestMode(true);
        setIsGuest(true);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        syncUser(session);
        setGuestMode(false);
        setIsGuest(false);
      } else {
        setUser(null);
        setGuestMode(true);
        setIsGuest(true);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncUser = async (session: Session) => {
    const { user: authUser } = session;
    if (!authUser) return;

    const defaultName = authUser.email ? authUser.email.split('@')[0] : 'User';
    let finalName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || defaultName;
    let finalPhoto = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || '';

    const userData: AppUser = {
      id: authUser.id,
      email: authUser.email || '',
      name: finalName,
      profile_picture: finalPhoto,
    };

    setUser(userData);
    setLoading(false);
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setUser(null);
      setSession(null);
      setGuestMode(true);
      setIsGuest(true);
    }
  };

  const updateUserContext = (data: Partial<AppUser>) => {
    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, isGuest, signOut, updateUserContext }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
