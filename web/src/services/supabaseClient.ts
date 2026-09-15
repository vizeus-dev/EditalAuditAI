/**
 * supabaseClient.ts — Cliente Supabase Resiliente com Timeouts Estritos
 * Padrão: learned-resilient-db-timeouts
 * Garante que consultas remotas não travem o navegador e caiam graciosamente em fallback local.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Variáveis de ambiente Vite / Next.js
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL) as string | undefined;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    supabaseAnonKey.length > 15
  );
};

// Se não configurado via env, usa o projeto padrão configurado
const defaultUrl = 'https://mpbhbhjqvyjczpohtgid.supabase.co';
const defaultKey = 'sb_publishable_QMW-b1VbVbaqBZ_LFMo4Ew_ZiTPALSM';

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? (supabaseUrl as string) : defaultUrl,
  isSupabaseConfigured() ? (supabaseAnonKey as string) : defaultKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'edital_audit_auth_token'
    }
  }
);

/**
 * Envolve qualquer Promise do Supabase em um timeout agressivo (padrão 2500ms).
 * Se a nuvem oscilar, rejeita rápido e permite ao app usar o IndexedDB local.
 */
export function withTimeout<T>(promise: PromiseLike<T>, ms = 2500): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`[SUPABASE_TIMEOUT] Limite de ${ms}ms excedido na requisição remota.`)),
        ms
      )
    )
  ]);
}
