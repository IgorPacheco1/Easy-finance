# ADR-0015: PWA instalável (vite-plugin-pwa, cache só da casca e atualização com aviso)

- **Status:** Aceita
- **Data:** 2026-11-05

## Contexto

A #31 pede que o app possa ser instalado na tela inicial do celular e do computador, como um app
comum. Para isso o navegador exige três coisas: endereço seguro (HTTPS, resolvido na #32), um
**manifest** (nome, ícones, cores, modo de abertura) e um **service worker** (um script que o
navegador roda à parte da página e que pode responder pedidos mesmo sem internet).

O app guarda registros financeiros. O que o service worker guarda no aparelho precisa ser
decidido pensando na proteção desses dados. Também é preciso decidir como uma versão nova chega a
quem já instalou o app, sem atrapalhar um lançamento que está sendo digitado.

## Decisão

- **`vite-plugin-pwa` 2.0.0** (dependência de desenvolvimento) gera o manifest e o service worker
  (Workbox, modo `generateSW`) no `npm run build`. No `npm run dev` o service worker fica
  desligado; para testar, usa-se `npm run build` + `npm run preview`.
- **Cache só da "casca":** o service worker guarda apenas HTML, JS, CSS e ícones do próprio build
  (precache). **Respostas da API nunca são guardadas** (não existe `runtimeCaching`), e endereços
  `/api/` nunca são respondidos com o `index.html` (`navigateFallbackDenylist`). Sem internet, o
  app abre e mostra a mensagem de "sem conexão" que as telas já têm.
- **Atualização com aviso** (`registerType: 'prompt'`): quando existe versão nova, aparece
  "Nova versão do app disponível" com o botão **Atualizar**, que fica na tela até ser tocado
  (`src/pwa/AvisoDeAtualizacao.tsx`, reaproveitando o `Aviso` com `duracao={null}`). Sem o toque,
  a versão nova entra na próxima vez que o app for aberto do zero.
- **Manifest:** nome "Easy Finance", `display: standalone` (abre sem a barra do navegador),
  `lang: pt-BR`, cores da paleta Champagne e ícones 192, 512 e 512 *maskable* (com margem, para o
  Android recortar em círculo ou outro formato sem cortar o símbolo).
- **iPhone:** o iOS ignora os ícones do manifest, então o `index.html` aponta um
  `apple-touch-icon` de 180×180 e um título próprio.
- **Ícones provisórios**, gerados **uma vez** a partir dos SVGs em `web/icones/` e commitados como
  PNG em `web/public/`. Sem gerador de ícones no projeto. Serão refeitos com a identidade visual.

## Alternativas consideradas

- **Manifest e service worker escritos à mão:** sem dependência, mas é preciso manter a lista de
  arquivos do build (os nomes mudam a cada build) e a limpeza de caches antigos na mão; erro aí
  deixa o app preso numa versão velha.
- **Guardar também as respostas da API** (mostrar o último mês visto sem internet): mais útil
  offline, mas deixa dados financeiros gravados no aparelho, sem login (M5) e sem regra de
  sincronização (M4). Fica para ser decidido junto com o modo offline, se ele vier.
- **Atualização automática** (`autoUpdate`): mais simples, mas a página pode recarregar sozinha
  no meio de um lançamento.
- **`@vite-pwa/assets-generator`** para gerar os ícones: mais uma dependência para algo que é
  feito raramente e ainda vai mudar com a identidade visual.

## Consequências

- Positivas: app instalável no celular e no computador; abre rápido e mesmo sem internet;
  nenhum dado financeiro no cache do aparelho; versão nova nunca interrompe o que a pessoa está
  fazendo.
- Negativas / custos assumidos:
  - Para ver o service worker funcionando é preciso build + preview (não aparece no `dev`).
  - O `npm audit` passa a apontar 6 alertas (2 baixos e 4 moderados) em pacotes usados **só no
    build** pelo `workbox-build` (`deepmerge`, `glob`, `minimatch`). Nada disso vai para o app
    que roda no aparelho (`npm audit --omit=dev`: 0) e eles só leem arquivos do próprio projeto.
    O `npm audit fix --force` sugerido voltaria para o `vite-plugin-pwa` 1.1.0, mais antigo.
    Risco aceito até sair uma versão corrigida (o Dependabot avisa).
  - Ícones e cores do manifest precisam ser trocados junto com a identidade visual.
