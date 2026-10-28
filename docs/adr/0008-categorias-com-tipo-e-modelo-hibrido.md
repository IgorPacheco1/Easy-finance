# ADR-0008: Categorias com tipo e modelo híbrido (sistema + personalizadas)

- **Status:** Aceita
- **Data:** 2026-10-26

## Contexto

Toda transação pertence a exatamente uma categoria, para que o usuário sempre saiba onde o dinheiro
entrou ou saiu. Faltava decidir:

1. Como representar se um lançamento é receita ou despesa.
2. Quem define as categorias: o sistema, o usuário ou os dois.

O foco é a usabilidade no celular: lançar em poucos toques, vendo só as opções que fazem sentido.

## Decisão

- **Receita ou despesa é uma coluna de tipo** (`RECEITA`/`DESPESA`), e não o sinal do valor. O
  valor é sempre positivo (`CHECK valor > 0`).
- **O tipo fica na categoria**, e não na transação. "Salário" é sempre receita e "Mercado" é sempre
  despesa. Assim o app mostra só as categorias de despesa ao lançar um gasto, e o tipo da
  transação vem da categoria, guardado em um único lugar.
- **O tipo de uma categoria não muda depois de criada**, para não alterar o saldo histórico.
- **Modelo híbrido:**
  - **Categorias do sistema**, já carregadas na instalação (ver lista em
    [`domain-model.md`](../architecture/domain-model.md#categorias-do-sistema)), baseadas nos
    maiores gastos das famílias brasileiras segundo a POF 2017-2018 do IBGE. Não podem ser
    editadas nem apagadas pelo usuário.
  - **Categorias personalizadas**, criadas pelo usuário para o uso dele (a partir do M5, cada uma
    pertence a um usuário).

## Alternativas consideradas

- **Sinal no valor (negativo = despesa):** soma do saldo mais simples, mas um sinal trocado vira um
  bug silencioso e uma "despesa de -50" não tem significado claro.
- **Tipo na transação e na categoria:** os dois podem discordar. Garantir a consistência exigiria
  uma FK composta, mais complexa. Ver `domain-model.md`.
- **Só categorias globais:** o usuário não poderia criar "Pet" ou "Academia".
- **Só categorias por usuário:** um usuário novo começaria sem categorias e, como a categoria é
  obrigatória, não conseguiria lançar nada até criar as suas.

## Consequências

- Positivas: lançamento mais rápido (lista filtrada pelo tipo), sem inconsistência entre tipo da
  transação e da categoria, e um usuário novo já consegue usar o app no primeiro acesso.
- Negativas / custos assumidos:
  - O saldo exige `JOIN` com `categoria`.
  - No M5, toda consulta de categorias vira "do sistema **ou** do usuário", e uma transação só
    pode usar categoria do sistema ou do próprio usuário (regra a garantir e testar).
  - Mudar a lista de categorias do sistema depois exige uma migration de dados.
