package io.github.igorpacheco1.guarda.usuario;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Testes de unidade da entidade {@link Usuario}: sem Spring e sem banco. */
class UsuarioTests {

    @Test
    void guardaOEmailSemEspacosNasPontasEEmMinusculas() {
        Usuario usuario = new Usuario("  Ana.Silva@Email.COM ", "{bcrypt}hash");

        assertThat(usuario.getEmail()).isEqualTo("ana.silva@email.com");
    }

    @Test
    void emailsQueSoDiferemNasMaiusculasViramOMesmo() {
        assertThat(Usuario.normalizarEmail("ANA@x.com")).isEqualTo(Usuario.normalizarEmail("ana@X.COM"));
    }

    @Test
    void novoUsuarioGuardaOHashEAsDatasIguais() {
        Usuario usuario = new Usuario("ana@email.com", "{bcrypt}hash");

        assertThat(usuario.getSenhaHash()).isEqualTo("{bcrypt}hash");
        assertThat(usuario.getCriadoEm()).isNotNull().isEqualTo(usuario.getAtualizadoEm());
    }

    @Test
    void trocarOHashAtualizaADataDeAlteracaoEMantemADeCriacao() {
        Usuario usuario = new Usuario("ana@email.com", "{bcrypt}antigo");
        var criadoEm = usuario.getCriadoEm();

        usuario.trocarSenhaHash("{bcrypt}novo");

        assertThat(usuario.getSenhaHash()).isEqualTo("{bcrypt}novo");
        assertThat(usuario.getCriadoEm()).isEqualTo(criadoEm);
        assertThat(usuario.getAtualizadoEm()).isAfterOrEqualTo(criadoEm);
    }

    @Test
    void novoUsuarioGuardaONomeEComecaComOAvatarPadrao() {
        Usuario usuario = new Usuario("ana@email.com", "{bcrypt}hash", "Ana");

        assertThat(usuario.getNome()).isEqualTo("Ana");
        assertThat(usuario.getAvatar()).isEqualTo(AvatarDoUsuario.PADRAO);
    }

    @Test
    void atualizarOPerfilMudaSoOQueVeio() {
        Usuario usuario = new Usuario("ana@email.com", "{bcrypt}hash", "Ana");

        usuario.atualizarPerfil(null, "iniciais:verde");
        assertThat(usuario.getNome()).isEqualTo("Ana");
        assertThat(usuario.getAvatar()).isEqualTo("iniciais:verde");

        usuario.atualizarPerfil("Ana Souza", null);
        assertThat(usuario.getNome()).isEqualTo("Ana Souza");
        assertThat(usuario.getAvatar()).isEqualTo("iniciais:verde");
    }
}
