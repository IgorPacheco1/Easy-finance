# ADR-0031: Cores e ícones das categorias

- **Status:** Aceita
- **Data:** 2026-11-20

## Contexto

No redesenho do M6 (#182), cada categoria passa a ter **cor e ícone próprios**, usados no Lançar,
no Mês (rosca, barras, lista) e em Categorias. Nos protótipos, o autor comparou três paletas
(tons da terra, só tons de cacau e cores vibrantes) e escolheu as **vibrantes**.

A identidade do app (ADR-0029) é a paleta Capital Cacau, com poucas cores e o caramelo reservado
para a logo. Era preciso decidir como as cores vibrantes convivem com ela, como garantir que
continuem legíveis nos dois temas e como guardar a escolha de cada categoria.

## Decisão

- **As cores vibrantes são só das categorias.** A interface (fundo, texto, botões, destaque,
  navegação) continua Capital Cacau. A cor de uma categoria aparece no ícone dela e nos gráficos
  que a representam.
- **12 cores com nome:** coral, laranja, amarelo, verde, menta, turquesa, ciano, azul, anil,
  roxo, rosa e cinza. Cada uma tem um tom para cada tema, em `--categoria-<cor>` no `tema.css`.
- **Contraste mínimo de 3:1** (WCAG 2.1, critério 1.4.11, para gráficos e ícones) sobre o fundo e
  sobre a superfície, nos dois temas. No tema escuro valem os tons vibrantes do protótipo; no
  claro, tons mais escuros calculados para passar. Um teste lê o `tema.css` e confere cada cor.
- **A cor nunca é a única pista:** a categoria aparece sempre com **ícone + nome**. O ícone é
  decorativo para o leitor de tela; o nome é o que identifica.
- **32 ícones do `lucide-react`** (já usado, ADR-0012), numa lista fechada.
- **A categoria guarda o nome da cor e o nome do ícone** (`verde`, `shopping-cart`), não o código
  da cor nem um ícone livre. A lista fica em `web/src/categorias/aparencia.ts` e o backend valida
  contra a mesma lista (próxima issue).
- **Cor por classe CSS, não por `style`**, para o app continuar compatível com uma CSP estrita.
- Valor desconhecido (dado antigo, ou a API mais nova que o app) mostra uma aparência padrão
  neutra (`circle-ellipsis`, cinza), em vez de quebrar a tela.

## Alternativas consideradas

- **Tons da terra:** harmonizavam com o cacau, mas o autor preferiu o destaque das vibrantes.
- **Só tons de cacau:** fiéis à marca, mas as categorias ficavam parecidas entre si e a rosca
  perdia o sentido.
- **Guardar o código da cor (`#22c55e`):** cada ajuste de tom (contraste, tema novo) exigiria
  migrar os dados, e a validação ficaria mais frouxa.
- **Cor livre escolhida pela pessoa (seletor de cores):** não daria para garantir o contraste nem
  a harmonia entre as categorias.

## Consequências

- Positivas: categorias reconhecíveis de relance; contraste garantido por teste; um tom pode
  mudar sem tocar no banco; a lista é a mesma no app e no backend.
- Negativas / custos assumidos: com 19 categorias do sistema e 12 cores, algumas categorias
  repetem a cor (o ícone continua diferente). Uma cor ou ícone novo exige mudar a lista nos dois
  lados (app e backend). No tema claro, o amarelo vira mostarda para passar no contraste.
