# ADR-0038: Importação de extratos (OFX e CSV) com revisão antes de salvar

- **Status:** Aceita
- **Data:** 2026-11-27

## Contexto

Lançar à mão o mês inteiro cansa. A pessoa pode baixar o extrato no app ou no site do banco e trazer
para o Guardá, **sem dar a senha do banco** e sem Open Finance (descartado por custo e regulação). É
também o **primeiro upload do app**, então a entrada do arquivo é um ponto novo de ataque. O
planejamento do M8 (#266) decidiu o desenho com o autor; a implementação vai da #272 à #278.

## Decisão

### Formatos

1. **OFX**, o formato que a maioria dos bancos oferece, nas versões 1.0.2 (SGML, tags sem fechamento,
   comum nos bancos brasileiros) e 2.x (XML).
2. **CSV do Nubank** (conta e fatura do cartão), reconhecido pelo cabeçalho. Outros bancos entram
   depois, um layout por vez.
3. **Qualquer outro CSV**, com a pessoa indicando a coluna da data, da descrição e do valor, o formato
   da data e o sinal das despesas.

### Leitores próprios, sem dependência nova

4. **O OFX é lido por um leitor nosso, pequeno**, que só procura os blocos `STMTTRN` (`TRNTYPE`,
   `DTPOSTED`, `TRNAMT`, `FITID`, `MEMO`/`NAME`). Ele lê o arquivo **como texto**, sem parser XML,
   então não existe risco de XXE (entidades externas do XML). Trata o encoding do cabeçalho
   (`CHARSET:1252` ou UTF-8) e datas como `20261127000000[-3:BRT]`.
5. **O CSV também é lido por código nosso:** separador `,` ou `;`, aspas, UTF-8 (com ou sem BOM) ou
   Windows-1252, vírgula ou ponto decimal.
6. Os testes usam **arquivos de exemplo inventados**. Extratos reais nunca entram no repositório.

### Duas etapas, sem estado no servidor

7. **Prévia** (`POST /api/v1/importacoes/previa`, multipart): o arquivo é lido, conferido e
   descartado. A resposta traz cada lançamento com a categoria sugerida e a situação: `NOVO`,
   `TALVEZ_JA_LANCADO` (com o lançamento parecido) ou `JA_IMPORTADO`. **Nada é gravado.**
8. **Confirmação** (`POST /api/v1/importacoes`): o app manda a lista revisada (até 1.000 itens), cada
   item é validado como um lançamento comum, e **tudo é salvo numa transação só**. Um item inválido
   não salva nenhum.
9. **Sem tabela de rascunho:** a revisão fica no app entre as duas chamadas. Não há rascunho para
   limpar, nem tabela nova para proteger com RLS.

### Limites do upload

10. **Até 2 MB por arquivo** (`spring.servlet.multipart.*`, `413`) e **até 1.000 lançamentos** por
    importação. Um ano de extrato em OFX tem cerca de 200 KB.
11. **O tipo é conferido pelo conteúdo**, não pelo `Content-Type` nem pela extensão, que o navegador e
    a pessoa podem mandar errado: OFX começa com `OFXHEADER:` ou `<?xml` e traz `<OFX>`; CSV tem de
    ser texto, sem bytes nulos. Fora disso, `415`.
12. **Cerca de 10 prévias por hora por pessoa**, no pacote `limites/` (ADR-0035), com `429` e
    `Retry-After`: cada prévia lê um arquivo inteiro e custa mais que uma requisição comum.
13. **Nada em disco e nada do conteúdo no log.** Os erros saem em ProblemDetail, em português, com o
    número da linha ou do lançamento com problema.

### Duplicados

14. **Coluna nova `id_externo` na `transacao`** (opcional), com índice único parcial em
    `(usuario_id, id_externo)`. A `transacao` já tem RLS (ADR-0034).
15. O valor é um **hash SHA-256** de origem + banco + conta + `FITID` (OFX) ou do identificador da
    linha (CSV da conta do Nubank). Assim **o número da conta no banco nunca é gravado**, e a mesma
    linha importada de novo é reconhecida (`JA_IMPORTADO`). Na confirmação, um `id_externo` que já
    existe é ignorado e contado, sem erro.
16. Sem identificador (fatura do cartão, CSV genérico) e para os lançamentos feitos à mão: **"talvez
    já lançado"** quando a data e o valor batem com um lançamento que já existe.
17. Na revisão, os duplicados chegam **desmarcados e com o motivo escrito**, e a pessoa decide.

### Categoria sugerida

18. **Pelo histórico da própria pessoa:** a última categoria usada com a mesma descrição (normalizada:
    sem acentos, maiúsculas e números variáveis). Sem histórico, a categoria padrão do tipo, que vem do
    sinal do valor. Na revisão, trocar a categoria pode valer para todos do extrato com a mesma
    descrição.

## Alternativas consideradas

- **ofx4j (biblioteca):** lê SGML e XML, mas quase não tem manutenção e traz o cliente e o servidor
  OFX inteiros, de que não precisamos.
- **Ler o arquivo no próprio app** e mandar só as linhas em JSON: sem upload, mas a leitura do extrato
  ficaria no front-end (contra as camadas do projeto) e sem a validação no backend.
- **Rascunho da importação no banco:** a revisão sobreviveria a fechar o app, mas exigiria uma tabela
  nova com RLS e a limpeza dos rascunhos abandonados.
- **Tabela própria para os ids externos:** mais uma tabela com RLS para guardar uma informação só.
- **`id` da transação derivado do `FITID` (UUID v5):** sem mudar o schema, mas esconde o significado
  dentro do `id` e mistura duas ideias numa coluna.
- **Categoria por regras fixas** ("iFood" vira Alimentação): envelhece rápido e não serve para as
  categorias de cada pessoa.

## Consequências

- Positivas: importar sem senha do banco e sem dependência nova; nada é salvo sem revisão; a mesma
  linha não entra duas vezes; o número da conta não fica guardado.
- Negativas / custos assumidos:
  - Cada banco escreve o OFX de um jeito: o leitor vai precisar de ajustes quando aparecer um arquivo
    diferente. Os testes com amostras ajudam a não quebrar o que já funciona.
  - Fechar o app no meio da revisão perde a revisão (é só escolher o arquivo de novo).
  - "Talvez já lançado" por data e valor pode marcar dois gastos iguais e legítimos no mesmo dia. A
    pessoa decide na revisão.
  - Um lançamento importado e depois excluído volta se o mesmo extrato for importado de novo (o
    `id_externo` some com ele). Aceito por enquanto: a revisão mostra o lançamento como novo.
  - A importação precisa de internet.
