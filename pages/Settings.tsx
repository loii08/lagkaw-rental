import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { UserRole, VerificationStatus } from '../types';
import { User, Lock, Bell, CreditCard, Save, AlertCircle, BadgeCheck, AlertTriangle, Monitor, LogOut, CheckCircle, ChevronRight, Camera, Loader2, RefreshCw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdminPasswordReset } from '../components/AdminPasswordReset';
import { UserVerification } from '../components/UserVerification';
import { supabaseAdmin } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const Settings = () => {
  const { currentUser, loading, login } = useAuth();
  const { updateUser } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  type ToastType = 'success' | 'error';
  type ToastItem = { id: string; type: ToastType; message: string };
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaved, setIsSaved] = useState(false);
  const [showAdminPasswordReset, setShowAdminPasswordReset] = useState(false);
  const [memberSinceLabel, setMemberSinceLabel] = useState<string>('');

  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordMessageType, setPasswordMessageType] = useState<'success' | 'error' | ''>('');
  const [securityErrors, setSecurityErrors] = useState<{ currentPassword?: string; newPassword?: string; confirmNewPassword?: string }>({});

  const [passwordIntervalDays, setPasswordIntervalDays] = useState<number>(0);
  const [isLoadingSecurityPolicy, setIsLoadingSecurityPolicy] = useState(false);
  const [securityPolicyError, setSecurityPolicyError] = useState<string>('');
  const [isSavingSecurityPolicy, setIsSavingSecurityPolicy] = useState(false);

  const [passwordLastChangedAt, setPasswordLastChangedAt] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isRevokingOtherSessions, setIsRevokingOtherSessions] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const profilePicInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [uploadedIdImage, setUploadedIdImage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    income: ''
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
        setActiveTab(tab);
    }
  }, [location.search]);

  const pushToast = (message: string, type: ToastType) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const toast: ToastItem = { id, type, message };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    navigate(`/profile?tab=${tabId}`, { replace: true });
  };

  useEffect(() => {
    if (currentUser) {
      const fullName = currentUser.full_name || '';
      const nameParts = fullName.split(' ');
      setFormData({
        firstName: currentUser.firstName || nameParts[0] || '',
        middleName: currentUser.middleName || '',
        lastName: currentUser.lastName || nameParts.slice(1).join(' ') || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        address: currentUser.address || '',
        income: currentUser.income ? currentUser.income.toString() : ''
      });
    }
  }, [currentUser]);

  useEffect(() => {
    const loadMemberSince = async () => {
      if (!currentUser?.id) return;
      try {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .select('created_at')
          .eq('id', currentUser.id)
          .single();

        if (error) throw error;

        const createdAt = data?.created_at;
        if (!createdAt) {
          setMemberSinceLabel('');
          return;
        }

        const date = new Date(createdAt);
        if (Number.isNaN(date.getTime())) {
          setMemberSinceLabel('');
          return;
        }

        const formatted = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
        setMemberSinceLabel(`Member since ${formatted}`);
      } catch {
        setMemberSinceLabel('');
      }
    };

    loadMemberSince();
  }, [currentUser?.id]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const updatedUser = {
      ...currentUser,
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
      name: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      income: formData.income ? Number(formData.income) : undefined,
    };

    updateUser(updatedUser);
    login(updatedUser);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    pushToast('Profile updated successfully.', 'success');
  };

  const handleMockVerify = (type: 'email' | 'id') => {
    if (!currentUser) return;
    let updatedUser = { ...currentUser };

    if (type === 'email') updatedUser.email_verified = 1;
    if (type === 'id') {
      updatedUser.status_type_id = VerificationStatus.PENDING;
    }

    updatedUser.is_verified = (Number(updatedUser.email_verified) === 1 && Number(updatedUser.phone_verified) === 1) ? 1 : 0;

    updateUser(updatedUser);
    login(updatedUser);
  };

  useEffect(() => {
    const loadSecurityPolicy = async () => {
      if (!currentUser?.id) return;

      setIsLoadingSecurityPolicy(true);
      setSecurityPolicyError('');
      try {

        try {

          const { data, error } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'password_change_interval_days')
            .single();

          if (error) throw error;

          const raw = (data as any)?.value;
          const parsed = raw === null || raw === undefined ? 0 : Number(raw);
          setPasswordIntervalDays(Number.isFinite(parsed) ? parsed : 0);
        } catch {
          try {

            const { data, error } = await supabaseAdmin
              .from('system_settings')
              .select('value')
              .eq('name', 'password_change_interval_days')
              .single();

            if (error) throw error;

            const raw = (data as any)?.value;
            const parsed = raw === null || raw === undefined ? 0 : Number(raw);
            setPasswordIntervalDays(Number.isFinite(parsed) ? parsed : 0);
          } catch {

            setPasswordIntervalDays(0);
            setSecurityPolicyError('Security policy settings are not configured in the database yet.');
          }
        }

        try {
          const { data } = await supabaseAdmin
            .from('profiles')
            .select('password_last_changed_at')
            .eq('id', currentUser.id)
            .single();

          setPasswordLastChangedAt((data as any)?.password_last_changed_at ?? null);
        } catch {
          setPasswordLastChangedAt(null);
        }

        try {
          const { data } = await supabase.auth.getSession();
          setCurrentSessionId((data as any)?.session?.access_token ? 'current' : null);
        } catch {
          setCurrentSessionId(null);
        }
      } finally {
        setIsLoadingSecurityPolicy(false);
      }
    };

    loadSecurityPolicy();
  }, [currentUser?.id]);

  const handleSavePasswordInterval = async () => {
    if (currentUser?.role !== UserRole.ADMIN) return;

    const normalized = Number.isFinite(passwordIntervalDays) ? Math.max(0, Math.floor(passwordIntervalDays)) : 0;
    setIsSavingSecurityPolicy(true);
    setSecurityPolicyError('');

    try {

      const attempt1 = await supabaseAdmin
        .from('system_settings')
        .upsert({ key: 'password_change_interval_days', value: String(normalized) } as any, { onConflict: 'key' } as any);

      if ((attempt1 as any)?.error) {

        const attempt2 = await supabaseAdmin
          .from('system_settings')
          .upsert({ name: 'password_change_interval_days', value: String(normalized) } as any, { onConflict: 'name' } as any);

        if ((attempt2 as any)?.error) {
          setSecurityPolicyError(((attempt2 as any)?.error?.message || (attempt1 as any)?.error?.message) || 'Failed to save security policy.');
          return;
        }
      }

      setPasswordIntervalDays(normalized);
      showPasswordStatus('Security policy updated.', 'success');
    } catch {
      setSecurityPolicyError('Failed to save security policy.');
      pushToast('Failed to save security policy.', 'error');
    } finally {
      setIsSavingSecurityPolicy(false);
    }
  };

  const handleSignOutOtherSessions = async () => {
    setIsRevokingOtherSessions(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) {
        showPasswordStatus(error.message || 'Failed to revoke other sessions.', 'error');
        return;
      }
      showPasswordStatus('Signed out from other devices successfully.', 'success');
    } catch {
      showPasswordStatus('Failed to revoke other sessions.', 'error');
    } finally {
      setIsRevokingOtherSessions(false);
    }
  };

  const showPasswordStatus = (text: string, type: 'success' | 'error') => {
    setPasswordMessage(text);
    setPasswordMessageType(type);
    pushToast(text, type);
    setTimeout(() => {
      setPasswordMessage('');
      setPasswordMessageType('');
    }, 4000);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) return;

    setSecurityErrors({});

    const currentPassword = securityForm.currentPassword;
    const newPassword = securityForm.newPassword;
    const confirmNewPassword = securityForm.confirmNewPassword;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setSecurityErrors({
        currentPassword: !currentPassword ? 'Current password is required.' : undefined,
        newPassword: !newPassword ? 'New password is required.' : undefined,
        confirmNewPassword: !confirmNewPassword ? 'Please confirm your new password.' : undefined
      });
      showPasswordStatus('Please fill in all password fields.', 'error');
      return;
    }

    if (newPassword.length < 6) {
      setSecurityErrors({ newPassword: 'New password must be at least 6 characters.' });
      showPasswordStatus('New password must be at least 6 characters.', 'error');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setSecurityErrors({ confirmNewPassword: 'New password and confirmation do not match.' });
      showPasswordStatus('New password and confirmation do not match.', 'error');
      return;
    }

    if (passwordIntervalDays > 0 && passwordLastChangedAt) {
      const last = new Date(passwordLastChangedAt);
      if (!Number.isNaN(last.getTime())) {
        const nextAllowed = new Date(last.getTime() + passwordIntervalDays * 24 * 60 * 60 * 1000);
        const now = new Date();
        if (now.getTime() < nextAllowed.getTime()) {
          const remainingMs = nextAllowed.getTime() - now.getTime();
          const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
          showPasswordStatus(`You can update your password again in ${remainingDays} day(s).`, 'error');
          return;
        }
      }
    }

    setIsUpdatingPassword(true);
    try {
      const supabaseUrl = (import.meta as any)?.env?.VITE_SUPABASE_URL;
      const supabaseKey = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        showPasswordStatus('Missing Supabase env vars. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.', 'error');
        return;
      }

      const verifier = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });

      const { error: verifyError } = await verifier.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword
      });

      if (verifyError) {
        showPasswordStatus(verifyError.message || 'Current password is incorrect.', 'error');
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        showPasswordStatus('Your session expired. Please log out and log in again, then retry.', 'error');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

      if (updateError) {
        showPasswordStatus(updateError.message || 'Failed to update password.', 'error');
        return;
      }

      setSecurityForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });

      try {
        const nowIso = new Date().toISOString();
        await supabaseAdmin
          .from('profiles')
          .update({ password_last_changed_at: nowIso } as any)
          .eq('id', currentUser.id);
        setPasswordLastChangedAt(nowIso);
      } catch {

      }

      showPasswordStatus('Password updated successfully.', 'success');
    } catch {
      showPasswordStatus('Failed to update password.', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setIsUploading(true);

      setTimeout(() => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedIdImage(e.target?.result as string);
          setIsUploading(false);

          handleMockVerify('id');
        };
        reader.readAsDataURL(file);
      }, 1500);
    }
  };

  const handleProfilePicSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0] && currentUser) {
        const file = event.target.files[0];
        setIsAvatarUploading(true);

        setTimeout(() => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;

                const updatedUser = { ...currentUser, avatar: result };
                updateUser(updatedUser);
                login(updatedUser);
                setIsAvatarUploading(false);
            };
            reader.readAsDataURL(file);
        }, 1000);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const triggerProfileUpload = () => {
      profilePicInputRef.current?.click();
  };

  const tabs = [
    { id: 'profile', label: 'Profile & Verification', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    ...(currentUser.role === UserRole.RENTER ? [{ id: 'billing', label: 'Payment Methods', icon: CreditCard }] : [])
  ];

  return (
    <>
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-[92vw] sm:w-[380px]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-xl px-4 py-3 shadow-lg border text-sm font-semibold backdrop-blur bg-white/95 ${
            t.type === 'success'
              ? 'border-green-200 text-green-800'
              : 'border-red-200 text-red-700'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-32">
      <header className="mb-8 md:mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-dark mb-3 tracking-tight">Account Settings</h1>
        <p className="text-gray-500 text-lg">Manage your personal information, verify your identity, and secure your account.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {}
        <nav className="w-full lg:w-72 shrink-0">
            <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-4 lg:pb-0 no-scrollbar items-start">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex items-center gap-3 px-5 py-4 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shrink-0 lg:w-full text-left group
                            ${activeTab === tab.id
                                ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                                : 'bg-white text-gray-500 hover:bg-beige/30 hover:text-primary border border-transparent hover:border-beige'
                            }`}
                    >
                        <tab.icon size={20} className={activeTab === tab.id ? 'text-white' : 'text-gray-400 group-hover:text-primary'} />
                        {tab.label}
                        {activeTab === tab.id && <ChevronRight size={16} className="ml-auto hidden lg:block text-white/80" />}
                    </button>
                ))}
            </div>

            {}
            <div className="hidden lg:block mt-8 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Account Status</h4>
                <div className="space-y-4">
                     <div className="flex items-center justify-between">
                         <span className="text-sm font-medium text-gray-600">Identity</span>
                         {currentUser.is_verified === 1 ? <CheckCircle size={18} className="text-green-500"/> : <AlertCircle size={18} className="text-amber-500"/>}
                     </div>
                     <div className="flex items-center justify-between">
                         <span className="text-sm font-medium text-gray-600">Email</span>
                         {Number(currentUser.email_verified) === 1 ? <CheckCircle size={18} className="text-green-500"/> : <AlertCircle size={18} className="text-amber-500"/>}
                     </div>
                     <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mt-2">
                         <div
                            className={`h-full ${currentUser.is_verified === 1 ? 'bg-green-500' : 'bg-amber-500'}`}
                            style={{ width: currentUser.is_verified === 1 ? '100%' : Number(currentUser.email_verified) === 1 ? '50%' : '10%' }}
                        ></div>
                     </div>
                </div>
            </div>
        </nav>

        {}
        <div className="flex-1 min-w-0">

          {activeTab === 'profile' && (
            <form onSubmit={handleSave} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {}
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary to-[#6D4C2D] opacity-10 transition-opacity group-hover:opacity-15"></div>
                  <div className="relative flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-end pt-8 md:pt-12">

                      {}
                      <div className="relative group/avatar cursor-pointer" onClick={triggerProfileUpload}>
                          <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-[6px] border-white shadow-xl overflow-hidden bg-gray-200 relative z-10">
                              <img src={currentUser.avatar_url || '/img/default-profile.png'} alt="Profile" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          </div>

                          {}
                          <div className="absolute inset-0 z-20 rounded-full flex items-center justify-center pointer-events-none md:pointer-events-auto">
                              {isAvatarUploading ? (
                                  <div className="bg-black/50 absolute inset-0 rounded-full flex items-center justify-center m-[6px]">
                                     <Loader2 size={28} className="text-white animate-spin"/>
                                  </div>
                              ) : (
                                  <div className="bg-black/40 absolute inset-0 rounded-full flex items-center justify-center m-[6px] opacity-0 group-hover/avatar:opacity-100 transition-opacity backdrop-blur-[2px]">
                                      <Camera size={28} className="text-white drop-shadow-md"/>
                                  </div>
                              )}
                          </div>

                          <input
                              type="file"
                              ref={profilePicInputRef}
                              onChange={handleProfilePicSelect}
                              accept="image/*"
                          />
                      </div>

                <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm h-full">
                    <h3 className="text-xl font-bold text-dark mb-6 flex items-center gap-2">
                        <div className="p-2 bg-beige/30 rounded-lg text-primary"><User size={20}/></div>
                        Personal Details
                    </h3>

                    <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">First Name</label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-dark"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Last Name</label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-dark"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className={`w-full bg-gray-50 border rounded-xl pl-4 pr-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-dark ${!currentUser.email_verified ? 'border-amber-200 bg-amber-50/10' : 'border-gray-200'}`}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Phone Number</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-dark"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Current Address</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({...formData, address: e.target.value})}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-dark"
                            />
                        </div>

                        {currentUser.role === UserRole.RENTER && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Annual Income (₱)</label>
                                <input
                                type="number"
                                value={formData.income}
                                onChange={(e) => setFormData({...formData, income: e.target.value})}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-dark"
                                />
                            </div>
                        )}
                    </div>
                </div>

              </div>

              </div>

              {}
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
                  <UserVerification />
              </div>

              {}
              <div className="sticky bottom-6 z-20 md:static flex justify-end">
                <button
                  type="submit"
                  className={`w-full md:w-auto px-10 py-4 rounded-xl font-bold text-white transition-all shadow-xl flex items-center justify-center gap-3 transform active:scale-95
                    ${isSaved ? 'bg-green-600 shadow-green-200' : 'bg-dark hover:bg-black shadow-gray-300'}`}
                >
                  {isSaved ? <CheckCircle size={20} /> : <Save size={20} />}
                  {isSaved ? 'Changes Saved Successfully' : 'Save All Changes'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 {}
                 <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
                     <h3 className="text-xl font-bold text-dark mb-6 flex items-center gap-2">
                         <div className="p-2 bg-beige/30 rounded-lg text-primary"><Lock size={20}/></div>
                         Password & Authentication
                     </h3>
                     <form className="space-y-6 max-w-lg" onSubmit={handleUpdatePassword}>
                         <div className="space-y-1.5">
                             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Current Password</label>
                             <input
                               type="password"
                               value={securityForm.currentPassword}
                               onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                               className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                             />
                             {securityErrors.currentPassword && (
                               <p className="text-xs text-red-600 ml-1">{securityErrors.currentPassword}</p>
                             )}
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">New Password</label>
                                 <input
                                   type="password"
                                   value={securityForm.newPassword}
                                   onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                                   className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                 />
                                 {securityErrors.newPassword && (
                                   <p className="text-xs text-red-600 ml-1">{securityErrors.newPassword}</p>
                                 )}
                             </div>
                             <div className="space-y-1.5">
                                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Confirm New</label>
                                 <input
                                   type="password"
                                   value={securityForm.confirmNewPassword}
                                   onChange={(e) => setSecurityForm({ ...securityForm, confirmNewPassword: e.target.value })}
                                   className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                 />
                                 {securityErrors.confirmNewPassword && (
                                   <p className="text-xs text-red-600 ml-1">{securityErrors.confirmNewPassword}</p>
                                 )}
                             </div>
                         </div>

                         {passwordMessage && (
                           <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
                             passwordMessageType === 'success'
                               ? 'bg-green-50 border-green-200 text-green-700'
                               : 'bg-red-50 border-red-200 text-red-700'
                           }`}>
                             {passwordMessage}
                           </div>
                         )}

                         <button
                           type="submit"
                           disabled={isUpdatingPassword}
                           className="px-8 py-3 bg-white border border-gray-200 text-dark rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition shadow-sm disabled:opacity-60"
                         >
                           {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                         </button>
                     </form>

                         {}
                         {currentUser?.role === UserRole.ADMIN && (
                             <div className="pt-4 border-t border-gray-200">
                                 <button
                                     onClick={() => setShowAdminPasswordReset(true)}
                                     className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-[#6D4C2D] transition shadow-sm flex items-center gap-2"
                                 >
                                     <RefreshCw size={16} />
                                     Reset Admin Password
                                 </button>
                                 <p className="text-xs text-gray-500 mt-2 ml-1">
                                     Reset the system administrator password with security verification
                                 </p>
                             </div>
                         )}
                         {}
                         {currentUser?.role === UserRole.ADMIN && (
                           <div className="pt-4 border-t border-gray-200">
                             <h4 className="text-sm font-bold text-dark mb-2">Password Update Interval</h4>
                             <p className="text-xs text-gray-500 mb-3">
                               Set the minimum number of days before a user can change their password again.
                             </p>

                             <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                               <div className="flex-1">
                                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Interval (days)</label>
                                 <input
                                   type="number"
                                   min={0}
                                   value={Number.isFinite(passwordIntervalDays) ? passwordIntervalDays : 0}
                                   onChange={(e) => setPasswordIntervalDays(Number(e.target.value))}
                                   className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                   placeholder="0"
                                 />
                               </div>
                               <button
                                 type="button"
                                 onClick={handleSavePasswordInterval}
                                 disabled={isSavingSecurityPolicy}
                                 className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition disabled:opacity-60"
                               >
                                 {isSavingSecurityPolicy ? 'Saving...' : 'Save Policy'}
                               </button>
                             </div>

                             {isLoadingSecurityPolicy && (
                               <p className="text-xs text-gray-500 mt-2">Loading security policy...</p>
                             )}
                             {securityPolicyError && (
                               <p className="text-xs text-amber-700 mt-2">{securityPolicyError}</p>
                             )}
                           </div>
                         )}
                 </div>

                 {}
                 <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
                     <h3 className="text-xl font-bold text-dark mb-6 flex items-center gap-2">
                         <div className="p-2 bg-beige/30 rounded-lg text-primary"><Monitor size={20}/></div>
                         Connected Sessions
                     </h3>
                     <div className="space-y-4">
                       <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                           <div className="flex items-center gap-4">
                             <div className="p-3 bg-white rounded-xl border border-gray-200 text-primary shadow-sm">
                               <Monitor size={24} />
                             </div>
                             <div>
                               <p className="font-bold text-dark text-sm md:text-base">Current Session</p>
                               <p className="text-xs text-gray-500 mt-1">This device is currently signed in.</p>
                             </div>
                           </div>
                           <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-green-200 self-start sm:self-center">
                             <CheckCircle size={14}/> Active
                           </span>
                         </div>
                       </div>

                       <div className="flex flex-col sm:flex-row gap-3">
                         <button
                           type="button"
                           onClick={handleSignOutOtherSessions}
                           disabled={isRevokingOtherSessions || !currentSessionId}
                           className="flex-1 px-4 py-3 bg-white border border-gray-200 text-dark rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
                         >
                           <LogOut size={16} />
                           {isRevokingOtherSessions ? 'Revoking...' : 'Sign out of other devices'}
                         </button>
                       </div>

                       <p className="text-xs text-gray-500">
                         Note: For privacy, the app cannot list all active devices. You can still revoke other sessions.
                       </p>
                     </div>
                 </div>
             </div>
          )}

          {activeTab === 'notifications' && (
              <div className="bg-white rounded-3xl p-8 md:p-16 border border-gray-100 shadow-sm text-center animate-in fade-in slide-in-from-bottom-4">
                  <div className="w-24 h-24 bg-beige/30 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                      <Bell size={48} />
                  </div>
                  <h3 className="text-2xl font-bold text-dark mb-3">Notification Preferences</h3>
                  <p className="text-gray-500 max-w-md mx-auto text-lg">Detailed notification settings will be available in the next update.</p>
              </div>
          )}

          {activeTab === 'billing' && (
              <div className="bg-white rounded-3xl p-8 md:p-16 border border-gray-100 shadow-sm text-center animate-in fade-in slide-in-from-bottom-4">
                  <div className="w-24 h-24 bg-beige/30 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                      <CreditCard size={48} />
                  </div>
                  <h3 className="text-2xl font-bold text-dark mb-3">Payment Methods</h3>
                  <p className="text-gray-500 max-w-md mx-auto text-lg">Manage your credit cards and bank accounts securely here soon.</p>
              </div>
          )}
        </div>
      </div>
    </div>

    {}
    {showAdminPasswordReset && (
      <AdminPasswordReset
        onClose={() => setShowAdminPasswordReset(false)}
      />
    )}
    </>
  );
};