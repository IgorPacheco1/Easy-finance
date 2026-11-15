# Política de segurança

## Versões com suporte

O projeto está em fase inicial (pré-MVP). Somente a branch `main` e a última release
recebem correções de segurança.

## Como reportar uma vulnerabilidade

**Não abra uma issue pública.** Use o relato privado do GitHub:

1. Acesse a aba **Security** do repositório.
2. Clique em **Report a vulnerability**.
3. Descreva o problema, como reproduzi-lo e o impacto esperado.

Você receberá uma resposta assim que possível. Este é um projeto pessoal, então
não há SLA formal.

## Boas práticas adotadas no projeto

- Nenhum segredo (senhas, tokens, chaves) é versionado. Configuração sensível vem de
  variáveis de ambiente; o repositório contém apenas `.env.example`.
- Secret scanning e push protection habilitados.
- Dependabot e CodeQL habilitados.
- Senhas de usuários são armazenadas somente com hash (BCrypt, custo 12) e nunca são devolvidas
  pela API nem escritas no log.
- Login por sessão no servidor (cookie `HttpOnly`, `Secure` e `SameSite=Strict`) com proteção
  CSRF e limite de tentativas por e-mail e por IP ([ADR-0020](docs/adr/0020-autenticacao-com-sessao.md)
  e [ADR-0022](docs/adr/0022-limite-de-tentativas-de-login.md)).
- Cada pessoa só acessa os próprios dados; o isolamento é provado por testes com duas sessões
  reais.
