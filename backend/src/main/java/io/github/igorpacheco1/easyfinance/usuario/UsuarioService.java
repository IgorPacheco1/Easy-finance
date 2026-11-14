package io.github.igorpacheco1.easyfinance.usuario;

import io.github.igorpacheco1.easyfinance.usuario.dto.CadastroRequest;
import io.github.igorpacheco1.easyfinance.usuario.dto.UsuarioResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Regras de negócio dos usuários.
 *
 * <ul>
 *   <li>O e-mail é guardado sem espaços nas pontas e em minúsculas: "Ana@x.com" e "ana@x.com" são
 *       a mesma conta.</li>
 *   <li>E-mail repetido: 409.</li>
 *   <li>A senha vira hash (BCrypt) antes de qualquer gravação e nunca é guardada nem registrada
 *       em log (ADR-0020).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UsuarioService {

    /** Nome definido na migration V4. Aparece na mensagem de erro do PostgreSQL. */
    private static final String RESTRICAO_EMAIL_UNICO = "uk_usuario_email";

    private final UsuarioRepository repository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UsuarioResponse cadastrar(CadastroRequest request) {
        String email = Usuario.normalizarEmail(request.email());
        if (repository.existsByEmail(email)) {
            throw new EmailJaCadastradoException();
        }
        Usuario usuario = new Usuario(email, passwordEncoder.encode(request.senha()));
        return UsuarioResponse.de(salvar(usuario));
    }

    /**
     * Salva e já envia ao banco (saveAndFlush). A verificação feita antes cobre o caso comum;
     * a restrição única do banco é a garantia final quando dois cadastros do mesmo e-mail chegam
     * ao mesmo tempo. Nesse caso a resposta continua sendo 409, e não um erro 500.
     */
    private Usuario salvar(Usuario usuario) {
        try {
            return repository.saveAndFlush(usuario);
        } catch (DataIntegrityViolationException e) {
            if (violou(e, RESTRICAO_EMAIL_UNICO)) {
                throw new EmailJaCadastradoException();
            }
            throw e; // outra restrição: não é e-mail repetido, então não escondemos o erro
        }
    }

    /** Confere, pela mensagem do PostgreSQL, qual restrição do banco foi violada. */
    private static boolean violou(DataIntegrityViolationException e, String restricao) {
        String mensagem = e.getMostSpecificCause().getMessage();
        return mensagem != null && mensagem.contains(restricao);
    }
}
