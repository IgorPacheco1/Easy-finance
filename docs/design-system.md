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
- **Funciona igual nos dois temas.** O tema segue o do sistema (claro ou escuro).

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
- **Movimento:** `--duracao-rapida` (150ms) com `--curva-padrao`. Com "reduzir movimento" ligado no
  sistema, animações e transições somem (`index.css`).
- **Medidas:** `--altura-toque` 44px, `--espessura-borda-campo` 1,5px, `--largura-maxima` 640px.

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

**Desabilitado:** opacidade 0,45 e o texto da ação muda ("Lançando…"). **Foco:** contorno de 3px
em `--cor-foco`, só para quem usa o teclado (`:focus-visible`).

## CSP

Nenhum componente usa `style` inline: a barra do resumo por categoria é um SVG com o atributo
`width`. Assim o app aceita uma Content Security Policy estrita no M6, sem `'unsafe-inline'`.
