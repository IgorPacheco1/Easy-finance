# ADR-0017: Paginação da listagem de transações

- **Status:** Aceita
- **Data:** 2026-11-09

## Contexto

`GET /api/v1/transacoes` devolvia todas as transações de uma vez. Com meses de uso, a resposta
cresce sem limite: fica lenta no celular, gasta dados móveis e deixa o servidor montar listas
enormes a cada pedido. O M4 também traz a busca com filtros (#93, #94), que pode alcançar o
histórico inteiro.

O app é pensado para o celular, onde o jeito natural de ver uma lista longa é a **rolagem
infinita**: a tela mostra um pedaço e busca o próximo quando a pessoa chega ao fim. Para isso, o
app só precisa saber se existe mais alguma coisa, não o total.

Decisão tomada com o autor no planejamento do M4 (#91) e na #92.

## Decisão

1. **Paginação por número de página**, com os parâmetros `pagina` (começa em **1**) e `tamanho`
   (de 1 a **100**; padrão 20). Fora disso, 400 no campo correspondente, com mensagem em
   português.
2. **`Slice`, e não `Page`, no Spring Data.** O `Slice` busca um item a mais que o pedido só
   para saber se há próxima página: uma consulta por pedido. O `Page` faria também um
   `SELECT COUNT(*)`, que fica caro com a tabela grande e não é usado pela rolagem infinita. O
   saldo do mês não depende disso, porque vem somado pelo `/api/v1/saldo`.
3. **Formato de resposta próprio** (`shared/PaginaResponse`), em vez de serializar o objeto do
   Spring:
   ```json
   { "itens": [ ... ], "pagina": 1, "tamanho": 20, "temMais": true }
   ```
   A resposta é um contrato com o app. Se ela fosse o `Slice`/`Page` do Spring, uma atualização
   da biblioteca poderia mudar o JSON e quebrar o app sem mudança no nosso código; além disso,
   detalhes internos (`pageable`, `sort`) vazariam. O próprio Spring Data desaconselha
   serializar o `PageImpl` diretamente.
4. **Ordem estável com desempate pelo `id`:** `data` decrescente, depois `criado_em`
   decrescente, depois `id` decrescente. Sem o último critério, transações com a mesma data e o
   mesmo `criado_em` (por exemplo, a fila offline enviando vários lançamentos juntos) podiam vir
   em ordem diferente a cada consulta, e uma delas aparecia em duas páginas enquanto outra sumia.
   O `id` nunca se repete; ser aleatório (UUID v4, ADR-0006) não atrapalha, porque o desempate
   só precisa ser sempre o mesmo.
5. **Páginas a partir de 1 na API.** É mais natural para quem lê a URL. O Spring conta a partir
   de 0, e a conversão fica em só dois lugares: no service (`pagina - 1`) e no
   `PaginaResponse.de(...)`.
6. **O app ignora itens repetidos ao juntar páginas** (`web/src/mes/juntarSemRepetir.ts`). Com
   paginação por número, um lançamento novo durante a rolagem faz a lista "escorregar" uma
   posição, e o último item de uma página volta como o primeiro da próxima.
7. **Rolagem infinita no app** com o `IntersectionObserver` do navegador e um botão
   "Carregar mais" sempre visível, para quem usa teclado ou leitor de tela
   (`web/src/componentes/CarregarMais.tsx`). A tela do Mês pede 50 transações por vez, para a
   maioria dos meses caber num pedido só.

## Alternativas consideradas

- **Paginação por cursor (keyset):** o app pede "os próximos 20 depois deste item", e o banco
  continua de onde parou (`WHERE (data, criado_em, id) < (...)`). Não repete nem pula itens
  quando entram lançamentos novos, e não fica lenta em páginas muito distantes, como o `OFFSET`.
  Descartada por enquanto: dá mais trabalho no backend e no app, e o problema que ela resolve é
  raro aqui (alguém lançar enquanto rola a lista), tratado pelo item 6. Volta a ser candidata se
  o volume de dados ou a busca exigirem.
- **`Page` com o total de itens:** permitiria mostrar "página 3 de 12", que a rolagem infinita
  não usa, ao custo de uma consulta `COUNT(*)` a cada pedido.
- **Páginas a partir de 0 (padrão do Spring):** evita a conversão, mas expõe um detalhe interno
  na URL pública.
- **Sem limite de tamanho:** um cliente poderia pedir `tamanho=1000000` e trazer a tabela
  inteira, que é o que a paginação existe para evitar.

## Consequências

- Positivas: respostas de tamanho limitado; uma consulta ao banco por página; contrato da API
  sob nosso controle; ordem previsível; base pronta para a busca com filtros (#93, #94).
- Negativas / custos assumidos:
  - **Mudança incompatível na API:** a resposta deixou de ser uma lista e passou a ser um objeto.
    Aceitável enquanto a versão é 0.x e o único cliente é o próprio app, atualizado no mesmo PR.
  - Com `OFFSET`, páginas muito distantes ficam mais lentas, porque o banco percorre e descarta
    as linhas anteriores. Irrelevante no volume de uma pessoa; seria um motivo para o cursor.
  - Um lançamento novo durante a rolagem só aparece ao abrir o mês de novo.
