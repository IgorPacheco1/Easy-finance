# ADR-0025: Categorias por usuário

- **Status:** Aceita
- **Data:** 2026-11-15

## Contexto

A V4 (#123) já separou os dados no banco: categoria do sistema não tem dono (`usuario_id` nulo) e
categoria personalizada pertence a um usuário. Mas a API ainda lia todas as categorias do banco.
Com mais de uma conta, uma pessoa enxergaria, editaria e apagaria as categorias das outras.

## Decisão

1. **Cada pessoa enxerga as categorias do sistema e as próprias.** Toda consulta do pacote
   `categoria` filtra por `usuario_id IS NULL OR usuario_id = :usuario`. O usuário vem da sessão
   (`UsuarioAtual`), nunca do cliente.
2. **Categoria de outra pessoa responde `404`** (busca, edição e exclusão), igual a um id que não
   existe. Responder `403` revelaria que o id existe. A consulta por id já devolve vazio para
   quem não pode ver, então o service não precisa de um "confere o dono" separado, que poderia ser
   esquecido.
3. **A ordem por uso (`?ordem=USO`) conta só as transações do próprio usuário.** O filtro do
   usuário fica no `ON` do `LEFT JOIN` (junto da data), para categorias sem uso continuarem na lista.
4. **Nome único entre o que a pessoa enxerga** (sistema + as dela), sem diferenciar maiúsculas:
   `409` ao criar ou renomear. Assim a lista nunca mostra dois "Mercado". Duas pessoas diferentes
   podem ter categorias com o mesmo nome. É regra do service; o banco continua garantindo só a
   unicidade por dono (V4), então **não há migration nova**.
5. **Editar ou excluir categoria do sistema continua `409`.** O `403` já significa "token CSRF
   inválido" para o app, que refaz o token e tenta de novo; reaproveitar o status confundiria.
6. **Fora do escopo:** a `TransacaoService` ainda valida a categoria de um lançamento com
   `findById`/`existsById`. Impedir lançar numa categoria de outra pessoa é da issue de
   transações por usuário (#9 da ordem do M5).

## Alternativas consideradas

- **`403` para categoria de outra pessoa:** mais explícito, mas confirma que o id existe.
- **Filtrar no controller ou depois de carregar:** fácil de esquecer em um endpoint novo. Filtrar
  na consulta torna o isolamento o caminho padrão.
- **Permitir nome igual ao de uma categoria do sistema:** só valeria a unicidade da V4, e a lista
  poderia mostrar duas iguais.
- **Índice único no banco para sistema + usuário:** exigiria uma regra entre linhas de "donos"
  diferentes, que um índice simples não expressa; o service resolve com uma consulta.

## Consequências

- Positivas: uma conta não vê nem altera categoria de outra; a ordem por uso reflete só o hábito
  da própria pessoa; sem migration.
- Negativas / custos assumidos:
  - A checagem de nome é no service, então duas requisições simultâneas podem passar por ela; o
    índice por dono da V4 barra o duplicado do mesmo usuário (`409`), mas não o caso "nome igual
    ao do sistema" em corrida, que só ocorreria se uma categoria do sistema fosse criada no meio.
    Risco desprezível: categorias do sistema só mudam por migration.
  - Até a issue de transações por usuário, um lançamento ainda pode apontar para categoria de
    outra pessoa pela API de transações.
