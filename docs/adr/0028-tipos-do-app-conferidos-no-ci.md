# ADR-0028: Tipos do app gerados de um arquivo e conferidos no CI

- **Status:** Aceita
- **Data:** 2026-11-17

## Contexto

Os tipos do app (`web/src/api/esquema.d.ts`) são gerados do OpenAPI do backend com o
`openapi-typescript` (ADR-0013). Até aqui, o `npm run api:tipos` lia o `/v3/api-docs` do backend
rodando no perfil `dev`, e nada conferia se o arquivo versionado ainda batia com a API. Na #130 ele
foi editado à mão. Se um campo mudar no backend e o app não for atualizado, o erro só aparece com o
app rodando. Na revisão do projeto de 2026-11-17 (#149), este foi o item de dívida técnica de maior
prioridade.

A especificação continua desligada fora do perfil `dev` (ADR-0010): quem está de fora não deve ver
o mapa da API em produção.

## Decisão

- **Um teste do backend grava a especificação** em `backend/target/openapi.json`
  (`EspecificacaoDaApiParaOAppTests`). Ele liga o OpenAPI só para si, com
  `@TestPropertySource(properties = "springdoc.api-docs.enabled=true")`, como o
  `DocumentacaoDaApiTests` já fazia; o `DocumentacaoDaApiDesligadaTests` segue garantindo que ela
  fica desligada na configuração padrão. O arquivo é gerado a cada `./mvnw verify` e **não vai para
  o Git**: o contrato versionado é o próprio `esquema.d.ts`, que já aparece no diff dos PRs.
- **`npm run api:tipos` lê esse arquivo**, sem precisar do backend ligado.
- **O CI confere:** depois do `verify` do backend, o job `build` roda `npm run api:tipos` e
  `git diff --exit-code src/api/esquema.d.ts`. Se sobrar diferença, falha com a mensagem do que
  rodar.

## Alternativas consideradas

- **Versionar o `openapi.json`** (ex.: `docs/api/openapi.json`): o contrato ficaria legível no
  GitHub e daria para gerar os tipos sem rodar o backend, mas seriam dois arquivos gerados para
  manter em dia e conferir. Descartada pelo autor.
- **Subir o backend no CI e ler o `/v3/api-docs`**, como o script fazia: mais lento e frágil
  (esperar o servidor subir, perfil `dev` com banco) para chegar ao mesmo arquivo que o teste já
  produz.
- **Plugin do springdoc para Maven** (`springdoc-openapi-maven-plugin`): sobe a aplicação numa fase
  do build para baixar a especificação. Dependência nova para fazer o que um teste de poucas linhas
  faz com o contexto que os testes já sobem.

## Consequências

- Positivas: app e API não se desencontram sem o CI avisar; gerar os tipos não exige o backend
  rodando nem o perfil `dev`; o `esquema.d.ts` volta a ser 100% gerado.
- Negativas / custos assumidos:
  - Para regerar os tipos na máquina é preciso rodar os testes do backend (Docker ligado, pelo
    Testcontainers) antes do `npm run api:tipos`.
  - O CI só confere quando o backend e o app existem no mesmo job (hoje sempre).
