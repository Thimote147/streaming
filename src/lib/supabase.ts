import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Profile {
  id: string;
  username: string;
  role: 'member' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface AccessRequest {
  id: string;
  user_id: string;
  email: string;
  username: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  language: 'en' | 'fr';
  theme: 'light' | 'dark';
  adult_content: boolean;
  created_at: string;
  updated_at: string;
}

export interface WatchProgress {
  id: string;
  user_id: string;
  movie_path: string;
  movie_title: string;
  current_position: number; // en secondes
  duration?: number; // en secondes
  progress_percentage: number; // 0-100
  last_watched_at: string;
  created_at: string;
  updated_at: string;
}

export interface WatchHistory {
  id: string;
  user_id: string;
  movie_path: string;
  movie_title: string;
  watch_duration: number; // en secondes
  total_duration?: number; // en secondes
  completion_percentage: number; // 0-100
  watched_at: string;
  session_start?: string;
  session_end?: string;
}

export type WatchStatus = 'started' | 'in_progress' | 'completed';