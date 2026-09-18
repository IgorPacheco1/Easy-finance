# ADR-0004: Escopo inicial e o que fica de fora

- **Status:** Aceita
- **Data:** 2026-09-18

## Contexto

O README original prometia microsserviços, AWS, JWT, Docker, escalabilidade e monitoramento, mas o
código consistia em um `main` de console com uma tabela. Prometer tudo ao mesmo tempo foi um dos
fatores para o projeto parar: o escopo era maior que a capacidade de entrega.

## Decisão

O objetivo é uma **versão 1.0.0 usável no dia a dia e em produção**: uma API monolítica com
categorias, transações, saldo, filtros, resumo mensal e autenticação, mais uma interface PWA
mobile-first (ver [ADR-0005](0005-interface-pwa-react.md)).

O trabalho imediato é a **base do projeto: M0 a M3** (repositório organizado, backend, API e um
PWA mínimo funcionando localmente). Autenticação e deploy em produção serão detalhados quando
essa base estiver pronta, mas continuam no roadmap e no critério de "pronto" da v1.0.0.

Ficam **fora do escopo** até a v1.0.0 (e só voltam por meio de um novo ADR):

- Microsserviços
- Provedor de cloud específico (AWS, GCP, Azure), exceto uma hospedagem simples decidida no M6
- Multi-moeda
- Integração bancária (Open Finance)
- Controle de investimentos, metas e orçamentos

O trabalho é dividido em milestones pequenos, cada um entregando algo verificável.

## Alternativas consideradas

- **Manter o escopo do README original:** reproduz o problema que levou ao abandono.
- **Começar pela interface:** sem API e banco bem modelados, a interface teria de ser refeita.

## Consequências

- Positivas: escopo realista, progresso visível a cada milestone, README honesto.
- Negativas: itens atraentes (cloud, microsserviços) ficam para depois. Isso é intencional.
