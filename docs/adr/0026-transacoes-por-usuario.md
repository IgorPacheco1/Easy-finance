# ADR-0026: Transações por usuário

- **Status:** Aceita
- **Data:** 2026-11-15

## Contexto

A V4 (#123) deu dono a toda transação (`usuario_id`) e a toda transação excluída. A #128 separou as
categorias. Faltava a API de transações respeitar o dono: listar, buscar, editar, excluir, somar
(saldo e resumo) e checar o `410` ainda liam e alteravam as transações de todo mundo.

## Decisão

1. **Toda consulta filtra por `usuario_id`.** A listagem (Specification) sempre começa pela
   condição do dono; o saldo e o resumo por categoria (SQL direto) têm `t.usuario_id = :usuario`; o
   acesso por id é `findByIdAndUsuarioId`. O `findById` herdado do JPA não filtra o dono e não é
   mais usado pela API. O usuário vem da sessão (`UsuarioAtual`), nunca do cliente.
2. **Transação de outra pessoa responde `404`** (busca, edição, exclusão), igual a um id que não
   existe. Responder `403` revelaria que o id existe.
3. **A categoria do lançamento e o filtro `categoriaId` só aceitam categoria que a pessoa enxerga**
   (`findVisivelPorId`, ADR-0025). A de outra pessoa dá o mesmo `400` de uma categoria
   inexistente ("Categoria não encontrada").
4. **O `410` vale só para ids que a própria pessoa excluiu** (`foiExcluida(id, usuario)`). Sem
   isso, o `410` mostraria que um id existiu para outra pessoa.
5. **Id escolhido pelo cliente que já é de outra pessoa dá `409`** (o mesmo erro de "mesmo id com
   dados diferentes"), sem dizer de quem é. A chave primária de `transacao` continua global, então
   o `INSERT ... ON CONFLICT (id) DO NOTHING` não grava nada; a busca seguinte, filtrada pelo dono,
   não acha a linha, e o service responde o conflito.
6. **Sem migration.** O schema da V4 já tem tudo.

## Alternativas consideradas

- **Chave primária composta `(usuario_id, id)` (migration V7):** cada pessoa teria o seu espaço de
  ids e nenhum caso de borda, mas muda o modelo de dados e o `@Id` da entidade, e arrisca regressão
  na criação idempotente da fila offline. Para ids UUID v4 aleatórios, o risco que ela evitaria é
  desprezível.
- **`404` para o id já ocupado por outra pessoa:** esconderia o conflito, mas o app offline
  entenderia que a transação "sumiu" e não saberia o que fazer.
- **Filtrar no controller:** fácil de esquecer num endpoint novo; filtrar na consulta faz do
  isolamento o caminho padrão.

## Consequências

- Positivas: uma conta não vê, soma nem altera as transações de outra; o `410` e o `409` não
  vazam nada de outras contas; sem migration.
- Negativas / custos assumidos:
  - **Id repetido entre pessoas:** se duas pessoas usassem o mesmo id (colisão de UUID, ou
    ataque de quem já conhece o id), a segunda recebe `409`. Aceito pela baixíssima chance.
  - Caso de borda do mesmo tipo em `transacao_excluida` (chave primária global): se alguém
    excluísse uma transação cujo id já estivesse registrado como excluído por outra pessoa, a
    exclusão dele não seria registrada. Também exigiria colisão de UUID; aceito.
  - O teste "uma pessoa não acessa os dados de outra" ponta a ponta, com duas sessões reais, é a
    issue seguinte do planejamento (#11); aqui os testes usam um segundo usuário inserido no banco.
