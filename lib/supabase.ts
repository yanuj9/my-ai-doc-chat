// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 1. Log to the terminal/console to see what the app sees
if (!supabaseUrl || !supabaseAnonKey) {
  console.log("🛠️ ENV CHECK:");
  console.log("URL:", supabaseUrl ? "✅ Found" : "❌ MISSING");
  console.log("Anon Key:", supabaseAnonKey ? "✅ Found" : "❌ MISSING");
}

// 2. Only create the client if we have the variables
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null as any;

export const supabaseAdmin = (supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null as any;