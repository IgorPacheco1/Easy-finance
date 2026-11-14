package io.github.igorpacheco1.easyfinance.usuario;

import io.github.igorpacheco1.easyfinance.usuario.dto.CadastroRequest;
import io.github.igorpacheco1.easyfinance.usuario.dto.UsuarioResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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

        UsuarioResponse resposta = service.cadastrar(new CadastroRequest("  Ana@Email.COM ", "uma senha longa"));

        ArgumentCaptor<Usuario> gravado = ArgumentCaptor.forClass(Usuario.class);
        verify(repository).saveAndFlush(gravado.capture());
        assertThat(gravado.getValue().getEmail()).isEqualTo("ana@email.com");
        assertThat(gravado.getValue().getSenhaHash()).isEqualTo("{bcrypt}hash");
        assertThat(resposta.email()).isEqualTo("ana@email.com");
        assertThat(resposta.id()).isNotNull();
    }

    @Test
    void cadastrarComEmailExistenteNaoGravaNemCalculaOHash() {
        when(repository.existsByEmail("ana@email.com")).thenReturn(true);

        assertThatThrownBy(() -> service.cadastrar(new CadastroRequest("ANA@email.com", "uma senha longa")))
                .isInstanceOf(EmailJaCadastradoException.class);

        verify(repository, never()).saveAndFlush(any());
        // O BCrypt é lento de propósito: não vale gastá-lo num cadastro que já vai ser recusado.
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    void cadastrarTraduzViolacaoDaRestricaoDeEmailEm409() {
        // A verificação diz "e-mail livre", mas outro cadastro gravou o mesmo e-mail logo antes do INSERT.
        when(repository.existsByEmail("ana@email.com")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("{bcrypt}hash");
        when(repository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException(
                "ERROR: duplicate key value violates unique constraint \"uk_usuario_email\""));

        assertThatThrownBy(() -> service.cadastrar(new CadastroRequest("ana@email.com", "uma senha longa")))
                .isInstanceOf(EmailJaCadastradoException.class);
    }

    @Test
    void cadastrarNaoEscondeOutrasViolacoesDoBanco() {
        when(repository.existsByEmail("ana@email.com")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("{bcrypt}hash");
        when(repository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException(
                "ERROR: new row violates check constraint \"ck_usuario_email_nao_vazio\""));

        assertThatThrownBy(() -> service.cadastrar(new CadastroRequest("ana@email.com", "uma senha longa")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void cadastrarNaoEscondeViolacaoSemMensagem() {
        when(repository.existsByEmail("ana@email.com")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("{bcrypt}hash");
        when(repository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException(null));

        assertThatThrownBy(() -> service.cadastrar(new CadastroRequest("ana@email.com", "uma senha longa")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
