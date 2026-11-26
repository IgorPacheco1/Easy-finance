package io.github.igorpacheco1.guarda.limites;

import java.time.Clock;

/** Limite geral: requisições à API por IP (ADR-0035). Aplicado pelo {@link LimiteDeRequisicoesFilter}. */
public class LimiteDeRequisicoes extends JanelaDeContagem {

    public LimiteDeRequisicoes(LimitesProperties limites, Clock clock) {
        super(limites.maxRequisicoes(), limites.janelaDasRequisicoes(), clock);
    }
}
