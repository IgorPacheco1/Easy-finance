# ADR-0029: Identidade visual do app (paleta, tipografia, logo e tela inicial)

- **Status:** Aceita
- **Data:** 2026-11-17

## Contexto

A cara do app era provisória (ADR-0012): paleta "Dividendo Champagne" escolhida para testar,
logo de teste e a tela inicial (Lançar) decidida às pressas na #26. O spike #155 decide a
identidade antes da logo e do design system do M5.5, porque os dois saem dela.

A revisão de acessibilidade de 2026-11-17 (#149) já tinha achado contraste abaixo do mínimo no
tema claro: borda dos campos com 1,2:1 e destaque com 2,2:1 (WCAG 2.1 AA pede 3:1 para bordas,
ícones e indicadores de estado, e 4,5:1 para texto).

As opções foram comparadas num canvas de protótipos (fora do código do app): a tela do Mês em
cada paleta, nos temas claro e escuro, com uma tabela de contraste; três tipografias aplicadas à
mesma tela; e cinco rodadas de conceitos de logo.

## Decisão

- **Sensação:** elegante e confiável. O app é de finanças pessoais e trata dados sensíveis:
  sóbrio, sem parecer frio.
- **Paleta "Capital Cacau"**, com estes papéis:

  | Papel | Tema claro | Tema escuro |
  |---|---|---|
  | Fundo | `#F7F1EA` | `#1F1410` |
  | Superfície (cartões, campos, navegação) | `#FFFFFF` | `#2C221E` |
  | Texto | `#1F1410` | `#F7F1EA` |
  | Texto secundário | `#4B2E24` | `#D6C2AE` |
  | Destaque (saldo, botão principal, item ativo) | `#8B5E34` | `#8B5E34` |
  | Texto sobre o destaque | `#F7F1EA` | `#F7F1EA` |
  | **Borda de campo e botão** (novo) | `#4B2E24` | `#847467` |
  | Divisor e trilho de barras (decorativo) | `#D6C2AE` | `#40332C` |
  | Receita | `#276B43` | `#86C79E` |
  | Erro | `#B3261E` | `#F2B8B5` |

  Contraste conferido (WCAG 2.1 AA), todos passando: texto 16,1:1 (claro e escuro); secundário
  10,9:1 e 10,5:1; texto sobre o destaque 5,0:1; destaque sobre o fundo 5,0:1 (claro) e 3,2:1
  (escuro); borda de campo 12,2:1 e 3,5:1 (sobre a superfície); receita 5,7:1 e 9,2:1; erro 5,8:1 e
  10,5:1.
  - A **borda de campo** é um papel novo, separado do divisor: o tom claro da paleta como borda
    de campo falha em todas as paletas (1,3 a 1,7:1). Corrige o achado da revisão.
  - No claro, o destaque serve como preenchimento **e** como texto ou ícone (5,0:1). No escuro,
    só como preenchimento ou elemento grande (3,2:1), nunca como texto pequeno.
  - O verde da receita escureceu de `#2E7D4F` (4,50:1, falha por arredondamento no fundo Cacau)
    para `#276B43`.
- **Tipografia: Manrope**, uma família só, servida pelo próprio app (nada de servidor de
  fontes de terceiros: privacidade e a CSP do M6). Licença SIL Open Font License. Valores com
  algarismos de largura fixa (`font-variant-numeric: tabular-nums`) para as colunas alinharem.
  Como servir (pacote npm ou arquivos no repositório) e quais pesos: na issue do design system.
- **Logo: símbolo + nome.** O símbolo é a **silhueta de uma carteira com o fecho recortado**,
  uma forma só, de uma cor, ao lado do nome "Easy Finance" em Manrope. Rascunho de referência
  (100×100):

  ```svg
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="24" fill="#8B5E34"/>
    <rect x="16" y="28" width="68" height="46" rx="13" fill="#F7F1EA"/>
    <rect x="58" y="44" width="26" height="15" rx="7.5" fill="#8B5E34"/>
    <circle cx="67" cy="51.5" r="3.5" fill="#F7F1EA"/>
  </svg>
  ```

  O desenho final (traço, proporções, versões por tamanho e o fundo do ícone: cacau ou o
  caramelo `#E0A458`, cor reservada à marca) sai na issue da logo. Ícones da interface
  continuam com `lucide-react` (ADR-0012).
- **Tela inicial: Lançar** (confirma a decisão provisória da #26): registrar um gasto em
  segundos é o objetivo principal do app.

## Alternativas consideradas

- **Outras paletas:** Dividendo Champagne e Previsão Rose Gold (destaque com 2,2:1 e 2,5:1 no
  claro: só serviriam como preenchimento); Índigo Rendimento e Ameixa Patrimônio (passam em tudo,
  mas o destaque precisa clarear no escuro); Grafite Tangerina (moderna, tema escuro forte, mas
  texto sobre o laranja no limite, 4,55:1, e o laranja lê como "atenção" e fica perto de apps de
  bancos conhecidos). A Cacau foi a preferida do autor e é rara em apps de finanças.
- **Fonte do sistema:** carrega na hora e não pesa nada, mas sem personalidade. **Plus Jakarta
  Sans** (mais arredondada) e **Fraunces + Inter** (serifa nos títulos, mais "premium", mas duas
  famílias para carregar).
- **Outros conceitos de logo** (moeda com barras, semente, monograma em livro-caixa, moeda
  sorridente, "e" com seta, broto, pilha de moedas em "E", moeda-cadeado, entre outros): os que
  somavam objetos ficaram forçados. A carteira, uma forma só, foi a escolhida.
- **Abrir no Mês:** mostraria o saldo primeiro, mas tira o foco da ação principal; o Mês fica a
  um toque.

## Consequências

- Positivas: identidade definida antes da logo e do design system, com contraste conferido nos
  dois temas; a borda de campo vira um papel próprio, e a correção vale para o app inteiro;
  nenhuma fonte ou recurso de terceiros carregado em tempo de execução.
- Negativas / custos assumidos:
  - Uma fonte própria aumenta o que o app baixa na primeira visita (poucas dezenas de KB por
    peso); os pesos são limitados no design system.
  - No tema escuro, o destaque não pode ser usado em texto pequeno.
  - O caramelo `#E0A458` é só da marca (logo e ícone); não entra na interface, para não criar
    um segundo destaque.

## Atualização (2026-11-17): como a fonte é servida (#157)

A Manrope vem do pacote `@fontsource-variable/manrope` (dependência de produção aprovada pelo
autor; o Dependabot acompanha as versões). O Vite empacota os arquivos `.woff2` junto com o app, e
o PWA guarda no cache só os alfabetos latinos. Referência dos tokens e componentes:
[`docs/design-system.md`](../design-system.md).
