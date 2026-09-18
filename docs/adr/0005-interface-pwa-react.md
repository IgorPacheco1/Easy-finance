# ADR-0005: Interface como PWA (React + TypeScript) consumindo a API Java

- **Status:** Aceita
- **Data:** 2026-09-18

## Contexto

O objetivo do produto é **registrar as finanças com o mínimo de atrito, no celular e no computador,
com foco maior no celular**, e a aplicação é pensada para ir para produção. O core deve ser em
Java; outras linguagens são aceitas nas demais partes.

Uma API sozinha não substitui a planilha: sem uma interface rápida de usar, o projeto não resolve o
problema que o originou.

## Decisão

- **Backend:** API REST em Java (Spring Boot), monolito organizado em módulos. É o core do projeto.
- **Interface:** **PWA** (Progressive Web App) em **React + TypeScript**, com Vite, na pasta `web/`.
  Instalável na tela inicial do celular e utilizável no navegador do computador.
- **Monorepo:** `backend/`, `web/`, `docs/` e `legacy/` no mesmo repositório.
- **Mesmo domínio:** em produção o proxy entrega o PWA em `/` e a API em `/api`; em desenvolvimento
  o servidor do Vite faz proxy de `/api` para o backend. Isso evita CORS e simplifica a autenticação.
- **Mobile-first:** as telas são desenhadas primeiro para o celular; o desktop é uma adaptação.
- **Uso offline (básico):** planejado para depois do PWA mínimo, com fila de lançamentos e
  identificador de transação gerado no cliente (UUID), para que reenvios não dupliquem dados.
- **Uso de TypeScript** restrito ao front-end. Regras de negócio ficam na API Java.

## Alternativas consideradas

- **App nativo (Flutter, Kotlin, React Native):** experiência mais "de app", mas linguagem nova,
  publicação em loja e uma versão web separada para o computador.
- **Bot de Telegram:** ótimo para lançar rápido, ruim como painel e dependente de terceiro.
  Pode entrar no futuro como canal extra de captura.
- **Thymeleaf + HTMX ou Vaadin (tudo em Java):** evita outra linguagem, mas a experiência mobile e
  offline é mais limitada e tem menos relevância de mercado.

## Consequências

- Positivas: uma base de código para celular e PC, sem loja de apps, atualização imediata,
  separação clara entre API e interface (bom para portfólio).
- Negativas: TypeScript/React entram na curva de aprendizado; no iPhone há limitações de PWA
  (ex.: notificações push só com o app instalado); testar instalação no celular exige HTTPS
  (tratado em issue própria); o CI passa a ter duas pipelines (Java e Node).
