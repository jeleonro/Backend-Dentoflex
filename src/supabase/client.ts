import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Faltan variables de entorno de Supabase. Revisa tu archivo .env');
}

// Cliente público (respeta RLS) - usado para auth del usuario
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey);

// Cliente admin (bypassa RLS) - usado solo en el backend con service_role
export const supabaseAdmin = createClient<any>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
