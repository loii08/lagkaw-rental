

import { supabase, supabaseAdmin } from './supabase';
import { VerificationStatus } from '../types';


export const sendEmailVerification = async (email: string, userId: string) => {
  try {


    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ email_verified: 2 })
      .eq('id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error sending email verification:', error);
    return { success: false, error: error.message };
  }
};


export const verifyEmailToken = async (token: string, email: string) => {
  try {
    const { error } = await supabase.auth.verifyOtp({
      token,
      type: 'signup',
      email,
    });

    if (error) throw error;


    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabaseAdmin
        .from('profiles')
        .update({ email_verified: 1 })
        .eq('id', user.id);


      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email_verified, phone_verified, status_type_id')
        .eq('id', user.id)
        .single();

      const emailOk = Number(profile?.email_verified) === 1;
      const phoneOk = Number(profile?.phone_verified) === 1;
      const idOk = Number(profile?.status_type_id) === VerificationStatus.VERIFIED;

      await supabaseAdmin
        .from('profiles')
        .update({ is_verified: emailOk && phoneOk && idOk ? 1 : 0 })
        .eq('id', user.id);
    }

    return { success: true };
  } catch (error) {
    console.error('Error verifying email:', error);
    return { success: false, error: error.message };
  }
};


export const sendPhoneVerification = async (phone: string, userId: string) => {
  try {

    const code = Math.floor(100000 + Math.random() * 900000).toString();










    localStorage.setItem(`phone_verification_${userId}`, JSON.stringify({
      code,
      phone,
      timestamp: Date.now(),
    }));


    await supabaseAdmin
      .from('profiles')
      .update({ phone_verified: 0 })
      .eq('id', userId);

    console.log(`Mock: Verification code for ${phone} is ${code}`);

    return { success: true, message: `Verification code sent to ${phone}` };
  } catch (error) {
    console.error('Error sending phone verification:', error);
    return { success: false, error: error.message };
  }
};


export const verifyPhoneCode = async (userId: string, code: string) => {
  try {
    const storedData = localStorage.getItem(`phone_verification_${userId}`);
    if (!storedData) {
      throw new Error('No verification code found. Please request a new code.');
    }

    const { code: storedCode, timestamp } = JSON.parse(storedData);


    if (Date.now() - timestamp > 10 * 60 * 1000) {
      localStorage.removeItem(`phone_verification_${userId}`);
      throw new Error('Verification code expired. Please request a new code.');
    }

    if (code !== storedCode) {
      throw new Error('Invalid verification code');
    }


    await supabaseAdmin
      .from('profiles')
      .update({ phone_verified: 1 })
      .eq('id', userId);


    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email_verified, phone_verified, status_type_id')
      .eq('id', userId)
      .single();

    const emailOk = Number(profile?.email_verified) === 1;
    const phoneOk = Number(profile?.phone_verified) === 1;
    const idOk = Number(profile?.status_type_id) === VerificationStatus.VERIFIED;

    await supabaseAdmin
      .from('profiles')
      .update({ is_verified: emailOk && phoneOk && idOk ? 1 : 0 })
      .eq('id', userId);


    localStorage.removeItem(`phone_verification_${userId}`);

    return { success: true };
  } catch (error) {
    console.error('Error verifying phone:', error);
    return { success: false, error: error.message };
  }
};


export const isUserFullyVerified = (user: any) => {
  const emailOk = Number(user.email_verified) === 1;
  const phoneOk = Number(user.phone_verified) === 1;
  const idOk = Number(user.status_type_id) === VerificationStatus.VERIFIED || Number(user.is_verified) === 1;
  return emailOk && phoneOk && idOk;
};


export const getVerificationStatus = (user: any) => {
  const phoneValue = Number(user.phone_verified);
  const emailValue = Number(user.email_verified);
  const statusTypeId = Number(user.status_type_id);
  return {
    email: emailValue === 1,
    emailPending: emailValue === 2,
    phone: phoneValue === 1,
    phonePending: phoneValue === 2,
    id: statusTypeId === VerificationStatus.VERIFIED || Number(user.is_verified) === 1,
    idPending: statusTypeId === VerificationStatus.PENDING,
    fullyVerified: isUserFullyVerified(user),
  };
};
