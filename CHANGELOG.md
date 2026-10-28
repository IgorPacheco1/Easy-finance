# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).
Enquanto a versão for `0.x`, a API pode mudar sem aviso.

## [Não lançado]

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

[Não lançado]: https://github.com/IgorPacheco1/Easy-finance/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/IgorPacheco1/Easy-finance/releases/tag/v0.1.0
