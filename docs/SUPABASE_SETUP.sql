-- ==============================================================================
-- EDITALAUDIT AI — ESQUEMA DE BANCO SUPABASE (CUSTO ZERO / MULTI-TENANT)
-- Projeto: https://supabase.com/dashboard/project/mpbhbhjqvyjczpohtgid
-- Instruções: Cole este script no SQL Editor do Supabase e clique em RUN.
-- ==============================================================================

-- 1. TABELA DE PERFIS DE USUÁRIO (Armazena cota e metadados)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    storage_quota INT DEFAULT 5, -- Cota padrão: 5 editais salvos por usuário
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativa Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso para Perfis:
DROP POLICY IF EXISTS "Usuários podem ver apenas seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem ver apenas seu próprio perfil" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Trigger para criar perfil automaticamente no primeiro cadastro (Google ou Email)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. TABELA DE EDITAIS E AUDITORIAS
CREATE TABLE IF NOT EXISTS public.editais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_filename TEXT,
    file_size_bytes BIGINT DEFAULT 0,
    overall_score INT DEFAULT 0,
    status TEXT DEFAULT 'pronto',
    is_public BOOLEAN DEFAULT FALSE,
    share_token TEXT UNIQUE,
    audit_report JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_editais_user_id ON public.editais(user_id);
CREATE INDEX IF NOT EXISTS idx_editais_share_token ON public.editais(share_token);

-- Ativa Row Level Security (RLS)
ALTER TABLE public.editais ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso para Editais:
DROP POLICY IF EXISTS "Usuários gerenciam seus próprios editais" ON public.editais;
CREATE POLICY "Usuários gerenciam seus próprios editais" 
    ON public.editais FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Qualquer um pode ler edital público via link" ON public.editais;
CREATE POLICY "Qualquer um pode ler edital público via link" 
    ON public.editais FOR SELECT 
    USING (is_public = TRUE);

-- ==============================================================================
-- PRONTO! Seu banco Supabase está configurado com segurança total (RLS).
-- ==============================================================================
