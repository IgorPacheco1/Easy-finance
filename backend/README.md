# Easy Finance: backend (API)

API REST do Easy Finance, em **Java 21 + Spring Boot**, com **PostgreSQL** e **Flyway**. É o
"core" do projeto: todas as regras de negócio ficam aqui, e o app em [`web/`](../web) só consome
esta API. Decisões em [ADR-0002](../docs/adr/0002-stack-backend.md) (stack) e nos demais
[ADRs](../docs/adr).

## Pré-requisitos

- **JDK 21** e **Docker Desktop** (o banco local e os testes usam PostgreSQL em container).
- O arquivo `.env` na raiz do repositório (modelo em [`.env.example`](../.env.example)).

Passo a passo da primeira vez: [Preparar o computador](../docs/guias/preparar-o-computador.md).

## Comandos

Todos rodam dentro desta pasta (`cd backend`). No Windows, use `.\mvnw` no lugar de `./mvnw`.

| Comando | O que faz |
|---|---|
| `SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run` | Sobe a API em <http://localhost:8080> com o perfil `dev` (PowerShell: `$env:SPRING_PROFILES_ACTIVE="dev"; ./mvnw spring-boot:run`) |
| `./mvnw -B verify` | Compila e roda **todos** os testes (precisa do Docker aberto) |
| `./mvnw test -Dtest=TransacaoServiceTests` | Roda só uma classe de teste |

O banco local sobe com `docker compose up -d`, na raiz. Passo a passo completo, portas e solução
de problemas em [Rodar o projeto](../docs/guias/rodar-o-projeto.md).

## Perfis

| Perfil | Quando usar | Banco | O que muda |
|---|---|---|---|
| `dev` | No seu computador | Docker Compose, credenciais do `.env` | Swagger UI e detalhes do health ligados; a API só aceita conexões do próprio computador (`127.0.0.1`) |
| `test` | Testes automatizados | Testcontainers (PostgreSQL descartável) | Menos log |
| nenhum | Produção | `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` | Padrões mais seguros: sem Swagger, health sem detalhes |

Não existe perfil padrão de propósito: sem perfil e sem variáveis, a aplicação não sobe, em vez de
tentar se conectar a um banco errado.

## Endpoints

Base: `/api/v1`. Com o perfil `dev`, todos podem ser testados no navegador pelo **Swagger UI**:
<http://localhost:8080/swagger-ui.html> (especificação em `/v3/api-docs`).

| Método e caminho | O que faz |
|---|---|
| `GET /categorias` | Lista as categorias. `?tipo=RECEITA\|DESPESA`; `?ordem=USO` traz as mais usadas nos últimos 90 dias primeiro |
| `GET /categorias/{id}` | Busca uma categoria |
| `POST /categorias` | Cria uma categoria personalizada |
| `PUT /categorias/{id}` | Renomeia uma categoria personalizada |
| `DELETE /categorias/{id}` | Exclui uma categoria personalizada sem lançamentos |
| `GET /transacoes` | Lista paginada (`pagina` a partir de 1, `tamanho` até 100) com filtros: `de`/`ate`, `categoriaId`, `tipo`, `descricao`, `valorMinimo`/`valorMaximo` |
| `GET /transacoes/{id}` | Busca uma transação |
| `POST /transacoes` | Cria uma transação, de forma **idempotente** pelo `id` enviado pelo app (201 criada, 200 reenvio igual, 409 mesmo id com outros dados, 410 id de transação excluída) |
| `PUT /transacoes/{id}` | Edita uma transação |
| `DELETE /transacoes/{id}` | Exclui uma transação (o id fica bloqueado para reenvios) |
| `GET /saldo?de=&ate=` | Receitas, despesas e saldo do período |
| `GET /resumo?de=&ate=` | Total, quantidade e percentual de cada categoria no período |
| `GET /actuator/health` | Saúde da aplicação (`UP`/`DOWN`), fora do `/api/v1` |

Os erros seguem o formato **ProblemDetail** (RFC 9457), com mensagens em português e, nos dados
inválidos, a lista `erros` com o campo e a mensagem.

## Organização do código

Um pacote por assunto do domínio, cada um com as suas camadas: **Controller** (HTTP e validação)
→ **Service** (regras de negócio) → **Repository** (banco).

```
src/main/java/io/github/igorpacheco1/easyfinance/
├── categoria/     categorias: entidade, regras (nome único, sistema × personalizada), API
│   └── dto/       o que entra e sai pela API
├── transacao/     transações, saldo e resumo: regras de data e idempotência, filtros
│   └── dto/       (Specification), paginação e bloqueio de ids excluídos
├── shared/        tratamento de erros (ProblemDetail), página de resultados
└── config/        OpenAPI, relógio da aplicação, cabeçalhos de segurança

src/main/resources/
├── application.yaml        configuração base (vale para todos os ambientes)
├── application-dev.yaml    perfil de desenvolvimento
└── db/migration/           migrations Flyway (V1, V2, V3...): a única forma de mudar o schema
```

O modelo de dados está em [`docs/architecture/domain-model.md`](../docs/architecture/domain-model.md),
com o diagrama editável em [`schema.dbml`](../docs/architecture/schema.dbml) (dbdiagram.io).

## Convenções

- **Dinheiro:** `BigDecimal` no Java e `NUMERIC(19,2)` no banco; nunca `double`
  ([ADR-0007](../docs/adr/0007-representacao-de-dinheiro.md)).
- **Identificadores:** UUID v4 ([ADR-0006](../docs/adr/0006-identificador-uuid.md)).
- **Datas:** `LocalDate` para lançamentos; instantes em UTC; "hoje" vem de um `Clock` injetado,
  para os testes controlarem o relógio.
- **Schema:** só muda por migration nova; uma migration aplicada nunca é editada.
- **Domínio em português** (`Transacao`, `Categoria`); termos técnicos em inglês.

## Testes

São três camadas, todas rodando no `./mvnw -B verify` e no CI:

| Camada | Exemplo | O que confere | Banco |
|---|---|---|---|
| Unidade | `TransacaoServiceTests` | Regras de negócio, com o repository simulado (Mockito) e relógio fixo | Nenhum |
| Controller | `TransacaoControllerTests` (`@WebMvcTest`) | HTTP: status, JSON, leitura de parâmetros, erros | Nenhum |
| Integração | `TransacaoApiTests` (`@SpringBootTest`) | O fluxo inteiro, da requisição ao PostgreSQL | PostgreSQL real (Testcontainers) |

Não há H2 nem banco "parecido": os testes de integração usam a mesma versão do PostgreSQL do
ambiente local, e as migrations são aplicadas do zero. O relatório de cobertura (JaCoCo) fica em
`target/site/jacoco/index.html`.
