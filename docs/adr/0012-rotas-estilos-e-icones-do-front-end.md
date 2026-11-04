# ADR-0012: Rotas, estilos e ícones do front-end

- **Status:** Aceita
- **Data:** 2026-11-04

## Contexto

A #26 cria a primeira estrutura visual do PWA: navegação inferior com três telas (Lançar, Mês e
Categorias), tema claro e escuro e layout pensado primeiro para o celular. Para isso faltava
decidir como trocar de tela, como escrever os estilos e de onde vêm os ícones.

O autor definiu a prioridade: **fazer funcionar primeiro e estilizar depois**. O visual começa
padronizado e será revisto quando o app estiver funcional, para ganhar uma identidade própria.

## Decisão

- **Rotas com React Router** (`react-router` 8): `createBrowserRouter` com uma rota de layout
  (`Layout`, que desenha a navegação) e as telas como rotas filhas. Endereços: `/` (Lançar),
  `/mes` e `/categorias`; qualquer outro mostra "Página não encontrada".
- **Tela inicial: Lançar**, porque registrar um gasto é a ação principal do produto.
  Decisão **provisória**, a revisar junto com a identidade visual.
- **Estilos com CSS Modules**, sem biblioteca: cada componente tem o seu `.module.css`, com
  classes isoladas. Cores e medidas ficam em **variáveis CSS** num único arquivo
  (`src/estilos/tema.css`); o tema escuro só troca os valores, por `prefers-color-scheme`.
- **Ícones com `lucide-react`**: ícones prontos, licença MIT, e só os usados entram no build.
- **Paleta "Dividendo Champagne"** (escolhida entre três candidatas, comparadas em telas de
  exemplo): fundo `#FFF9EF`, texto `#2B2A28`, texto secundário `#6B6258`, bordas `#EFE2C8` e
  destaque `#C9A86A`, invertidos no tema escuro. Verde para receitas (`#2E7D4F` / `#86C79E`),
  porque a paleta não tem uma cor de "entrada de dinheiro". Também **provisória**.
- **Acessibilidade desde o começo:** áreas de toque de pelo menos 44px (os links da navegação
  têm 56px), contorno de foco visível para teclado, `aria-current` no destino atual (feito pelo
  `NavLink`) e respeito à faixa de gestos do celular (`env(safe-area-inset-bottom)`).

## Alternativas consideradas

- **TanStack Router:** links tipados pelo TypeScript, mas mais complexo e menos comum.
- **Tailwind CSS:** rápido de escrever e popular, mas é uma linguagem a mais para aprender e
  deixa o HTML carregado de classes.
- **Biblioteca de componentes (MUI e similares):** telas prontas mais rápido, mas visual genérico
  e app mais pesado, ruim para abrir rápido no celular e para a identidade própria planejada.
- **Ícones SVG escritos à mão:** sem dependência, mas difícil manter um conjunto coerente.
- **Tela inicial no Mês:** abre mostrando o saldo, mas deixa o lançamento a um toque de distância.

## Consequências

- Positivas: poucas dependências (duas), estilos em CSS padrão, paleta trocável em um arquivo
  e base acessível para as próximas telas.
- Negativas / custos assumidos:
  - Contraste baixo entre o destaque (`#C9A86A`) e o fundo claro (2,2:1): botões em destaque
    precisam de texto escuro (6,3:1) e não podem depender só da cor para serem percebidos.
  - Identidade visual e tela inicial ainda serão revistas; mudanças nelas geram um novo ADR.
