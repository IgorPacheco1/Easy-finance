package io.github.igorpacheco1.easyfinance.categoria;

import io.github.igorpacheco1.easyfinance.categoria.dto.AtualizarCategoriaRequest;
import io.github.igorpacheco1.easyfinance.categoria.dto.CategoriaResponse;
import io.github.igorpacheco1.easyfinance.categoria.dto.CriarCategoriaRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.AdditionalAnswers.returnsFirstArg;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Testes de unidade do {@link CategoriaService}: só as regras de negócio, sem Spring e sem banco.
 * O repository é simulado com Mockito ({@code @Mock}): cada teste diz o que ele responde.
 *
 * <p>Também cobrem o que é difícil de reproduzir de ponta a ponta: duas requisições ao mesmo
 * tempo, em que a verificação do service passa e quem barra é o banco.
 */
@ExtendWith(MockitoExtension.class)
class CategoriaServiceTests {

    @Mock
    private CategoriaRepository repository;

    @InjectMocks
    private CategoriaService service;

    private static final Clock HOJE_09_11_2026 =
            Clock.fixed(Instant.parse("2026-11-09T12:00:00Z"), ZoneOffset.UTC);

    // ---------------------------------------------------------------- listar e buscar

    @Test
    void listarSemTipoTrazTodas() {
        when(repository.findAllByOrderByTipoAscNomeAsc()).thenReturn(List.of(personalizada("Pets")));

        assertThat(service.listar(null, OrdemDasCategorias.ALFABETICA)).extracting(CategoriaResponse::nome).containsExactly("Pets");
        verify(repository, never()).findByTipoOrderByNomeAsc(any());
    }

    @Test
    void listarComTipoUsaOFiltro() {
        when(repository.findByTipoOrderByNomeAsc(TipoCategoria.RECEITA)).thenReturn(List.of());

        assertThat(service.listar(TipoCategoria.RECEITA, OrdemDasCategorias.ALFABETICA)).isEmpty();
        verify(repository, never()).findAllByOrderByTipoAscNomeAsc();
    }

    // ---------------------------------------------------------------- ordem por uso (#97)

    @Test
    void ordemPorUsoContaOsUltimos90DiasPeloRelogio() {
        // Montado à mão (e não com @InjectMocks) para receber um relógio parado em 09/11/2026.
        CategoriaService comRelogio = new CategoriaService(repository, HOJE_09_11_2026);
        when(repository.findAllOrdenadasPorUsoDesde(any())).thenReturn(List.of(personalizada("Pets")));

        assertThat(comRelogio.listar(null, OrdemDasCategorias.USO))
                .extracting(CategoriaResponse::nome).containsExactly("Pets");
        verify(repository).findAllOrdenadasPorUsoDesde(LocalDate.parse("2026-08-11"));
        verify(repository, never()).findAllByOrderByTipoAscNomeAsc();
    }

    @Test
    void ordemPorUsoComTipoFiltraSemMudarAOrdem() {
        CategoriaService comRelogio = new CategoriaService(repository, HOJE_09_11_2026);
        when(repository.findAllOrdenadasPorUsoDesde(any())).thenReturn(List.of(
                personalizada("Uber"),
                new Categoria("Freela", TipoCategoria.RECEITA),
                personalizada("Pets")));

        assertThat(comRelogio.listar(TipoCategoria.DESPESA, OrdemDasCategorias.USO))
                .extracting(CategoriaResponse::nome).containsExactly("Uber", "Pets");
    }

    @Test
    void buscarIdInexistenteLancaNaoEncontrada() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.buscar(id)).isInstanceOf(CategoriaNaoEncontradaException.class);
    }

    // ---------------------------------------------------------------- criar

    @Test
    void criarRemoveOsEspacosDasPontasAntesDeVerificarEGravar() {
        when(repository.existsByNomeIgnoreCase("Pets")).thenReturn(false);
        when(repository.saveAndFlush(any())).then(returnsFirstArg());

        CategoriaResponse criada = service.criar(new CriarCategoriaRequest("  Pets  ", TipoCategoria.DESPESA));

        assertThat(criada.nome()).isEqualTo("Pets");
        assertThat(criada.tipo()).isEqualTo(TipoCategoria.DESPESA);
        assertThat(criada.sistema()).isFalse();
    }

    @Test
    void criarComNomeExistenteNaoGrava() {
        when(repository.existsByNomeIgnoreCase("Pets")).thenReturn(true);

        assertThatThrownBy(() -> service.criar(new CriarCategoriaRequest("Pets", TipoCategoria.DESPESA)))
                .isInstanceOf(NomeDeCategoriaJaExisteException.class);
        verify(repository, never()).saveAndFlush(any());
    }

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
    void criarNaoEscondeViolacaoSemMensagem() {
        when(repository.existsByNomeIgnoreCase("Pets")).thenReturn(false);
        when(repository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException(null));

        assertThatThrownBy(() -> service.criar(new CriarCategoriaRequest("Pets", TipoCategoria.DESPESA)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    // ---------------------------------------------------------------- atualizar

    @Test
    void atualizarCategoriaDoSistemaNaoGrava() {
        UUID id = UUID.randomUUID();
        Categoria mercado = doSistema(); // criada antes: um when() dentro de outro quebra o Mockito
        when(repository.findById(id)).thenReturn(Optional.of(mercado));

        assertThatThrownBy(() -> service.atualizar(id, new AtualizarCategoriaRequest("Supermercado")))
                .isInstanceOf(CategoriaDoSistemaException.class);
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void atualizarIgnoraAPropriaCategoriaNaVerificacaoDoNome() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.of(personalizada("pets")));
        when(repository.existsByNomeIgnoreCaseAndIdNot("Pets", id)).thenReturn(false);
        when(repository.saveAndFlush(any())).then(returnsFirstArg());

        assertThat(service.atualizar(id, new AtualizarCategoriaRequest(" Pets ")).nome()).isEqualTo("Pets");
    }

    @Test
    void atualizarComNomeDeOutraCategoriaNaoGrava() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.of(personalizada("Pets")));
        when(repository.existsByNomeIgnoreCaseAndIdNot("Lazer", id)).thenReturn(true);

        assertThatThrownBy(() -> service.atualizar(id, new AtualizarCategoriaRequest("Lazer")))
                .isInstanceOf(NomeDeCategoriaJaExisteException.class);
        verify(repository, never()).saveAndFlush(any());
    }

    // ---------------------------------------------------------------- excluir

    @Test
    void excluirCategoriaDoSistemaNaoApaga() {
        UUID id = UUID.randomUUID();
        Categoria mercado = doSistema(); // criada antes: um when() dentro de outro quebra o Mockito
        when(repository.findById(id)).thenReturn(Optional.of(mercado));

        assertThatThrownBy(() -> service.excluir(id)).isInstanceOf(CategoriaDoSistemaException.class);
        verify(repository, never()).delete(any());
    }

    @Test
    void excluirCategoriaComTransacoesNaoApaga() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.of(personalizada("Pets")));
        when(repository.possuiTransacoes(id)).thenReturn(true);

        assertThatThrownBy(() -> service.excluir(id)).isInstanceOf(CategoriaComTransacoesException.class);
        verify(repository, never()).delete(any());
    }

    @Test
    void excluirCategoriaSemTransacoesApaga() {
        UUID id = UUID.randomUUID();
        Categoria pets = personalizada("Pets");
        when(repository.findById(id)).thenReturn(Optional.of(pets));
        when(repository.possuiTransacoes(id)).thenReturn(false);

        service.excluir(id);

        verify(repository).delete(pets);
        verify(repository).flush();
    }

    @Test
    void excluirTraduzViolacaoDaChaveEstrangeiraEm409() {
        // A verificação diz "sem transações", mas uma transação foi criada logo antes do DELETE.
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.of(personalizada("Pets")));
        when(repository.possuiTransacoes(id)).thenReturn(false);
        doThrow(new DataIntegrityViolationException(
                "ERROR: update or delete on table \"categoria\" violates foreign key constraint \"fk_transacao_categoria\""))
                .when(repository).flush();

        assertThatThrownBy(() -> service.excluir(id)).isInstanceOf(CategoriaComTransacoesException.class);
    }

    @Test
    void excluirNaoEscondeOutrasViolacoesDoBanco() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.of(personalizada("Pets")));
        when(repository.possuiTransacoes(id)).thenReturn(false);
        doThrow(new DataIntegrityViolationException("ERROR: outra restrição")).when(repository).flush();

        assertThatThrownBy(() -> service.excluir(id)).isInstanceOf(DataIntegrityViolationException.class);
    }

    // ---------------------------------------------------------------- auxiliares

    private static Categoria personalizada(String nome) {
        return new Categoria(nome, TipoCategoria.DESPESA);
    }

    /**
     * A API não cria categoria do sistema (só a migration V2), então não há construtor para isso.
     * Aqui ela é simulada: um mock que responde {@code true} para {@code isSistema()}.
     */
    private static Categoria doSistema() {
        Categoria mercado = mock(Categoria.class);
        when(mercado.isSistema()).thenReturn(true);
        return mercado;
    }
}
