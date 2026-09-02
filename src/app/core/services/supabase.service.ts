import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG, isSupabaseConfigured } from '../config/supabase.config';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly configured = isSupabaseConfigured();
  readonly client: SupabaseClient | null = this.createClient();

  private createClient(): SupabaseClient | null {
    if (!this.configured) return null;
    return createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  }
}
