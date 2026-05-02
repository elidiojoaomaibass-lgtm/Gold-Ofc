import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null as any;

if (!supabase) {
  console.warn('⚠️ Supabase URL e/ou ANON KEY não configurados. Algumas funcionalidades podem estar limitadas.');
}

// ---- Tipos das tabelas ----

export interface CmsSettings {
  id: number;
  autoplay_enabled: boolean;
  video_url: string | null;
  updated_at: string;
}

export interface GalleryImage {
  id: number;
  data_url: string;
  created_at: string;
}
