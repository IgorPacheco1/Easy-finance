# ADR-0024: Trocar a senha e excluir a conta

- **Status:** Aceita
- **Data:** 2026-11-15

## Contexto

Com login por sessão (ADR-0020), a pessoa precisa poder trocar a senha e apagar a própria conta
(direito de eliminação da LGPD). As duas ações são sensíveis: uma sessão roubada ou um aparelho
emprestado não deveria bastar para trancar a pessoa fora ou apagar tudo.

## Decisão

1. **Endpoints:** `PUT /api/v1/eu/senha` (`senhaAtual`, `novaSenha`) e `DELETE /api/v1/eu`
   (`senha`), ambos `204`, com login e CSRF como o resto da API.
2. **Confirmação pela senha atual**, mesmo já logado. Quem só tem a sessão não consegue trocar a
   senha nem apagar a conta.
3. **Senha errada é `400` no campo (`senhaAtual` ou `senha`), não `401`.** O app trata `401` como
   "sessão caiu" e mandaria para o login; aqui a sessão está boa, o dado é que está errado.
4. **Mesmo limite de tentativas do login** (ADR-0022): senha errada conta como falha do e-mail e do
   IP, e bloqueado dá `429`. Sem isso, uma sessão roubada serviria para adivinhar a senha.
   Sucesso zera as falhas do e-mail.
5. **Nova senha igual à atual é `400`** (`novaSenha`) e segue as mesmas regras do cadastro
   (mínimo de 8 caracteres, até 72 bytes).
6. **Trocar a senha encerra as outras sessões** da conta e mantém a atual, que ganha novo id
   (`changeSessionId`). Assim, quem tinha a senha antiga ou uma sessão roubada é derrubado. O
   `PRINCIPAL_NAME` da sessão é o id do usuário, o que permite achar todas as sessões da conta.
7. **Excluir apaga tudo:** o usuário some e, por `ON DELETE CASCADE` (V4), as transações, os ids de
   transações excluídas e as categorias dele; as categorias do sistema ficam. Todas as sessões são
   encerradas e o cookie é expirado. As falhas de login do e-mail também são apagadas.
8. **Organização:** `UsuarioService` faz a regra (conferir senha, gravar, apagar); `auth/ContaService`
   orquestra limite e sessões; `SessoesDaConta` fala com o repositório de sessões. A dependência
   vai só de `auth` para `usuario`, sem ciclo.
9. **Fora do escopo:** a tela "Minha conta" no app. Ela vem depois da tela de login (issue de web
   do M5). Esta issue entrega só a API.

## Alternativas consideradas

- **`401` para senha errada:** mais "correto" no HTTP, mas o app derrubaria a pessoa para o login.
- **Sem pedir a senha:** menos atrito, porém uma sessão roubada apagaria a conta.
- **Manter todas as sessões ao trocar a senha:** mais simples, mas não resolve o motivo mais comum
  de trocar a senha (suspeita de acesso indevido).
- **Exclusão lógica (marcar como apagada):** guarda dados que a pessoa pediu para eliminar.

## Consequências

- Positivas: ações destrutivas exigem prova de posse da senha; sessão roubada deixa de servir
  para adivinhar senha ou apagar a conta; a exclusão é completa e imediata.
- Negativas / custos assumidos:
  - A exclusão é **irreversível** e não há backup por conta; o app precisará de um aviso claro
    quando a tela existir.
  - Errar a senha aqui pode bloquear o login por 15 minutos (mesmo contador).
  - Backups do banco, se existirem no futuro, podem reter dados por um tempo: tratar no M6.
