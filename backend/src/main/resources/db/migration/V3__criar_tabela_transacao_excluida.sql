-- =============================================================================
-- V3: ids das transações excluídas (#98).
--
-- Problema: a criação de transação é idempotente pelo id que o app envia (#19). Se uma
-- transação é excluída, o id some do banco; um reenvio atrasado do mesmo lançamento (por
-- exemplo, da fila offline do celular) seria aceito como novo e "ressuscitaria" a transação.
--
-- Solução: ao excluir, o id vem para esta tabela. Um POST com um id daqui responde 410 Gone,
-- e o app pergunta ao usuário o que fazer.
--
-- Fonte: docs/architecture/domain-model.md e docs/architecture/schema.dbml.
-- Regra do Flyway: depois de aplicada, esta migration NUNCA é editada.
-- =============================================================================

CREATE TABLE transacao_excluida (
    -- O mesmo id que a transação tinha. Sem FOREIGN KEY: a transação já não existe mais.
    id           UUID         NOT NULL,
    -- Instante da exclusão, em UTC. Útil para investigar e, no futuro, para uma limpeza.
    excluido_em  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- Só o id e a data: nenhum dado financeiro (valor, descrição) fica guardado depois de excluir.
    CONSTRAINT pk_transacao_excluida PRIMARY KEY (id)
);
