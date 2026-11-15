package io.github.igorpacheco1.easyfinance.usuario;

import io.github.igorpacheco1.easyfinance.shared.CampoInvalidoException;
import io.github.igorpacheco1.easyfinance.usuario.dto.CadastroRequest;
import io.github.igorpacheco1.easyfinance.usuario.dto.EntrarRequest;
import io.github.igorpacheco1.easyfinance.usuario.dto.UsuarioResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Regras de negócio dos usuários.
 *
 * <ul>
 *   <li>O e-mail é guardado sem espaços nas pontas e em minúsculas: "Ana@x.com" e "ana@x.com" são
 *       a mesma conta.</li>
 *   <li>E-mail repetido: 409.</li>
 *   <li>A senha vira hash (BCrypt) antes de qualquer gravação e nunca é guardada nem registrada
 *       em log (ADR-0020).</li>
 *   <li>Trocar a senha e excluir a conta pedem a senha atual (confirmação); senha errada é 400,
 *       não 401.</li>
 *   <li>Entrar: e-mail inexistente e senha errada dão a mesma resposta (401) e levam o mesmo
 *       tempo, para não revelar quais e-mails têm conta.</li>
 * </ul>
 */
@Service
@Transactional(readOnly = true)
public class UsuarioService {

    /** Nome definido na migration V4. Aparece na mensagem de erro do PostgreSQL. */
    private static final String RESTRICAO_EMAIL_UNICO = "uk_usuario_email";

    private final UsuarioRepository repository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Hash de uma senha aleatória que ninguém conhece. Quando o e-mail não existe, a senha é
     * conferida contra ele só para gastar o mesmo tempo de um BCrypt de verdade: sem isso, a
     * resposta mais rápida entregaria que o e-mail não tem conta.
     */
    private final String hashParaEqualizarTempo;

    public UsuarioService(UsuarioRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.hashParaEqualizarTempo = passwordEncoder.encode(UUID.randomUUID().toString());
    }

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
     * Confere e-mail e senha. Qualquer falha lança {@link CredenciaisInvalidasException}, sem
     * dizer qual das duas coisas estava errada.
     */
    public UsuarioResponse autenticar(EntrarRequest request) {
        Optional<Usuario> usuario = repository.findByEmail(Usuario.normalizarEmail(request.email()));
        String hash = usuario.map(Usuario::getSenhaHash).orElse(hashParaEqualizarTempo);
        boolean senhaConfere = senhaConfere(request.senha(), hash);
        if (usuario.isEmpty() || !senhaConfere) {
            throw new CredenciaisInvalidasException();
        }
        return UsuarioResponse.de(usuario.get());
    }

    /**
     * Troca a senha do usuário logado. A atual é conferida; a nova precisa ser diferente dela.
     *
     * @throws SenhaAtualIncorretaException a atual não confere
     * @throws CampoInvalidoException       a nova é igual à atual
     */
    @Transactional
    public void trocarSenha(UUID id, String senhaAtual, String novaSenha) {
        Usuario usuario = carregar(id);
        if (!senhaConfere(senhaAtual, usuario.getSenhaHash())) {
            throw new SenhaAtualIncorretaException("senhaAtual");
        }
        if (senhaAtual.equals(novaSenha)) {
            throw new CampoInvalidoException("novaSenha", "A nova senha deve ser diferente da atual.");
        }
        usuario.trocarSenhaHash(passwordEncoder.encode(novaSenha));
        repository.saveAndFlush(usuario);
    }

    /**
     * Exclui a conta depois de conferir a senha. As chaves estrangeiras com {@code ON DELETE
     * CASCADE} (V4) apagam junto categorias personalizadas, transações e ids excluídos: o banco
     * garante que nada do usuário sobra, sem uma lista de tabelas no código.
     *
     * @throws SenhaAtualIncorretaException a senha não confere
     */
    @Transactional
    public void excluir(UUID id, String senha) {
        Usuario usuario = carregar(id);
        if (!senhaConfere(senha, usuario.getSenhaHash())) {
            throw new SenhaAtualIncorretaException("senha");
        }
        repository.delete(usuario);
        repository.flush();
    }

    private Usuario carregar(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Usuário não existe mais."));
    }

    /** Dados do usuário já autenticado (para "quem sou eu"). Conta apagada com sessão viva: 401. */
    public UsuarioResponse buscar(UUID id) {
        return UsuarioResponse.de(carregar(id));
    }

    /**
     * Um hash fora do formato esperado (sem o prefixo {@code {bcrypt}}, por exemplo) faz o
     * encoder lançar exceção. Aqui isso vira "não confere", e não um erro 500.
     */
    private boolean senhaConfere(String senha, String hash) {
        try {
            return passwordEncoder.matches(senha, hash);
        } catch (IllegalArgumentException e) {
            return false;
        }
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
