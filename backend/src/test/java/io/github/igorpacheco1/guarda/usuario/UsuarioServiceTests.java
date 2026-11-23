package io.github.igorpacheco1.guarda.usuario;

import io.github.igorpacheco1.guarda.shared.CampoInvalidoException;
import io.github.igorpacheco1.guarda.usuario.dto.CadastroRequest;
import io.github.igorpacheco1.guarda.usuario.dto.EntrarRequest;
import io.github.igorpacheco1.guarda.usuario.dto.PerfilRequest;
import io.github.igorpacheco1.guarda.usuario.dto.UsuarioResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Testes de unidade do {@link UsuarioService}: só as regras de negócio, sem Spring e sem banco.
 * Cobrem também o que é difícil de reproduzir de ponta a ponta: dois cadastros do mesmo e-mail
 * ao mesmo tempo, em que a verificação do service passa e quem barra é o banco.
 */
@ExtendWith(MockitoExtension.class)
class UsuarioServiceTests {

    @Mock
    private UsuarioRepository repository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UsuarioService service;

    @Test
    void cadastrarGuardaOEmailNormalizadoEOHashDaSenha() {
        when(repository.existsByEmail("ana@email.com")).thenReturn(false);
        when(passwordEncoder.encode("uma senha longa")).thenReturn("{bcrypt}hash");
        when(repository.saveAndFlush(any())).then(invocacao -> {
            Usuario usuario = invocacao.getArgument(0);
            ReflectionTestUtils.setField(usuario, "id", UUID.randomUUID());
            return usuario;
        });

        UsuarioResponse resposta = service.cadastrar(new CadastroRequest("  Ana@Email.COM ", "uma senha longa", "Ana"));

        ArgumentCaptor<Usuario> gravado = ArgumentCaptor.forClass(Usuario.class);
        verify(repository).saveAndFlush(gravado.capture());
        assertThat(gravado.getValue().getEmail()).isEqualTo("ana@email.com");
        assertThat(gravado.getValue().getSenhaHash()).isEqualTo("{bcrypt}hash");
        assertThat(gravado.getValue().getNome()).isEqualTo("Ana");
        assertThat(resposta.email()).isEqualTo("ana@email.com");
        assertThat(resposta.nome()).isEqualTo("Ana");
        assertThat(resposta.avatar()).isEqualTo(AvatarDoUsuario.PADRAO);
        assertThat(resposta.id()).isNotNull();
    }

    @Test
    void cadastrarComEmailExistenteNaoGravaNemCalculaOHash() {
        when(repository.existsByEmail("ana@email.com")).thenReturn(true);

        assertThatThrownBy(() -> service.cadastrar(new CadastroRequest("ANA@email.com", "uma senha longa", "Ana")))
                .isInstanceOf(EmailJaCadastradoException.class);

        verify(repository, never()).saveAndFlush(any());
        // O BCrypt é lento de propósito: não vale gastá-lo num cadastro que já vai ser recusado.
        // (O encode do construtor, para equalizar o tempo do login, usa outra senha.)
        verify(passwordEncoder, never()).encode("uma senha longa");
    }

    @Test
    void cadastrarTraduzViolacaoDaRestricaoDeEmailEm409() {
        // A verificação diz "e-mail livre", mas outro cadastro gravou o mesmo e-mail logo antes do INSERT.
        when(repository.existsByEmail("ana@email.com")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("{bcrypt}hash");
        when(repository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException(
                "ERROR: duplicate key value violates unique constraint \"uk_usuario_email\""));

        assertThatThrownBy(() -> service.cadastrar(new CadastroRequest("ana@email.com", "uma senha longa", "Ana")))
                .isInstanceOf(EmailJaCadastradoException.class);
    }

    @Test
    void cadastrarNaoEscondeOutrasViolacoesDoBanco() {
        when(repository.existsByEmail("ana@email.com")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("{bcrypt}hash");
        when(repository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException(
                "ERROR: new row violates check constraint \"ck_usuario_email_nao_vazio\""));

        assertThatThrownBy(() -> service.cadastrar(new CadastroRequest("ana@email.com", "uma senha longa", "Ana")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void cadastrarNaoEscondeViolacaoSemMensagem() {
        when(repository.existsByEmail("ana@email.com")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("{bcrypt}hash");
        when(repository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException(null));

        assertThatThrownBy(() -> service.cadastrar(new CadastroRequest("ana@email.com", "uma senha longa", "Ana")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    // ------------------------------------------------------------------ entrar e buscar

    @Test
    void autenticarComSenhaCertaDevolveOUsuario() {
        Usuario usuario = usuarioComId("{bcrypt}hash");
        when(repository.findByEmail("ana@email.com")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("uma senha longa", "{bcrypt}hash")).thenReturn(true);

        UsuarioResponse resposta = service.autenticar(new EntrarRequest("  Ana@Email.com ", "uma senha longa"));

        assertThat(resposta.id()).isEqualTo(usuario.getId());
        assertThat(resposta.email()).isEqualTo("ana@email.com");
    }

    @Test
    void autenticarComSenhaErradaLancaCredenciaisInvalidas() {
        when(repository.findByEmail("ana@email.com")).thenReturn(Optional.of(usuarioComId("{bcrypt}hash")));
        when(passwordEncoder.matches("senha errada", "{bcrypt}hash")).thenReturn(false);

        assertThatThrownBy(() -> service.autenticar(new EntrarRequest("ana@email.com", "senha errada")))
                .isInstanceOf(CredenciaisInvalidasException.class);
    }

    @Test
    void autenticarComEmailInexistenteTambemConfereASenhaParaGastarOMesmoTempo() {
        when(repository.findByEmail("ninguem@email.com")).thenReturn(Optional.empty());
        when(passwordEncoder.matches(eq("qualquer senha"), any())).thenReturn(false);

        assertThatThrownBy(() -> service.autenticar(new EntrarRequest("ninguem@email.com", "qualquer senha")))
                .isInstanceOf(CredenciaisInvalidasException.class);

        // Sem esta chamada, o e-mail inexistente responderia bem mais rápido que a senha errada.
        verify(passwordEncoder).matches(eq("qualquer senha"), any());
    }

    @Test
    void autenticarComHashForaDoFormatoLancaCredenciaisInvalidasEmVezDeErroInterno() {
        when(repository.findByEmail("ana@email.com")).thenReturn(Optional.of(usuarioComId("!sem-login")));
        when(passwordEncoder.matches("uma senha longa", "!sem-login"))
                .thenThrow(new IllegalArgumentException("There is no PasswordEncoder mapped"));

        assertThatThrownBy(() -> service.autenticar(new EntrarRequest("ana@email.com", "uma senha longa")))
                .isInstanceOf(CredenciaisInvalidasException.class);
    }

    @Test
    void buscarDevolveOUsuarioPeloId() {
        Usuario usuario = usuarioComId("{bcrypt}hash");
        when(repository.findById(usuario.getId())).thenReturn(Optional.of(usuario));

        assertThat(service.buscar(usuario.getId()).email()).isEqualTo("ana@email.com");
    }

    @Test
    void buscarUsuarioQueNaoExisteMaisLancaNaoAutenticado() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.buscar(id))
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class);
    }

    // ------------------------------------------------------------------ trocar a senha e excluir

    @Test
    void trocarSenhaGravaOHashDaNovaSenha() {
        Usuario usuario = usuarioComId("{bcrypt}hashAntigo");
        when(repository.findById(usuario.getId())).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("senha atual", "{bcrypt}hashAntigo")).thenReturn(true);
        when(passwordEncoder.encode("senha nova longa")).thenReturn("{bcrypt}hashNovo");

        service.trocarSenha(usuario.getId(), "senha atual", "senha nova longa");

        assertThat(usuario.getSenhaHash()).isEqualTo("{bcrypt}hashNovo");
        verify(repository).saveAndFlush(usuario);
    }

    @Test
    void trocarSenhaComSenhaAtualErradaNaoGravaNada() {
        Usuario usuario = usuarioComId("{bcrypt}hashAntigo");
        when(repository.findById(usuario.getId())).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("senha errada", "{bcrypt}hashAntigo")).thenReturn(false);

        assertThatThrownBy(() -> service.trocarSenha(usuario.getId(), "senha errada", "senha nova longa"))
                .isInstanceOf(SenhaAtualIncorretaException.class);

        assertThat(usuario.getSenhaHash()).isEqualTo("{bcrypt}hashAntigo");
        verify(repository, never()).saveAndFlush(any());
        verify(passwordEncoder, never()).encode("senha nova longa");
    }

    @Test
    void trocarSenhaParaAMesmaSenhaLancaCampoInvalido() {
        Usuario usuario = usuarioComId("{bcrypt}hashAntigo");
        when(repository.findById(usuario.getId())).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("senha atual", "{bcrypt}hashAntigo")).thenReturn(true);

        assertThatThrownBy(() -> service.trocarSenha(usuario.getId(), "senha atual", "senha atual"))
                .isInstanceOf(CampoInvalidoException.class)
                .isNotInstanceOf(SenhaAtualIncorretaException.class);

        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void trocarSenhaDeUsuarioQueNaoExisteMaisLancaNaoAutenticado() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.trocarSenha(id, "senha atual", "senha nova longa"))
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class);
    }

    @Test
    void excluirApagaOUsuarioDepoisDeConferirASenha() {
        Usuario usuario = usuarioComId("{bcrypt}hash");
        when(repository.findById(usuario.getId())).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("senha atual", "{bcrypt}hash")).thenReturn(true);

        service.excluir(usuario.getId(), "senha atual");

        verify(repository).delete(usuario);
        verify(repository).flush();
    }

    @Test
    void excluirComSenhaErradaNaoApagaNada() {
        Usuario usuario = usuarioComId("{bcrypt}hash");
        when(repository.findById(usuario.getId())).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("senha errada", "{bcrypt}hash")).thenReturn(false);

        assertThatThrownBy(() -> service.excluir(usuario.getId(), "senha errada"))
                .isInstanceOf(SenhaAtualIncorretaException.class);

        verify(repository, never()).delete(any());
    }

    @Test
    void atualizarPerfilGravaEDevolveONomeEOAvatarNovos() {
        Usuario usuario = usuarioComId("{bcrypt}hash");
        when(repository.findById(usuario.getId())).thenReturn(Optional.of(usuario));
        when(repository.saveAndFlush(usuario)).thenReturn(usuario);

        UsuarioResponse resposta = service.atualizarPerfil(usuario.getId(),
                new PerfilRequest("Ana Souza", "iniciais:verde"));

        assertThat(resposta.nome()).isEqualTo("Ana Souza");
        assertThat(resposta.avatar()).isEqualTo("iniciais:verde");
        verify(repository).saveAndFlush(usuario);
    }

    private static Usuario usuarioComId(String hash) {
        Usuario usuario = new Usuario("ana@email.com", hash);
        ReflectionTestUtils.setField(usuario, "id", UUID.randomUUID());
        return usuario;
    }
}
