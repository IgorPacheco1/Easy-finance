<div align="center">

# Easy Finance

**Controle financeiro pessoal para registrar receitas e despesas em segundos, no celular ou no computador.**

[![CI](https://github.com/IgorPacheco1/Easy-finance/actions/workflows/ci.yml/badge.svg)](https://github.com/IgorPacheco1/Easy-finance/actions/workflows/ci.yml)
[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue.svg)](LICENSE)
![Java](https://img.shields.io/badge/Java-21_LTS-ED8B00?logo=openjdk&logoColor=white)
![Status](https://img.shields.io/badge/status-pr%C3%A9--MVP-yellow)

</div>

---

## Por que este projeto existe

Manter uma planilha de gastos exige disciplina: abrir o arquivo, formatar, somar, conferir
fórmulas. O Easy Finance nasceu para tornar o registro de receitas e despesas **rápido, com foco no
celular**, e para responder perguntas simples sem fórmulas: *quanto sobrou no mês? onde estou
gastando mais?*

A aplicação é pensada para ir para produção e é conduzida como um projeto profissional: todo
trabalho parte de uma issue, toda mudança entra por Pull Request e toda decisão de arquitetura é
registrada em um [ADR](docs/adr).

## Status atual

| Componente | Situação |
|---|---|
| Protótipo em console (SQLite) | Congelado em [`legacy/prototype-sqlite`](legacy/prototype-sqlite) (tag `prototype-sqlite`) |
| Backend (API Java) | Ainda não iniciado. Começa no milestone **M1** |
| Interface (PWA) | Ainda não iniciada. Começa no milestone **M3** |
| Integração contínua | Ativa: valida o título dos PRs e compila backend e web quando existirem |

> O projeto ainda **não tem nada executável além do protótipo legado**. O foco atual é construir a
> base (M0 a M3). Veja o [roadmap](docs/roadmap.md).

## Arquitetura em uma frase

API REST em **Java (Spring Boot)** com **PostgreSQL**, e um **PWA em React + TypeScript**
(instalável no celular, funciona no computador) que consome essa API.
Detalhes em [`docs/architecture/overview.md`](docs/architecture/overview.md) e
[ADR-0005](docs/adr/0005-interface-pwa-react.md).

## Escopo do MVP (v1.0.0)

- [ ] Cadastro de categorias
- [ ] Registro de receitas e despesas em poucos toques (mobile-first)
- [ ] Saldo por período
- [ ] Listagem com filtros, paginação e histórico mensal
- [ ] Resumo mensal por categoria
- [ ] Uso instalável no celular (PWA), com lançamento offline básico
- [ ] Autenticação, com dados isolados por usuário
- [ ] Deploy em produção com backup

**Fora do escopo por enquanto:** microsserviços, provedor de cloud específico, multi-moeda,
integração bancária (Open Finance) e controle de investimentos. Ver
[ADR-0004](docs/adr/0004-escopo-inicial.md).

## Stack

| Camada | Tecnologia | Situação |
|---|---|---|
| Backend | Java 21 (LTS), Spring Boot, Maven | Decidida (M1) |
| Banco de dados | PostgreSQL + Flyway | Decidida (M1) |
| Testes (backend) | JUnit 5, Testcontainers | Decidida (M1) |
| Interface | PWA: React, TypeScript, Vite | Decidida (M3) |
| Ambiente local | Docker Compose | Decidida (M1) |
| CI | GitHub Actions | Ativa |
| Documentação da API | OpenAPI (springdoc) | Planejada (M2) |
| Segurança | Spring Security | Planejada (M5) |
| Empacotamento e deploy | Docker, GHCR | Planejada (M6) |

Justificativas em [ADR-0002](docs/adr/0002-stack-backend.md) e
[ADR-0005](docs/adr/0005-interface-pwa-react.md).

## Como acompanhar o projeto

- **Roadmap:** [`docs/roadmap.md`](docs/roadmap.md) e os [milestones](https://github.com/IgorPacheco1/Easy-finance/milestones)
- **Trabalho em andamento:** [issues](https://github.com/IgorPacheco1/Easy-finance/issues) e o
  [project board](https://github.com/IgorPacheco1?tab=projects)
- **Histórico de mudanças:** [`CHANGELOG.md`](CHANGELOG.md) e [releases](https://github.com/IgorPacheco1/Easy-finance/releases)
- **Decisões de arquitetura:** [`docs/adr`](docs/adr)

## Como rodar

O backend e o PWA ainda não existem. Para executar o protótipo legado:

1. Instale o JDK 21.
2. Abra `legacy/prototype-sqlite` na IDE e execute a classe `Main`.
3. O banco SQLite é criado em `data/` (ignorado pelo Git).

Quando o M1 e o M3 terminarem, esta seção passará a ser: `docker compose up -d`,
`./mvnw spring-boot:run` em `backend/` e `npm run dev` em `web/`.

## Contribuindo

O fluxo de trabalho (issues, branches, commits, PRs) está descrito em
[CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).

## Autor

**Igor Pacheco**, [@IgorPacheco1](https://github.com/IgorPacheco1)
