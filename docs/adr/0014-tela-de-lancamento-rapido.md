# ADR-0014: Tela de lançamento rápido

- **Status:** Aceita
- **Data:** 2026-11-04

## Contexto

Registrar um gasto é a ação principal do Easy Finance. A #28 pede: lançamento em no máximo
3 toques depois de digitar o valor, `id` gerado no aparelho (criação idempotente, #19), retorno
claro de sucesso e de erro, validação igual à da API e meta de menos de 10 segundos.

O autor definiu a prioridade do M3: fazer funcionar primeiro, de forma simples; versões mais
sofisticadas (bibliotecas de estado, visual próprio) ficam para quando o app for modernizado.

## Decisão

- **Valor no estilo "caixa registradora":** só números, que entram pela direita (`5290` vira
  52,90), com o teclado numérico. Não é preciso digitar vírgula, e não há como digitar um valor
  inválido. O cursor fica sempre no fim do campo; sem isso, tocar no começo do número fazia o
  dígito entrar no meio (52,90 virava 52.900,00). Limite de 11 dígitos (R$ 999.999.999,99): a
  API aceita mais, mas números maiores perderiam precisão no JavaScript.
- **Categoria em botões ("chips")**, só as do tipo escolhido: um toque. As categorias são
  buscadas uma vez e filtradas na tela. Ordenar pelas mais usadas fica para o M4.
- **Data:** "Hoje" (padrão), "Ontem" e "Outra data" (calendário do celular). "Hoje" vem do
  relógio do aparelho, no fuso local, e não de UTC.
- **Tipo:** Despesa por padrão. Trocar o tipo limpa a categoria escolhida.
- **Conta dos toques:** digitar o valor, tocar na categoria e tocar em "Lançar" (2 toques).
- **Botão "Lançar" fixo acima da navegação** enquanto a tela rola, sempre ao alcance do polegar.
- **Depois do sucesso:** a tela continua no Lançar, limpa valor, categoria e descrição (mantém
  tipo e data, para lançar vários seguidos), volta o cursor para o valor e mostra um aviso no
  topo com **"Desfazer"** por 6 segundos (exclui a transação).
- **Idempotência:** o `id` é gerado quando o formulário fica pronto e só muda depois de um envio
  bem-sucedido; se a rede falhar, tentar de novo envia o mesmo `id`, e a API não duplica. Se a
  API responder `409` (o mesmo `id` já gravado com outros dados), um `id` novo é gerado e a
  pessoa é avisada para conferir a tela do Mês.
- **`id` sem HTTPS:** `crypto.randomUUID()` só existe em HTTPS ou `localhost`; no celular pela
  rede local, o `id` é montado com `crypto.getRandomValues()`.
- **Validação no aparelho** com as mesmas regras e mensagens da API (valor maior que zero,
  categoria obrigatória, data dentro de ±1 ano, descrição até 255 caracteres); erros que a API
  ainda recusar aparecem no campo certo (`erroDoCampo`).
- **Estado com o que o React já tem** (`useState`, `useEffect`), sem biblioteca. Provisório.

## Alternativas consideradas

- **Valor com vírgula digitada:** mais familiar, mas exige achar a vírgula e validar o texto.
- **Categoria numa lista suspensa:** ocupa menos espaço, mas são dois toques.
- **Só o calendário para a data:** mais simples, mas sempre com vários toques.
- **Ir para a tela do Mês depois de lançar, ou aviso sem "Desfazer":** mais lento para lançar
  vários, ou sem jeito rápido de corrigir um toque errado.
- **TanStack Query para os dados da API:** cache e novas tentativas automáticas, mas uma camada
  a mais para aprender agora. Rever quando o app for modernizado.

## Consequências

- Positivas: lançamento em 2 toques depois do valor; sem valores inválidos; reenvio seguro.
- Negativas / custos assumidos:
  - Com muitas categorias, a lista ocupa várias linhas (até o M4 ordenar pelas mais usadas).
  - O estado da tela fica todo no componente; se crescer, pode pedir uma organização melhor.
  - Testes da tela (cliques, aviso, erros) ficam para a #33, com o Testing Library; as regras
    (valor, data, validação, id) já têm testes de unidade.
