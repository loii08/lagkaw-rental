

import { supabase, supabaseAdmin } from './supabase';
import { UserRole, VerificationStatus } from '../types';


export const createDefaultAdmin = async () => {
  const adminEmail = 'admin@admin.com';
  const adminPassword = '1';
  const adminName = 'System Administrator';

  try {
    console.log('Creating default admin account...');


    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminName,
        role: UserRole.ADMIN
      }
    });

    if (authError) {

      if (authError.message.includes('already registered')) {
        console.log('Admin account already exists');
        return { success: true, message: 'Admin account already exists' };
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to create admin user');
    }


    const profileData = {
      id: authData.user.id,
      email: adminEmail,
      full_name: adminName,
      role: UserRole.ADMIN,
      avatar_url: '/img/default-profile.png',
      is_verified: 1,
      status_type_id: VerificationStatus.VERIFIED,
      email_verified: 1,
      phone_verified: 1,
      phone: '+0987654321'
    };

    const { error: profileError } = await supabaseAdmin.from('profiles').insert(profileData);

    if (profileError) {

      if (profileError.code === '23505') {
        console.log('Admin profile already exists');
        return { success: true, message: 'Admin account already exists' };
      }
      throw profileError;
    }

    console.log('Default admin account created successfully');
    console.log('Email: admin@admin.com');
    console.log('Password: 1');

    return { success: true, message: 'Default admin account created successfully' };

  } catch (error: any) {
    console.error('Error creating default admin:', error);
    return { success: false, message: error.message };
  }
};


export const resetAdminPassword = async (newPassword: string) => {
  try {

    const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) throw listError;

    const adminUser = (data as any)?.users?.find((user: any) => user.email === 'admin@admin.com');

    if (!adminUser) {
      throw new Error('Admin user not found');
    }


    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      adminUser.id,
      { password: newPassword }
    );

    if (error) throw error;

    console.log('Admin password updated successfully');
    return { success: true, message: 'Admin password updated' };

  } catch (error: any) {
    console.error('Error updating admin password:', error);
    return { success: false, message: error.message };
  }
};
