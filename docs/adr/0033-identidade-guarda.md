# ADR-0033: Identidade Guardá (nome, paleta Guará e logo)

- **Status:** Aceita
- **Data:** 2026-11-22
- **Substitui:** [ADR-0029](0029-identidade-visual.md) (paleta, logo e nome). A tipografia e a
  tela inicial do ADR-0029 continuam valendo.

## Contexto

"Easy Finance" é um nome genérico: há muitos apps e empresas com nomes parecidos, é difícil de
achar numa busca e de registrar como marca e domínio. O mascote do projeto já é o **lobo-guará**
(protótipos de 2026-11), mas a identidade Capital Cacau (ADR-0029) não tinha relação com ele: o
mascote laranja ficava desconectado da paleta marrom e da logo da carteira.

Trocar a identidade custa pouco antes da Produção (M7) e muito depois: links divulgados, domínio,
e-mails, a marca nas lojas de aplicativos e o app instalado nos celulares das pessoas.

As opções foram comparadas no canvas de protótipos: nomes com a disponibilidade de domínio, a
paleta aplicada às cinco telas nos dois temas e três rodadas de logo (15 variantes).

## Decisão

- **Nome: Guardá**, de "guardar" (dinheiro) com o som de "guará". Nos textos do app o nome leva
  acento; no código, nos pacotes, nas chaves e nos endereços, fica **sem acento: `guarda`**.
- **Paleta Guará**: grafite e tons neutros com o laranja do lobo-guará como destaque.

  | Papel | Tema claro | Tema escuro |
  |---|---|---|
  | Fundo | `#FAF9F7` (Creme) | `#1D1E20` (Grafite) |
  | Superfície (cartões, campos, navegação) | `#FFFFFF` | `#2A2B2E` |
  | Texto | `#1D1E20` (Grafite) | `#FAF9F7` (Creme) |
  | Texto secundário | `#55585E` (Chumbo) | `#B9BBC0` |
  | Destaque (saldo, botão principal, item ativo) | `#B4501F` (Guará escuro) | `#F08A52` (Guará claro) |
  | Texto sobre o destaque | `#FFFFFF` | `#1D1E20` (Grafite) |
  | Borda de campo e botão | `#55585E` (Chumbo) | `#7A7C82` |
  | Divisor e contorno decorativo | `#E7E3DE` (Areia) | `#3A3B3F` |
  | Receita | `#276B43` | `#86C79E` |
  | Erro | `#B3261E` | `#F2B8B5` |
  | Foco do teclado | `#1D1E20` | `#FAF9F7` |

  Contraste conferido (WCAG 2.1 AA), todos passando. Os números são claro / escuro, e quando há
  dois valores vale o menor, entre o fundo e a superfície:
  - texto: 15,9:1 / 13,5:1;
  - texto secundário: 6,8:1 / 7,4:1;
  - texto sobre o destaque: 5,1:1 / 6,7:1;
  - destaque sobre o fundo: 4,9:1 / 5,7:1;
  - borda de campo sobre a superfície: 7,1:1 / 3,4:1;
  - receita: 6,1:1 / 7,2:1;
  - erro: 6,2:1 / 8,3:1.

  Regras:
  - **Botões com um tom de laranja por tema:** Guará escuro com texto branco no claro, Guará
    claro com texto grafite no escuro. O laranja do mascote (`#D9622B`) com texto branco dá só
    3,7:1 e não serve para texto.
  - O destaque passa de 4,5:1 nos dois temas: diferente do ADR-0029, ele **pode** ser usado como
    texto e ícone também no escuro.
  - **O Guará (`#D9622B`) é só da marca** (logo, ícone e mascote), como o caramelo era no
    ADR-0029. Ele não entra na interface, para não haver dois destaques.
  - A borda de campo do escuro é `#7A7C82`. O tom do protótipo (`#6E7076`) dava 2,9:1 sobre a
    superfície e foi clareado até passar de 3:1.
  - As cores das categorias (ADR-0031) não mudam. Conferidas sobre o fundo e a superfície novos,
    todas continuam acima de 3:1. A menor é 3,4:1 no claro e 3,2:1 no escuro (anil). O
    `contraste.test.ts` passa a usar os fundos novos.
- **Tipografia:** continua a **Manrope** (ADR-0029 e #157).
- **Logo: o lobo-guará "espiando a moeda".** A cara do mascote aparece por baixo, virada para
  uma moeda, com a sobrancelha de "tô de olho". O desenho de referência é a variante N do canvas
  de protótipos (seção 10). É **uma versão só**, com a cara do mascote, em todos os lugares:
  ícone do app, favicon, tela de entrar, navegação lateral e redes.

  *Atualização (2026-11-23, #231):* a decisão original previa também uma versão simplificada
  (só a silhueta das orelhas e do focinho) para o favicon, porque os olhos e as sobrancelhas
  viram uma mancha em 16 px. O rascunho foi feito, mas o autor preferiu manter uma versão só:
  uma identidade única vale mais que a nitidez na aba do navegador, e a simplificada pode voltar
  se o favicon incomodar.

  É uma versão simples, que vale até haver uma melhor (por exemplo o mascote final). O desenho
  definitivo dos SVGs e dos ícones do PWA sai na issue da logo. Ícones da interface continuam com
  `lucide-react` (ADR-0012).
- **O nome novo vale em tudo, sem migração:** app, pacote Java (`io.github.igorpacheco1.guarda`),
  artefato, `compose.yaml`, chaves do aparelho (`guarda:tema`, `guarda:esconder-valores`, banco
  IndexedDB `guarda`) e o repositório (`IgorPacheco1/Guarda`). Ainda não há usuários reais, então
  os dados do aparelho e do banco local começam do zero, e o CHANGELOG avisa. A demonstração passa
  para `/Guarda/`, porque o GitHub Pages não redireciona o endereço antigo.
- **Histórico não muda:** os ADRs anteriores, as entradas antigas do CHANGELOG, `legacy/` e
  `m0-pacote/` continuam com "Easy Finance". São o registro de quando cada coisa aconteceu.

## Alternativas consideradas

- **Manter "Easy Finance":** sem custo de troca, mas o nome continua genérico e sem relação com o
  mascote.
- **Outros nomes**, com e sem relação com o lobo-guará, comparados com a disponibilidade de
  domínio: "Guardá" foi o preferido, porque junta as duas ideias (guardar dinheiro e o guará) numa
  palavra curta.
- **Manter a paleta Capital Cacau com o mascote:** o laranja do guará ficava desconectado do
  marrom.
- **Laranja do mascote puro como destaque:** não chega a 4,5:1 com texto branco nem com grafite
  no tema claro.
- **Outras logos:** o lobo de perfil, a silhueta só das orelhas, o retrato de frente, o selo
  redondo e a cabeça sobre fundo grafite, creme ou laranja (variantes A a O). A logo "espiando
  a moeda" foi a preferida do autor, porque junta o mascote e o dinheiro sem somar objetos à força.

## Consequências

- Positivas:
  - O mascote, a paleta e a logo contam a mesma história.
  - O nome é próprio e fácil de lembrar.
  - O destaque fica legível como texto nos dois temas, o que no ADR-0029 só valia no claro.
  - A troca acontece antes de qualquer usuário real.
- Negativas / custos assumidos:
  - Uma rodada de mudanças em quase todo o repositório: pacote Java, app, docs e o endereço da
    demonstração.
  - Quem já usa o app no aparelho perde o tema escolhido e a fila offline pendente.
  - Os ADRs antigos citam "Easy Finance" e a paleta Cacau.
  - Em 16 px (aba do navegador) a cara do mascote perde os detalhes; fica a silhueta laranja
    com a moeda.
  - A categoria "laranja" fica perto do destaque. Ela continua sendo identificada pelo ícone e
    pelo nome (ADR-0031), nunca só pela cor.
- **Pendências:**
  - A pesquisa da marca "Guardá" no INPI fica registrada na issue #229.
  - O domínio está no M7. Em 2026-11-22 foi registrado o domínio provisório `guaraapp`, e o
    domínio definitivo do Guardá ainda será registrado.
