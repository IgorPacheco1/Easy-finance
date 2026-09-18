# Guia de contribuição

Este é um projeto pessoal, mas é conduzido como se fosse de equipe: o mesmo fluxo vale para
quem for contribuir e para o próprio autor.

## Fluxo de trabalho (GitHub Flow)

1. **Toda mudança começa em uma issue**, com contexto e critérios de aceite. Sem issue, sem trabalho.
2. **Crie uma branch** a partir da `main` atualizada, no formato `tipo/numero-descricao-curta`:
   `feat/12-crud-categorias`, `fix/31-erro-no-saldo`, `docs/8-adr-jwt`.
3. **Faça commits pequenos** seguindo [Conventional Commits](https://www.conventionalcommits.org/pt-br/).
4. **Abra um Pull Request** para a `main`, preenchendo o template e referenciando a issue
   (`Closes #12`).
5. **Aguarde o CI ficar verde** e resolva todas as conversas do PR.
6. **Faça squash merge.** O título do PR vira a mensagem do commit na `main`, por isso ele também
   precisa seguir Conventional Commits (validado automaticamente).
7. A branch é apagada após o merge.

A `main` é protegida: não há push direto.

Quem usar assistentes de IA neste repositório deve seguir também o [CLAUDE.md](CLAUDE.md), que
registra as regras de rastreabilidade e os limites de autonomia.

## Conventional Commits

Formato: `tipo(escopo opcional): descrição no imperativo, em minúsculas`

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Somente documentação |
| `refactor` | Mudança de código sem alterar comportamento |
| `test` | Criação ou ajuste de testes |
| `perf` | Melhoria de desempenho |
| `build` | Build, dependências, Dockerfile |
| `ci` | Workflows e automações |
| `chore` | Manutenção que não se encaixa nas anteriores |

Exemplos: `feat(transacao): validar valor positivo`, `fix: corrigir arredondamento no saldo`,
`docs: adicionar ADR sobre autenticação`.

Mudança incompatível: use `!` (`feat!: ...`) e explique no corpo do PR.

## Versionamento e releases

[SemVer](https://semver.org/lang/pt-BR/): `MAJOR.MINOR.PATCH`. Cada milestone fechado corresponde a
uma versão (ver [roadmap](docs/roadmap.md)). O [CHANGELOG](CHANGELOG.md) é atualizado a cada release.

## Definition of Done

Uma issue só está concluída quando:

- [ ] Todos os critérios de aceite da issue foram atendidos
- [ ] O código compila e **todos os testes passam** no CI
- [ ] Comportamento novo ou alterado tem **testes**
- [ ] Nenhum segredo, dado pessoal ou arquivo de IDE foi versionado
- [ ] Documentação atualizada (README, `docs/`, OpenAPI) quando aplicável
- [ ] Decisão de arquitetura relevante registrada em um [ADR](docs/adr)
- [ ] O PR foi mergeado via squash, com título em Conventional Commits

## Decisões de arquitetura

Decisões que afetam a estrutura do projeto (tecnologia, padrões, trade-offs) viram um ADR em
[`docs/adr`](docs/adr), usando o [template](docs/adr/0000-template.md).

## Ambiente local

Pré-requisitos: JDK 21, Docker, Node.js (versão LTS) e Git. As instruções de execução do backend
(M1) e do front-end (M3) serão adicionadas ao [README](README.md) quando essas partes existirem.
