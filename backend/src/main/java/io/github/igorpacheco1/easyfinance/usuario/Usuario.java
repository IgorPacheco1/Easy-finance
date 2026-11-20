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

    /**
     * Nome da pessoa (#193). Pode ser {@code null} nas contas criadas antes da V8, até a pessoa
     * preencher. Nunca vai para o log.
     */
    @Column(length = AvatarDoUsuario.TAMANHO_MAXIMO_DO_NOME)
    private String nome;

    /** Avatar no formato {@code iniciais:<cor>} (ver {@link AvatarDoUsuario}). */
    @Column(nullable = false, length = 40)
    private String avatar;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    public Usuario(String email, String senhaHash, String nome) {
        this.email = normalizarEmail(email);
        this.senhaHash = senhaHash;
        this.nome = nome;
        this.avatar = AvatarDoUsuario.PADRAO;
        this.criadoEm = Instant.now();
        this.atualizadoEm = this.criadoEm;
    }

    /** Conta sem nome, como as criadas antes da V8 (usado nos testes). */
    public Usuario(String email, String senhaHash) {
        this(email, senhaHash, null);
    }

    /**
     * Muda o nome e o avatar (#193). O que vier {@code null} fica como está. O nome já chega
     * validado e sem espaços nas pontas (DTO).
     */
    public void atualizarPerfil(String novoNome, String novoAvatar) {
        if (novoNome != null) {
            this.nome = novoNome;
        }
        if (novoAvatar != null) {
            this.avatar = novoAvatar;
        }
        this.atualizadoEm = Instant.now();
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
