# ADR-0016: Testes de tela do front-end (Testing Library e jsdom)

- **Status:** Aceita
- **Data:** 2026-11-05

## Contexto

Até a #33, os testes do `web/` só cobriam funções soltas (formatar moeda, validar o valor,
agrupar por dia) e o cliente HTTP. As telas, que juntam tudo isso com cliques, campos e respostas
da API, não tinham teste: uma mudança podia quebrar o lançamento sem ninguém perceber até abrir o
app. A #33 pede testes das telas de lançamento (inclusive o cursor no fim do valor), do mês, de
categorias e da navegação.

## Decisão

- **Testing Library** (`@testing-library/react`, `@testing-library/dom`,
  `@testing-library/user-event` e `@testing-library/jest-dom`), só como dependência de
  desenvolvimento. Os testes procuram os elementos pelo que a pessoa vê (papel e nome
  acessível: `getByRole('button', { name: 'Lançar despesa' })`) e agem como ela (`usuario.click`,
  `usuario.type`), sem olhar estado interno nem classes CSS.
- **jsdom** como navegador falso do Vitest (`test.environment: 'jsdom'`), para todos os testes.
- **API falsa com o MSW** (o mesmo da ADR-0013): cada teste combina as respostas
  (`src/testes/dados.ts` tem dados de exemplo e as respostas "de sempre"). Pedido sem resposta
  combinada continua fazendo o teste falhar.
- **App inteiro num endereço qualquer:** `src/testes/renderizar.tsx` monta as rotas reais
  (`rotas.tsx` passou a exportar `rotas`) num roteador de memória. Assim os testes de tela
  passam pelo layout e pela navegação, como no app.
- **Data fixa** nos testes que dependem de "hoje" (`vi.useFakeTimers({ toFake: ['Date'] })`),
  falsificando só o relógio para não travar o `user-event`.
- **Service worker trocado por um falso** (`vi.mock('virtual:pwa-register/react')`) no teste do
  aviso de versão nova.

## Alternativas consideradas

- **happy-dom no lugar do jsdom:** mais rápido, mas implementa menos do navegador; o jsdom é o
  mais usado com a Testing Library e cobre seleção de texto (necessária no teste do cursor).
- **Testes de ponta a ponta com Playwright num navegador de verdade:** mais fiéis, mas lentos,
  precisam do app e da API rodando e são mais difíceis de manter no CI agora. Ficam para quando
  houver fluxos maiores (login, M5).
- **Testar componentes isolados com dados prontos:** mais rápido de escrever, mas não pega
  erros na ligação entre tela, API e navegação, que é onde a maioria dos problemas aparece.

## Consequências

- Positivas: as telas principais ficam protegidas contra regressão; os testes também conferem
  a acessibilidade (se o leitor de tela não acha o botão, o teste também não acha); nenhuma
  dependência nova vai para o app do usuário; `npm audit` sem alertas novos.
- Negativas / custos assumidos:
  - `npm test` ficou mais lento (de uns 4 s para uns 18 s), porque todo arquivo de teste agora
    sobe o jsdom. Se incomodar, dá para separar os testes de funções (ambiente `node`) dos de tela.
  - Textos da tela aparecem nos testes: mudar um rótulo (por exemplo, "Lançar despesa") exige
    ajustar o teste. É de propósito: o texto é parte do que a pessoa usa.
