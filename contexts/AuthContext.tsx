
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, VerificationStatus } from '../types';
import { supabase, supabaseAdmin } from '../lib/supabase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email!);
      } else {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email!);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    try {

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);

      }

      if (data) {
        const inactive = Number((data as any)?.inactive ?? 0);
        if (inactive === 1) {
          try {
            localStorage.setItem('inactive_login_blocked', '1');
            localStorage.setItem('inactive_login_email', email);
            localStorage.setItem('inactive_login_userId', userId);
          } catch {

          }

          try {
            Object.keys(localStorage)
              .filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
              .forEach(k => localStorage.removeItem(k));
          } catch {

          }

          setLoading(false);
          try {
            await supabase.auth.signOut();
          } catch {

          }
          setCurrentUser(null);
          return;
        }

        setCurrentUser({
            ...data,
            id: userId,
            email: email,
            role: data.role as UserRole,
            full_name: data.full_name || '',
            status_type_id: Number((data as any).status_type_id ?? VerificationStatus.UNVERIFIED) as VerificationStatus,
            is_verified: Number((data as any).is_verified ?? 0),
            email_verified: Number((data as any).email_verified ?? 0),
            phone_verified: Number((data as any).phone_verified ?? 0),
            inactive: Number((data as any).inactive ?? 0),
            allow_reactivation_request: Number((data as any).allow_reactivation_request ?? 1)
        });
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = (user: User) => {
    setCurrentUser(user);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
