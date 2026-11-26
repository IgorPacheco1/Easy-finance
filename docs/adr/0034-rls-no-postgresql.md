# ADR-0034: RLS no PostgreSQL e usuários separados no banco

- **Status:** Aceita
- **Data:** 2026-11-23

## Contexto

O isolamento entre usuários está no código: toda consulta filtra por `usuario_id` (ADR-0025 e
0026), e os testes com duas sessões reais provam isso (#131). O risco que sobra é o de uma consulta
nova **esquecer o filtro**: os dados de uma pessoa apareceriam para outra, sem nenhum erro.

O planejamento da segurança antes da Produção (M7, #246) decidiu adicionar uma segunda camada,
dentro do próprio banco: o **Row Level Security (RLS)** do PostgreSQL. Com ele, a regra "cada linha
só aparece para a pessoa dona dela" vale mesmo que o código esqueça o `WHERE`.

O RLS tem duas armadilhas:
- O **dono da tabela** e os **superusuários** ignoram as políticas. Hoje o app conecta com o mesmo
  usuário que cria as tabelas (o das migrations do Flyway).
- O app usa um **pool de conexões**: a mesma conexão atende pessoas diferentes. Se quem está logado
  ficar gravado na conexão, a próxima requisição herda a pessoa anterior.

## Decisão

1. **RLS em `categoria`, `transacao` e `transacao_excluida`**, as tabelas com dados da pessoa, usadas
   só depois do login. (Ver a atualização no fim: sem `FORCE ROW LEVEL SECURITY`.)
2. **Sem RLS** em `usuario`, `tentativa_login`, `SPRING_SESSION` e `SPRING_SESSION_ATTRIBUTES`: o
   backend lê essas tabelas **antes** de saber quem é a pessoa (login, cadastro, limite de
   tentativas, descobrir a sessão). Continuam protegidas pelo código e pelos testes de isolamento.
3. **Políticas:**
   - `transacao` e `transacao_excluida`: ler e gravar só onde `usuario_id` é o da pessoa logada.
   - `categoria`: **ler** as do sistema (`usuario_id` nulo) e as próprias; **gravar** (criar,
     alterar, apagar) só as próprias. Ninguém altera nem apaga categoria do sistema pelo app.
4. **Quem está logado chega ao banco por transação:** um componente central roda
   `SELECT set_config('app.usuario_id', <id>, true)` (o equivalente a `SET LOCAL`) no começo de toda
   transação, com o usuário da sessão. O `true` faz o valor valer **só até o fim da transação**, e a
   conexão volta limpa para o pool. Nenhum service precisa lembrar disso.
5. **Falha fechada:** as políticas leem `current_setting('app.usuario_id', true)`. Sem pessoa logada,
   o valor é nulo e o banco não mostra **nenhuma** linha.
6. **Dois usuários do banco (menor privilégio):**
   - `guarda_admin`: dono das tabelas. Usado **só pelo Flyway** (`spring.flyway.user`/`password`).
   - `guarda_app`: usado pelo app (`spring.datasource.*`). Só `SELECT`, `INSERT`, `UPDATE` e `DELETE`
     nas tabelas e uso das sequências. Não cria, não altera, não apaga tabelas e não escapa do RLS.
7. **Ambientes:** o `compose.yaml` cria os dois usuários na primeira subida do banco (script de
   inicialização); os testes (Testcontainers) conectam o app como `guarda_app`; na Produção, os dois
   usuários são criados no provedor do banco. As permissões (`GRANT`) ficam numa migration.
8. **Testes:** os testes de isolamento (#131) rodam com o RLS ligado, e entra um teste novo que faz
   uma consulta **sem** o filtro de `usuario_id` e prova que o banco não devolve as linhas de outra
   pessoa: a segunda camada funcionando sozinha.

## Alternativas consideradas

- **Ficar só com o filtro no código:** já testado, mas um esquecimento numa consulta nova vaza dados
  sem aviso. O RLS transforma esse esquecimento num resultado vazio.
- **RLS também na `usuario`:** possível, com uma regra especial para o login buscar por e-mail, mas
  fica bem mais complexo para uma tabela que o código só lê no login, no cadastro e no "quem sou eu".
- **Definir a pessoa em cada service, à mão:** reintroduz o risco de esquecer, que é justamente o
  que o RLS quer eliminar.
- **`SET` sem `LOCAL` (valor na sessão da conexão):** com o pool, a pessoa vazaria para a próxima
  requisição que usasse a mesma conexão.
- **Um usuário só para o Flyway e o app:** é o dono das tabelas, então ignoraria o RLS; e uma falha
  que permitisse rodar SQL pelo app poderia apagar tabelas ou desligar as políticas.

## Consequências

- Positivas:
  - Uma consulta que esqueça o filtro devolve vazio, em vez de dados de outra pessoa.
  - Uma falha no app que permita rodar SQL fica limitada aos dados da sessão e não altera tabelas.
  - Toda tabela nova com dados da pessoa (importação, contas a pagar) nasce com a mesma regra.
- Negativas / custos assumidos:
  - Mais configuração: dois usuários e duas senhas por ambiente.
  - O banco local de desenvolvimento precisa ser recriado (o volume novo cria os dois usuários).
  - Toda tabela nova com dados da pessoa precisa da sua política na migration; o checklist de
    revisão de PR passa a conferir isso.
  - `usuario` e as tabelas de sessão continuam dependendo só do código para o isolamento.

## Atualização (2026-11-24, #249)

- **Sem `FORCE ROW LEVEL SECURITY`.** O `FORCE` faria as políticas valerem também para o dono das
  tabelas, que é o usuário das migrations (`guarda_admin`). Com ele, uma migration de dados futura
  (por exemplo, um `UPDATE` em todas as transações) seria filtrada em silêncio em produção, onde o
  dono não é superusuário, e funcionaria no desenvolvimento e nos testes, onde é. Como o app nunca
  conecta como dono (item 6), o `FORCE` não protegeria o app; só criaria essa armadilha.
- **Função `usuario_logado()`** nas políticas, com `NULLIF(current_setting('app.usuario_id', true), '')`:
  depois de uma transação com `set_config`, a variável volta como texto vazio (e não nulo) na mesma
  conexão, e texto vazio não vira `uuid`.
- **Ponto central:** o gerenciador de transações do JPA estendido (`TransacaoComUsuarioNoBanco`), que
  informa a pessoa logo depois de abrir cada transação. Escolhido entre um aspecto nos services (não
  cobre chamadas diretas aos repositories e depende da ordem dos interceptadores) e um "embrulho" no
  pool de conexões (o valor ficaria na conexão e dependeria de sempre limpar na devolução: uma falha
  viraria vazamento).
- **Cuidado com a sessão:** perguntar ao Spring Security quem está logado pode ler a sessão no
  banco (ele carrega a pessoa sob demanda), e o Spring Session JDBC abre uma transação para isso,
  que perguntaria de novo quem está logado: uma recursão que esgotava o pool de conexões. Enquanto
  a pessoa está sendo descoberta, as transações abertas por essa descoberta seguem sem pessoa (só
  tocam as tabelas de sessão, que não têm RLS).
- **Testes:** nos testes `@Transactional`, a transação é aberta pelo teste e as requisições do MockMvc
  rodam dentro dela. Um filtro e um listener só de teste repetem o passo do ponto central a cada
  requisição e no começo de cada teste; um ajudante (`PessoaNoBanco`) troca a pessoa para preparar ou
  conferir dados de outra pessoa.
