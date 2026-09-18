# ADR-0002: Stack do backend (Java 21, Spring Boot, PostgreSQL, Flyway)

- **Status:** Aceita
- **Data:** 2026-09-18

## Contexto

O protótipo atual usa Java puro com JDBC e SQLite, sem framework. O objetivo do projeto é
construir uma API REST realista, com stack próxima à usada no mercado de backend Java, e usar o
projeto para aprender banco de dados relacional de verdade.

O `pom.xml` do protótipo compilava com Java 21 e `--enable-preview`, enquanto o README dizia
Java 17. Havia inconsistência e uma flag desnecessária.

## Decisão

- **Java 21 (LTS)**, sem `--enable-preview`.
- **Spring Boot** (versão estável mais recente, gerada pelo Spring Initializr) com **Maven** e Maven Wrapper.
- **PostgreSQL** como banco, executado localmente via **Docker Compose**.
- **Flyway** para versionar o schema por migrations SQL; JPA com `ddl-auto=validate`.
- **JUnit 5 + Testcontainers** para testes de integração contra um Postgres real.
- O protótipo SQLite é **preservado** em `legacy/prototype-sqlite` (tag `prototype-sqlite`) e não será migrado.

## Alternativas consideradas

- **Manter SQLite e migrar depois:** a migração seria trabalho descartável. SQLite roda bem em
  produção para um único usuário, mas guarda os dados em um arquivo local, o que combina mal com
  hospedagem em container, backup gerenciado e acesso concorrente, e esconde conceitos relevantes
  (tipos, constraints, concorrência, tipos numéricos exatos). A aplicação é pensada para produção.
- **H2 nos testes:** comportamento diferente do Postgres pode esconder bugs; Testcontainers evita isso.
- **Gradle:** também é comum, mas Maven já é o build do projeto e a base de conhecimento atual.
- **Java 17:** também LTS, mas o projeto já compilava em 21 e não há razão para ficar atrás.

## Consequências

- Positivas: stack alinhada ao mercado, ambiente reproduzível, schema versionado e testável.
- Negativas: exige Docker instalado; curva de aprendizado maior (Spring, JPA, Flyway, Testcontainers).
