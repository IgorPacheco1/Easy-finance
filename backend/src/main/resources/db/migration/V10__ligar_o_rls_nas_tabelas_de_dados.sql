-- =============================================================================
-- V10: RLS (Row Level Security) nas tabelas com dados da pessoa (M7, #249, ADR-0034).
--
-- Segunda camada de isolamento, dentro do banco: mesmo que uma consulta do app esqueça o
-- filtro por usuario_id, o PostgreSQL só devolve as linhas da pessoa logada.
--
-- Quem está logado chega ao banco por transação: o backend roda
-- set_config('app.usuario_id', <id>, true) no começo de cada uma (TransacaoComUsuarioNoBanco).
-- Sem pessoa logada, o valor fica vazio e as políticas não mostram nenhuma linha (falha fechada).
--
-- As políticas valem para o guarda_app, que não é dono das tabelas (V9). O dono (usado só pelas
-- migrations) não passa pelas políticas, para uma migration de dados futura não ser filtrada
-- sem aviso.
-- =============================================================================

-- Quem está logado nesta transação. NULLIF porque, depois de uma transação com set_config, a
-- variável volta como texto vazio (e não nulo) na mesma conexão; texto vazio não vira uuid.
CREATE FUNCTION usuario_logado() RETURNS uuid
    LANGUAGE sql
    STABLE
AS $$
    SELECT NULLIF(current_setting('app.usuario_id', true), '')::uuid
$$;

-- transacao: só as da pessoa logada, para ler e para gravar.
ALTER TABLE transacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY transacao_da_pessoa ON transacao
    USING (usuario_id = usuario_logado())
    WITH CHECK (usuario_id = usuario_logado());

-- transacao_excluida: igual (o 410 é por pessoa, ADR-0026).
ALTER TABLE transacao_excluida ENABLE ROW LEVEL SECURITY;
CREATE POLICY transacao_excluida_da_pessoa ON transacao_excluida
    USING (usuario_id = usuario_logado())
    WITH CHECK (usuario_id = usuario_logado());

-- categoria: todos leem as do sistema (usuario_id nulo) e as próprias; só as próprias mudam.
ALTER TABLE categoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY categoria_leitura ON categoria FOR SELECT
    USING (usuario_id IS NULL OR usuario_id = usuario_logado());
CREATE POLICY categoria_criacao ON categoria FOR INSERT
    WITH CHECK (usuario_id = usuario_logado());
CREATE POLICY categoria_alteracao ON categoria FOR UPDATE
    USING (usuario_id = usuario_logado())
    WITH CHECK (usuario_id = usuario_logado());
CREATE POLICY categoria_exclusao ON categoria FOR DELETE
    USING (usuario_id = usuario_logado());
