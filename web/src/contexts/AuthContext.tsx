/**
 * AuthContext.tsx — Contexto de Autenticação com Suporte Híbrido (Supabase + Demo Local)
 * Padrão Matt Pocock: Tipagem rigorosa, sem "any", tratamento seguro de erros.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, withTimeout } from '../services/supabaseClient';

export interface UserQuota {
  currentCount: number;
  maxCount: number;
  usedBytes: number;
  maxBytes: number;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  quota: UserQuota;
  signInWithEmail: (email: string, pass: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<{ error?: string; message?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_DEMO_KEY = 'edital_audit_demo_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();

  // Cota padrão inicial: 3 a 5 editais (30 MB)
  const [quota] = useState<UserQuota>({
    currentCount: 1, // Exemplo inicial com projeto atual
    maxCount: 5,
    usedBytes: 3.2 * 1024 * 1024,
    maxBytes: 30 * 1024 * 1024
  });

  useEffect(() => {
    if (!isConfigured) {
      // Modo Demo Local (Fallback quando Supabase não tem chaves configuradas)
      const saved = localStorage.getItem(LOCAL_STORAGE_DEMO_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setUser(parsed.user);
          setSession(parsed.session);
        } catch {
          localStorage.removeItem(LOCAL_STORAGE_DEMO_KEY);
        }
      }
      setLoading(false);
      return;
    }

    // Inicialização real com Supabase
    withTimeout(supabase.auth.getSession(), 3000)
      .then(({ data: { session: currentSession } }) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      })
      .catch((err) => {
        console.warn('[AUTH] Falha ao obter sessão do Supabase (operando offline):', err);
      })
      .finally(() => {
        setLoading(false);
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  const signInWithEmail = async (email: string, pass: string): Promise<{ error?: string }> => {
    if (!email || !pass) return { error: 'E-mail e senha são obrigatórios.' };

    if (!isConfigured) {
      // Login em Modo Demonstração Local
      const demoUser = {
        id: 'demo-user-id',
        email,
        user_metadata: { full_name: email.split('@')[0] },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      } as unknown as User;

      const demoSession = {
        access_token: 'demo-token',
        token_type: 'bearer',
        user: demoUser
      } as unknown as Session;

      setUser(demoUser);
      setSession(demoSession);
      localStorage.setItem(LOCAL_STORAGE_DEMO_KEY, JSON.stringify({ user: demoUser, session: demoSession }));
      return {};
    }

    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password: pass }),
        3500
      );
      if (error) return { error: error.message };
      return {};
    } catch (err) {
      return { error: (err as Error).message || 'Tempo limite esgotado ao contatar servidor de autenticação.' };
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string): Promise<{ error?: string; message?: string }> => {
    if (!email || !pass) return { error: 'E-mail e senha são obrigatórios.' };
    if (pass.length < 6) return { error: 'A senha deve ter pelo menos 6 caracteres.' };

    if (!isConfigured) {
      const demoUser = {
        id: 'demo-user-id',
        email,
        user_metadata: { full_name: name || email.split('@')[0] },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      } as unknown as User;

      const demoSession = {
        access_token: 'demo-token',
        token_type: 'bearer',
        user: demoUser
      } as unknown as Session;

      setUser(demoUser);
      setSession(demoSession);
      localStorage.setItem(LOCAL_STORAGE_DEMO_KEY, JSON.stringify({ user: demoUser, session: demoSession }));
      return { message: 'Conta criada com sucesso (Modo Demonstração Ativo).' };
    }

    try {
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email,
          password: pass,
          options: {
            data: { full_name: name || '' }
          }
        }),
        3500
      );

      if (error) return { error: error.message };

      if (data.session) {
        return { message: 'Conta criada e autenticada com sucesso!' };
      }
      return { message: 'Cadastro realizado! Verifique sua caixa de entrada para confirmar o e-mail.' };
    } catch (err) {
      return { error: (err as Error).message || 'Tempo limite esgotado no cadastro.' };
    }
  };

  const signInWithGoogle = async (): Promise<{ error?: string }> => {
    if (!isConfigured) {
      return signInWithEmail('usuario.google@exemplo.com', 'demo123');
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) return { error: error.message };
      return {};
    } catch (err) {
      return { error: (err as Error).message || 'Erro ao conectar com Google OAuth.' };
    }
  };

  const signOut = async (): Promise<void> => {
    if (!isConfigured) {
      setUser(null);
      setSession(null);
      localStorage.removeItem(LOCAL_STORAGE_DEMO_KEY);
      return;
    }

    try {
      await withTimeout(supabase.auth.signOut(), 2000);
    } catch {
      // Silencioso se der timeout
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  const resetPassword = async (email: string): Promise<{ error?: string; message?: string }> => {
    if (!email) return { error: 'Informe seu e-mail para recuperar a senha.' };

    if (!isConfigured) {
      return { message: 'Link de recuperação simulado com sucesso (Modo Demonstração).' };
    }

    try {
      const { error } = await withTimeout(
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`
        }),
        3000
      );
      if (error) return { error: error.message };
      return { message: 'E-mail de redefinição enviado! Verifique sua caixa de entrada.' };
    } catch (err) {
      return { error: (err as Error).message || 'Falha ao solicitar redefinição.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured,
        quota,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        resetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um <AuthProvider>');
  }
  return context;
}
