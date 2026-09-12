import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Debugging log to see if the key is making it into the client browser
  console.log("Supabase Client Init:");
  console.log("URL exists:", !!supabaseUrl, "| Length:", supabaseUrl.length);
  console.log("Anon Key exists:", !!supabaseKey, "| Length:", supabaseKey.length);
  
  if (supabaseKey.length < 10) {
    console.error("CRITICAL ERROR: Supabase Anon Key is empty, missing, or too short in this environment!");
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseKey
  )
}
