package io.github.igorpacheco1.guarda.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

/**
 * Acesso à tabela {@code tentativa_login} (V6). SQL direto com parâmetros: é uma tabela de
 * contagem, sem entidade nem relacionamento, então o JPA não traria nada aqui.
 */
@Repository
@RequiredArgsConstructor
class TentativasDeLoginRepository {

    /** O que a chave representa; os nomes são os da restrição {@code ck_tentativa_login_tipo}. */
    enum Tipo { EMAIL, IP }

    private final JdbcTemplate jdbc;

    void registrar(Tipo tipo, String chaveHash, Instant quando) {
        jdbc.update("INSERT INTO tentativa_login (tipo, chave_hash, criada_em) VALUES (?, ?, ?)",
                tipo.name(), chaveHash, Timestamp.from(quando));
    }

    /** Horários das falhas desta chave a partir de {@code desde}, da mais antiga para a mais nova. */
    List<Instant> falhasDesde(Tipo tipo, String chaveHash, Instant desde) {
        return jdbc.query("""
                        SELECT criada_em FROM tentativa_login
                        WHERE tipo = ? AND chave_hash = ? AND criada_em > ?
                        ORDER BY criada_em
                        """,
                (rs, linha) -> rs.getTimestamp(1).toInstant(),
                tipo.name(), chaveHash, Timestamp.from(desde));
    }

    /** Depois de um login certo, o histórico de falhas daquele e-mail recomeça do zero. */
    void apagar(Tipo tipo, String chaveHash) {
        jdbc.update("DELETE FROM tentativa_login WHERE tipo = ? AND chave_hash = ?", tipo.name(), chaveHash);
    }

    void apagarAnterioresA(Instant limite) {
        jdbc.update("DELETE FROM tentativa_login WHERE criada_em <= ?", Timestamp.from(limite));
    }
}
