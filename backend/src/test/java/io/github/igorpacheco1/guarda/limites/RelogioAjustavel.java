package io.github.igorpacheco1.guarda.limites;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/** Relógio de teste que só anda quando o teste manda ({@link #avancar}). */
class RelogioAjustavel extends Clock {

    private Instant agora;

    RelogioAjustavel(Instant inicio) {
        this.agora = inicio;
    }

    void avancar(Duration tempo) {
        agora = agora.plus(tempo);
    }

    @Override
    public Instant instant() {
        return agora;
    }

    @Override
    public ZoneId getZone() {
        return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zona) {
        return this;
    }
}
