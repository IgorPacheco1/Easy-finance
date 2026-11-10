# CLAUDE.md

Instruções para assistentes de IA (Claude no Cowork, no Claude Code ou no chat) que trabalham
neste repositório. Vale também como resumo do projeto para qualquer pessoa.

## O projeto

**Easy Finance** é um sistema de controle financeiro pessoal para registrar receitas e despesas
em segundos, **com foco no celular** e uso também no computador. É pensado para ir para produção.

- **Backend (core):** Java 21, Spring Boot, Maven, PostgreSQL, Flyway. Pasta `backend/` (M1).
- **Interface:** PWA em React + TypeScript (Vite). Pasta `web/` (M3).
- **Protótipo antigo:** `legacy/prototype-sqlite`, congelado. Não evoluir; serve só de referência.
- **Decisões:** `docs/adr/`. **Arquitetura:** `docs/architecture/overview.md`. **Roadmap:** `docs/roadmap.md`.

**Foco atual:** M4 concluído (v0.4.0). Próximo: planejar o M5 (segurança e multiusuário) com o
autor, usando o checklist de segurança do roadmap. Não planejar nem implementar o M6 antes da hora.

## Sobre quem conduz o projeto

O autor é estudante de Análise e Desenvolvimento de Sistemas, está aprendendo Spring e banco de
dados relacional, e quer usar este projeto para aprender de verdade. Portanto:

- Explique **o porquê** das decisões, de forma curta, e não apenas o quê.
- Em issues de aprendizado (por exemplo a modelagem do domínio), **guie** com perguntas e
  alternativas antes de entregar a solução pronta.
- Prefira soluções simples e legíveis a soluções sofisticadas.

## Fluxo obrigatório (tudo rastreável)

Toda modificação precisa ficar registrada. O caminho é sempre:

1. **Issue** com contexto e critérios de aceite, vinculada a um milestone. **Sem issue, sem trabalho.**
   Se a mudança pedida não tem issue, proponha criar uma antes de escrever qualquer código.
   **Exceção:** correção pequena (`fix`) pode ir direto para um PR, sem issue, se o PR explicar
   o problema, a causa e como foi verificado; a branch fica `fix/descricao-curta`. Correção grande
   ou que mude o comportamento visível ao usuário continua precisando de issue
   (ver [CONTRIBUTING.md](CONTRIBUTING.md#fluxo-de-trabalho-github-flow)).
2. **Branch** a partir da `main` atualizada: `tipo/numero-descricao-curta` (ex.: `feat/12-crud-categorias`).
3. **Commits pequenos** em [Conventional Commits](https://www.conventionalcommits.org/pt-br/),
   em português, no imperativo, em minúsculas: `feat(transacao): validar valor positivo`.
4. **Pull Request** para a `main`, com o template preenchido e `Closes #N`. O título do PR também
   segue Conventional Commits (vira a mensagem do commit no squash merge).
5. **CI verde** (`build` e `pr-title`) e conversas resolvidas.
6. **Squash merge** e branch apagada.

Registro adicional:

- **Decisão de arquitetura** (tecnologia, padrão, trade-off) vira um ADR em `docs/adr/`, no mesmo PR.
- **Configuração feita fora do Git** (settings, ruleset, labels, project) é registrada em um
  **comentário na issue correspondente**, com os comandos executados e o resultado.
- **Mudança relevante para o usuário** entra no `CHANGELOG.md`.
- **Se algo der errado ou uma decisão for revertida**, registre na issue ou no PR; não apague o rastro.

## Trabalho com o assistente no Cowork

No Cowork, o assistente grava arquivos direto na pasta local do projeto, mas **não roda Git na
máquina do autor e não faz push**. Para que nenhuma mudança caia em cima da `main`, a ordem é sempre:

1. **O autor cria a branch da issue** e avisa o assistente:
   `git switch main && git pull && git switch -c tipo/N-descricao`
2. **O assistente confere a branch aberta** (deve ser a da issue, criada a partir da `main`
   atualizada) e só então grava os arquivos na pasta local.
3. **O autor revisa** as mudanças no IntelliJ, faz os commits (o assistente sugere commits pequenos,
   com as mensagens em Conventional Commits) e faz o push.
4. **O assistente escreve a descrição do PR** seguindo o template, com labels e milestone
   (ver [CONTRIBUTING.md](CONTRIBUTING.md#labels-milestone-e-board)).

**O assistente nunca grava arquivos com a `main` aberta.** Se a branch da issue não existir ainda,
ele pede ao autor que a crie antes. Se o assistente tiver uma cópia própria do repositório (por
exemplo na nuvem, para leitura), commits feitos nela são descartáveis e não substituem os do autor.

## Limites de autonomia: consulte antes

O autor quer ser consultado. **Pergunte e espere uma resposta clara antes de:**

- `git push`, criar/mergear/fechar PR, criar/fechar issue, criar tag ou release
- qualquer alteração de configuração do GitHub (settings, rulesets, secrets, Actions, project)
- apagar branches, tags ou arquivos (inclusive `git rm`, `git reset --hard`, `git clean`)
- adicionar ou trocar dependência, ferramenta ou framework
- mudar a arquitetura, o modelo de dados, a API pública ou o escopo de uma issue
- qualquer coisa fora do que a issue em andamento descreve

**Nunca, mesmo se pedido de passagem:**

- commit direto na `main`, `push --force`, reescrever histórico publicado
- desativar checks, ruleset ou proteções para "destravar" algo
- versionar segredos, senhas, tokens, dados pessoais ou arquivos de IDE
- pular hooks ou testes para o CI passar

Ao propor uma ação que precisa de consulta, mostre **o comando exato** e o efeito esperado.

## Convenções técnicas

- **Idioma:** issues, PRs, commits e documentação em português. Termos técnicos consagrados ficam
  em inglês. O domínio no código usa português (`Transacao`, `Categoria`), como já no protótipo.
- **Dinheiro:** `BigDecimal` no Java e `NUMERIC(19,2)` no banco. Nunca `double`.
- **Datas:** `LocalDate`/`DATE` para lançamentos; instantes em UTC.
- **Schema:** só muda por migration Flyway. Nunca por `ddl-auto`.
- **Erros da API:** `ProblemDetail` (RFC 9457). **API versionada:** `/api/v1/...`.
- **Camadas (backend):** Controller (HTTP e validação) → Service (regra de negócio) → Repository
  (persistência). Regra de negócio não fica no controller nem no front-end.
- **Testes:** todo comportamento novo ou alterado tem teste. Integração com Testcontainers, sem H2.
- **Segredos:** só por variável de ambiente; o repositório contém apenas `.env.example`.

## Definition of Done

Ver [`CONTRIBUTING.md`](CONTRIBUTING.md#definition-of-done). Resumo: critérios de aceite atendidos,
CI verde, testes, docs/ADR/CHANGELOG atualizados, nada sensível versionado, PR com squash merge.

## Comandos úteis

```bash
gh issue list --milestone "M5 - Segurança e multiusuário (v0.5.0)"  # backlog do milestone atual
gh pr checks --watch                            # acompanhar o CI de um PR
git log --oneline main..HEAD                    # commits da branch atual

docker compose up -d                            # PostgreSQL local (M1)
cd backend && ./mvnw -B verify                  # build e testes do backend (M1)
cd web && npm ci && npm run dev                 # PWA em desenvolvimento (M3)
```

## Estado atual

- **M0 (Fundação) concluído:** repositório organizado, CI, ruleset na `main` e backlog criado.
- **M1 (Esqueleto, v0.1.0) concluído:** Spring Boot em `backend/`, PostgreSQL via Docker Compose,
  perfis `dev` e `test` (sem perfil padrão; produção usa `SPRING_DATASOURCE_*`), health check,
  schema por Flyway (V1 tabelas, V2 categorias do sistema), testes com Testcontainers, CI com
  JaCoCo e Dependabot (Actions e Maven). Modelo de domínio em
  [`docs/architecture/domain-model.md`](docs/architecture/domain-model.md) (ADRs 0006 a 0008).
- **M2 (Núcleo, v0.2.0) concluído:** API de categorias (`/api/v1/categorias`), transações
  (`/api/v1/transacoes`, criação idempotente com `id` do cliente) e saldo por período
  (`/api/v1/saldo`); Bean Validation e regra de data no service; erros em ProblemDetail com
  mensagens em português (`shared/TratadorGlobalDeErros`); OpenAPI com springdoc só no perfil
  `dev` (ADR-0010); testes em três camadas (unidade, `@WebMvcTest` e Testcontainers).
- **M3 (PWA mínimo, v0.3.0) concluído:** app em `web/` (React 19, TypeScript 7,
  Vite 8; ADR-0011 e 0012) com telas Lançar, Mês e Categorias; cliente HTTP com tipos gerados do
  OpenAPI e MSW (ADR-0013, campos obrigatórios marcados no backend na #77); lançamento rápido com
  id do aparelho (ADR-0014); PWA instalável com cache só da casca do app e aviso de versão nova
  (ADR-0015); testes de tela com Testing Library e jsdom (ADR-0016). Guias em `docs/guias/`
  (preparar o computador, celular com HTTPS, instalar o app); como rodar no README.
- **M4 (Consultas e offline, v0.4.0) concluído:** listagem paginada (`Slice`, páginas a partir
  de 1, ADR-0017) com filtros por Specification (ADR-0018); resumo por categoria
  (`/api/v1/resumo`); categorias mais usadas (`?ordem=USO`, 90 dias); bloqueio de reenvio de
  transação excluída (V3 `transacao_excluida`, `410 Gone`); app com busca (`/buscar`), resumo no
  mês e rolagem infinita; lançamento offline com fila no IndexedDB, Background Sync e service
  worker próprio (`web/src/sw.ts`, `injectManifest`, ADR-0019). Revisão de segurança (#113):
  backend do perfil `dev` só em `127.0.0.1`, cabeçalhos `no-store`/`nosniff`, log sem dados
  financeiros. READMEs reorganizados, com imagens do app (#115).
- **Próximo: M5 (Segurança e multiusuário, v0.5.0).** Ainda não detalhado: planejar as issues com
  o autor antes de implementar (cadastro, login, isolamento por usuário em todas as consultas,
  inclusive as em SQL direto e o 410; apagar a fila offline ao sair).
- **Pendências registradas:** cobertura mínima com `jacoco:check` (#69); override do `glob` no
  `web/package.json` até o `workbox-build` pedir uma versão corrigida (ADR-0015); alerta do
  `deepmerge` (só build, sem correção) dispensado com motivo; editar e excluir transação no app
  (#101); unir a lógica de páginas de `useBusca` e `useDadosDoMes` num hook comum.
