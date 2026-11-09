# ADR-0018: Filtros da listagem com Specification

- **Status:** Aceita
- **Data:** 2026-11-09

## Contexto

A listagem de transações ganha filtros opcionais que se combinam (#93): período, categoria,
tipo, texto da descrição e faixa de valor. Com sete filtros opcionais, existem dezenas de
combinações, e escrever um método de repository para cada uma (`findByCategoriaAndTipo...`) não
é viável. A busca do app (#94) e o resumo por categoria (#95) também vão precisar de filtros.

## Decisão

Montar a consulta com **`Specification`** do Spring Data JPA (`JpaSpecificationExecutor`):

- Os filtros chegam juntos num record, `FiltroDeTransacoes`. `null` quer dizer "não filtrar".
- `EspecificacaoDeTransacoes.com(filtro)` transforma cada filtro preenchido em uma condição da
  Criteria API do JPA, e todas entram no `WHERE` com `AND`. Filtro vazio não entra na consulta.
- O repository tem um único método de listagem, `buscar(filtro, pagina, tamanho)`, que aplica a
  ordem da ADR-0017 e devolve um `Slice` pela API fluente (`findBy(...).slice(...)`). A tela do
  mês usa o mesmo caminho, só com o período.
- A categoria vem na mesma consulta (`fetch`), para evitar o problema "N+1".
- A busca por texto usa `lower(descricao) LIKE '%texto%'` com escape de `%`, `_` e `\`: o que a
  pessoa digita vale como texto, nunca como curinga.
- A validação dos filtros (categoria existe, valores não negativos, mínimo ≤ máximo, período
  completo) fica no service, antes de qualquer consulta, com erro 400 no campo.

Não há dependência nova: a `Specification` já faz parte do Spring Data JPA.

## Alternativas consideradas

- **Uma consulta JPQL com `(:filtro IS NULL OR ...)` para cada filtro:** tudo num lugar só, mas
  a consulta carrega todos os filtros mesmo vazios, fica longa, e o PostgreSQL às vezes não
  consegue descobrir o tipo de um parâmetro nulo (o mesmo problema que pediu o `CAST` da
  descrição na #19).
- **Querydsl:** consultas tipadas e mais fáceis de ler, mas exige dependência e geração de
  código. Excessivo para uma tela de filtros.
- **Um método de repository por combinação:** inviável com sete filtros.
- **Filtrar em memória no service:** traria todas as transações do banco para filtrar em Java,
  o oposto do que a paginação (ADR-0017) busca.

## Consequências

- Positivas: só os filtros pedidos entram na consulta; cada filtro é uma condição pequena e
  isolada; novos filtros são uma linha a mais; a mesma base serve à busca (#94) e ao resumo (#95).
- Negativas / custos assumidos:
  - A Criteria API usa os nomes dos campos como texto (`"valor"`, `"categoria"`). Um campo
    renomeado na entidade só quebra em tempo de execução; os testes de integração (Testcontainers)
    cobrem cada filtro para pegar isso.
  - Busca por texto com `LIKE '%texto%'` não usa índice comum. Com o volume de uma pessoa não faz
    diferença; se fizer, um índice trigram (`pg_trgm`) entra com medição.
