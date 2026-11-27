# ADR-0036: Exportação dos dados em um .zip com CSV

- **Status:** Aceita
- **Data:** 2026-11-27

## Contexto

A LGPD garante à pessoa a **portabilidade** dos dados: receber o que ela guardou num formato
estruturado, que outro serviço consiga ler. O Guardá ainda não tem como tirar os dados do app. O
planejamento do M8 (#266) decidiu o formato com o autor; a implementação fica na #268 (backend) e na
#269 (app).

## Decisão

1. **Um `.zip` com três arquivos:** `transacoes.csv`, `categorias.csv` e `LEIAME.txt` (o que
   significa cada coluna). O zip vem do próprio Java (`java.util.zip`), **sem dependência nova**.
2. **Gerado no backend**, em `GET /api/v1/eu/exportacao`, escrito direto na resposta (streaming):
   o arquivo nunca é montado inteiro na memória nem gravado em disco, e não fica guardado no servidor.
3. **CSV no padrão brasileiro:** UTF-8 com BOM, separador `;`, vírgula decimal e data `dd/MM/aaaa`.
   Campos com `;`, aspas ou quebra de linha vão entre aspas.
4. **Proteção contra CSV injection:** uma célula que começa com `=`, `+`, `-`, `@`, tab ou retorno
   ganha um `'` na frente, para a planilha não executar o conteúdo como fórmula.
5. **Sempre tudo:** sem escolher período. É o caso da portabilidade; um recorte pode vir depois.
6. **Só os dados da pessoa logada**, pelas mesmas consultas filtradas por usuário e pelo RLS
   (ADR-0025, 0026 e 0034). Cabeçalhos `no-store` também nesta resposta, e nada do conteúdo no log.

## Por que esse formato

- **CSV abre em qualquer lugar:** Excel, Google Planilhas, LibreOffice e outros apps de finanças.
- **O padrão brasileiro evita o erro mais comum:** com vírgula como separador, o Excel em português
  abre tudo numa coluna só e lê `12.50` como texto. O BOM faz o Excel reconhecer o UTF-8 (acentos).
- **O zip junta os arquivos num download só**, e o `LEIAME.txt` deixa o arquivo compreensível sem o app.

## Alternativas consideradas

- **Um único `transacoes.csv`:** mais simples, mas perde as categorias criadas pela pessoa (ícone e
  cor), que também são dados dela.
- **Planilha `.xlsx`:** abre bonita no Excel, mas exige o Apache POI (vários MB) ou outra biblioteca, só
  para o que o CSV já resolve.
- **JSON:** bom para outro sistema ler, ruim para a pessoa abrir. Pode entrar depois no mesmo zip.
- **Gerar no app:** o app teria de baixar todas as transações página por página e não funcionaria
  igual em todos os aparelhos.

## Consequências

- Positivas: portabilidade atendida sem dependência nova; o arquivo abre certo no Excel em português.
- Negativas / custos assumidos:
  - Quem usa planilha em inglês verá vírgula decimal e `;`; o `LEIAME.txt` explica como abrir.
  - O `'` da proteção contra CSV injection aparece na célula quando a descrição começa com `-`, por
    exemplo. É o custo de não executar fórmula escondida.
  - O arquivo tem dados financeiros: depois de baixado, a segurança depende de onde a pessoa guarda.
    A tela avisa isso.
