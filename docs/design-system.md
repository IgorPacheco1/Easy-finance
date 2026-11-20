# Design system

Referência visual do app (#157). A identidade (paleta Capital Cacau, fonte Manrope, logo e tela
inicial) foi decidida no [ADR-0029](adr/0029-identidade-visual.md). Todos os valores ficam em
variáveis CSS em [`web/src/estilos/tema.css`](../web/src/estilos/tema.css): **as telas usam só
essas variáveis**, nunca cores ou tamanhos escritos direto.

## Princípios

- **Elegante e confiável:** poucas cores, peso forte nos títulos e valores, muito espaço.
- **Acessível de verdade (WCAG 2.1 AA):** texto com 4,5:1, bordas e ícones com 3:1, área de toque
  de 44 px, nenhum texto abaixo de 13 px. **Nenhum estado depende só da cor:** selecionado ganha um
  visto, erro ganha ícone e texto, foco ganha contorno de 3 px.
- **Funciona igual nos dois temas.** O tema segue o do sistema (claro ou escuro), ou o que a
  pessoa escolher em Conta > Preferências (#195). O escuro vale com `data-tema="escuro"` no
  `<html>`, posto pelo `public/tema.js` antes da primeira pintura, para a tela não piscar no tema
  errado ao abrir.

## Cores

| Variável | Uso | Claro | Escuro |
|---|---|---|---|
| `--cor-fundo` | Fundo das telas | `#f7f1ea` | `#1f1410` |
| `--cor-superficie` | Cartões, campos, navegação | `#ffffff` | `#2c221e` |
| `--cor-texto` | Texto principal | `#1f1410` | `#f7f1ea` |
| `--cor-texto-secundario` | Rótulos, legendas, categoria | `#4b2e24` | `#d6c2ae` |
| `--cor-destaque` | Saldo, botão principal, item ativo | `#8b5e34` | `#8b5e34` |
| `--cor-no-destaque` | Texto e ícones sobre o destaque | `#f7f1ea` | `#f7f1ea` |
| `--cor-borda-campo` | Borda de campos, botões e chips | `#4b2e24` | `#847467` |
| `--cor-borda` | Divisores e contornos decorativos | `#e6d9cb` | `#40332c` |
| `--cor-receita` | Valores de receita | `#276b43` | `#86c79e` |
| `--cor-erro` | Erros e ação de perigo | `#b3261e` | `#f2b8b5` |
| `--cor-foco` | Contorno do foco do teclado | `#1f1410` | `#f7f1ea` |

**Contraste conferido** (claro / escuro): texto 16,1:1 / 16,1:1; secundário 10,9:1 / 10,5:1;
texto sobre o destaque 5,0:1 / 5,0:1; destaque sobre o fundo 5,0:1 / 3,2:1; borda de campo sobre a
superfície 12,2:1 / 3,5:1; receita 5,7:1 / 9,2:1; erro 5,8:1 / 10,5:1.

**Regras:**

- `--cor-borda` é só decorativa (divisor entre itens, contorno de uma área). O que a pessoa toca ou
  preenche usa `--cor-borda-campo`.
- No tema escuro, o destaque tem 3,2:1: serve como **preenchimento** ou elemento grande, nunca como
  texto pequeno.
- O caramelo da marca (`#e0a458`) é só da logo e do ícone: não entra na interface.
- Despesa e receita também se diferenciam pelo sinal (`−` e `+`), não só pela cor.

## Cores e ícones das categorias (#184)

Cada categoria tem uma **cor** e um **ícone** (ADR-0031). As cores vibrantes são **só das
categorias** (ícones e gráficos que as representam); a interface continua Capital Cacau. A lista
fechada fica em `web/src/categorias/aparencia.ts` e a categoria guarda o **nome** da cor e do
ícone, nunca o código da cor.

| Cor | `--categoria-*` claro | Contraste claro | Escuro | Contraste escuro |
|---|---|---|---|---|
| coral | `#ff363c` | 3,2:1 | `#ff5a5f` | 5,1:1 |
| laranja | `#d96404` | 3,2:1 | `#fb923c` | 6,8:1 |
| amarelo | `#a38303` | 3,2:1 | `#facc15` | 10,1:1 |
| verde | `#1a9a49` | 3,2:1 | `#22c55e` | 6,8:1 |
| menta | `#459563` | 3,3:1 | `#86c79e` | 7,9:1 |
| turquesa | `#1f9687` | 3,2:1 | `#2dd4bf` | 8,3:1 |
| ciano | `#0594ac` | 3,2:1 | `#06b6d4` | 6,4:1 |
| azul | `#3b82f6` | 3,3:1 | `#3b82f6` | 4,2:1 |
| anil | `#6366f1` | 4,0:1 | `#6366f1` | 3,5:1 |
| roxo | `#a855f7` | 3,5:1 | `#a855f7` | 3,9:1 |
| rosa | `#ec4396` | 3,2:1 | `#ec4899` | 4,4:1 |
| cinza | `#7487a3` | 3,3:1 | `#94a3b8` | 6,0:1 |

(Contraste: o menor valor entre o fundo e a superfície do tema.)

**Regras:**

- Contraste de **3:1** ou mais sobre o fundo e a superfície, nos dois temas, conferido por
  `web/src/estilos/contraste.test.ts`. Mudou um tom? O teste diz na hora se ainda passa.
- A categoria aparece **sempre com ícone + nome**: o ícone é decorativo (`aria-hidden`), o nome é
  o que identifica. Nenhum estado depende só da cor.
- **Ícones:** 32 do `lucide-react`, pelo nome (ex.: `shopping-cart`, `heart-pulse`, `paw-print`).
- **Componente:** `IconeDaCategoria` (`icone`, `cor`, `tamanho`: `mini` 24 px, `pequeno` 32 px,
  `medio` 40 px, `grande` 72 px). O desenho vai na cor; o fundo é a mesma cor a 18%. A cor entra por
  classe, não por `style` (CSP). Ícone ou cor desconhecidos viram `circle-ellipsis` cinza.
- **Pintar outra coisa com a cor da categoria** (#186): `classeDaCor(cor)`
  (`web/src/categorias/corDaCategoria.ts`) devolve a classe que define `--cor-da-categoria` no
  elemento e no que está dentro dele. É assim que a barra do resumo do Mês fica na cor da categoria.
- **Onde aparece:** escolha da categoria no Lançar e na edição (`mini`), lançamentos do Mês e da
  Buscar (`medio`), resumo por categoria do Mês (`pequeno`, e a barra na cor) e a lista de
  Categorias (`medio`). O filtro da Buscar é um `<select>` nativo, que não mostra ícones.

## Texto (Manrope)

Fonte servida pelo próprio app (`@fontsource-variable/manrope`, licença OFL), sem servidor de
terceiros. Só os alfabetos latinos entram no cache do PWA. Os números têm largura fixa
(`tabular-nums`), para os valores alinharem nas listas.

| Variável | Tamanho | Uso |
|---|---|---|
| `--texto-valor` | 44px | Valor sendo lançado |
| `--texto-display` | 36px | Saldo do mês |
| `--texto-titulo` | 28px | Título da tela |
| `--texto-subtitulo` | 22px | Mês, logo |
| `--texto-secao` | 17px | Título de seção |
| `--texto-corpo` | 16px | Texto e **campos** (16px ou mais: o iPhone não dá zoom ao tocar) |
| `--texto-medio` | 15px | Botões, itens de lista |
| `--texto-pequeno` | 14px | Rótulos, mensagens de erro |
| `--texto-legenda` | 13px | Legendas (o menor tamanho do app) |

Pesos: `--peso-normal` 500, `--peso-medio` 600, `--peso-forte` 700, `--peso-titulo` 800.

## Espaço, raios, sombra e movimento

- **Espaço** (múltiplos de 4px): `--espaco-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 20 · `-6` 24 ·
  `-8` 32 · `-10` 40.
- **Raios:** `--raio-pequeno` 10 · `--raio-medio` 12 (campos, botões) · `--raio-grande` 16 ·
  `--raio-cartao` 20 · `--raio-pilula` (chips e navegação).
- **Sombra:** `--sombra-cartao`, suave, para separar cartões do fundo.
- **Movimento (#196):** três durações e uma curva só (`--curva-padrao`).
  - `--duracao-rapida` (150ms): mudança de estado (tecla, chave, fundo ao tocar);
  - `--duracao-media` (250ms): algo que entra (a tela, a folha que sobe);
  - `--duracao-longa` (600ms): gráficos, números que contam e a confirmação do lançamento.

  Nada passa de 0,8s, e um teste (`estilos/movimento.test.ts`) confere que toda animação usa estas
  variáveis. Com "reduzir movimento" ligado no sistema, animações e transições somem (`index.css`)
  e os números aparecem prontos (`useNumeroQueConta`).
- **Telas vazias (#196):** `componentes/TelaVazia.tsx`, com ícone, uma frase simpática e a ação que
  tira a pessoa do vazio ("Lançar agora", "Limpar busca").
- **Medidas:** `--altura-toque` 44px, `--espessura-borda-campo` 1,5px, `--largura-maxima` 640px.

## Celular e computador (#161)

O app é o mesmo nos dois: mesmas telas, mesmas rotas, mesmos componentes. Muda só a moldura
(`layout/Layout.tsx`) e o espaço que as telas ganham.

| | Celular (até 899px) | Computador (a partir de **900px**) |
|---|---|---|
| Navegação | Barra inferior, ao alcance do polegar | Coluna fixa à esquerda (`--largura-navegacao-lateral` 240px), com a logo |
| Coluna das telas | `--largura-maxima` 640px | Lançar, Categorias, Conta: 640px · Buscar: `--largura-media` 800px · Mês: `--largura-larga` 1040px |
| Mês | Uma coluna | Duas: saldo e resumo à esquerda, parados; lista à direita |
| Botão "grudado" do lançamento | Acima da barra inferior | No fim da tela (`--altura-navegacao` vira 0) |

- **Ponto de quebra:** 900px, em `LARGURA_DO_COMPUTADOR` (`layout/useTelaLarga.ts`). A troca da
  navegação é feita no React (e não só no CSS) para cada aparelho receber uma navegação só, e para
  os testes conseguirem conferir as duas. Variáveis CSS não funcionam dentro de `@media`, por isso o
  valor fica no TypeScript.
- **Telas que mudam de forma** (o Mês) usam *container query*: olham a largura da coluna do
  conteúdo, e não a da janela, porque no computador parte da janela é da navegação.
- **Teclado:** o primeiro Tab mostra "Pular para o conteúdo", que leva o foco para o `<main>`.
- Usável de 360px até monitores largos, sem rolagem horizontal.

## Componentes

| Componente | Onde | Regras |
|---|---|---|
| Botão principal | `Formulario.module.css` `.botaoPrincipal`, `Lancamento.module.css` | Fundo destaque, texto `--cor-no-destaque`. Um por tela. |
| Botão secundário | `.botaoSecundario` | Contornado com `--cor-borda-campo`. |
| Botão de perigo | `.botaoPerigo` | Contornado em `--cor-erro`, com o nome da ação ("Excluir minha conta"). |
| Chip | `Lancamento.module.css` `.chip` | Selecionado: cores invertidas **e um visto**. |
| Alternador | `.opcaoDoAlternador`, `.aba`, `.opcao` | O escolhido fica preenchido; os outros, transparentes. |
| Campo | `.campo` | Rótulo em cima, borda `--cor-borda-campo`, texto 16px. Erro: borda e mensagem com "!". |
| Aviso | `Aviso.tsx` | Cores invertidas, no topo da tela, com ação opcional ("Desfazer"). |
| Botão de filtros | `Busca.module.css` | Aberto: cores invertidas, além do texto "Filtros (N ativos)". |
| Logo | `Logo.tsx` | Símbolo decorativo (`aria-hidden`) e o nome escrito. |
| Navegação | `NavegacaoInferior.tsx`, `NavegacaoLateral.tsx` | Mesmos destinos (`destinos.ts`). Atual: preenchido com destaque **e** `aria-current="page"`. |

**Desabilitado:** opacidade 0,45 e o texto da ação muda ("Lançando…"). **Foco:** contorno de 3px
em `--cor-foco`, só para quem usa o teclado (`:focus-visible`).

## CSP

Nenhum componente usa `style` inline: a barra do resumo por categoria é um SVG com o atributo
`width`. Assim o app aceita uma Content Security Policy estrita no M6, sem `'unsafe-inline'`.
