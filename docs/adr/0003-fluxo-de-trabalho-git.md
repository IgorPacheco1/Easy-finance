# ADR-0003: Fluxo de trabalho Git (GitHub Flow, Conventional Commits, squash merge)

- **Status:** Aceita
- **Data:** 2026-09-18

## Contexto

O histórico atual tem commits direto na `main`, mensagens sem padrão e commits duplicados.
Isso dificulta entender o que mudou e impede gerar changelog e versões automaticamente.

## Decisão

- **GitHub Flow:** `main` sempre estável; todo trabalho em branch curta, integrado via Pull Request.
- **Conventional Commits** para os títulos de PR (validado por workflow).
- **Squash merge** como único método de merge, com título do PR como mensagem do commit.
  Histórico linear, um commit por mudança.
- **SemVer** para versões, uma versão por milestone.
- **Ruleset na `main`:** sem push direto, sem force push, PR obrigatório, checks `build` e
  `pr-title` obrigatórios, conversas resolvidas.
- Nenhuma aprovação humana é exigida (projeto individual): a qualidade é garantida por CI e pela
  Definition of Done do [CONTRIBUTING](../../CONTRIBUTING.md).

## Alternativas consideradas

- **Git Flow (develop/release/hotfix):** excesso de cerimônia para um projeto individual com deploy contínuo.
- **Commit direto na main:** foi o que gerou o histórico atual.
- **Merge commit / rebase merge:** geram histórico mais ruidoso e menos previsível.

## Consequências

- Positivas: histórico legível, changelog e releases automatizáveis (M5), `main` protegida.
- Negativas: mais passos por mudança (issue, branch, PR), aceitos como parte da prática profissional.
