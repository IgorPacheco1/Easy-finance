# ADR-0021: Dono dos dados e usuário provisório até o login existir

- **Status:** Aceita (a parte do usuário provisório é temporária: sai na issue de login)
- **Data:** 2026-11-14

## Contexto

O M5 faz cada pessoa ter a própria conta e ver só os próprios dados (planejamento #121, ADR-0020).
A issue #123 cria a tabela `usuario` e dá dono aos dados (migration V4). Mas o login só chega duas
issues depois (entrar, sair e manter a sessão). Nesse intervalo, o `main` precisa continuar
funcionando e com o CI verde, e a V4 torna o dono **obrigatório** em `transacao`: um `INSERT` sem
`usuario_id` passa a ser recusado pelo banco.

Em outras palavras: toda gravação precisa saber **quem é o dono**, e ainda não existe quem diga.

## Decisão

1. **Os services pedem o dono a uma interface**, `UsuarioAtual` (`id()`), e nunca o recebem do
   cliente. Quando o login existir, só a implementação muda (passa a ler a sessão); nenhum
   service é reescrito.
2. **Até lá, `UsuarioProvisorio`:** um usuário fixo (id `00000000-0000-0000-0000-000000000001`),
   que existe **só nos perfis `dev` e `test`**. Quem o cria é o `UsuarioProvisorioInicializador`,
   ao subir a aplicação (`ON CONFLICT DO NOTHING`), com um hash de senha inválido: ninguém consegue
   entrar com ele.
3. **Sem perfil `dev`/`test` não há `UsuarioAtual`, e a aplicação não sobe.** É de propósito:
   falhar é melhor do que gravar os dados de todo mundo num usuário fantasma. O M5 só vai a
   produção com o login pronto.
4. **O usuário provisório não vive numa migration.** Migration vale para todos os ambientes,
   inclusive produção; um usuário "falso" lá seria um risco.
5. A V4 **apaga** os dados sem dono (transações, ids excluídos e categorias personalizadas do banco
   local), como combinado no planejamento. Ficam as categorias do sistema.
6. **`ON DELETE CASCADE`** nas chaves para `usuario`: apagar o usuário apaga tudo que é dele. É a
   base da "excluir minha conta" (LGPD), e fica garantido pelo banco, não por uma lista de tabelas
   no código que alguém pode esquecer de atualizar.
7. **Nome da categoria único por dono:** um índice para as do sistema e outro para as de cada
   usuário (`uk_categoria_nome_sistema`, `uk_categoria_nome_usuario`). O banco também garante que
   categoria do sistema não tem dono e a personalizada tem (`ck_categoria_dono`). Impedir um nome
   igual a uma do sistema continua sendo validação do service (o banco não enxerga entre os dois
   índices).
8. **E-mail sempre em minúsculas, garantido pelo banco** (`ck_usuario_email_minusculo` +
   `uk_usuario_email`), para "Ana@x.com" e "ana@x.com" nunca virarem duas contas.

## Alternativas consideradas

- **Colunas `usuario_id` aceitando nulo e `NOT NULL` só depois:** o código não mudaria agora, mas
  dados criados no meio ficariam sem dono, e a regra "toda transação tem dono" só valeria no fim
  do milestone.
- **Só o schema, sem mexer no código:** a API não conseguiria criar transação até o login chegar, e a
  PR não seria utilizável sozinha.
- **Usuário fixo criado pela migration:** simples, mas leva um usuário falso para produção.

## Consequências

- Positivas: o dono obrigatório vale desde já; a API segue funcionando e testada; a troca pelo
  login real é pontual (uma implementação de `UsuarioAtual`).
- Negativas / custos assumidos:
  - Código provisório (`UsuarioProvisorio` e o inicializador) a remover na issue de login.
  - **Isolamento ainda não existe:** as consultas continuam sem filtrar por usuário (categorias e
    transações ganham o filtro nas issues 7 e 8). Com um único usuário provisório isso não muda
    nada para ninguém, mas **este estado não pode ir para produção**.
  - O `id` de `transacao_excluida` segue sendo chave primária global; o isolamento do `410`
    entre usuários é tratado na issue de transações por usuário.
