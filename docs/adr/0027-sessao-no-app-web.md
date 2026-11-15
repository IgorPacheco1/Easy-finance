# ADR-0027: Sessão no app web (entrar, sair e a fila offline)

- **Status:** Aceita
- **Data:** 2026-11-15

## Contexto

O backend já exige login (ADR-0020), mas o app web não tinha tela de entrar: sem sessão, toda
chamada dava `401`. A #130 leva o login ao app. O desafio é o lançamento offline (ADR-0019): a
fila no IndexedDB guarda lançamentos de uma pessoa, e o aparelho pode passar de uma conta para
outra. Um lançamento nunca pode sair com a sessão de outra conta, e os dados de uma pessoa não
podem ficar no aparelho para a próxima.

## Decisão

1. **Quem está logado vem do servidor.** Ao abrir, o app pergunta `GET /eu`: `200` abre o app,
   `401` leva para `/entrar`. A sessão vive no cookie (o JavaScript não o lê); o app guarda só o
   estado em memória (`SessaoProvider`, `useSessao`).
2. **Rotas:** `/entrar` e `/criar-conta` ficam fora do Layout; todas as outras ficam atrás de
   `RotaProtegida`. Há um destino novo na navegação, "Conta" (`/conta`), com sair, trocar senha e
   excluir conta.
3. **`401` no meio do uso** (a sessão venceu) leva ao login com o aviso "Sua sessão expirou". O
   cliente HTTP chama um gancho (`definirAoPerderASessao`), menos nos pedidos de `/auth/*`, onde
   `401` significa "senha errada".
4. **Token CSRF só em memória**, buscado quando o primeiro `POST`/`PUT`/`DELETE` precisa e
   descartado ao entrar, criar conta, sair ou excluir a conta (o servidor troca o token). Um `403`
   "Sessão desatualizada" busca um token novo e repete o pedido uma única vez.
5. **Sem conexão ao abrir, o app abre como o último usuário que entrou no aparelho** (guardado no
   IndexedDB, store `sessao`), marcado como "não confirmado". Dá para lançar (vai para a fila); trocar
   senha e excluir conta ficam escondidos. Quando a conexão volta (`online`), a sessão é conferida.
   Sem ninguém lembrado, mostra o login.
6. **Todo lançamento da fila tem dono** (`usuarioId`). Antes de enviar, a fila consulta `GET /eu` e
   só envia o que é de quem está logado. `401` deixa o lançamento pendente (não o recusa). Lançamentos
   de antes do M5, sem dono, passam a ser da primeira pessoa que entra.
7. **Os dados do aparelho são apagados** (fila, categorias e quem entrou por último) ao **sair**, ao
   **excluir a conta** e ao **entrar com outra conta**. Neste último caso o app avisa quantos
   lançamentos não enviados foram descartados. Ao sair com lançamentos na fila, a pessoa escolhe entre
   "Cancelar" e "Sair mesmo".
8. **Sair exige conexão:** o servidor precisa encerrar a sessão. Sem conexão, o app explica e não
   apaga nada (apagar sem encerrar deixaria a sessão viva no servidor).
9. **Validação no app só para responder rápido** (campo vazio, senha com menos de 8 caracteres ou
   mais de 72 bytes); a regra valendo é a do servidor, e as mensagens dele aparecem na tela.
10. O banco do aparelho passou para a versão 2 (nova store `sessao`), sem perder a fila existente.

## Alternativas consideradas

- **Guardar o token CSRF no `localStorage`:** deixaria um segredo de sessão ao alcance de qualquer
  script da página; em memória custa um `GET` por abertura.
- **Sem conexão, só mostrar o login:** impediria o caso de uso principal do M4 (lançar offline).
- **Enviar a fila sem conferir o dono:** um lançamento de A podia sair na sessão de B.
- **Manter a fila de outra conta parada:** o aparelho guardaria dados de quem não está mais logado.
  Apagar, com aviso, é o mais simples e o mais seguro.

## Consequências

- Todo teste de tela abre já logado (`renderizarApp`); os testes de entrada passam o estado inicial.
- `esquema.d.ts` ganhou os tipos de usuário, cadastro, entrar, trocar senha, excluir conta e CSRF
  (os DTOs do backend marcam os campos como obrigatórios, #77). Regerar com `npm run api:tipos`.
- Fora do escopo (M6): "esqueci a senha" e confirmar o e-mail. Criptografar os dados no aparelho
  continua fora do M5.
