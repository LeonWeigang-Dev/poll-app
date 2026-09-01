export const SUPABASE_CONFIG = {
  url: 'https://YOUR-PROJECT.supabase.co',
  anonKey: 'YOUR-ANON-KEY',
};

export const isSupabaseConfigured = (): boolean =>
  !SUPABASE_CONFIG.url.includes('YOUR-PROJECT') &&
  !SUPABASE_CONFIG.anonKey.includes('YOUR-ANON-KEY');
