import { createClient } from '@supabase/supabase-js';
import { Product, OrderType } from './types'; // Assuming types.ts defines these

// Define a type for your database schema if you have one, otherwise use generic types
// For this example, we'll use generic types for simplicity with specific table structures mentioned.
export interface Database {
  public: {
    Tables: {
      products: {
        Row: Product; // Product type from your types.ts
        Insert: Product; // Client provides ID, so this is the full Product type
        Update: Partial<Product>; // For updating products
      };
      orders: {
        Row: OrderType; // OrderType from your types.ts
        Insert: OrderType; // Client provides ID, so this is the full OrderType
        Update: Partial<OrderType>;
      };
      sessions: {
        Row: {
          id: string; // UUID
          email: string;
          store_name: string;
          created_at: string;
          last_active_at: string;
        };
        Insert: {
          id: string;
          email: string;
          store_name: string;
          last_active_at?: string; // created_at is handled by db
        };
        Update: {
          last_active_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
}


const supabaseUrl = 'https://xdfoubwivcmxqprwslby.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkZm91YndpdmNteHFwcndzbGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDkzNTYsImV4cCI6MjA2NjI4NTM1Nn0.S-MUHQxn5GCBWn_WJalLFhdGOO7_CwWYyPv5ln6BSOo';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);