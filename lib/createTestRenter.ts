

import { supabaseAdmin } from './supabase';
import { UserRole, VerificationStatus } from '../types';

export const createTestRenter = async () => {
  const renterEmail = 'renter@test.com';
  const renterPassword = '123456';
  const renterName = 'Test Renter';

  try {
    console.log('Creating test renter account with PENDING verification...');


    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: renterEmail,
      password: renterPassword,
      email_confirm: true,
      user_metadata: {
        full_name: renterName,
        role: UserRole.RENTER
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('Test renter account already exists');
        return { success: true, message: 'Test renter account already exists' };
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to create test renter user');
    }


    const profileData = {
      id: authData.user.id,
      email: renterEmail,
      full_name: renterName,
      role: UserRole.RENTER,
      avatar_url: '/img/default-profile.png',
      is_verified: 0,
      status_type_id: VerificationStatus.PENDING,
      email_verified: 0,
      phone_verified: 0,
      phone: '+1234567890'
    };

    const { error: profileError } = await supabaseAdmin.from('profiles').insert(profileData);

    if (profileError) {
      if (profileError.code === '23505') {
        console.log('Test renter profile already exists');
        return { success: true, message: 'Test renter account already exists' };
      }
      throw profileError;
    }

    console.log('Test renter account created successfully with PENDING verification');
    console.log('Email: renter@test.com');
    console.log('Password: 123456');
    console.log('Status: PENDING verification (admin can verify)');

    return { success: true, message: 'Test renter account created successfully' };

  } catch (error: any) {
    console.error('Error creating test renter:', error);
    return { success: false, message: error.message };
  }
};
