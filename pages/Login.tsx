import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, User as UserIcon, Building, Mail, AlertCircle, UserPlus, Check, Lock, Home, Loader2 } from 'lucide-react';
import { UserRole, VerificationStatus } from '../types';

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.OWNER);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [inactiveEmail, setInactiveEmail] = useState('');
  const [inactiveUserId, setInactiveUserId] = useState<string>('');
  const [allowReactivationRequest, setAllowReactivationRequest] = useState(false);
  const [isRequestingReactivation, setIsRequestingReactivation] = useState(false);
  const [reactivationRequested, setReactivationRequested] = useState(false);

  useEffect(() => {
    try {
      const blocked = localStorage.getItem('inactive_login_blocked');
      const blockedEmail = localStorage.getItem('inactive_login_email');
      const blockedUserId = localStorage.getItem('inactive_login_userId');
      if (blocked === '1' && (blockedEmail || blockedUserId)) {
        setInactiveEmail(blockedEmail || '');
        setInactiveUserId(blockedUserId || '');
        setShowInactiveModal(true);

        try {
          Object.keys(localStorage)
            .filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
            .forEach(k => localStorage.removeItem(k));
        } catch {

        }

        supabase.auth.signOut().catch(() => {});
        localStorage.removeItem('inactive_login_blocked');
        localStorage.removeItem('inactive_login_email');
        localStorage.removeItem('inactive_login_userId');
      }
    } catch {

    }
  }, []);

  useEffect(() => {
    const loadInactiveModalState = async () => {
      if (!showInactiveModal) return;

      setAllowReactivationRequest(false);

      try {
        if (inactiveUserId) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('allow_reactivation_request')
            .eq('id', inactiveUserId)
            .single();

          const allow = Number((profile as any)?.allow_reactivation_request ?? 1) === 1;
          setAllowReactivationRequest(allow);
        }
      } catch {

      }

      try {
        if (inactiveUserId) {
          const { data: pending } = await supabaseAdmin
            .from('notifications')
            .select('id')
            .eq('title', 'Account Reactivation Request')
            .eq('is_read', false)
            .like('link', `%user=${inactiveUserId}%`)
            .limit(1);

          if (pending && pending.length > 0) {
            setReactivationRequested(true);
          }
        }
      } catch {

      }
    };

    loadInactiveModalState();
  }, [showInactiveModal, inactiveUserId]);

  const requestReactivation = async () => {
    if (!inactiveEmail) return;
    setIsRequestingReactivation(true);
    setError('');

    try {
      const { data: admins, error: adminsError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'ADMIN');

      if (adminsError) throw adminsError;

      if (!admins || admins.length === 0) {
        setError('No administrators found to notify. Please try again later.');
        return;
      }

      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      const authUser = (authUsers as any)?.users?.find((u: any) => u.email === inactiveEmail);
      const requesterId = authUser?.id;

      await supabaseAdmin.from('notifications').insert(
        admins.map((a: any) => ({
          user_id: a.id,
          title: 'Account Reactivation Request',
          message: requesterId
            ? `A user requested account reactivation. Email: ${inactiveEmail}. User ID: ${requesterId}`
            : `A user requested account reactivation. Email: ${inactiveEmail}.`,
          type: 'alert',
          link: requesterId ? `/?tab=users&user=${requesterId}` : '/?tab=users',
          is_read: false
        }))
      );

      setReactivationRequested(true);
    } catch (e: any) {
      console.error('Failed to request reactivation:', e);
      setError(e?.message || 'Failed to notify admins. Please try again.');
    } finally {
      setIsRequestingReactivation(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {

        try {
          const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, inactive, allow_reactivation_request')
            .ilike('email', email)
            .single();

          const inactive = Number((existingProfile as any)?.inactive ?? 0);
          if (inactive === 1) {
            setInactiveEmail(email);
            setInactiveUserId(String((existingProfile as any)?.id || ''));
            setAllowReactivationRequest(Number((existingProfile as any)?.allow_reactivation_request ?? 1) === 1);
            setShowInactiveModal(true);
            setIsLoading(false);
            return;
          }
        } catch {

        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('Login error:', error);

            if (error.message.includes('Email not confirmed')) {

                const { data } = await supabaseAdmin.auth.admin.listUsers();
                const user = (data as any)?.users?.find((u: any) => u.email === email);

                if (user) {

                    await supabaseAdmin.auth.admin.updateUserById(user.id, {
                        email_confirm: true
                    });

                    const retryResult = await supabase.auth.signInWithPassword({
                        email,
                        password
                    });

                    if (retryResult.data) {
                        setError('Login successful! Email verified automatically.');
                        navigate('/');
                        return;
                    }
                }

                setError('Login successful! However, email verification is required for booking and posting properties.');

                navigate('/');
                return;
            } else if (error.message.includes('Invalid login credentials')) {
                setError('Invalid email or password. Please try again.');
                throw error;
            } else {
                setError(error.message);
                throw error;
            }
        }

        try {
          const userId = (data as any)?.user?.id;
          if (userId) {

            let profile: any = null;
            try {
              const { data: p } = await supabaseAdmin
                .from('profiles')
                .select('inactive, allow_reactivation_request')
                .eq('id', userId)
                .single();
              profile = p;
            } catch {
              const { data: p } = await supabaseAdmin
                .from('profiles')
                .select('inactive')
                .eq('id', userId)
                .single();
              profile = p;
            }

            const inactive = Number((profile as any)?.inactive ?? 0);
            if (inactive === 1) {
              setInactiveEmail(email);
              setInactiveUserId(userId);
              setAllowReactivationRequest(Number((profile as any)?.allow_reactivation_request ?? 1) === 1);
              setShowInactiveModal(true);
              setIsLoading(false);
              try {
                localStorage.setItem('inactive_login_userId', userId);
              } catch {

              }

              supabase.auth.signOut().catch(() => {});
              return;
            }
          }
        } catch {

        }

        navigate('/');
    } catch (err: any) {
        console.error('Login failed:', err);
        setError(err.message || 'Failed to login');
    } finally {
        setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!name.trim()) { setError('Name required'); setIsLoading(false); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        setError('Please enter a valid email address');
        setIsLoading(false);
        return;
    }

    try {

        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        });

        console.log('Signup response:', { data, signUpError });

        if (signUpError) {
            console.error('Supabase signup error:', signUpError);

            if (signUpError.message.includes('invalid') || signUpError.message.includes('Email address')) {
                setError('This email address is not allowed. Please use a different email (Gmail, Outlook, etc.)');
            } else if (signUpError.message.includes('already registered')) {
                setError('This email is already registered. Please sign in instead.');
            } else {
                setError(signUpError.message);
            }
            throw signUpError;
        }

        if (data.user) {

            const profileData = {
                id: data.user.id,
                email: email,
                full_name: name,
                role: role,
                avatar_url: '/img/default-profile.png',
                is_verified: 0,
                status_type_id: VerificationStatus.UNVERIFIED
            };

            console.log('Creating profile with data:', profileData);

            const { error: profileError } = await supabaseAdmin.from('profiles').insert(profileData);

            if (profileError) {
                console.error("Profile creation failed:", profileError);

                throw new Error(`Account created but profile setup failed: ${profileError.message}. Please contact support.`);
            }

            console.log('Profile created successfully');

            if (data.user.email_confirmed_at) {

                setError('Account created successfully! You can now sign in.');
                setTimeout(() => {
                    navigate('/');
                }, 2000);
            } else {

                setError('Account created! You can login immediately, but email verification is required for booking and posting properties.');
                setTimeout(() => {
                    setIsLoginView(true);
                }, 3000);
            }
        } else {
            throw new Error('No user data returned from signup');
        }
    } catch (err: any) {
        console.error('Registration error:', err);

        if (!err.message.includes('not allowed') && !err.message.includes('already registered') && !err.message.includes('Account created') && !err.message.includes('check your email')) {
            setError(err.message || 'Failed to register');
        }
    } finally {
        setIsLoading(false);
    }
  };

  const toggleView = () => {
      setIsLoginView(!isLoginView);
      setError('');
      setEmail('');
      setName('');
      setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] p-4">
      {showInactiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-red-50">
                <AlertCircle size={20} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-dark">Account Deactivated</h3>
                <p className="text-sm text-gray-600 mt-1">
                  This account is currently inactive. Please contact an administrator or request reactivation.
                </p>
                {inactiveEmail && (
                  <p className="text-xs text-gray-500 mt-2">Email: {inactiveEmail}</p>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {allowReactivationRequest && (
                <button
                  onClick={requestReactivation}
                  disabled={isRequestingReactivation || reactivationRequested}
                  className="w-full px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {reactivationRequested
                    ? 'Reactivation Request Sent'
                    : isRequestingReactivation
                      ? 'Sending...'
                      : 'Request Reactivation'}
                </button>
              )}
              <button
                onClick={() => {
                  setShowInactiveModal(false);
                  setReactivationRequested(false);
                }}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-2xl shadow-xl overflow-hidden min-h-[550px]">

        {}
        <div className="bg-gradient-to-br from-primary to-[#6D4C2D] p-5 md:p-12 text-white flex flex-col justify-center md:justify-between relative overflow-hidden order-1 md:order-none min-h-[120px] md:min-h-0">
           <div className="z-10 relative">
             <div className="flex flex-row md:flex-col items-center md:items-start gap-3 md:gap-0 mb-2 md:mb-0">
                 <div className="w-8 h-8 md:w-12 md:h-12 border-2 border-white bg-transparent rounded-xl flex items-center justify-center md:mb-6 shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)] shrink-0">
                    <Home size={18} strokeWidth={2.5} className="md:hidden" />
                    <Home size={28} strokeWidth={2.5} className="hidden md:block" />
                 </div>
                 <h1 className="text-lg md:text-4xl font-bold md:mb-4 tracking-tight leading-tight">
                     {isLoginView ? 'Welcome to Lagkaw' : 'Join Lagkaw'}
                 </h1>
             </div>

             <p className="text-beige text-xs md:text-lg leading-relaxed opacity-90 font-medium ml-11 md:ml-0">
               {isLoginView
                 ? "Your intelligent property management companion."
                 : "Create your account today."}
             </p>
           </div>

           <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary rounded-full opacity-20 blur-3xl"></div>
           <div className="absolute -top-24 -right-24 w-64 h-64 bg-beige rounded-full opacity-20 blur-3xl"></div>
        </div>

        {}
        <div className="p-8 md:p-12 flex flex-col justify-center order-2 md:order-none">
            <h2 className="text-2xl md:text-3xl font-bold text-dark mb-2">
                {isLoginView ? 'Sign In' : 'Create Account'}
            </h2>
            <p className="text-sm md:text-base text-gray-500 mb-8">
                {isLoginView ? 'Enter your credentials to access your dashboard.' : 'Fill in your details to get started.'}
            </p>

            <form onSubmit={isLoginView ? handleLogin : handleRegister} className="space-y-5">
                {!isLoginView && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-beige focus:border-primary outline-none transition-all"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRole(UserRole.OWNER)}
                                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${role === UserRole.OWNER ? 'border-primary bg-beige/30 text-primary font-semibold shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <Building size={18} /> Owner
                                    {role === UserRole.OWNER && <Check size={16} className="text-primary"/>}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole(UserRole.RENTER)}
                                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${role === UserRole.RENTER ? 'border-primary bg-beige/30 text-primary font-semibold shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <UserIcon size={18} /> Renter
                                    {role === UserRole.RENTER && <Check size={16} className="text-primary"/>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="email"
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-beige focus:border-primary outline-none transition-all"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (error) setError('');
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="password"
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-beige focus:border-primary outline-none transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm animate-in fade-in slide-in-from-top-1">
                        <AlertCircle size={16} className="shrink-0" />
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-[#6D4C2D] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-beige/50 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : isLoginView ? (
                        <>Continue <ArrowRight size={18} /></>
                    ) : (
                        <>Create Account <UserPlus size={18} /></>
                    )}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-gray-500 text-sm">
                    {isLoginView ? "Don't have an account?" : "Already have an account?"}
                    <button
                        onClick={toggleView}
                        className="ml-2 text-primary font-semibold hover:text-[#6D4C2D] transition-colors"
                    >
                        {isLoginView ? "Sign up" : "Sign in"}
                    </button>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};
