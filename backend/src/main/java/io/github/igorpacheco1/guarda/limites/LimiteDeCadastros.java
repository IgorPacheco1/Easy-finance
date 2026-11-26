package io.github.igorpacheco1.guarda.limites;

import java.time.Clock;

/** Limite de contas novas por IP (ADR-0035). Aplicado pelo {@code CadastroService}. */
public class LimiteDeCadastros extends JanelaDeContagem {

    public LimiteDeCadastros(LimitesProperties limites, Clock clock) {
        super(limites.maxCadastros(), limites.janelaDosCadastros(), clock);
    }
}
