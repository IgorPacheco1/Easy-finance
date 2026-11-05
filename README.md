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
| Backend (API Java) | **v0.2.0**: API de categorias, transações e saldo por período em [`backend/`](backend), documentada com OpenAPI |
| Interface (PWA) | Milestone **M3**: app em [`web/`](web) (React + TypeScript + Vite), instalável no celular, com lançamento rápido, mês com saldo e categorias |
| Banco de dados local | PostgreSQL via Docker Compose ([`compose.yaml`](compose.yaml)) |
| Integração contínua | Ativa: valida o título dos PRs, compila e testa o backend e o web |

> O app já registra receitas e despesas e mostra o saldo do mês, mas ainda **não tem login**
> (chega no M5): use só localmente, com dados de teste. O foco atual é fechar a base do projeto
> (M0 a M3). Veja o [roadmap](docs/roadmap.md).

## Arquitetura em uma frase

API REST em **Java (Spring Boot)** com **PostgreSQL**, e um **PWA em React + TypeScript**
(instalável no celular, funciona no computador) que consome essa API.
Detalhes em [`docs/architecture/overview.md`](docs/architecture/overview.md) e
[ADR-0005](docs/adr/0005-interface-pwa-react.md).

## Escopo do MVP (v1.0.0)

- [x] Cadastro de categorias (API na v0.2.0, telas na v0.3.0)
- [x] Registro de receitas e despesas em poucos toques (mobile-first) (API na v0.2.0, tela na v0.3.0)
- [x] Saldo por período (API na v0.2.0, tela do mês na v0.3.0)
- [ ] Listagem com filtros, paginação e histórico mensal
- [ ] Resumo mensal por categoria
- [ ] Uso instalável no celular (PWA), com lançamento offline básico (instalável na v0.3.0; lançamento offline no M4)
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
| Interface | PWA: React, TypeScript, Vite, vite-plugin-pwa; oxlint, Prettier, Vitest, Testing Library | Decidida (M3, [ADR-0011](docs/adr/0011-ferramentas-do-front-end.md), [ADR-0015](docs/adr/0015-pwa-instalavel.md), [ADR-0016](docs/adr/0016-testes-de-tela-do-front-end.md)) |
| Ambiente local | Docker Compose | Decidida (M1) |
| CI | GitHub Actions | Ativa |
| Documentação da API | OpenAPI (springdoc) | Ativa (M2, [ADR-0010](docs/adr/0010-documentacao-da-api-com-springdoc.md)) |
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

Primeira vez neste computador? Antes, siga o guia
[Preparar o computador](docs/guias/preparar-o-computador.md) (instalar JDK 21, Docker e Node 26 e
criar o `.env`). Depois, a ordem é sempre a mesma: **banco → backend → app**, cada um no seu
terminal.

### 1. Banco de dados (PostgreSQL)

Com o **Docker Desktop aberto**, na raiz do projeto:

```bash
docker compose up -d              # sobe o PostgreSQL em segundo plano
docker compose ps                 # o STATUS deve ficar "healthy" em alguns segundos
```

O banco fica em `localhost:5432`, só no seu computador, com o nome, o usuário e a senha do `.env`.
Os dados ficam no volume `easy-finance-postgres-data` e sobrevivem a reinícios.

| Comando | O que faz |
|---|---|
| `docker compose stop` | Para o banco, mantendo os dados |
| `docker compose down` | Remove o container, mantendo os dados (volume) |
| `docker compose down -v` | Remove o container **e apaga todos os dados** do banco local |
| `docker compose logs -f postgres` | Mostra os logs do banco |

### 2. Backend (API)

Sempre **dentro da pasta `backend/`** e com o perfil `dev`:

```bash
cd backend
SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run      # PowerShell: $env:SPRING_PROFILES_ACTIVE="dev"; ./mvnw spring-boot:run
```

Está no ar quando aparecer `Started EasyFinanceApplication`. Confira em
<http://localhost:8080/actuator/health> (deve responder `"status": "UP"`).

No IntelliJ: na Run Configuration da `EasyFinanceApplication`, preencha **Active profiles** com
`dev` e use `backend/` como pasta de trabalho (**Working directory**). Aí é só clicar no ▶.

| Perfil | Quando usar | De onde vêm as credenciais |
|---|---|---|
| `dev` | Desenvolvimento local | `.env` da raiz (ou variáveis de ambiente) |
| `test` | Testes automatizados | Testcontainers (PostgreSQL descartável) |
| nenhum | Produção | Variáveis `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` e `SPRING_DATASOURCE_PASSWORD` |

Não existe perfil padrão de propósito: sem perfil e sem variáveis, a aplicação não sobe, em vez
de tentar se conectar a um banco errado.

**Testes do backend:** `cd backend && ./mvnw -B verify`. O Docker precisa estar aberto, porque o
Testcontainers sobe um PostgreSQL próprio (o banco do Compose não é usado). O relatório de
cobertura (JaCoCo) fica em `backend/target/site/jacoco/index.html`.

### 3. App (PWA)

Em outro terminal:

```bash
cd web
npm install                       # na primeira vez e quando o package.json mudar
npm run dev                       # app em http://localhost:5173
```

Abra <http://localhost:5173>. O app conversa com a API pelo proxy do Vite (tudo que começa com
`/api` vai para o `localhost:8080`), então o backend do passo 2 precisa estar no ar. Os demais
comandos (`build`, `preview`, `lint`, `test`...) estão no [README do `web/`](web/README.md).

### Portas e endereços

| Endereço | O que é | Quando existe |
|---|---|---|
| `localhost:5432` | PostgreSQL | `docker compose up -d` |
| <http://localhost:8080/api/v1> | API | backend rodando com o perfil `dev` |
| <http://localhost:8080/actuator/health> | Saúde da API (`UP` = no ar) | backend rodando |
| <http://localhost:8080/swagger-ui.html> | Swagger UI: ver e testar a API no navegador | só no perfil `dev` |
| <http://localhost:8080/v3/api-docs> | Especificação OpenAPI (JSON; `.yaml` para YAML) | só no perfil `dev` |
| <http://localhost:5173> | App em desenvolvimento (recarrega a cada alteração) | `npm run dev` |
| <http://localhost:4173> | App na versão de build, **instalável** (PWA) | `npm run build` + `npm run preview` |
| `https://<IP-do-computador>:5173` ou `:4173` | App pelo celular, na mesma rede | `npm run dev:celular` ou `npm run preview:celular`, com HTTPS configurado |

### No celular (mesma rede Wi-Fi)

O celular abre o app pelo IP do computador na rede (por exemplo `192.168.1.7`). Limitações:

- **Precisa de HTTPS.** Pelo IP, o navegador só aceita instalar o app e ligar o service worker
  em endereço seguro. O certificado é criado com o mkcert e precisa ser instalado e marcado como
  confiável no celular: [Abrir o app no celular](docs/guias/celular-com-https.md).
- **Para instalar na tela inicial**, use a versão de build (`npm run preview:celular`, porta
  4173): [Instalar o app](docs/guias/instalar-o-app.md). No iPhone, é pelo Safari, em
  **Compartilhar → Adicionar à Tela de Início**.
- **O computador continua sendo o servidor:** banco e backend precisam estar rodando nele. O
  banco e a API não ficam expostos na rede; o celular fala só com o Vite, que repassa para a API.
- **Ainda não há login (chega no M5):** quem estiver no mesmo Wi-Fi pode abrir o app. Use só em
  casa, com dados de teste.

### Solução de problemas

| O que aparece | Causa provável | O que fazer |
|---|---|---|
| `docker compose`: `defina POSTGRES_DB no .env` | Falta o arquivo `.env` na raiz | `Copy-Item .env.example .env` e troque a senha |
| `docker compose`: `error during connect` / `cannot find the file specified` | Docker Desktop fechado | Abra o Docker Desktop e espere o "Engine running" |
| `docker compose`: `port is already allocated` (5432) | Outro PostgreSQL usando a porta | Pare o outro ou mude `POSTGRES_PORT` no `.env` (o backend lê a mesma variável) |
| Backend: `Could not resolve placeholder 'POSTGRES_DB'` | Rodou fora da pasta `backend/` (o `.env` não foi achado) ou sem `.env` | `cd backend` antes; no IntelliJ, **Working directory** = `backend/` |
| Backend: `Failed to configure a DataSource` | Rodou sem o perfil `dev` | `$env:SPRING_PROFILES_ACTIVE="dev"` ou **Active profiles** = `dev` |
| Backend: `Connection refused` / `Connection to localhost:5432 refused` | Banco não está rodando | `docker compose up -d` e confira com `docker compose ps` |
| Backend: `password authentication failed` | A senha do `.env` mudou depois que o banco foi criado | Volte a senha antiga no `.env`, ou recrie o banco com `docker compose down -v` (**apaga os dados**) |
| Backend: `Port 8080 was already in use` | Outro backend já está rodando (talvez em outro terminal ou no IntelliJ) | Feche o outro (**Ctrl+C** ou ⏹ no IntelliJ) |
| `./mvnw -B verify` falha em testes com `Could not find a valid Docker environment` | Docker Desktop fechado | Abra o Docker Desktop e rode de novo |
| App: "Não foi possível falar com o servidor" | Backend parado | Suba o backend (passo 2) e toque em **Tentar de novo** |
| `npm`: `EBADENGINE` / `Unsupported engine` | Versão do Node diferente da 26 | `node -v` deve mostrar `v26...`; ver [Preparar o computador](docs/guias/preparar-o-computador.md) |
| Vite: `Port 5173 is in use, trying another one` | Já existe um `npm run dev` aberto | Use o endereço novo que aparecer, ou feche o outro terminal |
| Swagger UI ou `/v3/api-docs` dá 404 | Backend sem o perfil `dev` (em produção a documentação fica desligada) | Rode com o perfil `dev` |
| No celular | Ver as tabelas "Deu errado?" de [Abrir o app no celular](docs/guias/celular-com-https.md) e [Instalar o app](docs/guias/instalar-o-app.md) | |

### Protótipo legado

Para executar o protótipo antigo em console: abra `legacy/prototype-sqlite` na IDE e execute a
classe `Main`. O banco SQLite é criado em `data/` (ignorado pelo Git).

## Contribuindo

O fluxo de trabalho (issues, branches, commits, PRs) está descrito em
[CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).

## Autor

**Igor Pacheco**, [@IgorPacheco1](https://github.com/IgorPacheco1)
