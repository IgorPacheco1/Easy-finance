# Instalar o app no celular e no computador

Este guia mostra como instalar o Easy Finance na tela inicial, como um app comum. Depois de
instalado, ele abre sem a barra do navegador e com o ícone próprio.

> A instalação só funciona com a **versão de build** do app (`npm run build`), não com o
> `npm run dev`. É nela que existe o "motor" que permite instalar (o service worker).

## Antes de começar

- Banco (Docker) e backend (▶ no IntelliJ) ligados, como sempre.
- Para o **celular**: já ter feito uma vez o guia [Abrir o app no celular](celular-com-https.md)
  (certificado no computador e no iPhone). No iPhone, a **confiança do certificado precisa estar
  ligada**: **Ajustes** → **Geral** → **Sobre** → **Ajustes de Confiança de Certificados** →
  chave do **mkcert** ligada.
- Mesmos cuidados do outro guia: **só em casa, só com dados de teste**, porque o app ainda não
  tem login.

---

## No computador (o jeito mais rápido de testar)

**1.** No terminal do IntelliJ, dentro de `web`:

```powershell
npm run build
npm run preview
```

**2.** Abra no Chrome ou no Edge o endereço da linha **Local**: **http://localhost:4173**.

**3.** Na barra de endereço, no canto direito, aparece um ícone de **instalar** (um monitor com
uma seta). Clique nele → **Instalar**. O app abre numa janela própria e ganha atalho no menu
Iniciar.

> Repare que a porta é **4173** (preview), e não 5173 (dev).

## No iPhone

**1.** No terminal, dentro de `web`:

```powershell
npm run build
npm run preview:celular
```

**2.** No iPhone, abra o **Safari** e digite o endereço da linha **Network** do terminal, por
exemplo **https://192.168.1.7:4173** (porta **4173**, a do preview). Confira o cadeado 🔒.

**3.** Toque no botão **Compartilhar** (o quadrado com a seta para cima, na barra de baixo) →
role e toque em **Adicionar à Tela de Início** → confira o nome **Easy Finance** → **Adicionar**.

**4.** Feche o Safari e abra o app pelo ícone novo na tela de início.

## No Android

Passos 1 e 2 iguais aos do iPhone, mas no **Chrome**. Depois: menu **⋮** (canto de cima) →
**Instalar app** (ou **Adicionar à tela inicial**) → **Instalar**.

---

## O que esperar

- **Sem internet** o app abre do mesmo jeito, mas as telas mostram "Não foi possível falar com o
  servidor". Isso é de propósito: **nenhum dado financeiro fica guardado no celular**, só o
  próprio app.
- **Versão nova:** depois de um `npm run build` novo, ao abrir o app aparece o aviso **"Nova
  versão do app disponível"**. Toque em **Atualizar**. Se não tocar, a versão nova entra na
  próxima vez que o app for aberto do zero.
- **Computador desligado** ou `npm run preview` parado: o app abre, mas sem dados (mesma
  mensagem de sem internet).

## Deu errado?

| O que aconteceu | O que fazer |
|---|---|
| Não aparece o ícone de instalar no Chrome do computador | Confira se está na porta **4173** (`npm run preview`), e não na 5173 (`npm run dev`). |
| No iPhone: "Esta conexão não é privada" | A confiança do certificado está desligada. Ligue em **Ajustes de Confiança de Certificados** (ver "Antes de começar"). |
| No iPhone: não existe "Adicionar à Tela de Início" | Role a lista do **Compartilhar** até o fim; se ainda não aparecer, toque em **Editar Ações** e ative. |
| O app instalado abre uma página em branco ou de erro | O `npm run preview:celular` não está rodando, ou o número do computador mudou (refaça os passos 2 e 3 do [guia do celular](celular-com-https.md)). |
| A mudança no código não aparece no app | Rode `npm run build` de novo, reabra o app e toque em **Atualizar** no aviso. |

## Como desinstalar

- **iPhone:** segure o ícone → **Remover App** → **Apagar App**.
- **Android:** segure o ícone → **Desinstalar**.
- **Computador:** no app aberto, menu **⋮** (canto de cima) → **Desinstalar Easy Finance**.

---

## Para entender melhor (opcional)

### Como funciona

- O **manifest** (`manifest.webmanifest`, gerado no build) diz ao navegador o nome, os ícones, as
  cores e que o app abre sem a barra do navegador (`display: standalone`).
- O **service worker** (`sw.js`, também gerado no build) é um script que o navegador roda à parte.
  Ele guarda a "casca" do app (HTML, JS, CSS e ícones) e a entrega mesmo sem internet. Ele **não**
  guarda nada que venha de `/api/`.
- Os dois são gerados pelo `vite-plugin-pwa` (`web/vite.config.ts`). Decisões no
  [ADR-0015](../adr/0015-pwa-instalavel.md).

### Limitações do iPhone (iOS)

- Não existe botão automático de instalar: é sempre pelo **Compartilhar → Adicionar à Tela de
  Início**.
- O iOS ignora os ícones do manifest e usa o `apple-touch-icon` declarado no `index.html`.
- O app instalado tem armazenamento separado do Safari, e o iOS pode apagar esse armazenamento
  se o app ficar semanas sem ser aberto. Para o Easy Finance isso não perde nada: só a casca do
  app fica guardada, e ela é baixada de novo.
- Com o certificado do mkcert, o app instalado também depende da confiança ligada. Quando o app
  for para a internet (M6), com um certificado de verdade, isso deixa de existir.

### Conferir a instalabilidade no computador

No Chrome, com o app aberto em `localhost:4173`: **F12** → aba **Application** → **Manifest**.
A seção **Installability** não deve mostrar erros. Em **Service workers** deve aparecer o `sw.js`
como *activated and is running*.

## Resultado do teste

Teste da #31, em __/__/2026:

| Item | Resultado |
|---|---|
| Computador (Chrome/Edge): instalar e abrir em janela própria | ⬜ |
| iPhone 13 (Safari): Adicionar à Tela de Início, ícone e nome certos | ⬜ |
| iPhone: abre sem a barra do Safari | ⬜ |
| iPhone: abre sem internet, com o aviso de sem conexão | ⬜ |
| Aviso "Nova versão" depois de um build novo | ⬜ |
| Android | Não testado |
