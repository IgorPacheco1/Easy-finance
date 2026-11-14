package io.github.igorpacheco1.easyfinance.usuario;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/** Acesso ao banco para usuários. */
public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {

    /** O e-mail precisa já estar normalizado ({@link Usuario#normalizarEmail}). */
    Optional<Usuario> findByEmail(String email);

    boolean existsByEmail(String email);
}
