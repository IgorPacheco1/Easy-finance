# ADR-0022: Limite de tentativas de login com contador próprio no banco

- **Status:** Aceita
- **Data:** 2026-11-15

## Contexto

Entrar com e-mail e senha pode ser tentado por qualquer pessoa na internet, quantas vezes quiser.
Sem limite, dá para adivinhar senhas (várias senhas para um e-mail) ou testar senhas comuns em
muitos e-mails (várias contas). Além disso, cada tentativa gasta um BCrypt (custo 12), que é lento
de propósito: muitas tentativas também são uma forma de deixar o servidor sem CPU.

O planejamento do M5 (#121, ADR-0020) já decidiu: **contador próprio, sem biblioteca nova**, e
resposta `429`. Esta ADR fixa os detalhes.

## Decisão

1. **Falhas ficam numa tabela** (`tentativa_login`, migration V6) com tipo (`EMAIL` ou `IP`), chave
   e horário. Estado no banco, e não em memória, para sobreviver a reinício e valer se um dia
   houver mais de um servidor.
2. **Duas chaves por falha:** o e-mail digitado (protege uma conta) e o IP de quem tentou (protege
   contra quem testa vários e-mails). Padrões: **5 falhas por e-mail** e **20 por IP**, em uma
   **janela de 15 minutos**. Ajustáveis em `easyfinance.login.*` (`application.yaml`).
3. **Janela deslizante:** cada falha conta por 15 minutos. Quem atinge o máximo fica bloqueado até a
   falha que o fez estourar sair da janela. Não há "bloqueio de 1 hora" fixo.
4. **Resposta `429`** em `ProblemDetail`, com `Retry-After` em segundos. O limite é conferido
   **antes** de olhar a senha: bloqueado, nem a senha certa entra.
5. **O bloqueio não revela quais contas existem.** E-mail sem conta também acumula falhas e recebe
   o mesmo `429`, com a mesma mensagem.
6. **Só guardamos hash (SHA-256)** do e-mail normalizado e do IP. A tabela não tem e-mails de quem
   nem tem conta, e uma senha colada por engano no campo de e-mail não fica gravada. Sem chave
   estrangeira para `usuario`, justamente para valer para e-mails inexistentes.
7. **Login certo apaga as falhas do e-mail** (não as do IP, que pode ser de outra pessoa). Dados
   inválidos (`400`) não contam como falha.
8. **Limpeza sem agendador:** cada nova falha apaga as linhas mais velhas que a janela. A tabela
   fica pequena e não precisa de job.
9. **Quem orquestra é o `LoginService`**, fora de transação, para a falha ficar gravada mesmo quando
   o login termina em `401`.

## Alternativas consideradas

- **Biblioteca (Bucket4j, Resilience4j):** funciona bem, mas é dependência nova para uma regra
  pequena, e a decisão do planejamento foi não adicionar.
- **Contador em memória (mapa):** simples, mas zera a cada reinício e não vale com mais de um
  servidor.
- **Coluna "tentativas" na tabela `usuario`:** só protege contas que existem (revelaria quais
  existem) e não cobre o limite por IP.
- **Bloqueio fixo e longo (por exemplo, 1 hora):** deixaria qualquer pessoa trancar a conta de
  outra de propósito por mais tempo. A janela deslizante de 15 minutos limita esse estrago.

## Consequências

- Positivas: o ataque de adivinhar senhas fica caro; o custo de CPU do login tem teto por e-mail e
  por IP; nada de dependência nova; o bloqueio não vira pista de quais contas existem.
- Negativas / custos assumidos:
  - **Quem sabe o e-mail de outra pessoa consegue bloqueá-la por 15 minutos** (negação de serviço
    pontual). É o custo de qualquer limite por conta; a janela curta o reduz.
  - **O IP vem de `request.getRemoteAddr()`.** Atrás de um proxy ou balanceador, seria o IP do
    proxy, e todos dividiriam o mesmo limite de 20. Resolver com IP real do proxy confiável fica
    para o M6, com o deploy (previsto no roadmap).
  - **Cadastro e demais endpoints seguem sem limite** (o cadastro também faz BCrypt). Limite geral
    de requisições é do M6.
  - Redes compartilhadas (uma universidade, por exemplo) dividem o limite por IP; por isso ele é
    maior que o do e-mail.
