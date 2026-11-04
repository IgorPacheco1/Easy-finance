# Easy Finance: web (PWA)

Interface do Easy Finance: um PWA em React + TypeScript, criado com Vite, que consome a API do
`backend/`. Decisões em [ADR-0005](../docs/adr/0005-interface-pwa-react.md) (PWA com React) e
[ADR-0011](../docs/adr/0011-ferramentas-do-front-end.md) (ferramentas).

> Em construção no milestone **M3**. Por enquanto só existe uma tela provisória.

## Pré-requisito

**Node.js 26 (LTS)**, a versão fixada em [`.nvmrc`](.nvmrc). Confira com `node -v`.

## Comandos

Todos rodam dentro desta pasta (`cd web`):

| Comando              | O que faz                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `npm install`        | Instala as dependências (na primeira vez e quando o `package.json` mudar)                    |
| `npm run dev`        | Sobe o app em modo desenvolvimento em <http://localhost:5173>, recarregando a cada alteração |
| `npm run build`      | Confere os tipos (TypeScript) e gera a versão otimizada em `dist/`                           |
| `npm run preview`    | Serve a versão de `dist/` para conferir o resultado do build                                 |
| `npm run lint`       | Procura problemas no código (oxlint) e confere a formatação (Prettier)                       |
| `npm run format`     | Formata todos os arquivos com o Prettier                                                     |
| `npm test`           | Roda os testes uma vez (Vitest)                                                              |
| `npm run test:watch` | Roda os testes de novo a cada alteração                                                      |
| `npm run api:tipos`  | Gera `src/api/esquema.d.ts` a partir do OpenAPI do backend (o backend precisa estar rodando) |

No CI, o job `build` roda `npm ci`, `npm run lint`, `npm test` e `npm run build`.

## Estrutura

```
web/
├── index.html               página base; o React é montado na div#root
├── public/                  arquivos servidos como estão (ícone)
├── src/
│   ├── main.tsx             ponto de entrada: liga o roteador e os estilos globais
│   ├── rotas.tsx            mapa de endereços: qual tela abre em cada URL
│   ├── index.css            estilos globais
│   ├── estilos/tema.css     cores e medidas em variáveis CSS (tema claro e escuro)
│   ├── api/                 cliente HTTP: funções para cada recurso da API e os tipos
│   ├── testes/              servidor falso da API (MSW) usado pelos testes
│   ├── layout/              moldura das telas e navegação inferior
│   ├── componentes/         peças reutilizadas pelas telas
│   └── paginas/             uma tela por arquivo (Lançar, Mês, Categorias...)
├── vite.config.ts           configuração do Vite e do Vitest
├── tsconfig*.json           configuração do TypeScript (modo estrito)
├── .oxlintrc.json           regras do oxlint
└── .prettierrc.json         estilo de formatação (sem ponto e vírgula, aspas simples)
```

## Telas e endereços

| Endereço      | Tela                                     |
| ------------- | ---------------------------------------- |
| `/`           | Lançar (tela inicial)                    |
| `/mes`        | Mês: transações e saldo                  |
| `/categorias` | Categorias                               |
| outro         | Página não encontrada, com link de volta |

## Conversa com a API

```
navegador (React) → fetch('/api/v1/...') → Vite :5173 (proxy) → Spring :8080 → PostgreSQL
```

- **Proxy:** no `npm run dev`, o Vite repassa tudo que começa com `/api` para o backend
  (`localhost:8080`). Para o navegador, app e API estão no mesmo endereço, então não há CORS.
  O backend precisa estar rodando com o perfil `dev`.
- **Cliente HTTP** (`src/api/`): as telas usam funções como `listarCategorias()` e
  `criarTransacao(...)` e nunca chamam o `fetch` direto. Erros da API (ProblemDetail) viram um
  `ErroDaApi`, com `detalhe` para mostrar ao usuário e `erroDoCampo('valor')` para os formulários.
- **Tipos:** `src/api/esquema.d.ts` é **gerado** a partir do OpenAPI (`npm run api:tipos`) e vai
  para o Git; não edite à mão. Sempre que a API mudar, gere de novo e confira o que mudou no
  diff. `src/api/tipos.ts` dá nomes curtos a esses tipos (`Categoria`, `Transacao`...).
- **Configuração:** o endereço da API (`VITE_API_URL`) e o alvo do proxy (`API_PROXY_ALVO`) podem
  ser trocados num `.env.local` (modelo em [`.env.example`](.env.example)).
- **Dinheiro e datas:** o app nunca faz conta com dinheiro (o saldo vem pronto da API) e mantém
  as datas como texto `AAAA-MM-DD`, como a API usa.
- **Testes:** o MSW finge ser a API (`src/testes/`), então os testes não precisam do backend.

Decisões no [ADR-0013](../docs/adr/0013-cliente-http-do-front-end.md).

## Estilos

Cada componente tem o seu arquivo `.module.css` (CSS Modules): as classes valem só para ele.
Cores e medidas nunca são escritas direto nos componentes: use as variáveis de
[`src/estilos/tema.css`](src/estilos/tema.css) (`var(--cor-destaque)`, `var(--altura-toque)`...).
Assim, trocar a paleta ou ajustar o tema escuro é mexer em um arquivo só. Decisões no
[ADR-0012](../docs/adr/0012-rotas-estilos-e-icones-do-front-end.md).
