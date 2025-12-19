import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { UserRole, VerificationStatus } from '../types';
import { User, Lock, Bell, CreditCard, Save, AlertCircle, BadgeCheck, AlertTriangle, Monitor, LogOut, CheckCircle, ChevronRight, Camera, Loader2, RefreshCw, Shield, Key, Smartphone, Mail, MapPin, Calendar } from 'lucide-react';
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your settings...</p>
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
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
    
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 md:mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Account Settings</h1>
              <p className="text-gray-600">Manage your profile, security, and preferences</p>
            </div>
            <div className="flex items-center gap-3">
              {memberSinceLabel && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{memberSinceLabel}</span>
                </div>
              )}
              <div className="px-4 py-2 bg-primary/10 rounded-xl">
                <span className="text-sm font-semibold text-primary capitalize">
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
              style={{ 
                width: currentUser.is_verified === 1 ? '100%' : 
                       Number(currentUser.email_verified) === 1 ? '50%' : '10%'
              }}
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 shrink-0">
            <div className="sticky top-8">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-4 border-white shadow-md overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                      <img 
                        src={currentUser.avatar_url || '/img/default-profile.png'} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button 
                      onClick={triggerProfileUpload}
                      className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full border-2 border-white flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                    >
                      <Camera size={14} className="text-white" />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{currentUser.full_name || 'User'}</h3>
                    <p className="text-sm text-gray-500">{currentUser.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all
                        ${activeTab === tab.id
                          ? 'bg-primary text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                      <tab.icon size={18} />
                      {tab.label}
                      {activeTab === tab.id && (
                        <ChevronRight size={16} className="ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verification Status Card */}
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-sm p-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Shield size={16} />
                  Verification Status
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Email</span>
                    {Number(currentUser.email_verified) === 1 ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                        <CheckCircle size={14} />
                        Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600 text-sm font-medium">
                        <AlertCircle size={14} />
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Identity</span>
                    {currentUser.is_verified === 1 ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                        <BadgeCheck size={14} />
                        Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600 text-sm font-medium">
                        <AlertTriangle size={14} />
                        Required
                      </span>
                    )}
                  </div>
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 text-center">
                      Complete verification for full access
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <div className="space-y-8">
                {/* Profile Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <User size={20} />
                      </div>
                      Personal Information
                    </h2>
                  </div>
                  <form onSubmit={handleSave} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                          placeholder="Enter first name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                          placeholder="Enter last name"
                        />
                      </div>
                      <div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                            {!currentUser.email_verified && (
                              <span className="ml-2 text-xs text-amber-600 font-normal">(Requires verification)</span>
                            )}
                          </label>
                          <div className="relative">
                            <Mail size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({...formData, email: e.target.value})}
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                              placeholder="your@email.com"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Address
                          </label>
                          <div className="relative">
                            <MapPin size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={formData.address}
                              onChange={(e) => setFormData({...formData, address: e.target.value})}
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                              placeholder="Enter your address"
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phone Number
                          </label>
                          <div className="relative">
                            <Smartphone size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData({...formData, phone: e.target.value})}
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                              placeholder="091 xxxx xxxx"
                            />
                          </div>
                        </div>
                        {currentUser.role === UserRole.RENTER && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Annual Income (₱)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={formData.income}
                                onChange={(e) => setFormData({...formData, income: e.target.value})}
                                className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="Enter annual income"
                              />
                              <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">PHP</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-6 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        Make sure your information is up to date
                      </p>
                      <button
                        type="submit"
                        className={`px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg flex items-center gap-3
                          ${isSaved ? 'bg-green-600' : 'bg-gradient-to-r from-primary to-primary/90 hover:shadow-xl'}`}
                      >
                        {isSaved ? <CheckCircle size={20} /> : <Save size={20} />}
                        {isSaved ? 'Changes Saved' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Verification Section */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                        <BadgeCheck size={20} />
                      </div>
                      Identity Verification
                    </h2>
                  </div>
                  <div className="p-6">
                    <UserVerification />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8">
                {/* Password Update Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                        <Key size={20} />
                      </div>
                      Password & Authentication
                    </h2>
                  </div>
                  <div className="p-6">
                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Password
                          </label>
                          <input
                            type="password"
                            value={securityForm.currentPassword}
                            onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            placeholder="••••••••"
                          />
                          {securityErrors.currentPassword && (
                            <p className="mt-1 text-sm text-red-600">{securityErrors.currentPassword}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password
                          </label>
                          <input
                            type="password"
                            value={securityForm.newPassword}
                            onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            placeholder="••••••••"
                          />
                          {securityErrors.newPassword && (
                            <p className="mt-1 text-sm text-red-600">{securityErrors.newPassword}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm Password
                          </label>
                          <input
                            type="password"
                            value={securityForm.confirmNewPassword}
                            onChange={(e) => setSecurityForm({ ...securityForm, confirmNewPassword: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            placeholder="••••••••"
                          />
                          {securityErrors.confirmNewPassword && (
                            <p className="mt-1 text-sm text-red-600">{securityErrors.confirmNewPassword}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-6 border-t border-gray-100">
                        <div className="text-sm text-gray-500">
                          <p>Password must be at least 6 characters long</p>
                          {passwordLastChangedAt && (
                            <p className="mt-1">Last changed: {new Date(passwordLastChangedAt).toLocaleDateString()}</p>
                          )}
                        </div>
                        <button
                          type="submit"
                          disabled={isUpdatingPassword}
                          className="px-8 py-3 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-60 flex items-center gap-2"
                        >
                          {isUpdatingPassword ? (
                            <>
                              <Loader2 size={18} className="animate-spin" />
                              Updating...
                            </>
                          ) : 'Update Password'}
                        </button>
                      </div>
                    </form>

                    {/* Admin Section */}
                    {currentUser?.role === UserRole.ADMIN && (
                      <div className="mt-8 pt-8 border-t border-gray-100">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">Admin Controls</h4>
                            <p className="text-sm text-gray-600">
                              Manage password policies and system security settings
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              onClick={() => setShowAdminPasswordReset(true)}
                              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-2"
                            >
                              <RefreshCw size={16} />
                              Reset Admin Password
                            </button>
                            <button
                              onClick={handleSavePasswordInterval}
                              disabled={isSavingSecurityPolicy}
                              className="px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-60 flex items-center gap-2"
                            >
                              {isSavingSecurityPolicy ? 'Saving...' : 'Save Security Policy'}
                            </button>
                          </div>
                        </div>

                        {/* Password Policy */}
                        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password Change Interval (days)
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={Number.isFinite(passwordIntervalDays) ? passwordIntervalDays : 0}
                                onChange={(e) => setPasswordIntervalDays(Number(e.target.value))}
                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                placeholder="0 = No restriction"
                              />
                            </div>
                            <div className="text-sm text-gray-600">
                              <p>Set to 0 for no restriction</p>
                              <p className="text-xs mt-1">Prevents frequent password changes</p>
                            </div>
                          </div>
                          {securityPolicyError && (
                            <p className="mt-2 text-sm text-amber-600">{securityPolicyError}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sessions Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                        <Monitor size={20} />
                      </div>
                      Active Sessions
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                              <Monitor size={24} className="text-gray-600" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">Current Device</p>
                              <p className="text-sm text-gray-500">This browser session</p>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm font-semibold">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            Active Now
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
                        <button
                          onClick={handleSignOutOtherSessions}
                          disabled={isRevokingOtherSessions || !currentSessionId}
                          className="px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          <LogOut size={16} />
                          {isRevokingOtherSessions ? 'Revoking...' : 'Sign Out Other Devices'}
                        </button>
                        <div className="text-sm text-gray-500">
                          <p>This will sign out all other active sessions except this one</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                      <Bell size={20} />
                    </div>
                    Notification Preferences
                  </h2>
                </div>
                <div className="p-16 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Bell size={48} className="text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Coming Soon</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    We're working on detailed notification settings to give you full control over your alerts.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                      <CreditCard size={20} />
                    </div>
                    Payment Methods
                  </h2>
                </div>
                <div className="p-16 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-green-50 to-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CreditCard size={48} className="text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Secure Payment Hub</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Manage your credit cards, bank accounts, and billing preferences securely.
                    Available in the next update.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {showAdminPasswordReset && (
      <AdminPasswordReset
        onClose={() => setShowAdminPasswordReset(false)}
      />
    )}
    </>
  );
};