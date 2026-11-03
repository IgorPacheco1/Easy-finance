# ADR-0010: Documentação da API com OpenAPI (springdoc)

- **Status:** Aceita
- **Data:** 2026-11-03

## Contexto

O PWA (M3) vai consumir a API, e o contrato precisa estar escrito em algum lugar: quais
endpoints existem, que campos cada um aceita, que status e que erros devolve. Documentação
escrita à mão (um Markdown, por exemplo) fica desatualizada logo na primeira mudança.

O padrão de mercado para descrever APIs REST é a especificação **OpenAPI** (JSON ou YAML). A
partir dela é possível ver a API num navegador (Swagger UI), testar chamadas e até gerar código
de cliente para o front-end.

Como o projeto lida com dados financeiros pessoais, expor o mapa da API em produção também é
uma preocupação: quanto menos um atacante souber da estrutura, melhor.

## Decisão

Usar o **springdoc-openapi** (`springdoc-openapi-starter-webmvc-ui`, linha 3.x, a do Spring Boot 4),
que lê os controllers e gera a especificação OpenAPI automaticamente, e traz o Swagger UI.

- A especificação (`/v3/api-docs` e `/v3/api-docs.yaml`) e o Swagger UI (`/swagger-ui.html`)
  ficam **desligados por padrão** e **ligados só no perfil `dev`**.
- As descrições ficam em anotações **direto nos controllers e nos DTOs** (`@Operation`,
  `@ApiResponse`, `@Schema`), ao lado do código que descrevem.
- O formato das respostas de erro (`Problema`, ProblemDetail com a lista `erros`) é aplicado a
  todas as respostas 4xx e 5xx por um `OpenApiCustomizer` (`config/OpenApiConfiguration`), em vez
  de ser repetido em cada anotação.
- A versão fica numa propriedade do `pom.xml`, atualizada pelo Dependabot.

## Alternativas consideradas

- **Documentação escrita à mão (Markdown):** sem dependência nova, mas desatualiza fácil e não
  permite testar a API nem gerar cliente.
- **Escrever o arquivo OpenAPI à mão ("contract-first") e gerar o código a partir dele:** contrato
  muito bem definido, mas exige mais ferramentas e muito mais trabalho para uma API deste tamanho.
- **Anotações em interfaces separadas (`TransacaoApi`) implementadas pelos controllers:**
  controllers mais limpos, mas a documentação fica longe do código e as duas versões podem ficar
  diferentes sem ninguém perceber.
- **Deixar a documentação ligada em produção:** facilita a integração com terceiros, que o projeto
  não tem; o risco de expor a estrutura da API não compensa.

## Consequências

- Positivas: contrato sempre gerado a partir do código real; Swagger UI para ver e testar a API no
  desenvolvimento; base para o PWA (M3) e para gerar cliente TypeScript, se for útil.
- Negativas / custos assumidos:
  - Uma dependência a mais para manter atualizada (o Swagger UI já teve falhas de segurança
    corrigidas em versões novas; o Dependabot avisa).
  - Controllers e DTOs ficam mais longos por causa das anotações.
  - As descrições precisam ser atualizadas junto com o comportamento; o revisor do PR confere.
