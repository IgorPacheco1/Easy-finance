# ADR-0030: Modo demonstração com MSW no navegador e GitHub Pages

- **Status:** Aceita
- **Data:** 2026-11-18

## Contexto

Para mostrar o projeto (portfólio, entrevistas, quem chega pelo README) é preciso abrir o app sem
servidor, sem banco e sem criar conta (#162). O backend ainda não está hospedado (isso é o M6), e
mesmo depois uma demonstração não deve usar dados de verdade nem depender da API no ar.

O app já tem uma API falsa completa nos testes: o MSW (ADR-0013, ADR-0016), que intercepta o
`fetch` e responde como a API.

## Decisão

- **Build próprio** (`npm run build:demonstracao`, `vite build --mode demonstracao`, saída em
  `dist-demonstracao/`). No `main.tsx`, o código da demonstração só é carregado dentro de
  `if (import.meta.env.MODE === 'demonstracao')` com `import()` dinâmico: no build normal a condição
  vira `false` e o Vite corta o bloco, então o MSW e os dados de exemplo **não entram no app de
  verdade**.
- **API falsa no navegador:** `src/demonstracao/api.ts` responde todas as rotas da API com o MSW
  (`setupWorker`), a partir de um banco **na memória da aba** (`banco.ts`): três meses de lançamentos
  contados a partir de hoje e as categorias do sistema. Recarregar a página volta ao começo. As
  regras visíveis (nome repetido, categoria em uso, lançamento excluído, 404) seguem as da API, e
  qualquer outra rota de /api recebe um erro da própria demonstração: o pedido nunca sai do
  navegador. A demonstração já começa logada; entrar e criar conta aceitam qualquer e-mail.
- **Sem endereço de API de verdade:** no modo demonstração o `VITE_API_URL` é fixado em `/api/v1`
  (`define` no `vite.config.ts`), seja qual for o ambiente.
- **Sem PWA na demonstração:** o `VitePWA` fica desligado (`disable`) e o registro do service
  worker do app vira um módulo que não faz nada (`pwaDesligado.ts`). Só roda o service worker do
  MSW. Assim não há instalação, nem cache prendendo uma versão velha, nem mistura com o app real.
  Como o MSW responde mesmo sem internet, a fila offline nunca é usada na demonstração.
- **Faixa no topo de todas as telas:** "Demonstração: dados de exemplo, nada é salvo".
- **Publicação no GitHub Pages** pelo workflow `demonstracao.yml`, a cada merge na `main` que mexe
  em `web/`. O site fica em uma subpasta (`/Easy-finance/`): o `base` do Vite e o `basename` do
  roteador vêm do `base_path` do Pages, e um `404.html` igual ao `index.html` faz os links diretos
  (ex.: `/Easy-finance/mes`) abrirem o app.
- **O CI confere a separação:** depois do build normal, o job `build` gera a demonstração com um
  `VITE_API_URL` falso no ambiente e falha se o `dist/` tiver código da demonstração, se o
  `dist-demonstracao/` tiver aquele endereço, se faltar o worker do MSW ou o `404.html`, ou se o
  service worker do app aparecer.

## Alternativas consideradas

- **Backend de demonstração hospedado**, com uma conta pública: mostraria a API de verdade, mas
  custa servidor e banco, exige limpar os dados de quem passou e expõe a API antes da revisão de
  produção do M6.
- **Dados de exemplo no `localStorage`**, sobrevivendo entre visitas: precisaria de um "recomeçar"
  e a faixa "nada é salvo" deixaria de ser verdade. Descartada pelo autor.
- **Copiar o `mockServiceWorker.js` para `public/`** (o `npx msw init` padrão): ele iria também
  para o build normal. O arquivo é gerado só no build da demonstração, direto do pacote instalado
  (sempre na mesma versão do MSW).

## Consequências

- Positivas: qualquer pessoa experimenta o app inteiro em segundos, no celular ou no computador;
  a API falsa da demonstração também é testada (`api.test.ts`) e serve de exemplo de uso da API.
- Negativas / custos assumidos:
  - A API falsa precisa acompanhar a de verdade. Os tipos (`esquema.d.ts`) pegam mudança de
    formato; uma regra nova da API precisa ser repetida em `api.ts` se for visível na demonstração.
  - O pedaço da demonstração é grande (o MSW no navegador, cerca de 155 kB com gzip), carregado só
    nela.
  - O GitHub Pages precisa estar configurado com "Source: GitHub Actions" (configuração fora do
    Git, registrada na issue).
