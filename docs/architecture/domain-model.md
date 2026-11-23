# Modelo de domínio

> **Status:** definido na issue #10 (M1) e implementado nas migrations Flyway
> [`V1__criar_tabelas_iniciais.sql`](../../backend/src/main/resources/db/migration/V1__criar_tabelas_iniciais.sql)
> e [`V2__inserir_categorias_do_sistema.sql`](../../backend/src/main/resources/db/migration/V2__inserir_categorias_do_sistema.sql) (#13).
> Entidades JPA: `Categoria` (#17) e `Transacao` (#18), no M2.

Este documento define as entidades do Guardá, como elas se relacionam e **por que** cada
coluna e cada restrição existe. As decisões maiores estão registradas em ADR:

- [ADR-0006](../adr/0006-identificador-uuid.md): identificador UUID
- [ADR-0007](../adr/0007-representacao-de-dinheiro.md): dinheiro em `NUMERIC(19,2)` / `BigDecimal`
- [ADR-0008](../adr/0008-categorias-com-tipo-e-modelo-hibrido.md): categorias com tipo e modelo híbrido (sistema + personalizadas)

## Entidades (M1 a M4)

- **Categoria:** classifica um lançamento ("Mercado", "Salário"). Tem um **tipo** fixo: `RECEITA`
  ou `DESPESA`. Existem categorias do **sistema** (já vêm prontas) e, a partir do M5, categorias
  **personalizadas** de cada usuário.
- **Transação:** um lançamento de dinheiro que entrou ou saiu, numa data, com valor e descrição
  opcional. Pertence a **exatamente uma** categoria.
- **Transação excluída** (M4, #98): só o `id` de uma transação que foi apagada e o instante da
  exclusão. Existe para um reenvio atrasado não "ressuscitar" o lançamento (ver abaixo).

## Diagrama ER

O diagrama abaixo (Mermaid) aparece direto no GitHub. Para uma versão visual e editável, o schema
completo, com tipos, defaults, índices e `CHECK`, está em [`schema.dbml`](schema.dbml): é só colar
o conteúdo em [dbdiagram.io](https://dbdiagram.io). **Ao mudar o schema (nova migration), atualize
o `schema.dbml` no mesmo PR.** Quem manda no banco real são as migrations Flyway; o DBML é a
documentação visual delas.

```mermaid
erDiagram
    CATEGORIA ||--o{ TRANSACAO : "classifica"

    CATEGORIA {
        uuid id PK
        varchar(50) nome "NOT NULL"
        varchar(10) tipo "NOT NULL, RECEITA ou DESPESA"
        boolean sistema "NOT NULL, default false"
        varchar(30) icone "NOT NULL, default circle-ellipsis"
        varchar(20) cor "NOT NULL, default cinza"
        timestamptz criado_em "NOT NULL"
    }

    TRANSACAO {
        uuid id PK
        uuid categoria_id FK "NOT NULL"
        numeric valor "NOT NULL, (19,2), maior que 0"
        date data "NOT NULL"
        varchar(255) descricao "NULL"
        timestamptz criado_em "NOT NULL"
        timestamptz atualizado_em "NOT NULL"
    }

    TRANSACAO_EXCLUIDA {
        uuid id PK "id da transação apagada"
        timestamptz excluido_em "NOT NULL"
    }
```

Leitura: uma categoria classifica **zero ou muitas** transações; uma transação tem **exatamente
uma** categoria. `TRANSACAO_EXCLUIDA` fica solta de propósito: a transação a que o id se referia
já não existe.

## Tabela `categoria`

| Coluna | Tipo | Nulo? | Por quê |
|---|---|---|---|
| `id` | `UUID` | não (PK) | Não é sequencial, então não dá para adivinhar ids alheios. Ver ADR-0006. |
| `nome` | `VARCHAR(50)` | não | Uma categoria sem nome não tem significado. 50 caracteres cabem bem na tela do celular. |
| `tipo` | `VARCHAR(10)` | não | `RECEITA` ou `DESPESA`. Fica na categoria para o app sugerir só as categorias certas em cada lançamento. Ver ADR-0008. |
| `sistema` | `BOOLEAN` | não | `true` para as categorias padrão, que o usuário não pode editar nem apagar. |
| `icone` | `VARCHAR(30)` | não | Nome de um ícone de uma lista fechada (V7, #185, ADR-0031). Padrão `circle-ellipsis`. A lista é conferida no Java, não num `CHECK`, para um ícone novo não exigir migration. |
| `cor` | `VARCHAR(20)` | não | Nome de uma das 12 cores (`verde`, `coral`...), nunca o código da cor: o tom de cada uma é decisão do app e pode mudar sem migrar dados. Padrão `cinza`. |
| `criado_em` | `TIMESTAMPTZ` | não | Auditoria básica. Instante em UTC. |

Restrições:

- `CHECK (tipo IN ('RECEITA', 'DESPESA'))`: o banco recusa qualquer outro valor, mesmo que um bug
  na API tente gravar.
- `CHECK (char_length(trim(nome)) > 0)`: impede nome vazio ou só com espaços.
- Nome único sem diferenciar maiúsculas, evitando "Mercado" e "mercado" duplicados. Desde a V4
  (M5) vale **por dono**: um índice para as categorias do sistema (`uk_categoria_nome_sistema`) e
  outro para as de cada usuário (`uk_categoria_nome_usuario`). Ver "Como o usuário entra no modelo".
  Além disso, a API (#128, [ADR-0025](../adr/0025-categorias-por-usuario.md)) não deixa criar nem
  renomear uma categoria com o nome de uma que a pessoa já enxerga (do sistema ou dela), para a lista
  não mostrar dois "Mercado". Quem decide é o service; o banco só garante a unicidade por dono.
- `CHECK` do dono (`ck_categoria_dono`): categoria do sistema não tem `usuario_id`; personalizada
  sempre tem.

Regra de negócio (Service): **o tipo de uma categoria não muda depois de criada.** Se mudasse,
todas as transações antigas dela trocariam de receita para despesa (ou o contrário) e o saldo
histórico mudaria sem ninguém perceber.

## Tabela `transacao`

| Coluna | Tipo | Nulo? | Por quê |
|---|---|---|---|
| `id` | `UUID` | não (PK) | Ver ADR-0006. Também permite criação idempotente na #19 (M2). |
| `categoria_id` | `UUID` | não (FK) | Toda transação tem categoria, então o usuário sempre sabe onde foi o dinheiro. |
| `valor` | `NUMERIC(19,2)` | não | Sempre **positivo**. Se é entrada ou saída, quem diz é o tipo da categoria. Ver ADR-0007. |
| `data` | `DATE` | não | O dia do lançamento, sem hora: "gastei no dia 10". Evita problemas de fuso horário. |
| `descricao` | `VARCHAR(255)` | sim | Opcional, para lançar rápido no celular ("Mercado" já basta). |
| `criado_em` | `TIMESTAMPTZ` | não | Quando o registro foi criado (UTC). É diferente de `data`. |
| `atualizado_em` | `TIMESTAMPTZ` | não | Quando foi alterado por último. Ajuda a investigar problemas. |

Restrições:

- `CHECK (valor > 0)`: valor zero ou negativo não tem significado. Sem isso, uma "despesa de -50"
  viraria uma receita disfarçada.
- `FOREIGN KEY (categoria_id) REFERENCES categoria (id) ON DELETE RESTRICT`: não dá para apagar
  uma categoria que ainda tem transações. Sem isso o histórico perderia a classificação.

Regras de negócio (API):

- `valor` com no máximo 2 casas decimais. O `NUMERIC(19,2)` arredondaria `10.555` para `10.56`
  sem avisar, então a API recusa antes de chegar ao banco.
- `data` entre 1 ano antes e 1 ano depois de hoje, para pegar erros de digitação ("2062" no
  lugar de "2026"). Na edição, a data só é conferida se mudar: um lançamento antigo continua
  podendo ter a descrição ou a categoria corrigida (#20).

### Por que a transação não tem coluna `tipo`

O tipo (receita ou despesa) **fica só na categoria**. Se ficasse nas duas tabelas, as duas
poderiam discordar: uma transação marcada como `RECEITA` dentro da categoria "Mercado", que é
`DESPESA`. Guardando a informação em **um lugar só**, essa inconsistência não tem como acontecer.

O saldo de um período fica assim:

```sql
SELECT COALESCE(SUM(CASE WHEN c.tipo = 'RECEITA' THEN t.valor ELSE -t.valor END), 0) AS saldo
FROM transacao t
JOIN categoria c ON c.id = t.categoria_id
WHERE t.data BETWEEN :inicio AND :fim;
```

Alternativa considerada: manter `tipo` também na transação e garantir no banco que os dois são
iguais, com uma FK composta `(categoria_id, tipo) → categoria (id, tipo)`. Funciona e evita o
`JOIN` no saldo, mas é mais complexo de entender e manter. Fica registrada caso o desempenho exija.

## Tabela `transacao_excluida` (M4, #98)

A criação de transação é idempotente pelo `id` que o app envia (#19). Quando uma transação é
excluída, o `id` some do banco, e um reenvio atrasado do mesmo lançamento (por exemplo, da fila
offline do celular) seria aceito como novo. Esta tabela guarda os ids excluídos para impedir isso.

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `UUID` | PK. O mesmo id que a transação tinha. |
| `excluido_em` | `TIMESTAMPTZ` | `NOT NULL`, padrão `now()`. Instante da exclusão, em UTC. |

- Sem `FOREIGN KEY`: a transação já não existe.
- Ao excluir, o id entra aqui **na mesma transação do banco** que apaga a transação.
- `POST /api/v1/transacoes` com um id daqui responde **410 Gone** e não grava nada. O app pergunta
  ao usuário se descarta o lançamento ou se lança de novo, com um id novo. `GET`, `PUT` e `DELETE`
  de um id excluído continuam respondendo 404: só o `POST` é usado para reenviar.
- Só o id e a data ficam guardados: nenhum valor ou descrição sobrevive à exclusão.
- Os ids ficam para sempre por enquanto (poucos bytes cada). Desde a V4 (M5) a tabela tem
  `usuario_id` (obrigatório, `ON DELETE CASCADE`) e pode ganhar uma regra de limpeza.

## Tabela `tentativa_login` (M5, V6 / #126)

Contador de falhas de login, fora do modelo de negócio (ADR-0022). Cada login errado grava duas
linhas: uma para o e-mail e outra para o IP, com `tipo`, `chave_hash` (SHA-256, nunca o valor puro) e
`criada_em`. **Não tem chave estrangeira para `usuario`:** vale também para e-mails sem conta, para o
bloqueio não revelar quais contas existem. Linhas mais velhas que a janela (15 minutos) são apagadas
a cada nova falha, então a tabela fica pequena. Índice em `(tipo, chave_hash, criada_em)` para a
contagem e em `criada_em` para a limpeza. As tabelas da sessão (`spring_session*`, V5) são do
Spring Session e não fazem parte do domínio.

## Índices

| Índice | Por quê |
|---|---|
| PKs (`id`) | Criados automaticamente. |
| `transacao (usuario_id, data)` | A tela principal é "o mês de um usuário": quase toda consulta filtra pelo dono e por período. Desde a V4 substitui o índice só por data. |
| `transacao (categoria_id)` | O PostgreSQL **não** cria índice para FK automaticamente. Sem ele, o resumo por categoria e o `ON DELETE RESTRICT` precisam ler a tabela inteira. |
| `categoria (lower(nome))` único, só do sistema; `categoria (usuario_id, lower(nome))` único, só dos usuários | Garantem a unicidade do nome por dono (ver acima). |
| `transacao_excluida (usuario_id)` | O PostgreSQL não indexa FK sozinho; sem ele, excluir uma conta leria a tabela inteira. |

Índices têm custo (espaço e escrita mais lenta), por isso só entram os que têm uma consulta
prevista.

## Categorias do sistema

Carregadas por migration Flyway (dados, não só schema), com `sistema = true`. A lista se baseia na
[POF 2017-2018 do IBGE](https://agenciadenoticias.ibge.gov.br/agencia-sala-de-imprensa/2013-agencia-de-noticias/releases/25598-pof-2017-2018),
em que os maiores gastos das famílias brasileiras são habitação (36,6% do consumo), transporte
(18,1%), alimentação (17,5%), saúde (8,0%) e educação (4,7%).

**Despesas**

| Nome | Exemplos |
|---|---|
| Moradia | aluguel, condomínio, IPTU, manutenção |
| Contas da casa | luz, água, gás, internet, celular |
| Mercado | supermercado, feira, padaria |
| Alimentação fora | restaurante, lanche, delivery |
| Transporte | combustível, ônibus, aplicativo, estacionamento |
| Saúde | plano de saúde, farmácia, consultas |
| Educação | faculdade, cursos, livros, material |
| Vestuário | roupas, calçados, acessórios |
| Cuidados pessoais | higiene, cabeleireiro, academia |
| Lazer | cinema, viagens, passeios, jogos |
| Assinaturas | streaming, aplicativos, clubes |
| Dívidas e empréstimos | parcelas de empréstimo, financiamento, juros |
| Impostos e taxas | tarifas bancárias, IPVA, multas |
| Outras despesas | o que não se encaixa nas demais |

**Receitas**

| Nome | Exemplos |
|---|---|
| Salário | salário mensal, adiantamento |
| Renda extra | freelance, bicos, vendas |
| Benefícios | 13º, férias, auxílios, vale-alimentação |
| Rendimentos | juros de poupança, dividendos |
| Outras receitas | presentes, reembolsos, o que não se encaixa |

"Outras despesas" e "Outras receitas" existem porque a categoria é obrigatória: o usuário nunca
fica sem ter onde lançar.

## Como o usuário entra no modelo (M5, V4 / #123)

```mermaid
erDiagram
    USUARIO ||--o{ CATEGORIA : "cria (personalizadas)"
    USUARIO ||--o{ TRANSACAO : "registra"
    CATEGORIA ||--o{ TRANSACAO : "classifica"
```

- Nova tabela `usuario` (id UUID, e-mail único e sempre em minúsculas, hash da senha, datas).
  Feita na V4, junto com `transacao.usuario_id` e `categoria.usuario_id`.
- Na V8 (M6, #193), `usuario` ganhou `nome` (até 60 caracteres; `NULL` nas contas de antes, até a
  pessoa preencher) e `avatar` (`iniciais:<cor>`, com as 12 cores das categorias; sem foto,
  [ADR-0032](../adr/0032-nome-e-avatar-do-usuario.md)).
- `transacao.usuario_id UUID NOT NULL`: toda transação tem dono. **Toda consulta filtra por ele**
  (o filtro entra nas issues de categorias e transações por usuário; até lá, ver ADR-0021).
- `transacao_excluida.usuario_id UUID NOT NULL`, como a transação.
- As três chaves para `usuario` são `ON DELETE CASCADE`: apagar a conta apaga tudo que é dela.
- A V4 **apaga** os dados sem dono do banco local (planejamento do M5); ficam as categorias do sistema.
- `categoria.usuario_id UUID NULL`: `NULL` = categoria do sistema (visível para todos);
  preenchido = categoria personalizada (visível só para o dono). A coluna `sistema` pode passar a
  ser derivada disso.
- A unicidade do nome passa a ser por usuário. Um usuário não pode criar uma personalizada com o
  mesmo nome de uma do sistema (validação no Service).
- Regra de isolamento: uma transação só pode usar categoria **do sistema ou do próprio usuário**.
- Mudanças no schema são sempre migration nova. As anteriores **nunca** são editadas.

## Perguntas em aberto (para issues futuras)

- Usuário poderá **ocultar** uma categoria do sistema que não usa? (M5)
- Transferência entre contas próprias conta como receita/despesa? Hoje não há contas; fica fora
  do escopo até um ADR dizer o contrário.
