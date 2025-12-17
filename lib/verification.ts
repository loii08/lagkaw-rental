

import { useAuth } from '../contexts/AuthContext';
import { VerificationStatus } from '../types';


export const useBookingVerification = () => {
  const { currentUser } = useAuth();

  const canBook = () => {
    if (!currentUser) {
      return { allowed: false, message: 'Please login to book properties' };
    }

    if (Number((currentUser as any).email_verified ?? 0) !== 1) {
      return {
        allowed: false,
        message: 'Please request email verification and wait for admin approval before booking properties.'
      };
    }

    if (!currentUser.is_verified) {
      return {
        allowed: false,
        message: 'Your account needs to be verified before booking properties. Please complete your profile verification.'
      };
    }

    return { allowed: true, message: '' };
  };

  return { canBook };
};


export const usePropertyPostingVerification = () => {
  const { currentUser } = useAuth();

  const canPostProperty = () => {
    if (!currentUser) {
      return { allowed: false, message: 'Please login to post properties' };
    }

    if (currentUser.role !== 'OWNER' && currentUser.role !== 'ADMIN') {
      return {
        allowed: false,
        message: 'Only property owners can post properties'
      };
    }

    if (Number((currentUser as any).email_verified ?? 0) !== 1) {
      return {
        allowed: false,
        message: 'Please request email verification and wait for admin approval before posting properties.'
      };
    }

    if (!currentUser.is_verified) {
      return {
        allowed: false,
        message: 'Your account needs to be verified before posting properties. Please complete your profile verification.'
      };
    }

    return { allowed: true, message: '' };
  };

  return { canPostProperty };
};


export const useApplicationVerification = () => {
  const { currentUser } = useAuth();

  const canApply = () => {
    if (!currentUser) {
      return { allowed: false, message: 'Please login to apply for properties' };
    }

    if (Number((currentUser as any).email_verified ?? 0) !== 1) {
      return {
        allowed: false,
        message: 'Please request email verification and wait for admin approval before applying for properties.'
      };
    }

    if (!currentUser.is_verified) {
      return {
        allowed: false,
        message: 'Your account needs to be verified before applying for properties. Please complete your profile verification.'
      };
    }

    return { allowed: true, message: '' };
  };

  return { canApply };
};
