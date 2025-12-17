

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';

export const EmailVerification = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Mail size={32} className="text-primary" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-dark mb-2">Email Verification</h2>
        <p className="text-gray-500 mb-6">
          Email verification is reviewed and approved by an administrator. If you have requested verification, please wait for approval.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-full px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition"
          >
            Go to Settings
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
