-- =============================================================================
-- V8: nome e avatar do usuário (M6, #193, ADR-0032).
--
-- A tela Conta vira um perfil, com o nome da pessoa e um avatar com as iniciais dela.
--
--   - nome: pode ficar vazio (NULL). As contas criadas antes desta migration não têm nome; o app
--     pede o nome na próxima vez que a pessoa entrar. O cadastro novo já exige o nome (na API).
--   - avatar: sempre preenchido. Formato "iniciais:<cor>", com uma das 12 cores das categorias
--     (ADR-0031). O formato já deixa espaço para "mascote:<id>" no futuro. Sem foto: o app não
--     guarda arquivos de ninguém (ADR-0032).
--
-- Regra do Flyway: depois de aplicada, esta migration NUNCA é editada.
-- =============================================================================

ALTER TABLE usuario
    ADD COLUMN nome VARCHAR(60),
    ADD COLUMN avatar VARCHAR(40) NOT NULL DEFAULT 'iniciais:cinza';

-- Nome em branco não vale: quem não tem nome fica com NULL, e não com "" ou "   ".
ALTER TABLE usuario
    ADD CONSTRAINT ck_usuario_nome_preenchido CHECK (nome IS NULL OR length(btrim(nome)) > 0);
