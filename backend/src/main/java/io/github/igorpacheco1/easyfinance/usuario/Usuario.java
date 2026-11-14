package io.github.igorpacheco1.easyfinance.usuario;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

/**
 * Entidade JPA da tabela {@code usuario} (criada na migration V4): quem tem conta no app.
 *
 * <p>Guarda só o <b>hash</b> da senha, nunca a senha (ADR-0020). Quem calcula o hash é o
 * cadastro (issue seguinte); aqui ele chega pronto. Regras do Lombok em entidades: ver ADR-0009
 * (sem {@code @Data}, sem {@code toString}, para o hash nunca aparecer num log por engano).
 */
@Entity
@Table(name = "usuario")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Usuario {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.RANDOM)
    private UUID id;

    /** Sempre em minúsculas e sem espaços nas pontas; o banco confere as minúsculas e a unicidade. */
    @Column(nullable = false, length = 254, updatable = false)
    private String email;

    @Column(name = "senha_hash", nullable = false)
    private String senhaHash;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    public Usuario(String email, String senhaHash) {
        this.email = normalizarEmail(email);
        this.senhaHash = senhaHash;
        this.criadoEm = Instant.now();
        this.atualizadoEm = this.criadoEm;
    }

    /** Troca o hash da senha (usado em "trocar a senha"). */
    public void trocarSenhaHash(String novoSenhaHash) {
        this.senhaHash = novoSenhaHash;
        this.atualizadoEm = Instant.now();
    }

    /**
     * Forma única de escrever um e-mail: sem espaços nas pontas e em minúsculas. Assim
     * "Ana@Email.com " e "ana@email.com" são a mesma conta. {@code Locale.ROOT} para o resultado
     * não depender do idioma do computador (o clássico problema do "I" turco).
     */
    public static String normalizarEmail(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }
}
