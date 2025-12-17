

import { supabaseAdmin } from './supabase';
import { UserRole, VerificationStatus } from '../types';

export const createTestOwner = async () => {
  const ownerEmail = 'owner@test.com';
  const ownerPassword = '123456';
  const ownerName = 'Test Owner';

  try {
    console.log('Creating test owner account...');


    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: {
        full_name: ownerName,
        role: UserRole.OWNER
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('Test owner account already exists');
        return { success: true, message: 'Test owner account already exists' };
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to create test owner user');
    }


    const profileData = {
      id: authData.user.id,
      email: ownerEmail,
      full_name: ownerName,
      role: UserRole.OWNER,
      avatar_url: '/img/default-profile.png',
      is_verified: 1,
      status_type_id: VerificationStatus.VERIFIED
    };

    const { error: profileError } = await supabaseAdmin.from('profiles').insert(profileData);

    if (profileError) {
      if (profileError.code === '23505') {
        console.log('Test owner profile already exists');
        return { success: true, message: 'Test owner account already exists' };
      }
      throw profileError;
    }

    console.log('Test owner account created successfully');
    console.log('Email: owner@test.com');
    console.log('Password: 123456');

    return { success: true, message: 'Test owner account created successfully' };

  } catch (error: any) {
    console.error('Error creating test owner:', error);
    return { success: false, message: error.message };
  }
};
