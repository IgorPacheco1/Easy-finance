-- =============================================================================
-- V9: permissões do usuário do banco que o app usa (M7, #248, ADR-0034).
--
-- O app conecta como guarda_app, que NÃO é dono das tabelas: só lê e grava dados. Ele não cria,
-- não altera e não apaga tabelas, e (a partir do RLS) não escapa das políticas de linha.
-- O guarda_app é criado fora das migrations (script do compose, testes ou provedor do banco),
-- porque criar usuário exige privilégio de administrador e senha, que não ficam no repositório.
-- =============================================================================

GRANT USAGE ON SCHEMA public TO guarda_app;

-- Dados: só ler, inserir, alterar e apagar linhas.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO guarda_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO guarda_app;

-- O histórico das migrations é do Flyway: o app não lê nem altera.
REVOKE ALL ON flyway_schema_history FROM guarda_app;

-- Tabelas e sequências criadas por migrations futuras (pelo mesmo dono) já nascem com as mesmas
-- permissões, para nenhuma tabela nova ficar inacessível ao app por esquecimento.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO guarda_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO guarda_app;
