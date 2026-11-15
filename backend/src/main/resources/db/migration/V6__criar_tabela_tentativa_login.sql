-- =============================================================================
-- V6: contador de falhas de login (M5, #126).
--
-- Cada login errado grava duas linhas: uma para o e-mail digitado e outra para o IP de quem
-- tentou. Quem passa do limite dentro da janela de tempo recebe 429 (ver ADR-0022).
--
--   - chave_hash: SHA-256 (hexadecimal) do e-mail normalizado ou do IP, e nunca o valor em si.
--     Assim a tabela não guarda e-mails de quem nem tem conta, nem senhas coladas por engano no
--     campo de e-mail.
--   - Sem chave estrangeira para usuario: vale também para e-mails que não existem, que é o que
--     impede de descobrir quais contas existem pelo bloqueio.
--
-- As linhas são de vida curta: cada nova falha apaga as anteriores à janela.
-- =============================================================================

CREATE TABLE tentativa_login (
    id          UUID         NOT NULL DEFAULT gen_random_uuid(),
    tipo        VARCHAR(10)  NOT NULL,
    chave_hash  CHAR(64)     NOT NULL,
    criada_em   TIMESTAMPTZ  NOT NULL,

    CONSTRAINT pk_tentativa_login PRIMARY KEY (id),
    CONSTRAINT ck_tentativa_login_tipo CHECK (tipo IN ('EMAIL', 'IP'))
);

-- Atende a contagem por chave dentro da janela e a limpeza das linhas antigas.
CREATE INDEX idx_tentativa_login_chave ON tentativa_login (tipo, chave_hash, criada_em);
CREATE INDEX idx_tentativa_login_criada_em ON tentativa_login (criada_em);
