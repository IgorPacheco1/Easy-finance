# ADR-0009: Uso do Lombok com regras para entidades JPA

- **Status:** Aceita
- **Data:** 2026-10-26

## Contexto

Classes Java têm muito código repetitivo: getters, setters, construtores e campos injetados por
construtor. O [Lombok](https://projectlombok.org/) gera esse código em tempo de compilação a partir
de anotações.

Ele é muito usado em projetos Spring no mercado, mas tem dois riscos conhecidos:

- **Esconde código.** O que a anotação gera não aparece no arquivo. Para quem está aprendendo,
  isso pode esconder o que de fato acontece.
- **Algumas anotações quebram entidades JPA.** `@Data`, `@EqualsAndHashCode` e `@ToString` geram
  métodos que leem todos os campos, inclusive relacionamentos *lazy*. O resultado são consultas
  extras inesperadas, `LazyInitializationException`, recursão infinita entre entidades que se
  referenciam e `equals`/`hashCode` que mudam depois de salvar (o que quebra `Set` e `Map`).

## Decisão

Usar o Lombok, com estas regras:

| Onde | Pode usar | Não pode usar |
|---|---|---|
| Entidades JPA | `@Getter`, `@Setter` (só nos campos que podem mudar), `@NoArgsConstructor(access = AccessLevel.PROTECTED)` | `@Data`, `@EqualsAndHashCode`, `@ToString`, `@AllArgsConstructor`, `@Builder` |
| Services, controllers e componentes | `@RequiredArgsConstructor` (injeção por construtor com campos `final`), `@Slf4j` | injeção por campo (`@Autowired` em atributo) |
| DTOs (entrada e saída da API) | nada: usar `record` do Java | Lombok |

Se uma entidade precisar de `equals`/`hashCode`, eles são escritos à mão, comparando só o `id`.

As regras mais perigosas são garantidas pelo compilador, no
[`backend/lombok.config`](../../backend/lombok.config): usar `@Data`, `@EqualsAndHashCode` ou
`@ToString` gera **erro de compilação**. Ele também marca o código gerado com `@Generated`, para
o JaCoCo não contar getters e setters na cobertura de testes.

## Alternativas consideradas

- **Sem Lombok:** tudo explícito e nada escondido, mas com mais código repetitivo. O IntelliJ gera
  o código (Alt+Insert), mas ele precisa ser mantido à mão.
- **Lombok sem regras:** mais rápido no começo, mas leva aos bugs de JPA descritos acima.
- **Só `record`:** ótimo para DTOs, mas entidades JPA não podem ser `record` (o Hibernate precisa de
  classes mutáveis com construtor sem argumentos).

## Consequências

- Positivas: menos código repetitivo, injeção por construtor padronizada e uma ferramenta comum
  no mercado. As armadilhas com JPA são bloqueadas pelo compilador.
- Negativas / custos assumidos:
  - O IntelliJ precisa do plugin do Lombok (vem instalado) e do *annotation processing* habilitado.
  - O código gerado não aparece no arquivo: para ver o que uma anotação faz, use o *Delombok* do
    IntelliJ (Refactor → Delombok).
  - É uma dependência a mais para manter atualizada (o Dependabot cuida disso a partir da #15).
