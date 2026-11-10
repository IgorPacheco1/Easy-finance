# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).
Enquanto a versão for `0.x`, a API pode mudar sem aviso.

## [Não lançado]

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

[Não lançado]: https://github.com/IgorPacheco1/Easy-finance/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/IgorPacheco1/Easy-finance/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/IgorPacheco1/Easy-finance/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/IgorPacheco1/Easy-finance/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/IgorPacheco1/Easy-finance/releases/tag/v0.1.0
