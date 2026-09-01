export const SUPABASE_CONFIG = {
  url: 'https://psdscbmovprvlzrqvquh.supabase.co',
  anonKey: 'sb_publishable_VkiMJvh1-VGnjnwscMxZLA_O7JJVWXz',
};

export const isSupabaseConfigured = (): boolean =>
  !SUPABASE_CONFIG.url.includes('YOUR-PROJECT') &&
  !SUPABASE_CONFIG.anonKey.includes('YOUR-ANON-KEY');
