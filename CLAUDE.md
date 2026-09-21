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

**Foco atual:** a base do projeto, milestones M0 a M3. Não planejar nem implementar M4 a M6 antes da hora.

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
gh issue list --milestone "M0 - Fundação"       # backlog do milestone
gh pr checks --watch                            # acompanhar o CI de um PR
git log --oneline main..HEAD                    # commits da branch atual

# quando existirem:
docker compose up -d                            # PostgreSQL local (M1)
cd backend && ./mvnw -B verify                  # build e testes do backend (M1)
cd web && npm ci && npm run dev                 # PWA em desenvolvimento (M3)
```

## Estado atual

- M0 em andamento: organização do repositório (ver issues do milestone).
- Ainda não existem `backend/` nem `web/`.
