# ADR-0007: Representação de dinheiro (`NUMERIC(19,2)` e `BigDecimal`)

- **Status:** Aceita
- **Data:** 2026-10-26

## Contexto

O protótipo (`legacy/prototype-sqlite`) guardava o valor da transação como `double`. Os tipos
`double` e `float` guardam números em **binário de ponto flutuante**, e muitos valores decimais
simples não têm representação exata em binário, assim como 1/3 não tem em decimal (0,333...):

```java
System.out.println(0.1 + 0.2);        // 0.30000000000000004
System.out.println(0.1 + 0.2 == 0.3); // false
```

Num sistema financeiro isso causa: erro que se acumula ao somar muitos lançamentos, comparações
de saldo que falham e centavos que não batem conforme o arredondamento.

## Decisão

- **Banco:** `NUMERIC(19,2)`. Decimal exato: até 19 dígitos no total, sendo 2 depois da vírgula
  (centavos). O limite fica em torno de 99 quatrilhões, muito acima de qualquer uso real.
- **Java:** `java.math.BigDecimal`, sempre criado a partir de `String` ou de outro `BigDecimal`
  (`new BigDecimal("10.50")`), **nunca** a partir de `double` (`new BigDecimal(0.1)` copia o erro).
- **Comparações** com `compareTo`, não `equals` (`equals` considera a escala: `10.5` ≠ `10.50`).
- **Arredondamento** explícito, quando necessário, com `RoundingMode.HALF_EVEN` (arredondamento
  bancário).
- **JSON da API:** o valor trafega como número decimal (`"valor": 10.50`). A moeda é sempre BRL
  (multi-moeda está fora do escopo, ver ADR-0004).

## Alternativas consideradas

- **`double` / `float`:** imprecisos para dinheiro, como mostrado acima.
- **Inteiro em centavos (`BIGINT`, `long`):** exato e rápido, mas toda leitura e escrita precisa
  converter (`1050` → `R$ 10,50`), e esquecer a conversão em um lugar gera bugs de 100x.
- **Tipo `MONEY` do PostgreSQL:** depende da configuração de localidade do servidor e é
  [desaconselhado](https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_money) pela
  própria comunidade.

## Consequências

- Positivas: valores exatos do banco até a tela; o tipo deixa claro que aquilo é dinheiro.
- Negativas / custos assumidos: `BigDecimal` é mais verboso (`a.add(b)` em vez de `a + b`) e mais
  lento que tipos primitivos, o que não importa nesse volume.
