# ADR-0037: PDF do mês gerado no backend com OpenPDF

- **Status:** Aceita
- **Data:** 2026-11-27

## Contexto

A pessoa quer um resumo do mês para guardar, imprimir ou mandar para alguém: resumo, gasto por
categoria e lançamentos. O planejamento do M8 (#266) decidiu onde gerar o PDF e com qual biblioteca
(dependência nova, aprovada pelo autor). A implementação fica na #270 (backend) e na #271 (app).

## Decisão

1. **O PDF é gerado no backend**, em `GET /api/v1/relatorios/mes?mes=AAAA-MM`, com
   `Content-Disposition: attachment`.
2. **Biblioteca: OpenPDF 3.0.x** (`com.github.librepdf:openpdf`), licença MPL 2.0 ou LGPL 2.1, que
   pede Java 21 (o mesmo do projeto). Versão fixa no `pom.xml`, acompanhada pelo Dependabot.
3. **Conteúdo, só em tabelas:** cabeçalho com a logo e o mês, resumo (receitas, despesas e saldo),
   gasto por categoria (valor e %) e os lançamentos por data. O gráfico de rosca fica para depois.
4. **Fonte Manrope embutida no PDF** (licença OFL, o arquivo e a licença em `resources`), para os
   acentos e a identidade do app.
5. **Reaproveita as consultas do saldo e do resumo**, com o mesmo isolamento por usuário e o RLS.
   Cabeçalhos `no-store`, nada do conteúdo no log, e o arquivo não fica guardado no servidor.
6. **Modo demonstração:** o MSW devolve um PDF de exemplo fixo (ADR-0030).

## Por que no backend

- O arquivo sai **igual em qualquer aparelho**, num toque, e dá para testar: os testes leem o texto
  do PDF gerado e conferem valores, acentos e totais.
- Os totais já são calculados em SQL no backend; no app, seria preciso baixar todas as transações do mês.

## Por que OpenPDF

- Tem **tabelas prontas** (`PdfPTable`), que é quase tudo o que este PDF precisa, e escrever o
  documento fica legível.
- É mantido, com versões de 2026, e a licença (MPL ou LGPL) permite usar a biblioteca como dependência
  sem mudar a licença do Guardá.

## Alternativas consideradas

- **Apache PDFBox 3** (licença Apache 2.0): licença mais simples, mas a API é de baixo nível: cada
  texto é posicionado por coordenada, sem tabela pronta. Mais código para o mesmo resultado.
- **Imprimir pelo navegador** (`window.print()` com CSS de impressão): sem dependência e funciona na
  demonstração, mas a pessoa passa pelo diálogo de impressão ("Salvar como PDF"), que é confuso no
  celular, principalmente no iPhone.
- **Biblioteca no app** (jsPDF, pdfmake): aumenta o tamanho do app para todo mundo e exige baixar
  todas as transações do mês.

## Consequências

- Positivas: PDF consistente e testável; quase nenhum peso no app.
- Negativas / custos assumidos:
  - **Dependência nova** no backend, com o tamanho da imagem Docker um pouco maior.
  - A fonte embutida aumenta o tamanho de cada PDF (dezenas de KB).
  - O PDF precisa de internet (o app não gera sozinho, nem no M10, que só consulta dados offline).
  - Na demonstração, o PDF é sempre o mesmo exemplo.
