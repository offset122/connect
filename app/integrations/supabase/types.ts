// Minimal supabase types used by the client. Generated manually to avoid
// using the CLI inside this environment. Replace by running
// `npx supabase gen types typescript --project-id <id> > ./types.ts` when ready.

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];
export type JsonValue = Json;

export interface Database {
  public: {
    Tables: {
      users: {
        Row: { 
          id: string; 
          auth_id?: string | null;
          email: string; 
          first_name: string; 
          is_admin: boolean;
          payment_status?: string | null;
          created_at: string | null; 
          updated_at: string | null;
        };
        Insert: { 
          id?: string; 
          auth_id?: string | null;
          email: string; 
          first_name: string; 
          is_admin: boolean;
          payment_status?: string | null;
          created_at?: string | null; 
          updated_at?: string | null;
        };
        Update: { 
          id?: string; 
          auth_id?: string | null;
          email?: string; 
          first_name?: string; 
          is_admin?: boolean;
          payment_status?: string | null;
          created_at?: string | null; 
          updated_at?: string | null;
        };
      };
      connections: {
        Row: { id: string; requester_id: string; recipient_id: string; status: string; created_at: string | null };
        Insert: { id?: string; requester_id: string; recipient_id: string; status?: string; created_at?: string | null };
        Update: { id?: string; requester_id?: string; recipient_id?: string; status?: string; created_at?: string | null };
      };
      messages: {
        Row: { id: string; sender_id: string; receiver_id: string; content: string; created_at: string | null };
        Insert: { id?: string; sender_id: string; receiver_id: string; content: string; created_at?: string | null };
        Update: { id?: string; sender_id?: string; receiver_id?: string; content?: string; created_at?: string | null };
      };
      notifications: {
        Row: { id: string; user_id: string; title: string; body: string; data: Json | null; read: boolean; created_at: string | null };
        Insert: { id?: string; user_id: string; title: string; body: string; data?: Json | null; read?: boolean; created_at?: string | null };
        Update: { id?: string; user_id?: string; title?: string; body?: string; data?: Json | null; read?: boolean; created_at?: string | null };
      };
      reports: {
        Row: { id: string; reporter_id: string; reported_user_id: string; reason: string; status: string; created_at: string | null };
        Insert: { id?: string; reporter_id: string; reported_user_id: string; reason: string; status?: string; created_at?: string | null };
        Update: { id?: string; reporter_id?: string; reported_user_id?: string; reason?: string; status?: string; created_at?: string | null };
      };
    };
    Views: { [key: string]: never };
    Functions: { [key: string]: never };
    Enums: { [key: string]: never };
    CompositeTypes: { [key: string]: never };
  };
}
