package io.github.igorpacheco1.guarda.config;

import io.github.igorpacheco1.guarda.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Grava a especificação OpenAPI em {@code backend/target/openapi.json}, para o app gerar os tipos
 * dela ({@code npm run api:tipos}) e o CI conferir que eles batem com a API (ADR-0028).
 *
 * <p>Liga o OpenAPI só neste teste, como o {@link DocumentacaoDaApiTests}: fora do perfil
 * {@code dev} ele continua desligado (ADR-0010). As mesmas propriedades fazem o Spring reaproveitar
 * o contexto daquele teste, sem subir outro.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "springdoc.api-docs.enabled=true")
class EspecificacaoDaApiParaOAppTests {

    /** Relativo a {@code backend/}, onde o Maven roda os testes. Lido por {@code web/package.json}. */
    private static final Path ARQUIVO = Path.of("target", "openapi.json");

    @Autowired
    private MockMvc mockMvc;

    @Test
    void gravaAEspecificacaoParaOsTiposDoApp() throws Exception {
        String especificacao = mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);

        Files.createDirectories(ARQUIVO.getParent());
        Files.writeString(ARQUIVO, especificacao, StandardCharsets.UTF_8);

        assertThat(ARQUIVO).content(StandardCharsets.UTF_8)
                .contains("\"openapi\"", "/api/v1/transacoes");
    }
}
