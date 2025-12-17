

import { createDefaultAdmin } from './seedDatabase';


export const runOneTimeSetup = async () => {
  console.log('Starting one-time database setup...');


  const setupKey = 'lagkaw_setup_completed';
  const setupStatus = localStorage.getItem(setupKey);

  if (setupStatus) {
    console.log('Database setup already completed');
    return { success: true, message: 'Setup already completed' };
  }

  try {

    const result = await createDefaultAdmin();

    if (result.success) {

      localStorage.setItem(setupKey, 'true');
      console.log('Database setup completed successfully');
      return { success: true, message: 'Database setup completed successfully' };
    } else {
      throw new Error(result.message);
    }

  } catch (error: any) {
    console.error('Database setup failed:', error);
    return { success: false, message: error.message };
  }
};
