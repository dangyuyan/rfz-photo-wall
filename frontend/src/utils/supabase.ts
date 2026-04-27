import { createClient } from "@supabase/supabase-js"

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseBucket =
  import.meta.env.VITE_SUPABASE_BUCKET || import.meta.env.SUPABASE_BUCKET || "photos"

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)
export const uploadBucket = supabaseBucket

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null

export function getSupabaseClientOrThrow() {
  if (!supabase) {
    throw new Error(
      "缺少 Supabase 配置：请设置 VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY（或 NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY）。",
    )
  }

  return supabase
}
