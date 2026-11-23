# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).
Enquanto a versão for `0.x`, a API pode mudar sem aviso.

## [Não lançado]

### Alterado
- Paleta Guará no app (#230, ADR-0033): grafite e tons neutros com o laranja do lobo-guará como
  destaque, nos dois temas, também na barra do sistema e na tela de abertura do app instalado. No
  tema escuro, o destaque passa a servir também como texto.
- Logo nova (#231, ADR-0033): o lobo-guará "espiando a moeda", no ícone do app, no favicon e nas
  telas.
- O app passa a se chamar **Guardá** (#232, ADR-0033): nas telas, no título da aba, no nome do
  app instalado e no "Sobre o Guardá" da Conta. No nome da logo, o "á" vem na cor de destaque.
  **Atenção:** as chaves guardadas no aparelho mudaram de nome, sem migração (ainda não há usuários
  reais). Ao atualizar, o tema escolhido e "esconder valores" voltam ao padrão, e lançamentos
  offline que ainda não foram enviados se perdem. Envie a fila antes de atualizar.
- Backend com o nome novo (#233, ADR-0033): pacote `io.github.igorpacheco1.guarda`, artefato
  `guarda`, classe `GuardaApplication`, configuração `guarda.login.*` e título "Guardá API" no
  OpenAPI. No ambiente local, o banco, o usuário, o container e o volume passam a se chamar
  `guarda`: **atualize o seu `.env`** (`POSTGRES_DB=guarda` e `POSTGRES_USER=guarda`). O banco
  local começa vazio num volume novo; o antigo (`easy-finance-postgres-data`) pode ser apagado com
  `docker volume rm easy-finance-postgres-data`.
- Repositório renomeado para `IgorPacheco1/Guarda` e documentação com o nome novo (#234). A
  demonstração agora fica em <https://igorpacheco1.github.io/Guarda/>; o endereço antigo
  (`/Easy-finance/`) deixou de funcionar, porque o GitHub Pages não redireciona.

## [0.7.0] - 2026-11-22

Redesenho (M6): as quatro abas ganharam uma versão nova, desenhada e aprovada em protótipos aba por
aba, para o app causar uma primeira impressão de produto antes da Produção. Categorias com cor e
ícone, Lançar mais rápido com o teclado do celular, um Mês que mostra para onde foi o dinheiro e uma
Conta que virou perfil. O app continua sendo de desenvolvimento: a hospedagem na internet é o M7.

### Adicionado
- Cor e ícone por categoria (#184, #185, #186, ADR-0031): 12 cores vibrantes (só nas categorias; a
  interface continua Capital Cacau) e uma lista fechada de ícones, guardadas na categoria (migration
  V7) e validadas no backend. A categoria aparece sempre com ícone e nome, nunca só pela cor.
- Lançar como calculadora (#187): o valor grande no topo, as 6 categorias mais usadas em grade
  ("Ver todas" para o resto), chips de data e descrição, o botão dizendo o que falta e uma
  confirmação com o saldo do mês antes e depois, "Lançar outra" e "Desfazer" (também offline).
- Mês novo (#188, #189, #190): olho para esconder os valores, números que contam ao abrir, uma frase
  comparando com o mês anterior, gráfico de gasto por dia com a média (endpoint
  `/api/v1/resumo/diario`), rosca por categoria e lançamentos agrupados por dia ("Hoje", "Ontem",
  "Segunda, 2 de novembro").
- Categorias redesenhadas (#191, #192): separadas entre "com gastos no mês" e "sem movimento", com o
  total e uma barra de comparação; tocar abre os lançamentos da categoria na Busca. Nova categoria e
  editar numa folha com prévia, ícones e cores.
- Conta como perfil (#193, #194, ADR-0032): nome no cadastro e avatar com iniciais e cor (sem foto),
  "Editar perfil", desde quando usa o app e os números da pessoa (dias seguidos lançando,
  lançamentos e categorias usadas). Trocar a senha em tela própria. Endpoints `/api/v1/eu/perfil` e
  `/api/v1/eu/estatisticas`; quem já tinha conta informa o nome no primeiro acesso.
- Preferências do aparelho (#195): tema Sistema, Claro ou Escuro e "esconder valores ao abrir",
  guardados só no aparelho e apagados ao sair.
- Movimento e telas vazias (#196): transição curta entre as telas e telas vazias com um convite,
  sempre respeitando o "reduzir movimento" do sistema.
- "Instalar o app" na Conta (#217): no Chrome e no Edge abre a janela de instalação do navegador; no
  iPhone, uma folha explica o caminho pelo botão Compartilhar; com o app já instalado, a opção some.

### Alterado
- Lançar com o teclado do celular (#216): o teclado desenhado na tela deu lugar ao teclado numérico
  do próprio celular, e o valor fica sempre à vista no topo. No iPhone, um toque no valor abre o
  teclado; a tecla de confirmar lança. No computador, o teclado físico continua funcionando.
- Layout da Conta (#217): perfil centralizado, números com ícone, listas com ícones (Preferências,
  Segurança e privacidade, Sobre) e o botão Sair na largura toda. "Seus dados e privacidade" virou
  uma tela própria, com "Excluir minha conta" no fim.
- README com cara de produto (#197): apresentação do app com imagens das telas e o botão da
  demonstração; a parte técnica foi para "Para desenvolvedores".
- Os testes de tela rodam no `StrictMode`, como o app (#223).

### Corrigido
- Folhas de nova categoria, editar categoria e editar perfil fechavam sozinhas ao abrir no
  desenvolvimento (#215).
- A aba "Conta" não ficava marcada em "Trocar senha" e "Seus dados e privacidade".
- Revisão de acessibilidade da release no navegador real (#198): o contorno de foco do teclado
  voltou no campo do valor, no botão de lançar ainda incompleto e no olho ligado do Mês; os itens das
  listas da Conta e o avatar passaram a ter o nome igual ao texto que aparece (WCAG 2.5.3).

## [0.6.0] - 2026-11-18

Acabamento (M5.5): o app ganhou a cara dele antes de ir para produção. Identidade visual com logo
definitiva, design system, todas as telas redesenhadas, layout para o computador, editar e excluir
lançamentos e um modo demonstração no GitHub Pages
(<https://igorpacheco1.github.io/Easy-finance/>). Por baixo: tipos do app conferidos contra a API
no CI, cobertura mínima de testes no backend e no app e testes de acessibilidade em todas as telas.
O app continua sendo de desenvolvimento: a hospedagem na internet é o M6.

### Adicionado
- Modo demonstração (#162, ADR-0030): o app inteiro só no navegador, com dados de exemplo e uma API
  falsa (MSW), publicado no GitHub Pages a cada merge na `main` e com link no README. Já abre logado,
  dá para lançar, ver o mês, buscar e gerenciar categorias, e uma faixa no topo avisa que é uma
  demonstração e que nada é salvo. O CI confere que o app normal não leva nada da demonstração.
- Layout para o computador (#161): a partir de 900px de largura, a navegação passa para uma coluna
  fixa à esquerda, com a logo, e o Mês mostra saldo e resumo à esquerda e a lista à direita. A
  Busca ganha uma coluna mais larga. No celular nada muda. Para quem usa teclado, o primeiro Tab
  mostra "Pular para o conteúdo".
- Editar e excluir um lançamento no app (#101): tocar num item da lista do Mês ou da Busca abre a
  tela "Editar lançamento", já preenchida, com os mesmos campos do lançamento. Excluir pede
  confirmação ("Não dá para desfazer") e o foco começa no "Cancelar". Depois de salvar ou excluir,
  o app volta para o mesmo mês ou a mesma busca, com um aviso. Editar e excluir precisam de
  internet (a fila do aparelho continua só para lançamentos novos, ADR-0019); um lançamento que já
  não existe mostra "não encontrado".
- Telas Entrar, Criar conta e Conta redesenhadas (#160): logo e título centralizados, formulário
  num cartão com o botão na largura toda, link "Criar conta" / "Entrar" com área de toque de 44px,
  e na Conta o e-mail em destaque e cada assunto num cartão, com "Excluir conta" afastado e com a
  borda vermelha.
- Telas Buscar e Categorias redesenhadas (#159): painel de filtros e listas de categorias em
  cartões com sombra, rótulos fortes, títulos das seções em maiúsculas pequenas, alternador
  Despesa/Receita igual ao do lançamento, botão de excluir contornado e erros com o ícone "!".
  Campos com 16px (sem o zoom do iPhone).
- Telas Lançar e Mês redesenhadas (#158) no design system: valor em destaque, títulos maiores,
  saldo e resumo por categoria em cartões com sombra, Despesas/Receitas do resumo como chips com
  visto, dias da lista em maiúsculas pequenas e lista sem caixa em volta (vale também para a busca).
  Campos de texto do lançamento com 16px (o iPhone não dá mais zoom ao tocar).
- Design system (#157, `docs/design-system.md`): o app passa para a paleta Capital Cacau e a fonte
  Manrope (servida pelo próprio app, também offline), com variáveis para cores, texto, espaço,
  raios, sombra e movimento. Acessibilidade: bordas de campos e botões com contraste de 3:1 ou
  mais, chip selecionado com um visto, erro de campo com ícone, foco do teclado mais visível,
  nenhum texto abaixo de 13px e respeito ao "reduzir movimento" do sistema. A barra do resumo
  deixou de usar `style` inline (pronta para CSP estrita).
- Logo definitiva (#156, ADR-0029): a silhueta de uma carteira em cacau sobre o caramelo da
  marca, nos ícones do app (Android, iPhone e aba do navegador), nas telas de entrar e criar conta
  e no README. Cores da barra do sistema e da tela de abertura na paleta Capital Cacau.

### Alterado
- Tipos do app conferidos no CI (ADR-0028, #151): um teste do backend grava a especificação
  OpenAPI em `backend/target/openapi.json`, o `npm run api:tipos` gera os tipos a partir dela (sem
  precisar do backend rodando) e o CI falha se o `web/src/api/esquema.d.ts` versionado estiver
  diferente.
- Tela do mês: o saldo carrega separado da lista de lançamentos, como o resumo por categoria. Se
  só o saldo falhar, a lista continua na tela, e o "Tentar de novo" do cartão pede só o saldo; se
  só a lista falhar, o saldo continua aparecendo (#153).
- Acessibilidade verificada nos testes (#154): o axe-core roda em cada tela do app e o CI falha
  com qualquer violação; checklist manual (teclado, zoom, leitor de tela) no `CONTRIBUTING.md`.
- Cobertura dos testes do app medida e exigida (#152): `npm run test:cobertura` mede todos os
  arquivos de `web/src/` (menos `main.tsx` e o service worker) e falha abaixo de 95% das linhas ou
  85% dos branches; no CI, resumo na aba Summary e relatório HTML para baixar.
- Cobertura mínima do backend (#168; a #69, que pedia isso, já estava fechada): o `./mvnw verify`
  (e o CI) falha se a cobertura cair abaixo de 95% das linhas ou 85% dos branches. Hoje: 98,4% e
  91,1%.

### Corrigido
- Navegando pelo teclado no celular, o item focado podia ficar escondido atrás da barra de
  navegação ou do botão "Lançar": agora a tela rola deixando esse espaço livre (WCAG 2.4.11,
  revisão da v0.6.0, #163).
- Ao rolar a tela de lançamento, uma tira do conteúdo aparecia entre o botão "Lançar" e a barra de
  navegação (#163).
- Na demonstração, a faixa do topo passou a ser uma região da página (`<aside>`), que o leitor de
  tela lista com as outras (achado do axe, #163).
- A barra de navegação do celular tinha espaço para 3 destinos e mostrava 4 ("Conta" caía
  para uma segunda linha): agora as colunas se ajustam à quantidade de destinos (#161).
- Telas de entrar e criar conta sem região principal (`<main>`): o leitor de tela não tinha
  como pular direto para o conteúdo (#154, achado do axe).
- Fim de linha do `backend/mvnw.cmd` normalizado no Git (o Dependabot o gravou com CRLF no #147, e o
  arquivo aparecia sempre como modificado).
- OpenAPI de `GET /api/v1/auth/csrf`: não anuncia mais um parâmetro `token` obrigatório que não
  existe (o token vem da sessão). Os tipos do app deixam de pedir esse parâmetro (#151).

## [0.5.0] - 2026-11-15

Segurança e multiusuário (M5): cada pessoa cria a própria conta, entra e vê só os próprios dados.
O app ganhou as telas de entrar, criar conta e "Conta", e a API passou a exigir login em tudo. O app
ainda é de desenvolvimento: a hospedagem na internet (HTTPS, backups, limite de requisições) é o M6.
**Atenção ao atualizar:** a migration V4 apaga as transações e categorias personalizadas sem dono
do banco local; o app exige criar uma conta na primeira vez.

### Adicionado
- Usuário e dono dos dados (M5, #123): tabela `usuario` e `usuario_id` em transações, ids de
  transações excluídas e categorias personalizadas (migration V4). Apagar o usuário apaga os dados
  dele. **A V4 apaga os dados de teste sem dono do banco local** (ficam as categorias do sistema).
  Até a issue de login, a API usou um usuário provisório fixo (ADR-0021), já removido (#125).
- Cadastro de usuário: `POST /api/v1/auth/cadastro` com e-mail e senha (8 caracteres a 72 bytes,
  sem exigir símbolo). O e-mail vale sem diferenciar maiúsculas e é único (`409` se repetido); a
  senha é guardada só como hash BCrypt, custo 12, e nunca é devolvida (#124, ADR-0020). Ainda não
  deixa a pessoa logada (a partir da #125 deixa).
- Entrar, sair e manter a sessão (M5, #125, ADR-0020): `GET /api/v1/auth/csrf`,
  `POST /api/v1/auth/entrar`, `POST /api/v1/auth/sair` e `GET /api/v1/eu`. Sessão no servidor
  (Spring Session JDBC, tabelas na migration V5), cookie `HttpOnly`, `Secure` (menos no perfil `dev`)
  e `SameSite=Strict`, 30 dias sem uso. Proteção CSRF: o token vem em `GET /auth/csrf` e volta no
  cabeçalho `X-XSRF-TOKEN` em todo `POST`, `PUT` e `DELETE`. O cadastro já deixa a pessoa logada.
  E-mail inexistente e senha errada dão a mesma resposta (`401`), com o mesmo tempo. Novas
  dependências do backend: `spring-boot-starter-security`, `spring-boot-starter-session-jdbc` e,
  nos testes, `spring-boot-starter-security-test`.
- Limite de tentativas de login (M5, #126, ADR-0022): 5 falhas por e-mail e 20 por IP em 15 minutos
  (ajustável em `easyfinance.login.*`) bloqueiam o login com `429` e `Retry-After`, até com a senha
  certa. E-mail sem conta recebe a mesma resposta. A contagem fica no banco (migration V6), só com
  hash do e-mail e do IP. Login certo zera as falhas do e-mail. Sem dependência nova.
- Trocar a senha e excluir a conta (M5, #127, ADR-0024): `PUT /api/v1/eu/senha` e
  `DELETE /api/v1/eu`, ambos pedindo a senha atual. Senha errada dá `400` (não `401`, para o app não
  achar que a sessão caiu) e conta no mesmo limite de tentativas do login (`429`). Trocar a senha
  encerra as outras sessões da conta e mantém a atual; excluir apaga o usuário com tudo dele
  (transações, categorias, sessões) e encerra a sessão. **Só backend:** a tela "Minha conta" vem
  depois da tela de login. Sem dependência nova.
- Categorias por usuário (M5, #128, ADR-0025): cada pessoa vê as categorias do sistema e as dela; a
  de outra pessoa responde `404` na busca, na edição e na exclusão, como se não existisse. A
  listagem `?ordem=USO` conta só as transações da própria pessoa. O nome precisa ser único entre as
  categorias do sistema e as da pessoa (`409`); duas pessoas podem ter categorias com o mesmo nome.
  Editar ou excluir categoria do sistema continua `409`. Sem migration nem dependência nova.
- Transações por usuário (M5, #129, ADR-0026): cada pessoa vê e altera só as próprias transações; a
  de outra pessoa responde `404` (busca, edição e exclusão). Listagem, saldo e resumo por categoria
  contam só as dela. Lançar numa categoria de outra pessoa (ou filtrar por ela) dá `400`, como uma
  categoria que não existe. O `410` vale só para ids que a própria pessoa excluiu. Enviar um `id` que
  já é de transação de outra pessoa dá `409`, sem dizer de quem é. Sem migration nem dependência nova.
- Entrar, criar conta e sair no app (M5, #130, ADR-0027): telas `/entrar` e `/criar-conta`, rotas
  protegidas e a tela "Conta" (sair, trocar a senha e excluir a conta, com confirmação pela senha).
  Uma sessão vencida no meio do uso leva ao login com aviso. Sem conexão, o app abre como o último
  usuário do aparelho e deixa lançar offline. Cada lançamento da fila tem dono e só sai na sessão
  dele; sair, excluir a conta ou entrar com outra conta apaga os dados do aparelho (com aviso se
  havia lançamentos não enviados). Banco do aparelho na versão 2. Sem dependência nova.
- Prova de isolamento com duas sessões reais (M5, #131): Ana e Bia se cadastram pela API, cada uma
  com o próprio cookie e token CSRF, e os testes tentam ler, alterar e excluir os dados uma da
  outra em todos os endpoints, nos dois sentidos. Só testes.
- Revisão de segurança do M5 (#132): teste de que as respostas 401, 403 e 429 também proíbem cache
  (`no-store`) e a troca de tipo (`nosniff`). A revisão não achou vazamento entre contas; os
  limites aceitos ficam registrados no [roadmap](docs/roadmap.md#próximo-m6) para o M6.

### Alterado
- **Licença trocada de MIT para PolyForm Noncommercial 1.0.0** (#139, ADR-0023): o código continua
  visível, mas o uso comercial exige permissão do autor. Versões até a v0.4.0 continuam sob a MIT
  para quem já as recebeu. Atualizados `LICENSE`, o selo e a seção do README, `<licenses>` do
  `pom.xml` e `license` do `web/package.json`.
- **A API agora é fechada por padrão** (#125): tudo exige login, exceto `/actuator/health`, a
  documentação (só no perfil `dev`) e os endpoints de cadastro, entrar, sair e CSRF. Sem login, `401`
  (`ProblemDetail`); token CSRF ausente ou inválido, `403`. **O app web ganhou a tela de login na #130.**
- O usuário provisório (ADR-0021) foi removido: o dono dos dados passou a ser o usuário da sessão.

## [0.4.0] - 2026-11-09

Consultas e offline (M4): encontrar e entender os lançamentos e lançar mesmo sem internet. Busca
com filtros e rolagem infinita, resumo por categoria na tela do mês, categorias mais usadas
primeiro e lançamento offline com envio automático, inclusive em segundo plano no Android e no
computador. Ainda sem login: use só na rede de casa, com dados de teste, até o M5.

### Adicionado
- Lançar sem internet: sem conexão (ou sem resposta em 10 segundos), o lançamento fica guardado
  no aparelho (IndexedDB) e é enviado depois, com o mesmo id. No Chrome e no Edge, o envio
  acontece quando a conexão volta, mesmo com o app fechado (Background Sync); no iPhone, ao abrir
  o app ou quando a conexão volta com ele aberto. Aviso de lançamentos aguardando envio nas telas
  Lançar e Mês, com "Enviar agora"; lançamento excluído em outro aparelho pergunta se descarta ou
  lança de novo. As categorias ficam guardadas para lançar offline (#100, ADR-0019). Novas
  dependências do app: `idb` (e, em desenvolvimento, `fake-indexeddb`, `workbox-precaching` e
  `workbox-routing`).
- Reenvio de uma transação já excluída não a recria mais: o id excluído fica guardado (tabela
  `transacao_excluida`, migration V3, só id e data) e o `POST /api/v1/transacoes` com esse id
  responde `410 Gone` (#98). Prepara o lançamento offline.
- Categorias mais usadas primeiro na tela Lançar: `GET /api/v1/categorias?ordem=USO` ordena
  pela quantidade de lançamentos dos últimos 90 dias (empate e sem uso: ordem alfabética). Sem
  o parâmetro, a ordem continua alfabética (#97).
- Resumo por categoria na tela do Mês: cada categoria com o valor, o percentual escrito e uma
  barra proporcional, com a troca entre despesas e receitas. Se só o resumo falhar, o resto da
  tela continua funcionando (#96).
- Resumo por categoria na API: `GET /api/v1/resumo?de=...&ate=...` devolve, separado em
  receitas e despesas, o total, a quantidade de lançamentos e o percentual de cada categoria
  sobre o total do seu tipo, da maior para a menor (#95).
- Tela de busca no app (lupa no cabeçalho da tela do Mês): busca pelo texto da descrição
  enquanto se digita, filtros de tipo, categoria, faixa de valor e período, resultados de
  qualquer época com rolagem infinita, e a busca guardada no endereço da página (#94).
- Filtros na listagem de transações: `categoriaId`, `tipo`, `descricao` (texto contido, sem
  diferenciar maiúsculas) e `valorMinimo`/`valorMaximo` (pontas incluídas), combináveis entre si,
  com o período e com a paginação (#93, ADR-0018).
- Tela do Mês com rolagem infinita: as transações chegam em partes e a próxima é carregada ao
  chegar ao fim da lista, com o botão "Carregar mais" para quem navega pelo teclado (#92).

### Alterado
- READMEs reorganizados: o principal mostra o app (imagens), as funcionalidades, os destaques
  técnicos e a arquitetura; o passo a passo de rodar foi para `docs/guias/rodar-o-projeto.md`; o
  `backend/` ganhou README próprio (#115).
- O service worker do PWA passou a ser escrito no projeto (`web/src/sw.ts`, modo
  `injectManifest`), para o envio em segundo plano; o cache continua só com a casca do app.
- Na lista de lançamentos, dias de outro ano mostram o ano junto ("Sábado, 20/12/2025").
- Dependências do app atualizadas pelo Dependabot: `lucide-react` 1.70.0, `msw` 3.0.4,
  `oxlint` 1.92.0 e `vite` 8.3.6 (#116).
- **API (incompatível):** `GET /api/v1/transacoes` passou a ser paginado. Aceita `pagina`
  (começa em 1) e `tamanho` (de 1 a 100; padrão 20) e devolve
  `{ itens, pagina, tamanho, temMais }` em vez de uma lista. A ordem ganhou o `id` como
  desempate final, para nenhuma transação aparecer em duas páginas (#92, ADR-0017).

### Segurança
- No perfil `dev`, o backend só aceita conexões do próprio computador (`server.address:
  127.0.0.1`). O celular continua funcionando pelo proxy do Vite, que agora aponta para
  `127.0.0.1:8080`. O guia do celular avisa para usar o modo de rede só em casa e com dados de
  teste, já que ainda não há login.
- Respostas da API com `Cache-Control: no-store` e `X-Content-Type-Options: nosniff`, para dados
  financeiros não ficarem em cache no navegador ou na rede.
- O log da violação de integridade não grava mais a mensagem do banco (que trazia a linha
  recusada, com valor e descrição): só o nome da restrição.
- A busca pela descrição aceita no máximo 255 caracteres (400 acima disso).

## [0.3.0] - 2026-11-05

PWA mínimo (M3): a primeira interface usável. App instalável no celular e no computador para
lançar receitas e despesas em poucos toques, ver o mês com o saldo e gerenciar as categorias,
rodando localmente. Ainda sem login: use só na rede de casa, com dados de teste, até o M5.

### Adicionado
- Projeto do front-end em `web/` (PWA): React 19, TypeScript 7 em modo estrito e Vite 8, com
  oxlint e Prettier (ADR-0011), Vitest e Node 26 fixado (`.nvmrc`). Dependabot para npm.
- Layout base do app, pensado para o celular: navegação inferior com Lançar, Mês e Categorias,
  tema claro e escuro seguindo o sistema (paleta Champagne) e página de endereço inexistente
  (ADR-0012).
- Cliente HTTP do app para a API (`web/src/api/`): funções por recurso, erros da API
  (ProblemDetail) prontos para a tela, tipos gerados do OpenAPI, proxy do Vite para o backend no
  desenvolvimento e testes com MSW (ADR-0013).
- Tela de lançamento rápido: valor no estilo caixa registradora, categoria e data com um toque,
  validação igual à da API, aviso com "Desfazer" e reenvio seguro com o id gerado no aparelho
  (ADR-0014).
- Tela do mês: saldo em destaque (receitas, despesas e saldo), transações agrupadas por dia
  ("Hoje", "Ontem", dia da semana), setas para o mês anterior e o próximo (o mês fica no
  endereço, `/mes?m=AAAA-MM`) e estados de carregando, vazio e erro.
- Tela de categorias: despesas e receitas em ordem alfabética, categorias do sistema marcadas
  como "Padrão"; criar, renomear e excluir categorias personalizadas na própria tela, com
  confirmação e a explicação da API quando a categoria está em uso.
- Guia para abrir o app no celular com HTTPS na rede de casa (`docs/guias/celular-com-https.md`),
  testado no iPhone, e o comando `npm run dev:celular`. O HTTPS do servidor de desenvolvimento
  liga só quando o certificado é informado no `web/.env.local`.
- App instalável (PWA) no celular e no computador: nome, ícone e cores próprios, abre sem a
  barra do navegador e também sem internet (só a casca do app fica guardada; nenhum dado
  financeiro vai para o cache), aviso "Nova versão do app disponível" com o botão "Atualizar" e
  guia [Instalar o app](docs/guias/instalar-o-app.md) com as limitações do iPhone (ADR-0015).
- Testes de tela do app com Testing Library e jsdom (ADR-0016): lançamento, mês, categorias,
  navegação e avisos, com a API falsa do MSW; rodam no CI a cada PR.
- Guia [Preparar o computador](docs/guias/preparar-o-computador.md) para a primeira vez, e no
  README a ordem para rodar tudo (banco, backend, app), as portas e os endereços, o acesso pelo
  celular com as limitações de HTTPS e a solução dos problemas mais comuns.

### Alterado
- Documentação da API (OpenAPI): os campos que sempre vêm nas respostas de categorias,
  transações, saldo e erros de campo passaram a ser marcados como obrigatórios; os tipos do app
  são gerados já corretos, sem ajuste à mão.

### Segurança
- Alertas moderados do `npm audit` nas ferramentas de build do PWA (`glob` e `minimatch`)
  corrigidos com um `overrides` no `web/package.json`. Fica um alerta baixo sem correção
  disponível (`deepmerge`), só no build (ADR-0015).

## [0.2.0] - 2026-11-03

Núcleo da API (M2): categorias, transações e saldo por período, com validação, erros
padronizados em português, criação idempotente e documentação OpenAPI. Ainda sem login: a API
deve rodar só localmente até o M5.

### Adicionado
- API de categorias em `/api/v1/categorias`: criar, listar (com filtro opcional `?tipo=`),
  buscar por id, renomear e excluir. Nome único sem diferenciar maiúsculas; categorias do
  sistema e categorias com transações não podem ser alteradas nem excluídas.
- API de transações em `/api/v1/transacoes`: criar, listar (da mais recente para a mais antiga),
  buscar por id, editar e excluir. Cada transação traz a categoria resumida (id, nome e tipo);
  categoria inexistente é recusada como erro no campo `categoriaId`.
- Documentação da API em OpenAPI com springdoc (ADR-0010): especificação em `/v3/api-docs`
  (JSON) e `/v3/api-docs.yaml`, e Swagger UI em `/swagger-ui.html`, disponíveis só no perfil `dev`.
  Endpoints com descrições, exemplos e o formato das respostas de erro.
- Listagem de transações por período (`GET /api/v1/transacoes?de=...&ate=...`, dias das pontas
  incluídos) e saldo do período (`GET /api/v1/saldo?de=...&ate=...`) com receitas, despesas e
  saldo calculados no banco, em decimal exato.
- Criação idempotente de transações: o cliente pode enviar o próprio `id` no `POST`. Reenviar
  o mesmo `id` com os mesmos dados devolve a transação existente (`200`), sem duplicar; com
  dados diferentes, `409 Conflict`. Prepara o lançamento offline do PWA (M4).
- Validação das transações: valor maior que zero com no máximo 2 casas decimais, descrição com
  até 255 caracteres e data entre 1 ano antes e 1 ano depois de hoje (na edição, a data só é
  conferida se mudar, para lançamentos antigos continuarem editáveis).
- Erros da API no formato ProblemDetail (RFC 9457, `application/problem+json`), com título e
  mensagem em português. Erros de validação listam cada campo inválido (`erros`); JSON mal
  formado, valor fora das opções e id inválido dizem o que está errado; erros inesperados
  respondem 500 sem expor detalhes internos.
- Testes em três camadas: unidade dos services (Mockito), controllers (`@WebMvcTest`) e
  ponta a ponta com PostgreSQL real (Testcontainers), descritas em `docs/architecture/overview.md`.

### Alterado
- Versão do JaCoCo atualizada para 0.8.16.

## [0.1.0] - 2026-10-28

Primeira versão: fundação do repositório (M0) e esqueleto do backend (M1). Ainda sem API de
negócio: a aplicação sobe, conecta no PostgreSQL, aplica o schema e expõe o health check.

### Adicionado
- Estrutura profissional do repositório (M0): README realista, LICENSE, CONTRIBUTING,
  SECURITY, templates de issue e PR, CODEOWNERS, `.editorconfig` e `.gitattributes`.
- CI com GitHub Actions (build do backend e do front-end quando existirem, e validação do título do PR).
- Dependabot para GitHub Actions.
- ADRs iniciais (`docs/adr`), incluindo a decisão de interface como PWA (React + TypeScript), visão de arquitetura e roadmap por milestones.
- `CLAUDE.md` com o acordo de trabalho com assistentes de IA (rastreabilidade e consulta prévia).
- Scripts de configuração do GitHub (`tools/github-bootstrap`): labels, milestones,
  issues, project board e ruleset da `main`.
- Modelo de domínio com diagrama ER (`docs/architecture/domain-model.md`), schema em DBML
  para o dbdiagram.io (`docs/architecture/schema.dbml`) e ADRs de
  identificador UUID, representação de dinheiro e categorias com tipo (sistema + personalizadas).
- Projeto Spring Boot do backend em `backend/` (Java 21, Maven Wrapper), com Web, Validation,
  Data JPA, PostgreSQL, Flyway, Actuator, Testcontainers e Lombok (regras no ADR-0009).
- Ambiente local com PostgreSQL 18 via Docker Compose (`compose.yaml`), com volume nomeado,
  healthcheck e credenciais no `.env` (modelo em `.env.example`).
- Perfis de configuração `dev` e `test`, com credenciais só por variável de ambiente
  (o perfil `dev` reaproveita o `.env` do Compose) e padrões seguros na configuração base.
- Health check em `/actuator/health`, sem detalhes internos fora do perfil `dev`; demais
  endpoints do Actuator ficam fechados.
- Schema inicial do banco por migrations Flyway: tabelas `categoria` e `transacao` com chaves,
  restrições (`CHECK`, `FOREIGN KEY`) e índices (V1), e as 19 categorias padrão do sistema (V2).
- Relatório de cobertura de testes com JaCoCo, gerado no `verify` e publicado no CI.
- Dependabot para as dependências Maven do backend.

### Alterado
- Protótipo em console com SQLite movido para `legacy/prototype-sqlite` (congelado).
- Actions do CI atualizadas para as versões com Node 24 (`checkout` 7, `setup-java` 6,
  `upload-artifact` 7, `setup-node` 7, `action-semantic-pull-request` 6) e JaCoCo 0.8.15.

### Removido
- Arquivos de IDE (`.idea/`) e banco de dados local (`data/*.db`) removidos do versionamento.

[Não lançado]: https://github.com/IgorPacheco1/Easy-finance/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/IgorPacheco1/Easy-finance/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/IgorPacheco1/Easy-finance/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/IgorPacheco1/Easy-finance/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/IgorPacheco1/Easy-finance/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/IgorPacheco1/Easy-finance/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/IgorPacheco1/Easy-finance/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/IgorPacheco1/Easy-finance/releases/tag/v0.1.0
