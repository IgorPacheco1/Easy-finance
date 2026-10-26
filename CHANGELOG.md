# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).
Enquanto a versão for `0.x`, a API pode mudar sem aviso.

## [Não lançado]

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

### Alterado
- Protótipo em console com SQLite movido para `legacy/prototype-sqlite` (congelado).

### Removido
- Arquivos de IDE (`.idea/`) e banco de dados local (`data/*.db`) removidos do versionamento.

[Não lançado]: https://github.com/IgorPacheco1/Easy-finance/commits/main
