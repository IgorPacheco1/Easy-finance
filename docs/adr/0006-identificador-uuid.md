# ADR-0006: Identificador UUID para categorias e transações

- **Status:** Aceita
- **Data:** 2026-10-26

## Contexto

Toda tabela precisa de uma chave primária. As duas opções comuns no PostgreSQL são uma sequência
numérica gerada pelo banco (`BIGSERIAL`: 1, 2, 3...) e um UUID (identificador aleatório de 128 bits,
como `3f2b8c1e-...`).

O Easy Finance guarda **dados financeiros pessoais**, então a proteção dos dados é o critério
principal desta decisão. Também pesam:

- O id aparece na URL da API (`/api/v1/transacoes/{id}`).
- A #19 (M2) prevê criação idempotente: reenviar o mesmo lançamento não pode gravar duas vezes.
- O M4 prevê lançamento offline no PWA.

## Decisão

Usar **UUID versão 4 (aleatório)** como chave primária de `categoria` e `transacao` (e de
`usuario` no M5), tipo `UUID` no PostgreSQL e `java.util.UUID` no Java. O banco tem um valor
padrão (`DEFAULT gen_random_uuid()`), e na #19 o cliente poderá enviar o próprio id.

## Por que isso protege mais os dados

- **Ids sequenciais são adivinháveis.** Se um usuário vê a transação `/transacoes/1050`, ele sabe
  que existem a 1049 e a 1051 e pode tentar abri-las. Se em algum momento a verificação de dono
  falhar por um bug, essa falha (chamada de IDOR, *Insecure Direct Object Reference*, uma das
  mais comuns no [OWASP Top 10](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)) vira um
  vazamento fácil de explorar. Com UUID aleatório, o espaço de possibilidades é tão grande que
  adivinhar um id alheio não é viável.
- **Ids sequenciais revelam informação do negócio.** O id 1050 diz quantas transações já
  existem no sistema inteiro e em que ritmo elas crescem.
- **Versão 4, e não 7.** O UUIDv7 é melhor para índices, mas carrega o instante de criação
  dentro do próprio id. A versão 4 é 100% aleatória e não revela nada.

**Importante:** UUID é uma camada **extra** de proteção, não a principal. A proteção de verdade é a
autorização (M5): toda consulta filtra pelo usuário logado, e acessar o id de outra pessoa
responde `404`, como se o registro não existisse.

## Alternativas consideradas

- **`BIGSERIAL`:** mais simples e compacto (8 bytes contra 16), mas tem os problemas de
  segurança acima. Além disso, a idempotência da #19 exigiria uma coluna extra
  (`chave_idempotencia`).
- **`BIGSERIAL` interno + UUID público:** dois identificadores por tabela. Junta as vantagens, mas
  dobra a complexidade sem ganho real nesse volume de dados.
- **UUIDv7:** ordenado no tempo e melhor para índices, mas expõe o instante de criação.

## Consequências

- Positivas: ids não adivinháveis nem reveladores; criação idempotente e offline sem colunas extras.
- Negativas / custos assumidos:
  - Índices um pouco maiores e inserções levemente mais lentas que com sequência. Não faz
    diferença no volume esperado de um app de finanças pessoais.
  - Id gerado no cliente (#19): o servidor deve tratar um id que já existe. Se pertencer a
    **outro** usuário, a resposta não pode revelar isso (mesmo erro de um conflito comum).
  - Ids longos são menos práticos para depurar à mão.
