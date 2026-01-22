// Database types for Supabase
// These match the schema defined in supabase/schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          completed: boolean;
          scheduled_time: string | null;
          scheduled_date: string | null;
          duration: number;
          priority: 'low' | 'medium' | 'high';
          energy_level: 'low' | 'medium' | 'high';
          motivation_level: 'hate' | 'dislike' | 'neutral' | 'like' | 'love';
          is_locked: boolean;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          description?: string | null;
          completed?: boolean;
          scheduled_time?: string | null;
          scheduled_date?: string | null;
          duration: number;
          priority?: 'low' | 'medium' | 'high';
          energy_level?: 'low' | 'medium' | 'high';
          motivation_level?: 'hate' | 'dislike' | 'neutral' | 'like' | 'love';
          is_locked?: boolean;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          completed?: boolean;
          scheduled_time?: string | null;
          scheduled_date?: string | null;
          duration?: number;
          priority?: 'low' | 'medium' | 'high';
          energy_level?: 'low' | 'medium' | 'high';
          motivation_level?: 'hate' | 'dislike' | 'neutral' | 'like' | 'love';
          is_locked?: boolean;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      calendar_events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          start_time: string;
          end_time: string;
          is_external: boolean;
          external_id: string | null;
          calendar_source: string | null;
          location: string | null;
          energy_level: 'low' | 'medium' | 'high' | null;
          energy_drain: number | null;
          is_dismissed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          start_time: string;
          end_time: string;
          is_external?: boolean;
          external_id?: string | null;
          calendar_source?: string | null;
          location?: string | null;
          energy_level?: 'low' | 'medium' | 'high' | null;
          energy_drain?: number | null;
          is_dismissed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          start_time?: string;
          end_time?: string;
          is_external?: boolean;
          external_id?: string | null;
          calendar_source?: string | null;
          location?: string | null;
          energy_level?: 'low' | 'medium' | 'high' | null;
          energy_drain?: number | null;
          is_dismissed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_energy: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          energy_level: 'exhausted' | 'low' | 'medium' | 'high' | 'energized';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          date: string;
          energy_level: 'exhausted' | 'low' | 'medium' | 'high' | 'energized';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          energy_level?: 'exhausted' | 'low' | 'medium' | 'high' | 'energized';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      priority_level: 'low' | 'medium' | 'high';
      energy_level: 'low' | 'medium' | 'high';
      motivation_level: 'hate' | 'dislike' | 'neutral' | 'like' | 'love';
      daily_energy_level: 'exhausted' | 'low' | 'medium' | 'high' | 'energized';
    };
    CompositeTypes: Record<string, never>;
  };
}

// Helper types for use in repositories
export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export type EventRow = Database['public']['Tables']['calendar_events']['Row'];
export type EventInsert = Database['public']['Tables']['calendar_events']['Insert'];
export type EventUpdate = Database['public']['Tables']['calendar_events']['Update'];

export type EnergyRow = Database['public']['Tables']['daily_energy']['Row'];
export type EnergyInsert = Database['public']['Tables']['daily_energy']['Insert'];
export type EnergyUpdate = Database['public']['Tables']['daily_energy']['Update'];
