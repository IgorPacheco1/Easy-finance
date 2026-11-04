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

## Estilos

Cada componente tem o seu arquivo `.module.css` (CSS Modules): as classes valem só para ele.
Cores e medidas nunca são escritas direto nos componentes: use as variáveis de
[`src/estilos/tema.css`](src/estilos/tema.css) (`var(--cor-destaque)`, `var(--altura-toque)`...).
Assim, trocar a paleta ou ajustar o tema escuro é mexer em um arquivo só. Decisões no
[ADR-0012](../docs/adr/0012-rotas-estilos-e-icones-do-front-end.md).
