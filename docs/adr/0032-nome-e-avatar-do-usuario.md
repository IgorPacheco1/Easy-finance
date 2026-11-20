# ADR-0032: Nome e avatar do usuário

- **Status:** Aceita
- **Data:** 2026-11-20

## Contexto

No redesenho do M6 (#182), a tela Conta deixa de ser uma página de configurações e vira um
perfil: o nome da pessoa e uma imagem que a represente. Até aqui o usuário era só e-mail e senha
(V4). Era preciso decidir o que guardar, como representar a imagem e como tratar as contas que já
existiam.

## Decisão

- **Nome:** guardado em `usuario.nome` (até 60 caracteres, sem espaços nas pontas, nunca só de
  espaços). O cadastro passa a exigir o nome. As contas criadas antes da V8 ficam com `NULL` até a
  pessoa preencher; o app pede o nome a elas (#194).
- **Avatar sem foto:** as iniciais do nome num círculo de cor. Guardado em `usuario.avatar` como
  texto, no formato `iniciais:<cor>`, com uma das 12 cores das categorias (ADR-0031). O padrão é
  `iniciais:cinza`.
- **Formato com prefixo:** `iniciais:` deixa espaço para outros tipos sem mudar a coluna (como
  `mascote:<id>`, quando a ilustração do mascote existir). Hoje a API aceita só `iniciais:`, numa
  lista fechada.
- **API:** o perfil mora em `/api/v1/eu`, junto do resto da conta. `GET /api/v1/eu` passa a
  devolver `nome` e `avatar` (o app já chama esse endpoint ao abrir) e `PATCH /api/v1/eu/perfil`
  muda os dois; o campo que não vier fica como está. A issue sugeria `/api/v1/conta/perfil`; a
  troca foi combinada com o autor e registrada na #193.
- **Privacidade:** o nome nunca vai para o log (o `toString` do pedido de cadastro o esconde).

## Alternativas consideradas

- **Foto enviada pela pessoa:** é o mais comum em apps, mas obriga a guardar arquivos (custo e um
  serviço a mais na hospedagem gratuita do M7), a cuidar de tamanho, formato e conteúdo impróprio e
  traz um dado pessoal sensível (o rosto) para dentro do app, com mais deveres pela LGPD. Para um
  app de finanças pessoais, as iniciais bastam.
- **Gravatar (imagem pelo e-mail):** sem arquivos, mas envia um resumo do e-mail para um serviço
  de fora a cada vez que a tela abre e quebra a CSP estrita (imagens de outro domínio).
- **Nome obrigatório já na migration:** exigiria inventar um nome para as contas existentes (por
  exemplo, o começo do e-mail). Preferimos `NULL` e perguntar à pessoa.

## Consequências

- O cadastro do app precisa mandar o nome (ajustado junto, na #193).
- O app trata `nome` como `string | null`.
- Um avatar novo (como o mascote) entra mudando a lista aceita na API e no app, sem migration.
