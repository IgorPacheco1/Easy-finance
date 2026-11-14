-- =============================================================================
-- V4: usuário e dono dos dados (M5, #123).
--
-- Até a V3 os dados não tinham dono: quem chegasse na API enxergava e alterava tudo. A partir daqui:
--   - nasce a tabela usuario;
--   - toda transação (e todo id de transação excluída) pertence a um usuário;
--   - categoria personalizada pertence a um usuário; categoria do sistema não tem dono.
--
-- ATENÇÃO, esta migration APAGA dados. Planejamento do M5 (#121): o que existe hoje no banco
-- local é dado de teste, sem dono, então é descartado em vez de ser atribuído a alguém
-- por palpite. Ficam só as categorias do sistema (V2).
--
-- Fonte: docs/architecture/domain-model.md e docs/architecture/schema.dbml.
-- Regra do Flyway: depois de aplicada, esta migration NUNCA é editada.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Dados sem dono: apagados. A ordem importa por causa das chaves estrangeiras
--    (transacao aponta para categoria, então as transações saem primeiro).
-- -----------------------------------------------------------------------------
DELETE FROM transacao;
DELETE FROM transacao_excluida;
DELETE FROM categoria WHERE NOT sistema;


-- -----------------------------------------------------------------------------
-- 2. usuario: quem tem conta no Easy Finance.
-- -----------------------------------------------------------------------------
CREATE TABLE usuario (
    id             UUID          NOT NULL DEFAULT gen_random_uuid(),
    -- 254 caracteres é o tamanho máximo de um e-mail (RFC 5321).
    email          VARCHAR(254)  NOT NULL,
    -- Só o hash da senha (BCrypt, com o prefixo do algoritmo), nunca a senha (ADR-0020).
    senha_hash     VARCHAR(255)  NOT NULL,
    criado_em      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    atualizado_em  TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT pk_usuario PRIMARY KEY (id),
    CONSTRAINT ck_usuario_email_nao_vazio CHECK (char_length(trim(email)) > 0),
    -- O e-mail é sempre gravado em minúsculas (a aplicação normaliza). Com esta regra o banco
    -- garante isso, e a unicidade abaixo vale para "Ana@x.com" e "ana@x.com" ao mesmo tempo.
    CONSTRAINT ck_usuario_email_minusculo CHECK (email = lower(email)),
    CONSTRAINT uk_usuario_email UNIQUE (email)
);


-- -----------------------------------------------------------------------------
-- 3. transacao: dona obrigatória. Se o usuário some (excluir conta, LGPD), as transações
--    dele somem junto (ON DELETE CASCADE). A tabela está vazia neste ponto, então o NOT NULL
--    entra sem precisar de valor padrão.
-- -----------------------------------------------------------------------------
ALTER TABLE transacao
    ADD COLUMN usuario_id UUID NOT NULL,
    ADD CONSTRAINT fk_transacao_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuario (id) ON DELETE CASCADE;

-- A tela principal é "o mês de um usuário": o índice só por data (V1) dá lugar a este.
DROP INDEX idx_transacao_data;
CREATE INDEX idx_transacao_usuario_data ON transacao (usuario_id, data);


-- -----------------------------------------------------------------------------
-- 4. transacao_excluida: também tem dono, para a exclusão da conta levar os ids junto e
--    (issue de isolamento das transações) o 410 não revelar nada de outra conta.
-- -----------------------------------------------------------------------------
ALTER TABLE transacao_excluida
    ADD COLUMN usuario_id UUID NOT NULL,
    ADD CONSTRAINT fk_transacao_excluida_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuario (id) ON DELETE CASCADE;

-- Sem este índice, apagar uma conta leria a tabela inteira para achar os ids dela
-- (o PostgreSQL não cria índice para chave estrangeira sozinho).
CREATE INDEX idx_transacao_excluida_usuario ON transacao_excluida (usuario_id);


-- -----------------------------------------------------------------------------
-- 5. categoria: NULL = do sistema (de todos); preenchido = personalizada, só do dono.
-- -----------------------------------------------------------------------------
ALTER TABLE categoria
    ADD COLUMN usuario_id UUID,
    ADD CONSTRAINT fk_categoria_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuario (id) ON DELETE CASCADE,
    -- Duas formas de categoria, e só elas: do sistema sem dono, ou personalizada com dono.
    ADD CONSTRAINT ck_categoria_dono CHECK (
        (sistema AND usuario_id IS NULL) OR (NOT sistema AND usuario_id IS NOT NULL));

-- O nome era único no banco todo (V1). Agora é único dentro de cada "dono": entre as do
-- sistema e, separadamente, entre as de cada usuário. Os dois índices começam com
-- "uk_categoria_nome" de propósito: o service reconhece essa violação pelo prefixo.
DROP INDEX uk_categoria_nome;
CREATE UNIQUE INDEX uk_categoria_nome_sistema ON categoria (lower(nome)) WHERE usuario_id IS NULL;
CREATE UNIQUE INDEX uk_categoria_nome_usuario ON categoria (usuario_id, lower(nome)) WHERE usuario_id IS NOT NULL;
