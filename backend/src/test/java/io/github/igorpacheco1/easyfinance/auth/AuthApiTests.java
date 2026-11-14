package io.github.igorpacheco1.easyfinance.auth;

import io.github.igorpacheco1.easyfinance.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testa o cadastro de ponta a ponta, com PostgreSQL real (Testcontainers).
 *
 * <p>{@code @Transactional} desfaz o que cada teste gravou. O hash BCrypt com custo 12 leva uma
 * fração de segundo por cadastro: é o comportamento real, então os testes não o enfraquecem.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthApiTests {

    private static final String URL = "/api/v1/auth/cadastro";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void cadastrarRetorna201SemDevolverASenha() throws Exception {
        cadastrar("ana@email.com", "uma senha longa")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.email").value("ana@email.com"))
                .andExpect(jsonPath("$.senha").doesNotExist())
                .andExpect(content().string(not(containsString("bcrypt"))))
                .andExpect(content().string(not(containsString("uma senha longa"))));
    }

    @Test
    void cadastrarGuardaSoOHashBCryptENuncaASenha() throws Exception {
        cadastrar("ana@email.com", "uma senha longa").andExpect(status().isCreated());

        String hash = jdbc.queryForObject(
                "SELECT senha_hash FROM usuario WHERE email = 'ana@email.com'", String.class);

        assertThat(hash).startsWith("{bcrypt}$2a$12$").doesNotContain("uma senha longa");
        assertThat(passwordEncoder.matches("uma senha longa", hash)).isTrue();
        assertThat(passwordEncoder.matches("outra senha longa", hash)).isFalse();
    }

    @Test
    void cadastrarGuardaOEmailEmMinusculasSemEspacosNasPontas() throws Exception {
        cadastrar("  Ana.Silva@Email.COM ", "uma senha longa")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("ana.silva@email.com"));

        Integer contas = jdbc.queryForObject(
                "SELECT count(*) FROM usuario WHERE email = 'ana.silva@email.com'", Integer.class);
        assertThat(contas).isEqualTo(1);
    }

    @Test
    void cadastrarComEmailRepetidoRetorna409MesmoComOutrasMaiusculas() throws Exception {
        cadastrar("ana@email.com", "uma senha longa").andExpect(status().isCreated());

        cadastrar("ANA@Email.com", "outra senha longa")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.title").value("E-mail já cadastrado"));
    }

    @Test
    void cadastrarComDadosInvalidosRetorna400ENaoGravaNada() throws Exception {
        cadastrar("isso-nao-e-email", "curta")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Dados inválidos"))
                .andExpect(jsonPath("$.erros[?(@.campo == 'email')]").exists())
                .andExpect(jsonPath("$.erros[?(@.campo == 'senha')]").exists());

        Integer contas = jdbc.queryForObject(
                "SELECT count(*) FROM usuario WHERE email = 'isso-nao-e-email'", Integer.class);
        assertThat(contas).isZero();
    }

    @Test
    void duasContasPodemTerAMesmaSenhaComHashesDiferentes() throws Exception {
        cadastrar("ana@email.com", "uma senha longa").andExpect(status().isCreated());
        cadastrar("bia@email.com", "uma senha longa").andExpect(status().isCreated());

        Integer hashesDistintos = jdbc.queryForObject(
                "SELECT count(DISTINCT senha_hash) FROM usuario WHERE email IN ('ana@email.com', 'bia@email.com')",
                Integer.class);
        assertThat(hashesDistintos).isEqualTo(2);
    }

    private ResultActions cadastrar(String email, String senha) throws Exception {
        return mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\": \"%s\", \"senha\": \"%s\"}".formatted(email, senha)));
    }
}
