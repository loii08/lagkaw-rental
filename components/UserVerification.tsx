

import React, { useState } from 'react';
import { Mail, Phone, CheckCircle, AlertCircle, RefreshCw, ShieldCheck, Upload, FileText, X } from 'lucide-react';
import { sendEmailVerification, getVerificationStatus } from '../lib/verificationUtils';
import { useAuth } from '../contexts/AuthContext';
import { supabaseAdmin } from '../lib/supabase';
import { VerificationStatus, UserRole } from '../types';

export const UserVerification = () => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [idDocumentBack, setIdDocumentBack] = useState<File | null>(null);
  const [idType, setIdType] = useState<'passport' | 'driver_license' | 'national_id' | ''>('');
  const [uploadingId, setUploadingId] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  React.useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser?.id) return;
      try {
        const { data } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        if (data) setProfile(data);
      } catch {

      }
    };

    loadProfile();
  }, [currentUser?.id]);

  React.useEffect(() => {
    const loadReason = async () => {
      if (!currentUser?.id) return;
      const status = (profile?.status_type_id ?? currentUser.status_type_id) as any;
      if (status !== VerificationStatus.REJECTED) {
        setRejectionReason('');
        return;
      }

      try {
        const { data, error } = await supabaseAdmin
          .from('notifications')
          .select('message, created_at')
          .eq('user_id', currentUser.id)
          .eq('title', 'Verification Rejected')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) return;
        const latest = data?.[0];
        setRejectionReason(latest?.message || '');
      } catch {

      }
    };

    loadReason();
  }, [currentUser?.id, currentUser?.status_type_id, profile?.status_type_id]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const handleRequestPhoneVerification = async () => {
    if (!currentUser?.id || !currentUser?.phone) {
      showMessage('Please add a phone number first', 'error');
      return;
    }

    setLoading('phone-request');
    try {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ phone_verified: 2 })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      const { data: adminUsers, error: adminError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', UserRole.ADMIN);

      if (adminError) throw adminError;

      if (adminUsers?.length) {
        const notifications = adminUsers.map((admin: any) => ({
          user_id: admin.id,
          title: 'New Phone Verification Submitted',
          message: `${currentUser.full_name || 'A user'} has requested phone number verification. Please review and verify the phone number.`,
          type: 'activity',
          link: `/?tab=users&user=${currentUser.id}`,
          is_read: false
        }));

        await supabaseAdmin.from('notifications').insert(notifications);
      }

      setProfile((prev: any) => ({ ...(prev || {}), phone_verified: 2 }));
      showMessage('Phone verification request sent to admin.', 'success');
    } catch (error: any) {
      showMessage(error?.message || 'Failed to request phone verification', 'error');
    } finally {
      setLoading('');
    }
  };

  const handleSendEmailVerification = async () => {
    if (!currentUser?.email) return;

    setLoading('email');
    try {
      const result = await sendEmailVerification(currentUser.email, currentUser.id);
      if (result.success) {

        try {
          const { data: adminUsers } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('role', UserRole.ADMIN);

          if (adminUsers?.length) {
            const notifications = adminUsers.map((admin: any) => ({
              user_id: admin.id,
              title: 'New Email Verification Submitted',
              message: `${currentUser.full_name || 'A user'} has requested email verification. Please review and approve or reject.`,
              type: 'activity',
              link: `/?tab=users&user=${currentUser.id}`,
              is_read: false
            }));

            await supabaseAdmin.from('notifications').insert(notifications);
          }
        } catch {

        }

        setProfile((prev: any) => ({ ...(prev || {}), email_verified: 2 }));
        showMessage('Email verification request sent to admin.', 'success');
      } else {
        showMessage(result.error || 'Failed to send verification email', 'error');
      }
    } catch (error) {
      showMessage('Failed to send verification email', 'error');
    } finally {
      setLoading('');
    }
  };

  const sanitizeFileName = (name: string) => {

    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
  };

  const handleIdDocumentUpload = async () => {
    if (!idDocument || !currentUser?.id || !idType) return;


    if (idType !== 'passport' && !idDocumentBack) {
      showMessage('Please upload both front and back of your ID document.', 'error');
      return;
    }

    setUploadingId(true);
    try {

      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const documentsBucket = buckets?.find(b => b.name === 'documents');

      if (!documentsBucket) {
        throw new Error('Storage bucket not configured. Please contact administrator.');
      }

      const timestamp = Date.now();
      const uploadedFiles: string[] = [];


      const sanitizedFrontName = sanitizeFileName(idDocument.name);
      const frontFileName = `${currentUser.id}/${timestamp}-front-${sanitizedFrontName}`;
      const { error: frontError } = await supabaseAdmin.storage
        .from('documents')
        .upload(frontFileName, idDocument, {
          contentType: idDocument.type,
          upsert: false
        });

      if (frontError) throw frontError;
      uploadedFiles.push(frontFileName);


      let backFileName = null;
      if (idType !== 'passport' && idDocumentBack) {
        const sanitizedBackName = sanitizeFileName(idDocumentBack.name);
        backFileName = `${currentUser.id}/${timestamp}-back-${sanitizedBackName}`;
        const { error: backError } = await supabaseAdmin.storage
          .from('documents')
          .upload(backFileName, idDocumentBack, {
            contentType: idDocumentBack.type,
            upsert: false
          });

        if (backError) throw backError;
        uploadedFiles.push(backFileName);
      }


      const { data: frontUrl } = await supabaseAdmin.storage
        .from('documents')
        .createSignedUrl(frontFileName, 86400);

      let backUrl = null;
      if (uploadedFiles.length > 1) {
        const { data: backUrlData } = await supabaseAdmin.storage
          .from('documents')
          .createSignedUrl(uploadedFiles[1], 86400);
        backUrl = backUrlData?.signedUrl || null;
      }


      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          id_document_url: frontFileName || '',
          id_document_back_url: backFileName,
          id_type: idType,
          status_type_id: VerificationStatus.PENDING,
          is_verified: 0
        })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;


      try {
        const { data } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        if (data) setProfile(data);
      } catch {

      }


      try {
        const isDev = (import.meta as any)?.env?.DEV;


        const { data: adminUsers, error: adminError } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name')
          .eq('role', 'ADMIN');

        if (isDev) {
          console.log('Admin users found:', adminUsers);
          console.log('Current user submitting:', currentUser.id, currentUser.full_name);
        }

        if (adminError) {
          console.error('Error fetching admin users:', adminError);
        } else if (adminUsers && adminUsers.length > 0) {

          const notifications = adminUsers.map(admin => ({
            user_id: admin.id,
            title: 'New ID Verification Submitted',
            message: `${currentUser.full_name || 'A user'} has submitted ID documents for verification. Please review and approve or reject.`,
            type: 'activity',
            link: `/?tab=verifications&user=${currentUser.id}`,
            is_read: false
          }));

          if (isDev) console.log('Creating notifications for admins:', notifications);

          const { data: notificationResult, error: notificationError } = await supabaseAdmin
            .from('notifications')
            .insert(notifications)
            .select();

          if (isDev) console.log('Admin notification result:', notificationResult);

          if (notificationError) {
            console.error('Failed to create admin notifications:', notificationError);
          } else {
            if (isDev) console.log('Admin notifications created successfully for', adminUsers.length, 'admins');
          }
        } else {
          if (isDev) console.log('No admin users found with role ADMIN');
        }
      } catch (notificationError) {
        console.error('Notification creation failed:', notificationError);
      }

      showMessage('ID document uploaded successfully! Your status is now PENDING - waiting for admin verification.', 'success');
      setIdDocument(null);
      setIdDocumentBack(null);
      setIdType('');
    } catch (error: any) {
      console.error('Error uploading ID document:', error);
      if (error.message?.includes('Bucket not found')) {
        showMessage('Storage not configured. Please contact administrator to set up document storage.', 'error');
      } else if (error.message?.includes('storage')) {
        showMessage('Storage error. Please try again or contact administrator.', 'error');
      } else if (error.message?.includes('duplicate')) {
        showMessage('File already exists. Please rename your document and try again.', 'error');
      } else {
        showMessage('Failed to upload ID document. Please try again.', 'error');
      }
    } finally {
      setUploadingId(false);
    }
  };

  if (!currentUser) return null;
  const effectiveUser = { ...currentUser, ...(profile || {}) };

  const verificationStatus = getVerificationStatus(effectiveUser);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck size={24} className="text-primary" />
          <h3 className="text-lg font-bold text-dark">Identity Verification</h3>
        </div>

        {effectiveUser.status_type_id === VerificationStatus.REJECTED && (
          <div className="p-4 rounded-xl mb-6 bg-red-50 border border-red-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-red-700">Verification Rejected</p>
                <p className="text-sm text-red-700 mt-1">
                  {rejectionReason || 'Your verification was rejected. Please review and submit again.'}
                </p>
              </div>
              <button
                onClick={() => {
                  showMessage('You can re-submit your ID documents below to request verification again.', 'success');
                }}
                className="shrink-0 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
              >
                Re-verify
              </button>
            </div>
          </div>
        )}

        {}
        <div className={`p-4 rounded-xl mb-6 ${
          verificationStatus.fullyVerified
            ? 'bg-green-50 border border-green-200'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            {verificationStatus.fullyVerified ? (
              <CheckCircle size={20} className="text-green-600" />
            ) : (
              <AlertCircle size={20} className="text-amber-600" />
            )}
            <div>
              <p className={`font-bold ${
                verificationStatus.fullyVerified ? 'text-green-700' : 'text-amber-700'
              }`}>
                {verificationStatus.fullyVerified ? 'Identity Verified User' : 'Identity Unverified'}
              </p>
              <p className="text-sm text-gray-600">
                {verificationStatus.fullyVerified
                  ? 'Your identity is fully verified. You can access all features.'
                  : 'Complete all verification steps to unlock full features.'
                }
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-700">Email</span>
              <span className={`text-xs font-bold ${verificationStatus.email ? 'text-green-700' : 'text-red-700'}`}>
                {verificationStatus.email ? 'VERIFIED' : 'NOT VERIFIED'}
              </span>
            </div>
            <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-700">Number</span>
              <span className={`text-xs font-bold ${verificationStatus.phone ? 'text-green-700' : verificationStatus.phonePending ? 'text-amber-700' : 'text-red-700'}`}>
                {verificationStatus.phone ? 'VERIFIED' : verificationStatus.phonePending ? 'PENDING' : 'NOT VERIFIED'}
              </span>
            </div>
            <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-700">ID</span>
              <span className={`text-xs font-bold ${verificationStatus.id ? 'text-green-700' : verificationStatus.idPending ? 'text-amber-700' : 'text-red-700'}`}>
                {verificationStatus.id ? 'VERIFIED' : verificationStatus.idPending ? 'PENDING' : 'NOT VERIFIED'}
              </span>
            </div>
          </div>
        </div>

        {}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 min-w-0">
              <Mail size={20} className="text-gray-500" />
              <div className="min-w-0">
                <p className="font-medium text-dark">Email Address</p>
                <p className="text-sm text-gray-500 truncate">{currentUser.email}</p>
              </div>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto ${
              verificationStatus.email
                ? 'bg-green-100 text-green-700'
                : verificationStatus.emailPending
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
            }`}>
              {verificationStatus.email ? 'VERIFIED' : verificationStatus.emailPending ? 'PENDING' : 'NOT VERIFIED'}
            </span>
          </div>

          {!verificationStatus.email && (
            <button
              onClick={handleSendEmailVerification}
              disabled={loading === 'email'}
              className="w-full px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading === 'email' ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Mail size={16} />
              )}
              {loading === 'email' ? 'Sending...' : (verificationStatus.emailPending ? 'Email Verification Pending' : 'Request Email Verification')}
            </button>
          )}

          {verificationStatus.emailPending && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                <strong>Status:</strong> Your email verification is pending admin approval.
              </p>
            </div>
          )}
        </div>

        {}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 min-w-0">
              <Phone size={20} className="text-gray-500" />
              <div className="min-w-0">
                <p className="font-medium text-dark">Phone Number</p>
                <p className="text-sm text-gray-500">
                  {currentUser.phone || 'No phone number added'}
                </p>
              </div>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto ${
              verificationStatus.phone
                ? 'bg-green-100 text-green-700'
                : verificationStatus.phonePending
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
            }`}>
              {verificationStatus.phone ? 'VERIFIED' : verificationStatus.phonePending ? 'PENDING' : 'NOT VERIFIED'}
            </span>
          </div>

          {!verificationStatus.phone && currentUser.phone && (
            <>
              {verificationStatus.phonePending ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">
                    <strong>Status:</strong> Your phone number is pending admin verification.
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleRequestPhoneVerification}
                  disabled={loading === 'phone-request'}
                  className="w-full px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading === 'phone-request' ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Phone size={16} />
                  )}
                  {loading === 'phone-request' ? 'Sending...' : 'Request Phone Verification'}
                </button>
              )}
            </>
          )}

          {!verificationStatus.phone && !currentUser.phone && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                Add a phone number in your profile to enable phone verification.
              </p>
            </div>
          )}
        </div>

        {}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 min-w-0">
              <FileText size={20} className="text-gray-500" />
              <div className="min-w-0">
                <p className="font-medium text-dark">ID Document</p>
                <p className="text-sm text-gray-500">
                  {effectiveUser.status_type_id === VerificationStatus.VERIFIED
                    ? 'Document verified'
                    : effectiveUser.status_type_id === VerificationStatus.REJECTED
                      ? 'Document rejected - please re-submit'
                      : effectiveUser.id_document_url
                        ? 'Document uploaded - pending admin verification'
                        : 'No document uploaded'}
                </p>
              </div>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto ${
              effectiveUser.status_type_id === VerificationStatus.VERIFIED
                ? 'bg-green-100 text-green-700'
                : effectiveUser.status_type_id === VerificationStatus.REJECTED
                  ? 'bg-red-100 text-red-700'
                  : effectiveUser.id_document_url
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
            }`}>
              {effectiveUser.status_type_id === VerificationStatus.VERIFIED
                ? 'APPROVED'
                : effectiveUser.status_type_id === VerificationStatus.REJECTED
                  ? 'REJECTED'
                  : effectiveUser.id_document_url
                    ? 'PENDING'
                    : 'NOT UPLOADED'}
            </span>
          </div>

          {(!effectiveUser.id_document_url || effectiveUser.status_type_id === VerificationStatus.REJECTED) && (
            <div className="space-y-4">
              {}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">ID Type</label>
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select ID type</option>
                  <option value="passport">Passport</option>
                  <option value="driver_license">Driver's License</option>
                  <option value="national_id">National ID Card</option>
                </select>
              </div>

              {idType && (
                <>
                  {}
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                    <Upload size={32} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600 mb-2">
                      Upload {idType === 'passport' ? 'your passport photo page' : 'front of your ID'}
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      Accepted formats: PDF, JPG, PNG (Max 5MB)
                    </p>

                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            showMessage('File size must be less than 5MB', 'error');
                            return;
                          }
                          setIdDocument(file);
                        }
                      }}
                      className="hidden"
                      id="id-document-front-upload"
                    />

                    {idDocument ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={16} className="text-gray-500" />
                            <span className="text-sm text-gray-700 truncate">{idDocument.name}</span>
                          </div>
                          <button
                            onClick={() => setIdDocument(null)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="id-document-front-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition cursor-pointer"
                      >
                        <Upload size={16} />
                        Choose Front Document
                      </label>
                    )}
                  </div>

                  {}
                  {idType !== 'passport' && (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                      <Upload size={32} className="mx-auto text-gray-400 mb-3" />
                      <p className="text-sm text-gray-600 mb-2">
                        Upload back of your {idType === 'driver_license' ? "driver's license" : 'national ID'}
                      </p>
                      <p className="text-xs text-gray-500 mb-4">
                        Accepted formats: PDF, JPG, PNG (Max 5MB)
                      </p>

                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              showMessage('File size must be less than 5MB', 'error');
                              return;
                            }
                            setIdDocumentBack(file);
                          }
                        }}
                        className="hidden"
                        id="id-document-back-upload"
                      />

                      {idDocumentBack ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText size={16} className="text-gray-500" />
                              <span className="text-sm text-gray-700 truncate">{idDocumentBack.name}</span>
                            </div>
                            <button
                              onClick={() => setIdDocumentBack(null)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label
                          htmlFor="id-document-back-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition cursor-pointer"
                        >
                          <Upload size={16} />
                          Choose Back Document
                        </label>
                      )}
                    </div>
                  )}

                  {}
                  <button
                    onClick={handleIdDocumentUpload}
                    disabled={uploadingId || !idDocument || (idType !== 'passport' && !idDocumentBack)}
                    className="w-full px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {uploadingId ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Upload size={16} />
                    )}
                    {uploadingId ? 'Uploading...' : 'Upload Documents'}
                  </button>
                </>
              )}
            </div>
          )}

          {effectiveUser.status_type_id !== VerificationStatus.VERIFIED && effectiveUser.id_document_url && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                <strong>Status:</strong> Your {effectiveUser.id_type || 'ID'} document is being reviewed by an administrator.
                You will be notified once the verification is complete.
              </p>
            </div>
          )}
        </div>
      </div>

      {}
      {message && (
        <div className={`p-4 rounded-xl ${
          messageType === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <p className="font-medium">{message}</p>
        </div>
      )}
    </div>
  );
};
