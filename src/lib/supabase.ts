import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  
  if (error?.message) {
    // Handle specific error messages
    if (error.message.includes('duplicate key')) {
      if (error.message.includes('contact_number')) {
        return 'This contact number is already registered';
      }
      return 'This information is already registered';
    }
    
    if (error.message.includes('violates row-level security')) {
      return 'You do not have permission to perform this action';
    }
    
    if (error.message.includes('JWT expired')) {
      return 'Your session has expired. Please log in again.';
    }
    
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
};