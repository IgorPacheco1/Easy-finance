# ADR-0011: Ferramentas do front-end (TypeScript 7, oxlint, Prettier, Vitest)

- **Status:** Aceita
- **Data:** 2026-11-04

## Contexto

O ADR-0005 decidiu a interface como PWA em React + TypeScript, criado com Vite. Faltava decidir
as ferramentas de qualidade do código: lint (procurar problemas), formatação e testes, além da
versão do Node.

A #24 previa **ESLint e Prettier**. Ao gerar o projeto com o modelo oficial do Vite
(create-vite 9.3, React + TypeScript), duas coisas tinham mudado:

- o modelo usa **TypeScript 7**, a versão reescrita (muito mais rápida para checar tipos);
- o modelo troca o ESLint pelo **oxlint**.

O motivo é concreto: o `typescript-eslint`, que liga o ESLint ao TypeScript, só aceita
TypeScript até a 6.0 (`>=4.8.4 <6.1.0` na versão 8.72). Usar ESLint obrigaria a rebaixar o
TypeScript, contra o modelo oficial.

## Decisão

- **Projeto criado pelo modelo oficial do Vite** (`react-ts`), com React 19, Vite 8 e
  **TypeScript 7 em modo estrito** (`"strict": true` explícito nos `tsconfig`).
- **Lint com oxlint**, como vem no modelo, incluindo as regras de React (hooks e componentes).
- **Formatação com Prettier**, versão fixada exatamente (sem `^`), porque versões novas podem
  mudar a formatação de arquivos que ninguém alterou. Estilo do modelo: sem ponto e vírgula,
  aspas simples. `npm run lint` roda o oxlint **e** confere a formatação, então o CI recusa
  código fora do padrão.
- **Testes com Vitest**, o executor de testes do próprio Vite (mesma configuração do build).
  O Testing Library entra junto com os primeiros testes de tela (#33).
- **Node.js 26 (LTS ativo)**, fixado em `web/.nvmrc` e em `engines` no `package.json`.
- Dependências npm atualizadas pelo Dependabot, com minor e patch agrupados num PR.

## Alternativas consideradas

- **ESLint + Prettier (o que a #24 previa):** ecossistema maior de regras, mas exige
  TypeScript 6.0 enquanto o `typescript-eslint` não suportar a 7. Pode ser revisto quando isso
  mudar, se alguma regra fizer falta.
- **oxfmt no lugar do Prettier:** mesmo projeto do oxlint e mais rápido, mas ainda não tem versão
  estável (0.x). O Prettier é o padrão de mercado e pode ser trocado depois sem impacto no código.
- **Jest no lugar do Vitest:** muito usado, mas precisa de configuração própria para TypeScript e
  ESM; o Vitest reaproveita a configuração do Vite.
- **Node 24:** ainda suportado (manutenção até 2028), mas o projeto começa agora e vai para
  produção; o 26 dá mais tempo de suporte e é o mesmo LTS usado pelo CI.

## Consequências

- Positivas: segue o modelo oficial do Vite (menos configuração própria para manter);
  checagem de tipos e lint muito rápidos; formatação garantida pelo CI.
- Negativas / custos assumidos:
  - O oxlint tem menos regras e plugins que o ESLint; regras de checagem de tipos avançadas
    ainda não estão disponíveis da mesma forma.
  - TypeScript 7 é recente: algumas ferramentas de terceiros podem demorar a suportá-lo.
  - Quem for rodar o projeto precisa do Node 26.
