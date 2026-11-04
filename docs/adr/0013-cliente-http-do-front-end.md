# ADR-0013: Cliente HTTP do front-end (fetch, tipos gerados do OpenAPI e MSW)

- **Status:** Aceita
- **Data:** 2026-11-04

## Contexto

O PWA (`web/`) precisa conversar com a API Java (`backend/`). A #27 pede uma camada única de
acesso à API, para que as telas não conheçam detalhes de HTTP, com tipos das respostas,
tratamento dos erros no formato ProblemDetail, proxy no desenvolvimento, endereço configurável e
testes sem o backend ligado.

Em desenvolvimento são dois servidores: o Vite (`localhost:5173`) entrega o app e o Spring
(`localhost:8080`) responde a API. Para o navegador, portas diferentes são origens diferentes, e
chamadas entre origens diferentes são bloqueadas (CORS) a menos que o servidor as libere.

## Decisão

- **Proxy do Vite:** no `npm run dev`, tudo que começa com `/api` é repassado para o backend. O
  app chama endereços relativos (`/api/v1/...`), sem CORS e sem configuração de segurança extra
  no backend. Em produção (M6), o mesmo papel será de um servidor na frente dos dois, no mesmo
  domínio.
- **`fetch` do navegador**, sem biblioteca de HTTP, numa função única (`src/api/cliente.ts`)
  usada por funções por recurso (`categorias.ts`, `transacoes.ts`, `saldo.ts`). As telas só
  chamam essas funções.
- **Erros:** respostas de erro (ProblemDetail, #21) viram `ErroDaApi`, com `status`, `titulo`,
  `detalhe` e a lista `erros` por campo. Falha de rede vira `ErroDaApi` com status `0`.
- **Tipos gerados do OpenAPI** com `openapi-typescript` (7.13.0) a partir do `/v3/api-docs` do
  backend (`npm run api:tipos`). O arquivo gerado (`src/api/esquema.d.ts`) vai para o Git, para
  o build e o CI não dependerem do backend. `src/api/tipos.ts` dá nomes curtos aos tipos.
  - O gerador roda com `npx`, isolado, e **não** fica no `package.json`: ele exige TypeScript 5
    (usa a API do compilador em JavaScript, que o TypeScript 7 ainda não oferece), e o projeto
    usa o 7 (ADR-0011). A versão fica fixada no script.
  - No OpenAPI atual, os campos das respostas aparecem como opcionais (os records de resposta do
    backend não estão marcados como obrigatórios). O `tipos.ts` os torna obrigatórios
    (`Required<...>`), exceto a `descricao` da transação, que pode ser `null`.
- **Endereço configurável:** `VITE_API_URL` (padrão `/api/v1`) e `API_PROXY_ALVO` (padrão
  `http://localhost:8080`), em `web/.env.local` (modelo em `web/.env.example`).
- **Testes com MSW** (Mock Service Worker 3): um servidor falso intercepta os pedidos do `fetch`
  nos testes; pedido sem resposta combinada faz o teste falhar.
- **Dinheiro e datas:** o front nunca faz conta com dinheiro (o saldo vem pronto da API) e mantém
  as datas como texto `AAAA-MM-DD`.

## Alternativas consideradas

- **Liberar CORS no backend:** funciona, mas acrescenta configuração de segurança no backend só
  para o desenvolvimento.
- **Tipos escritos à mão:** sem ferramenta extra e bons para aprender, mas podem ficar diferentes
  da API sem ninguém perceber.
- **Gerador instalado no projeto (`devDependency`):** atualizado pelo Dependabot, mas conflita com
  o TypeScript 7. Rever quando o `openapi-typescript` aceitar o TypeScript 7.
- **`@hey-api/openapi-ts`:** aceita o TypeScript 7, mas está em versão 0.x e gera um cliente
  inteiro, mais do que o necessário.
- **`axios`:** atalhos convenientes, mas o `fetch` já cobre o que o app precisa, sem dependência.
- **Simular o `fetch` com `vi.stubGlobal`:** sem dependência, mas menos realista; o MSW também
  serve para os testes de tela da #33.

## Consequências

- Positivas: telas sem detalhes de HTTP; mensagens de erro da API prontas para a tela; tipos
  iguais aos do backend; testes rápidos sem backend; nenhuma dependência nova no app final
  (o MSW é só de teste).
- Negativas / custos assumidos:
  - Toda mudança na API exige rodar `npm run api:tipos` com o backend ligado e commitar o
    `esquema.d.ts`.
  - O Dependabot não acompanha a versão do `openapi-typescript` (fica no script).
  - Os ajustes de opcional/obrigatório no `tipos.ts` existem até o backend marcar os campos
    obrigatórios das respostas no OpenAPI.
