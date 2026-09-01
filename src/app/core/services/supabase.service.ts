import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG, isSupabaseConfigured } from '../config/supabase.config';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient | null = this.createClient();
  readonly configured = isSupabaseConfigured();

  private createClient(): SupabaseClient | null {
    if (!isSupabaseConfigured()) return null;
    return createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  }
}
