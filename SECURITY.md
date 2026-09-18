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
- Senhas de usuários serão armazenadas somente com hash (BCrypt) — ver milestone M4.
