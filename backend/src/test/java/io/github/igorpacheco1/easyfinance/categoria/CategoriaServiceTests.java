package io.github.igorpacheco1.easyfinance.categoria;

import io.github.igorpacheco1.easyfinance.categoria.dto.CriarCategoriaRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

/**
 * Testes de unidade do {@link CategoriaService}, com o repository simulado (Mockito).
 *
 * <p>Cobrem o que é difícil de reproduzir num teste de ponta a ponta: duas requisições ao
 * mesmo tempo, em que a verificação do service passa e quem barra é o banco.
 */
@ExtendWith(MockitoExtension.class)
class CategoriaServiceTests {

    @Mock
    private CategoriaRepository repository;

    @InjectMocks
    private CategoriaService service;

    @Test
    void criarTraduzViolacaoDoIndiceUnicoEm409() {
        // A verificação diz "nome livre", mas outra requisição gravou o mesmo nome logo antes do INSERT.
        when(repository.existsByNomeIgnoreCase("Pets")).thenReturn(false);
        when(repository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException(
                "ERROR: duplicate key value violates unique constraint \"uk_categoria_nome\""));

        assertThatThrownBy(() -> service.criar(new CriarCategoriaRequest("Pets", TipoCategoria.DESPESA)))
                .isInstanceOf(NomeDeCategoriaJaExisteException.class);
    }

    @Test
    void criarNaoEscondeOutrasViolacoesDoBanco() {
        when(repository.existsByNomeIgnoreCase("Pets")).thenReturn(false);
        when(repository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException(
                "ERROR: new row violates check constraint \"ck_categoria_nome_nao_vazio\""));

        assertThatThrownBy(() -> service.criar(new CriarCategoriaRequest("Pets", TipoCategoria.DESPESA)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void excluirTraduzViolacaoDaChaveEstrangeiraEm409() {
        // A verificação diz "sem transações", mas uma transação foi criada logo antes do DELETE.
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.of(new Categoria("Pets", TipoCategoria.DESPESA)));
        when(repository.possuiTransacoes(id)).thenReturn(false);
        doThrow(new DataIntegrityViolationException(
                "ERROR: update or delete on table \"categoria\" violates foreign key constraint \"fk_transacao_categoria\""))
                .when(repository).flush();

        assertThatThrownBy(() -> service.excluir(id))
                .isInstanceOf(CategoriaComTransacoesException.class);
    }
}
