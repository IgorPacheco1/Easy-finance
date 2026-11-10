# Rodar o projeto

Passo a passo para subir o Easy Finance completo no seu computador: banco, API e app. Também
explica as portas, o uso pelo celular e os problemas mais comuns.

Primeira vez neste computador? Antes, siga [Preparar o computador](preparar-o-computador.md)
(instalar JDK 21, Docker e Node 26 e criar o `.env`). Depois, a ordem é sempre a mesma:
**banco → backend → app**, cada um no seu terminal.

## 1. Banco de dados (PostgreSQL)

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

## 2. Backend (API)

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

## 3. App (PWA)

Em outro terminal:

```bash
cd web
npm install                       # na primeira vez e quando o package.json mudar
npm run dev                       # app em http://localhost:5173
```

Abra <http://localhost:5173>. O app conversa com a API pelo proxy do Vite (tudo que começa com
`/api` vai para o `127.0.0.1:8080`), então o backend do passo 2 precisa estar no ar. Os demais
comandos (`build`, `preview`, `lint`, `test`...) estão no [README do `web/`](../../web/README.md).

## Portas e endereços

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

## No celular (mesma rede Wi-Fi)

O celular abre o app pelo IP do computador na rede (por exemplo `192.168.1.7`). Limitações:

- **Precisa de HTTPS.** Pelo IP, o navegador só aceita instalar o app e ligar o service worker
  em endereço seguro. O certificado é criado com o mkcert e precisa ser instalado e marcado como
  confiável no celular: [Abrir o app no celular](celular-com-https.md).
- **Para instalar na tela inicial**, use a versão de build (`npm run preview:celular`, porta
  4173): [Instalar o app](instalar-o-app.md). No iPhone, é pelo Safari, em
  **Compartilhar → Adicionar à Tela de Início**.
- **O computador continua sendo o servidor:** banco e backend precisam estar rodando nele. O
  banco e a API não ficam expostos na rede (no perfil `dev`, o backend só aceita conexões do
  próprio computador); o celular fala só com o Vite, que repassa para a API.
- **Ainda não há login (chega no M5):** enquanto o `dev:celular` ou o `preview:celular` estiver
  rodando, quem estiver no mesmo Wi-Fi pode abrir o app. Use só em casa, com dados de teste, e
  feche com **Ctrl+C** ao terminar.

## Solução de problemas

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
| `npm`: `EBADENGINE` / `Unsupported engine` | Versão do Node diferente da 26 | `node -v` deve mostrar `v26...`; ver [Preparar o computador](preparar-o-computador.md) |
| Vite: `Port 5173 is in use, trying another one` | Já existe um `npm run dev` aberto | Use o endereço novo que aparecer, ou feche o outro terminal |
| Swagger UI ou `/v3/api-docs` dá 404 | Backend sem o perfil `dev` (em produção a documentação fica desligada) | Rode com o perfil `dev` |
| No celular | Ver as tabelas "Deu errado?" de [Abrir o app no celular](celular-com-https.md) e [Instalar o app](instalar-o-app.md) | |

## Protótipo legado

Para executar o protótipo antigo em console: abra `legacy/prototype-sqlite` na IDE e execute a
classe `Main`. O banco SQLite é criado em `data/` (ignorado pelo Git).
