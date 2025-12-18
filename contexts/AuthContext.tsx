
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
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          if (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token Not Found')) {
            await supabase.auth.signOut({ scope: 'global' });
            setCurrentUser(null);
            setLoading(false);
            return;
          }
          throw error;
        }
        
        if (session?.user) {
          // Create basic user from session data without profile fetch
          setCurrentUser({
            id: session.user.id,
            email: session.user.email!,
            role: UserRole.RENTER, // Default role - can be updated later
            full_name: session.user.user_metadata?.full_name || '',
            status_type_id: VerificationStatus.UNVERIFIED,
            is_verified: 0,
            email_verified: session.user.email_confirmed ? 1 : 0,
            phone_verified: 0,
            inactive: 0,
            allow_reactivation_request: 1
          });
        }
        setLoading(false);
      } catch (error) {
        console.error('Error getting session:', error);
        setCurrentUser(null);
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user) {
          // Create basic user from session data without profile fetch
          setCurrentUser({
            id: session.user.id,
            email: session.user.email!,
            role: UserRole.RENTER, // Default role - can be updated later
            full_name: session.user.user_metadata?.full_name || '',
            status_type_id: VerificationStatus.UNVERIFIED,
            is_verified: 0,
            email_verified: session.user.email_confirmed ? 1 : 0,
            phone_verified: 0,
            inactive: 0,
            allow_reactivation_request: 1
          });
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error in auth state change:', error);
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
