import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

export type Document = {
  id: string
  user_id: string
  name: string
  file_type: string
  file_size: number
  storage_path: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  extracted_text?: string
  processing_time?: number
  error_message?: string
  created_at: string
  updated_at: string
}

export type ExtractedEvent = {
  id: string
  document_id: string
  user_id: string
  title: string
  description?: string
  event_date: string
  start_time?: string
  end_time?: string
  location?: string
  category: 'assignment' | 'exam' | 'meeting' | 'deadline' | 'milestone' | 'other'
  priority: 'critical' | 'high' | 'medium' | 'low'
  confidence: number
  is_imported: boolean
  created_at: string
  updated_at: string
}
