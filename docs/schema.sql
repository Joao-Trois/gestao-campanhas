-- ============================================================
-- SCHEMA COMPLETO — Plataforma de Campanhas WhatsApp
-- Supabase / PostgreSQL
-- ============================================================


-- ============================================================
-- 1. PROFILES
-- ============================================================
CREATE TABLE profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    role            TEXT NOT NULL DEFAULT 'marketing' CHECK (role IN ('admin', 'marketing')),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cria profile automaticamente ao criar usuário no Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, nome, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome', ''),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- 2. TAGS
-- ============================================================
CREATE TABLE tags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        TEXT NOT NULL UNIQUE,
    cor         TEXT NOT NULL DEFAULT '#6C3FC8',
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 3. TEMPLATES
-- ============================================================
CREATE TABLE templates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome                TEXT NOT NULL,
    meta_template_id    TEXT NOT NULL UNIQUE,
    descricao           TEXT,
    texto               TEXT NOT NULL,
    variaveis           TEXT[] NOT NULL DEFAULT '{}',
    ativo               BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Atualiza atualizado_em automaticamente
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER templates_atualizado_em
    BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();


-- ============================================================
-- 4. TEMPLATE_TAGS (relação N:N)
-- ============================================================
CREATE TABLE template_tags (
    template_id     UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    tag_id          UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (template_id, tag_id)
);


-- ============================================================
-- 5. LISTAS_CONTATOS
-- ============================================================
CREATE TABLE listas_contatos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome            TEXT NOT NULL,
    arquivo_url     TEXT,
    colunas         TEXT[] NOT NULL DEFAULT '{}',
    total_contatos  INTEGER NOT NULL DEFAULT 0,
    criado_por      UUID REFERENCES profiles(id) ON DELETE SET NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 6. CONTATOS
-- ============================================================
CREATE TABLE contatos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lista_id        UUID NOT NULL REFERENCES listas_contatos(id) ON DELETE CASCADE,
    telefone        TEXT NOT NULL,
    dados           JSONB NOT NULL DEFAULT '{}',
    valido          BOOLEAN NOT NULL DEFAULT TRUE,
    motivo_invalido TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contatos_lista_id ON contatos(lista_id);
CREATE INDEX idx_contatos_telefone ON contatos(telefone);
CREATE INDEX idx_contatos_valido ON contatos(valido);


-- ============================================================
-- 7. CAMPANHAS
-- ============================================================
CREATE TABLE campanhas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome            TEXT NOT NULL,
    template_id     UUID REFERENCES templates(id) ON DELETE SET NULL,
    lista_id        UUID REFERENCES listas_contatos(id) ON DELETE SET NULL,
    mapeamento      JSONB NOT NULL DEFAULT '{}',
    status          TEXT NOT NULL DEFAULT 'rascunho' CHECK (
                        status IN (
                            'rascunho',
                            'agendada',
                            'em_andamento',
                            'concluida',
                            'cancelada',
                            'com_erros'
                        )
                    ),
    agendado_para   TIMESTAMPTZ,
    criado_por      UUID REFERENCES profiles(id) ON DELETE SET NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER campanhas_atualizado_em
    BEFORE UPDATE ON campanhas
    FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

CREATE INDEX idx_campanhas_status ON campanhas(status);
CREATE INDEX idx_campanhas_agendado_para ON campanhas(agendado_para);
CREATE INDEX idx_campanhas_criado_por ON campanhas(criado_por);


-- ============================================================
-- 8. ENTREGAS
-- ============================================================
CREATE TABLE entregas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campanha_id     UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
    contato_id      UUID REFERENCES contatos(id) ON DELETE SET NULL,
    telefone        TEXT NOT NULL,
    mensagem_final  TEXT,
    status          TEXT NOT NULL DEFAULT 'pendente' CHECK (
                        status IN (
                            'pendente',
                            'enviado',
                            'falhou',
                            'ignorado'
                        )
                    ),
    motivo_falha    TEXT,
    meta_message_id TEXT,
    enviado_em      TIMESTAMPTZ,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_entregas_campanha_id ON entregas(campanha_id);
CREATE INDEX idx_entregas_status ON entregas(status);
CREATE INDEX idx_entregas_contato_id ON entregas(contato_id);


-- ============================================================
-- 9. CONFIGURACOES
-- ============================================================
CREATE TABLE configuracoes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave           TEXT NOT NULL UNIQUE,
    valor           TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER configuracoes_atualizado_em
    BEFORE UPDATE ON configuracoes
    FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

-- Valores padrão
INSERT INTO configuracoes (chave, valor) VALUES
    ('n8n_webhook_base_url',    NULL),
    ('meta_api_token',          NULL),
    ('meta_waba_id',            NULL),
    ('meta_phone_number_id',    NULL),
    ('fuso_horario',            'America/Sao_Paulo');


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags             ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tags    ENABLE ROW LEVEL SECURITY;
ALTER TABLE listas_contatos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contatos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes    ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- Helper: verifica role do usuário autenticado
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ------------------------------------------------------------
-- PROFILES
-- ------------------------------------------------------------
-- Usuário vê apenas o próprio perfil
CREATE POLICY "profiles_select_own"
    ON profiles FOR SELECT
    USING (id = auth.uid());

-- Admin vê todos
CREATE POLICY "profiles_select_admin"
    ON profiles FOR SELECT
    USING (get_user_role() = 'admin');

-- Admin gerencia usuários
CREATE POLICY "profiles_insert_admin"
    ON profiles FOR INSERT
    WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "profiles_update_admin"
    ON profiles FOR UPDATE
    USING (get_user_role() = 'admin');


-- ------------------------------------------------------------
-- TAGS
-- ------------------------------------------------------------
-- Todos autenticados leem
CREATE POLICY "tags_select"
    ON tags FOR SELECT
    USING (auth.role() = 'authenticated');

-- Apenas admin gerencia
CREATE POLICY "tags_insert_admin"
    ON tags FOR INSERT
    WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "tags_update_admin"
    ON tags FOR UPDATE
    USING (get_user_role() = 'admin');

CREATE POLICY "tags_delete_admin"
    ON tags FOR DELETE
    USING (get_user_role() = 'admin');


-- ------------------------------------------------------------
-- TEMPLATES
-- ------------------------------------------------------------
CREATE POLICY "templates_select"
    ON templates FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "templates_insert"
    ON templates FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "templates_update"
    ON templates FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Apenas admin arquiva/deleta
CREATE POLICY "templates_delete_admin"
    ON templates FOR DELETE
    USING (get_user_role() = 'admin');


-- ------------------------------------------------------------
-- TEMPLATE_TAGS
-- ------------------------------------------------------------
CREATE POLICY "template_tags_select"
    ON template_tags FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "template_tags_insert"
    ON template_tags FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "template_tags_delete"
    ON template_tags FOR DELETE
    USING (auth.role() = 'authenticated');


-- ------------------------------------------------------------
-- LISTAS_CONTATOS
-- ------------------------------------------------------------
CREATE POLICY "listas_select"
    ON listas_contatos FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "listas_insert"
    ON listas_contatos FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Apenas quem criou ou admin pode deletar
CREATE POLICY "listas_delete"
    ON listas_contatos FOR DELETE
    USING (criado_por = auth.uid() OR get_user_role() = 'admin');


-- ------------------------------------------------------------
-- CONTATOS
-- ------------------------------------------------------------
CREATE POLICY "contatos_select"
    ON contatos FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "contatos_insert"
    ON contatos FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "contatos_delete"
    ON contatos FOR DELETE
    USING (auth.role() = 'authenticated');


-- ------------------------------------------------------------
-- CAMPANHAS
-- ------------------------------------------------------------
CREATE POLICY "campanhas_select"
    ON campanhas FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "campanhas_insert"
    ON campanhas FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "campanhas_update"
    ON campanhas FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Apenas admin deleta campanhas
CREATE POLICY "campanhas_delete_admin"
    ON campanhas FOR DELETE
    USING (get_user_role() = 'admin');


-- ------------------------------------------------------------
-- ENTREGAS
-- ------------------------------------------------------------
CREATE POLICY "entregas_select"
    ON entregas FOR SELECT
    USING (auth.role() = 'authenticated');

-- N8N insere via service_role (sem RLS)
CREATE POLICY "entregas_insert"
    ON entregas FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "entregas_update"
    ON entregas FOR UPDATE
    USING (auth.role() = 'authenticated');


-- ------------------------------------------------------------
-- CONFIGURACOES (apenas admin)
-- ------------------------------------------------------------
CREATE POLICY "configuracoes_select_admin"
    ON configuracoes FOR SELECT
    USING (get_user_role() = 'admin');

CREATE POLICY "configuracoes_update_admin"
    ON configuracoes FOR UPDATE
    USING (get_user_role() = 'admin');


-- ============================================================
-- REALTIME
-- Habilita realtime nas tabelas que o React precisa observar
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE campanhas;
ALTER PUBLICATION supabase_realtime ADD TABLE entregas;


-- ============================================================
-- STORAGE
-- Bucket para arquivos Excel das listas
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('listas', 'listas', FALSE);

-- Apenas autenticados fazem upload
CREATE POLICY "listas_storage_insert"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'listas' AND auth.role() = 'authenticated');

-- Apenas autenticados leem
CREATE POLICY "listas_storage_select"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'listas' AND auth.role() = 'authenticated');

-- Apenas admin ou dono deletam
CREATE POLICY "listas_storage_delete"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'listas' AND auth.role() = 'authenticated');
