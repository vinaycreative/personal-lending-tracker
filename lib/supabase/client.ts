import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE

if (!url || !anonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

// Minimal Supabase client for both server actions and client components.
// No auth/cookie wiring—just plain CRUD with the anon key.
export const supabase = createClient<Database>(url, anonKey)
