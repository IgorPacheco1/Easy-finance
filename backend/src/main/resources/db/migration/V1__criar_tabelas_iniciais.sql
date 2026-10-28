-- =============================================================================
-- V1: schema inicial do Easy Finance (tabelas categoria e transacao).
--
-- Fonte: docs/architecture/domain-model.md e docs/architecture/schema.dbml.
-- Regra do Flyway: depois de aplicada, esta migration NUNCA é editada.
-- Qualquer mudança no schema vira uma migration nova (V3, V4...).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- categoria: classifica as transações. O tipo (RECEITA/DESPESA) fica aqui.
-- -----------------------------------------------------------------------------
CREATE TABLE categoria (
    -- UUID v4 gerado pelo próprio PostgreSQL: não sequencial, não adivinhável (ADR-0006).
    id         UUID         NOT NULL DEFAULT gen_random_uuid(),
    nome       VARCHAR(50)  NOT NULL,
    tipo       VARCHAR(10)  NOT NULL,
    -- true = categoria padrão do sistema, que o usuário não pode editar nem apagar.
    sistema    BOOLEAN      NOT NULL DEFAULT FALSE,
    -- TIMESTAMPTZ guarda o instante em UTC, independente do fuso de quem consulta.
    criado_em  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- Restrições com nome explícito: quando uma delas falhar, a mensagem de erro
    -- diz exatamente qual regra foi quebrada.
    CONSTRAINT pk_categoria PRIMARY KEY (id),
    -- O banco recusa qualquer tipo diferente desses dois, mesmo que um bug na API tente gravar.
    CONSTRAINT ck_categoria_tipo CHECK (tipo IN ('RECEITA', 'DESPESA')),
    -- Impede nome vazio ou só com espaços ("   ").
    CONSTRAINT ck_categoria_nome_nao_vazio CHECK (char_length(trim(nome)) > 0)
);

-- Nome único sem diferenciar maiúsculas: "Mercado" e "mercado" não podem coexistir.
-- É um índice (e não uma CONSTRAINT UNIQUE comum) porque usa a função lower().
CREATE UNIQUE INDEX uk_categoria_nome ON categoria (lower(nome));


-- -----------------------------------------------------------------------------
-- transacao: um lançamento de receita ou despesa.
-- -----------------------------------------------------------------------------
CREATE TABLE transacao (
    -- Também pode ser enviado pelo cliente, para criação idempotente (#19).
    id             UUID           NOT NULL DEFAULT gen_random_uuid(),
    categoria_id   UUID           NOT NULL,
    -- NUMERIC(19,2): valor exato, sem erro de arredondamento (ADR-0007). Nunca float/double.
    valor          NUMERIC(19, 2) NOT NULL,
    -- DATE: só o dia do lançamento ("gastei no dia 10"), sem hora e sem fuso.
    data           DATE           NOT NULL,
    -- Opcional: para lançar rápido no celular, a categoria já basta.
    descricao      VARCHAR(255),
    criado_em      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    -- Atualizado pela aplicação a cada alteração (o default vale só para a criação).
    atualizado_em  TIMESTAMPTZ    NOT NULL DEFAULT now(),

    CONSTRAINT pk_transacao PRIMARY KEY (id),
    -- Sempre positivo: se é entrada ou saída, quem diz é o tipo da categoria.
    -- Sem isso, uma "despesa de -50" viraria uma receita disfarçada.
    CONSTRAINT ck_transacao_valor_positivo CHECK (valor > 0),
    -- ON DELETE RESTRICT: não dá para apagar uma categoria que ainda tem transações,
    -- senão o histórico perderia a classificação.
    CONSTRAINT fk_transacao_categoria FOREIGN KEY (categoria_id)
        REFERENCES categoria (id) ON DELETE RESTRICT
);

-- A tela principal é "o mês": quase toda consulta de transações filtra por período.
CREATE INDEX idx_transacao_data ON transacao (data);

-- O PostgreSQL NÃO cria índice para chave estrangeira sozinho. Sem este, o resumo por
-- categoria e a checagem do ON DELETE RESTRICT precisariam ler a tabela inteira.
CREATE INDEX idx_transacao_categoria ON transacao (categoria_id);
