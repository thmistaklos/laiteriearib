import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xdfoubwivcmxqprwslby.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkZm91YndpdmNteHFwcndzbGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDkzNTYsImV4cCI6MjA2NjI4NTM1Nn0.S-MUHQxn5GCBWn_WJalLFhdGOO7_CwWYyPv5ln6BSOo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
