import React, { useState } from 'react';
import { Lock, Shield, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabaseAdmin } from '../lib/supabase';
import { resetAdminPassword } from '../lib/seedDatabase';

interface AdminPasswordResetProps {
  onClose?: () => void;
}

export const AdminPasswordReset = ({ onClose }: AdminPasswordResetProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState<'verify' | 'reset' | 'success'>('verify');


  const securityQuestions = [
    {
      question: "What is the default admin role?",
      answer: "admin"
    },
    {
      question: "What is the system name?",
      answer: "lagkaw"
    }
  ];

  const [securityAnswers, setSecurityAnswers] = useState(['', '']);

  const handleVerifyAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {

      const { data, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: 'admin@admin.com',
        password: currentPassword
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }


      const isSecurityValid = securityAnswers.every((answer, index) =>
        answer.toLowerCase().trim() === securityQuestions[index].answer.toLowerCase().trim()
      );

      if (!isSecurityValid) {
        throw new Error('Security answers are incorrect');
      }


      setStep('reset');
      setSuccess('Admin verified. You can now reset the password.');

    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsResetting(true);

    try {

      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }


      const result = await resetAdminPassword(newPassword);

      if (result.success) {
        setStep('success');
        setSuccess('Password reset successfully! You will be logged out.');


        setTimeout(() => {
          supabaseAdmin.auth.signOut();
          onClose?.();
        }, 2000);
      } else {
        throw new Error(result.message);
      }

    } catch (err: any) {
      setError(err.message || 'Password reset failed');
    } finally {
      setIsResetting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPasswords(!showPasswords);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Shield className="text-primary" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-dark">Admin Password Reset</h2>
            <p className="text-sm text-gray-500">
              {step === 'verify' && 'Verify your identity'}
              {step === 'reset' && 'Set new password'}
              {step === 'success' && 'Password updated'}
            </p>
          </div>
        </div>

        {}
        {step === 'verify' && (
          <form onSubmit={handleVerifyAdmin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPasswords ? "text" : "password"}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {securityQuestions.map((q, index) => (
              <div key={index}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {q.question}
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  placeholder="Enter answer"
                  value={securityAnswers[index]}
                  onChange={(e) => {
                    const newAnswers = [...securityAnswers];
                    newAnswers[index] = e.target.value;
                    setSecurityAnswers(newAnswers);
                  }}
                  required
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-[#6D4C2D] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isVerifying ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Verify Identity'
              )}
            </button>
          </form>
        )}

        {}
        {step === 'reset' && (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPasswords ? "text" : "password"}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPasswords ? "text" : "password"}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isResetting}
              className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-[#6D4C2D] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isResetting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}

        {}
        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-green-600" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Password Reset Successful
            </h3>
            <p className="text-gray-600">
              Your admin password has been updated. You will be logged out automatically.
            </p>
          </div>
        )}

        {}
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm mt-4">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg text-sm mt-4">
            <Check size={16} className="shrink-0" />
            {success}
          </div>
        )}

        {}
        {step !== 'success' && (
          <button
            onClick={onClose}
            className="w-full mt-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
