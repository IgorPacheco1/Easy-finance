# ADR-0035: Limites de requisições e de criação de contas em memória

- **Status:** Aceita
- **Data:** 2026-11-23

## Contexto

Hoje só o login tem limite (5 falhas por e-mail e 20 por IP a cada 15 minutos, ADR-0022). Faltam:
- um **limite geral**, para ninguém (pessoa ou bot) fazer milhares de requisições por minuto, o que
  sobrecarrega o servidor e, na Produção, aumenta a fatura;
- um **limite de criação de contas**, para um bot não criar centenas de contas falsas (limite aceito
  no M5, ADR-0020).

O planejamento do M7 (#246) também decidiu que a Produção roda com **no máximo um servidor** (uma
instância), como proteção de custo.

## Decisão

1. **Contagem em memória, com código nosso**, sem biblioteca nova: uma janela por IP que conta as
   requisições e é descartada quando expira.
2. **Limite geral:** 120 requisições por minuto por IP, em toda a API (`/api/**`). O
   `/actuator/health` fica de fora.
3. **Limite de cadastro:** 3 contas novas por IP a cada hora (`POST /api/v1/auth/cadastro`). Conta a
   tentativa que cria a conta, não as que falham na validação.
4. **Resposta `429 Too Many Requests`** em `ProblemDetail`, com `Retry-After` em segundos e os
   cabeçalhos `no-store`/`nosniff`, no mesmo formato do limite de login. O app já trata esse caso.
5. **Valores ajustáveis** em `guarda.limites.*` (`application.yaml`), sem mexer no código.
6. **IP de quem chamou:** por enquanto, o IP da conexão (`getRemoteAddr()`). A leitura do IP real atrás
   do proxy da hospedagem fica pronta por configuração e só é ligada na Produção (M11), junto com a
   lista de proxies confiáveis.

## Por que memória aqui, se o ADR-0022 escolheu o banco

O limite de login conta só as **falhas** de login, que são raras, e precisa sobreviver a reinícios.
O limite geral conta **toda** requisição: no banco, seria uma escrita a mais em cada chamada, só
para contar. Em memória, o custo é desprezível, e as duas limitações da memória não pesam aqui:
- **zera ao reiniciar:** o pior caso é um bot ganhar uma nova janela depois de um reinício;
- **não vale com mais de um servidor:** a Produção roda com no máximo um.

## Alternativas consideradas

- **Bucket4j (biblioteca):** mais completa, mas é dependência nova para uma regra pequena.
- **Contagem no banco:** sobrevive a reinícios e vale com vários servidores, mas custa uma escrita em
  toda requisição.
- **Só no proxy ou CDN da hospedagem (por exemplo, Cloudflare):** entra também na Produção, como
  primeira barreira, mas o app não deve depender só da infraestrutura.

## Consequências

- Positivas: teto de requisições por IP e de contas novas, sem dependência nova e sem custo no banco.
- Negativas / custos assumidos:
  - A contagem zera quando o servidor reinicia ou dorme.
  - Com mais de um servidor, o limite vira "por servidor"; se a Produção mudar para várias
    instâncias, revisar este ADR (contagem no banco ou num cache compartilhado).
  - Atrás de um proxy, até a configuração do M11, todos os acessos parecem vir do mesmo IP. Por isso
    a leitura do IP real precisa ser ligada junto com a hospedagem.
  - Uma rede compartilhada (escola, empresa) divide os mesmos 120 por minuto; o valor tem folga para
    isso e pode ser ajustado.
