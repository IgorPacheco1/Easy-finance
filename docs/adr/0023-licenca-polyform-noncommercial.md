# ADR-0023: Licença PolyForm Noncommercial 1.0.0 (código visível, uso restrito)

- **Status:** Aceita
- **Data:** 2026-11-15

## Contexto

O repositório nasceu com a licença MIT, que permite a qualquer pessoa usar, copiar, modificar,
distribuir e **vender** o código, inclusive como produto concorrente. O Easy Finance vai para
produção (M5 e M6) e o autor quer manter o código **visível** (portfólio, estudo, transparência),
mas **restringir o uso**, principalmente o comercial.

## Decisão

1. **Trocar a MIT pela [PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0)**
   (SPDX: `PolyForm-Noncommercial-1.0.0`). Ela permite ler, estudar, rodar e modificar para fins
   **não comerciais** (uso pessoal, estudo, pesquisa, organizações sem fins lucrativos e
   instituições de ensino) e **não permite uso comercial** sem permissão do autor.
2. **Usar o texto oficial, sem alterações,** e não um contrato próprio. É um texto padronizado, com
   identificador SPDX, e escrever licença à mão tem risco de lacunas. O aviso
   `Required Notice: Copyright (c) 2026 Igor Pacheco` fica no topo do `LICENSE`, como a própria
   licença prevê.
3. **Não é código aberto no sentido da OSI.** O README diz isso com clareza, e o selo mostra o nome
   da licença, para ninguém achar que é open source.
4. **Declarar a licença nos metadados:** `<licenses>` no `pom.xml` e `license` no
   `web/package.json` (e no `package-lock.json`), com o identificador SPDX.
5. **Histórico:** quem já recebeu o código sob a MIT (as versões publicadas até a v0.4.0 e o
   histórico do Git até este PR) **mantém os direitos da MIT** sobre aquelas versões. A troca vale
   para o que for publicado daqui para frente. Isso não é possível desfazer, e a decisão não tenta.
6. **Uso comercial pelo próprio autor** continua livre: o autor é o titular e não precisa de licença
   sobre o próprio código. Quem quiser usar comercialmente pede permissão.

## Alternativas consideradas

- **Manter a MIT:** a mais simples, mas qualquer um poderia vender o app ou um clone.
- **BSL 1.1 (Business Source License):** restringe o uso em produção por um prazo e depois vira
  código aberto (até 4 anos). Mais complexa e feita para empresas com vários produtos; o autor
  não quer abrir o código no futuro.
- **Todos os direitos reservados:** a mais restritiva e a mais simples, mas não deixa estudar,
  rodar nem modificar para uso pessoal, o que o autor quer permitir.
- **PolyForm Strict:** também restringe cópia e modificação, deixando só o uso não comercial. Mais
  restritiva do que o autor quer para um projeto de portfólio.

## Consequências

- Positivas: o código segue público e estudável; o uso comercial por terceiros depende do autor;
  o texto é padrão e reconhecido (SPDX), sem contrato próprio a manter.
- Negativas / custos assumidos:
  - **Não é open source.** Algumas ferramentas, listas e políticas só aceitam licenças aprovadas
    pela OSI, e contribuições de terceiros podem diminuir.
  - **Contribuições externas** passam a entrar sob esta licença; se um dia o autor quiser relicenciar
    ou vender, precisará de acordo com quem contribuiu. Hoje o projeto tem um único autor.
  - **"Não comercial" tem zonas cinzentas** (um uso numa empresa para fins internos, por exemplo).
    O texto da licença é o que vale, e um caso duvidoso se resolve pedindo permissão.
  - Dependências mantêm as próprias licenças (permissivas); isso não é afetado.
  - **Não é aconselhamento jurídico:** a escolha foi feita por informação pública sobre a licença,
    sem revisão de advogado. Se o projeto virar negócio, vale uma revisão profissional.
