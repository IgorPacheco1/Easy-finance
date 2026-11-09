# ADR-0019: Lançamento offline com fila no aparelho

- **Status:** Aceita
- **Data:** 2026-11-09

## Contexto

O app é feito para o celular, e o lançamento precisa funcionar onde a internet falha (mercado,
metrô, garagem). Hoje, sem conexão, o lançamento simplesmente não é salvo. O M4 prevê lançar sem
conexão (#100); este ADR é o resultado do spike (#99) e decide como.

Restrições combinadas no planejamento do M4 (#91):

- **Offline só para lançar.** Consultar dados offline guardaria o histórico financeiro no
  navegador, sem login nem criptografia; fica para depois do M5 (roadmap, "Ideias para depois").
- **O mínimo de dados financeiros no aparelho** (ADR-0015 deixou esta decisão para cá).
- A API já está pronta para isso: criação idempotente pelo `id` gerado no app (#19, ADR-0014) e
  `410 Gone` para o reenvio de uma transação excluída (#98).

## Decisão

1. **Armazenamento: IndexedDB, com a biblioteca [`idb`](https://github.com/jakearchibald/idb)**
   (cerca de 1 KB). O IndexedDB é o banco de dados que todo navegador tem para dados de app; a
   `idb` só troca a API antiga, de eventos, por `async/await`. Nos testes, a `fake-indexeddb`
   (só desenvolvimento) simula o IndexedDB no jsdom. As duas dependências entram na #100.
2. **O que fica guardado (banco `easy-finance` no IndexedDB):**
   - `fila`: os lançamentos ainda não confirmados pelo servidor, cada um com o corpo do `POST`
     (com o `id` do aparelho), a situação (`pendente` ou `recusado`) e, se recusado, a mensagem.
   - `categorias`: a última lista recebida da API, para escolher a categoria sem internet.
   Nada mais: nenhuma resposta da API, nenhum saldo, nenhuma lista de transações.
3. **Quando um lançamento vai para a fila:** o app tenta enviar normalmente. Se não há resposta
   (sem rede) ou ela demora mais de **10 segundos**, o lançamento vai para a fila e a tela
   confirma "Salvo no aparelho, será enviado quando houver conexão". O `navigator.onLine` não é
   usado para decidir: ele diz "online" em redes que não chegam à internet.
4. **Quando a fila é reenviada:**
   - **Em segundo plano, com o app fechado, onde o navegador permite** (*Background Sync*:
     Chrome e Edge, no Android e no computador). Ao colocar um lançamento na fila, o app pede ao
     navegador um evento `sync`; quando a conexão volta, o navegador acorda o service worker, que
     envia a fila.
   - **No iPhone** (o Safari não tem Background Sync) **e em qualquer navegador:** ao abrir o
     app, quando a conexão volta (evento `online`), depois de cada lançamento enviado com sucesso
     e pelo botão "Enviar agora" do aviso de pendentes.
   - O envio é **um por vez, na ordem**, sempre com o **mesmo `id`**. Se o app e o service worker
     enviarem o mesmo lançamento ao mesmo tempo, a idempotência da API (#19) garante que não
     duplica.
5. **Uma fila só**, lida pelo app e pelo service worker, com o mesmo código de envio
   (`web/src/fila/`). Para isso, o service worker passa a ser **escrito por nós** (modo
   `injectManifest` do vite-plugin-pwa), em vez de gerado (`generateSW`, ADR-0015). Ele continua
   guardando só a casca do app (a lista de arquivos ainda vem do Workbox) e ganha o tratamento do
   evento `sync`. As respostas da API continuam **sem** cache.
6. **O que fazer com cada resposta do reenvio:**

   | Resposta | O que acontece |
   |---|---|
   | 201 ou 200 | Sai da fila. |
   | 410 (excluída em outro aparelho, #98) | Fica marcado como `recusado`; o app pergunta: **descartar** ou **lançar de novo** (com `id` novo). |
   | 400 ou 409 (dados recusados) | Fica marcado como `recusado`, com a mensagem do servidor; a pessoa pode descartar. |
   | Sem rede, demora ou 5xx | Continua `pendente`, para a próxima tentativa. |

   O que o service worker não consegue perguntar (ele não tem tela) fica marcado na fila e é
   mostrado na próxima vez que o app abrir.
7. **Como os pendentes aparecem:** só um **aviso** ("2 lançamentos aguardando envio", com
   "Enviar agora"), na tela de lançamento e na do mês. Os pendentes **não** entram na lista nem no
   saldo: o saldo é sempre o valor confirmado pelo servidor. Mostrar os pendentes na lista fica
   para depois, se fizer falta.

## Segurança

- No aparelho ficam só as categorias e os lançamentos ainda não enviados. **Cada lançamento é
  apagado assim que o servidor confirma.** Lançamento recusado fica até a pessoa decidir.
- Nenhuma resposta da API é guardada (cache só da casca, como no ADR-0015).
- Ainda sem login (M5): quem pega o celular desbloqueado vê os pendentes, como já vê o app. No
  M5, **sair da conta apaga o banco `easy-finance` inteiro**, e a fila passa a ser por usuário.
- O IndexedDB fica isolado por origem: outro site não lê estes dados.

## Alternativas consideradas

- **IndexedDB sem biblioteca:** sem dependência, mas a API do navegador é baseada em eventos e
  trabalhosa; seriam dezenas de linhas difíceis de ler para pouca coisa.
- **localStorage:** o mais simples e suficiente para uma fila pequena, mas trava a tela enquanto
  lê e grava, só guarda texto e **não é acessível pelo service worker**, o que impediria o envio
  em segundo plano.
- **`BackgroundSyncPlugin` do Workbox** (o service worker guarda o pedido que falhou e repete):
  pouco código, mas cria uma segunda fila, escondida do app. O app não saberia mostrar os
  pendentes nem perguntar o que fazer com um 410.
- **Mostrar os pendentes na lista e no saldo:** mais completo, mas mistura o que o servidor
  confirmou com o que ainda não chegou; fica para depois.
- **Usar `navigator.onLine` para decidir se envia:** dá falso "online" em Wi-Fi sem internet.

## Consequências

- Positivas: lançar funciona sem internet em qualquer navegador; no Android e no computador, o
  envio acontece até com o app fechado; uma fila só, visível e testável; nenhum histórico
  financeiro guardado no aparelho.
- Negativas / custos assumidos:
  - Duas dependências novas (`idb` e, em desenvolvimento, `fake-indexeddb`).
  - O service worker deixa de ser 100% gerado: o arquivo `web/src/sw.ts` passa a ser nosso e
    precisa de cuidado a cada atualização do Workbox.
  - No iPhone, o envio só acontece com o app aberto.
  - O Safari pode apagar os dados de um **site** que fica 7 dias sem uso; o app **instalado** na
    tela inicial não sofre isso. O guia de instalação deve recomendar instalar.
  - Um lançamento feito offline não aparece no saldo até ser enviado.

## Verificação

- Testes da fila e do envio com `fake-indexeddb` e MSW (#100), cobrindo cada resposta da tabela.
- Roteiro manual no iPhone e no Android, registrado no PR da #100: modo avião, lançar, fechar o
  app, abrir de novo (o pendente continua lá), tirar do modo avião (o lançamento é enviado; no
  Android, também com o app fechado).
