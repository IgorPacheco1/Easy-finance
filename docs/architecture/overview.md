# Visão de arquitetura

> **Status:** planejada. O backend (M1) e o front-end (M3) ainda não existem.
> Este documento é atualizado conforme as decisões são implementadas.

## Visão geral

Monolito em camadas com API REST, banco relacional e um PWA mobile-first
([ADR-0005](../adr/0005-interface-pwa-react.md)).

```mermaid
flowchart LR
    U[Celular ou computador] --> PWA[PWA<br/>React + TypeScript]
    PWA -->|HTTPS /api| P[Proxy]

    subgraph Backend [Backend - Spring Boot]
        P --> C[Controller<br/>REST + validação]
        C --> S[Service<br/>regras de negócio]
        S --> R[Repository<br/>Spring Data JPA]
    end

    R -->|JDBC| DB[(PostgreSQL)]
    F[Flyway<br/>migrations] -.->|versiona o schema| DB
```

Em produção o proxy entrega o PWA em `/` e a API em `/api` (mesmo domínio). Em desenvolvimento,
o servidor do Vite faz proxy de `/api` para o backend local.

## Estrutura do repositório

```
easy-finance/
├── backend/    API Java (Spring Boot, Maven)              - M1
├── web/        PWA (React, TypeScript, Vite)              - M3
├── docs/       ADRs, arquitetura, roadmap
├── legacy/     protótipo SQLite congelado
├── tools/      scripts de configuração do GitHub
└── compose.yaml  PostgreSQL local                         - M1
```

## Responsabilidade das camadas (backend)

| Camada | Responsabilidade | Não deve |
|---|---|---|
| Controller | Receber HTTP, validar entrada, converter DTO ↔ domínio, devolver status corretos | Conter regra de negócio ou acessar o banco |
| Service | Regras de negócio, orquestração e transações | Conhecer detalhes de HTTP |
| Repository | Persistência e consultas | Conter regra de negócio |

## Organização de pacotes (backend, por funcionalidade)

Pacote base previsto: `io.github.igorpacheco1.easyfinance`.

```
easyfinance/
├── categoria/     controller, service, repository, entidade, DTOs
├── transacao/     controller, service, repository, entidade, DTOs
├── usuario/       (M5)
├── config/        configurações transversais (segurança, OpenAPI)
└── shared/        tratamento de erros e utilitários comuns
```

Organizar por funcionalidade (e não por camada técnica) mantém o que muda junto no mesmo lugar.

## Princípios

- **Dinheiro** é `BigDecimal` no Java e `NUMERIC(19,2)` no banco, nunca `double`.
- **Datas** de lançamento são `LocalDate`/`DATE`; instantes (criação) em UTC.
- **Identificador:** UUID v4 em todas as tabelas ([ADR-0006](../adr/0006-identificador-uuid.md)).
  Entidades e restrições em [`domain-model.md`](domain-model.md).
- **Schema** só muda por migration Flyway. Nunca por `ddl-auto`.
- **Erros** seguem `ProblemDetail` (RFC 9457), com título e mensagem em português, prontos para
  mostrar ao usuário. Erros de validação trazem também a lista `erros` (`campo` e `mensagem`).
  Nenhuma resposta expõe stack trace ou detalhes do banco. Ponto único: `shared/TratadorGlobalDeErros`.
- **API versionada** (`/api/v1/...`), porque o PWA instalado pode ficar desatualizado.
- **Configuração sensível** vem de variáveis de ambiente.
- **Regras de negócio ficam na API**; o front-end só apresenta e envia dados.

## Testes do backend

Três tipos, cada um com um papel. Todo comportamento novo ou alterado ganha teste no tipo certo.

| Tipo | Exemplo | Sobe | Serve para |
|---|---|---|---|
| **Unidade do service** | `TransacaoServiceTests` | nada (Mockito, sem Spring) | cada regra de negócio isolada, inclusive casos difíceis de provocar de verdade (corrida entre requisições) |
| **Controller** (`@WebMvcTest`) | `TransacaoControllerTests` | só a camada web, com o service simulado | contrato HTTP: rota, status, cabeçalhos, validação da entrada e formato dos erros |
| **Ponta a ponta** (`@SpringBootTest` + Testcontainers) | `TransacaoApiTests` | a aplicação inteira e um PostgreSQL real | tudo funcionando junto: SQL, migrations, restrições do banco, transações |

Os dois primeiros rodam em milissegundos e apontam exatamente onde está o problema; o último é
mais lento, mas é o único que prova que o banco se comporta como esperado. Sem H2: banco de
teste é sempre PostgreSQL de verdade. Cobertura no relatório do JaCoCo
(`backend/target/site/jacoco/index.html`, também publicado no CI).
