# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).
Enquanto a versão for `0.x`, a API pode mudar sem aviso.

## [Não lançado]

### Adicionado
- Projeto do front-end em `web/` (PWA): React 19, TypeScript 7 em modo estrito e Vite 8, com
  oxlint e Prettier (ADR-0011), Vitest e Node 26 fixado (`.nvmrc`). Dependabot para npm.
- Layout base do app, pensado para o celular: navegação inferior com Lançar, Mês e Categorias,
  tema claro e escuro seguindo o sistema (paleta Champagne) e página de endereço inexistente
  (ADR-0012).
- Cliente HTTP do app para a API (`web/src/api/`): funções por recurso, erros da API
  (ProblemDetail) prontos para a tela, tipos gerados do OpenAPI, proxy do Vite para o backend no
  desenvolvimento e testes com MSW (ADR-0013).

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

[Não lançado]: https://github.com/IgorPacheco1/Easy-finance/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/IgorPacheco1/Easy-finance/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/IgorPacheco1/Easy-finance/releases/tag/v0.1.0
