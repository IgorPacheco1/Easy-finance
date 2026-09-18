# ADR-0001: Registrar decisões de arquitetura

- **Status:** Aceita
- **Data:** 2026-09-18

## Contexto

O projeto foi abandonado uma vez e retomado depois de meses. Sem registro, o motivo das escolhas
se perde e é preciso redescobri-lo. Além disso, o projeto serve como portfólio: mostrar o
raciocínio por trás das escolhas vale tanto quanto o código.

## Decisão

Toda decisão relevante de arquitetura ou processo vira um ADR curto em `docs/adr/`, numerado em
sequência e criado a partir de [`0000-template.md`](0000-template.md). ADRs não são editados
depois de aceitos: se a decisão mudar, cria-se um novo ADR que substitui o anterior.

## Alternativas consideradas

- **Wiki do GitHub:** fora do fluxo de PR, sem revisão e sem histórico junto ao código.
- **Só comentários em issues/PRs:** difícil de encontrar meses depois.

## Consequências

- Positivas: memória do projeto versionada, revisável por PR e fácil de consultar.
- Negativas: pequeno custo de escrita a cada decisão (mitigado pelo template curto).
