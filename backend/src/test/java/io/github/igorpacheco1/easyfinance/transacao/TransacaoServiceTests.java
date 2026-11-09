package io.github.igorpacheco1.easyfinance.transacao;

import io.github.igorpacheco1.easyfinance.categoria.Categoria;
import io.github.igorpacheco1.easyfinance.categoria.CategoriaRepository;
import io.github.igorpacheco1.easyfinance.categoria.TipoCategoria;
import io.github.igorpacheco1.easyfinance.shared.CampoInvalidoException;
import io.github.igorpacheco1.easyfinance.shared.ErroDeCampo;
import io.github.igorpacheco1.easyfinance.shared.PaginaResponse;
import io.github.igorpacheco1.easyfinance.transacao.dto.CriarTransacaoRequest;
import io.github.igorpacheco1.easyfinance.transacao.dto.SaldoResponse;
import io.github.igorpacheco1.easyfinance.transacao.dto.TransacaoRequest;
import io.github.igorpacheco1.easyfinance.transacao.dto.TransacaoResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Testes de unidade do {@link TransacaoService}: as regras de negócio isoladas, sem Spring e
 * sem banco. Os repositories são simulados (Mockito) e o relógio fica parado em 03/11/2026.
 */
@ExtendWith(MockitoExtension.class)
class TransacaoServiceTests {

    private static final Clock HOJE_03_11_2026 =
            Clock.fixed(Instant.parse("2026-11-03T12:00:00Z"), ZoneOffset.UTC);

    @Mock
    private TransacaoRepository repository;

    @Mock
    private CategoriaRepository categoriaRepository;

    private TransacaoService service;

    private Categoria mercado;
    private Categoria salario;

    @BeforeEach
    void preparar() {
        // Montado à mão (e não com @InjectMocks) porque o Clock não é um mock, é um relógio fixo.
        service = new TransacaoService(repository, categoriaRepository, HOJE_03_11_2026);
        mercado = categoria("Mercado", TipoCategoria.DESPESA);
        salario = categoria("Salário", TipoCategoria.RECEITA);
    }

    // ---------------------------------------------------------------- criar: regra da data

    @Test
    void criarAceitaOsLimitesExatosDeUmAno() {
        prepararCriacaoBemSucedida();

        service.criar(novo("10.00", "2025-11-03", null));
        service.criar(novo("10.00", "2027-11-03", null));

        verify(repository, times(2))
                .inserirSeNaoExistir(any(), any(), any(), any(), any(), any());
    }

    @Test
    void criarComDataForaDoLimiteNaoConsultaNadaNemGrava() {
        assertThatThrownBy(() -> service.criar(novo("10.00", "2025-11-02", null)))
                .isInstanceOfSatisfying(CampoInvalidoException.class, erro -> assertThat(errosDe(erro))
                        .containsExactly(new ErroDeCampo("data", "A data deve estar entre 03/11/2025 e 03/11/2027.")));

        verifyNoInteractions(repository, categoriaRepository);
    }

    // ---------------------------------------------------------------- criar: categoria e descrição

    @Test
    void criarComCategoriaInexistenteNaoGrava() {
        when(categoriaRepository.findById(mercado.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.criar(novo("10.00", "2026-11-03", null)))
                .isInstanceOfSatisfying(CampoInvalidoException.class, erro -> assertThat(errosDe(erro))
                        .containsExactly(new ErroDeCampo("categoriaId", "Categoria não encontrada.")));

        verifyNoInteractions(repository);
    }

    @Test
    void criarRemoveOsEspacosDaDescricao() {
        prepararCriacaoBemSucedida();

        service.criar(novo("10.00", "2026-11-03", "  Feira  "));

        verify(repository).inserirSeNaoExistir(any(), any(), any(), any(), eq("Feira"), any());
    }

    @Test
    void criarComDescricaoEmBrancoGravaSemDescricao() {
        prepararCriacaoBemSucedida();

        service.criar(novo("10.00", "2026-11-03", "   "));

        verify(repository).inserirSeNaoExistir(any(), any(), any(), any(), isNull(), any());
    }

    // ---------------------------------------------------------------- criar: idempotência (#19)

    @Test
    void criarSemIdGeraUmIdNovo() {
        prepararCriacaoBemSucedida();

        ResultadoDaCriacao resultado = service.criar(novo("10.00", "2026-11-03", null));

        ArgumentCaptor<UUID> id = ArgumentCaptor.forClass(UUID.class);
        verify(repository).inserirSeNaoExistir(id.capture(), any(), any(), any(), any(), any());
        assertThat(id.getValue()).isNotNull();
        assertThat(resultado.criada()).isTrue();
    }

    @Test
    void criarComIdDoClienteUsaEsseId() {
        UUID id = UUID.randomUUID();
        prepararCriacaoBemSucedida();

        service.criar(novoComId(id, mercado, "10.00", "2026-11-03", null));

        verify(repository).inserirSeNaoExistir(eq(id), any(), any(), any(), any(), any());
    }

    @Test
    void reenvioIdenticoNaoContaComoCriacao() {
        UUID id = UUID.randomUUID();
        prepararReenvio(id, transacao(mercado, "52.90", "2026-11-03", "Feira"));

        // 52.9 = 52.90 (compareTo) e " Feira " vira "Feira".
        ResultadoDaCriacao resultado = service.criar(novoComId(id, mercado, "52.9", "2026-11-03", " Feira "));

        assertThat(resultado.criada()).isFalse();
        assertThat(resultado.transacao().descricao()).isEqualTo("Feira");
    }

    @Test
    void reenvioComOutraCategoriaEhConflito() {
        UUID id = UUID.randomUUID();
        prepararReenvio(id, transacao(mercado, "52.90", "2026-11-03", "Feira"), salario);

        assertThatThrownBy(() -> service.criar(novoComId(id, salario, "52.90", "2026-11-03", "Feira")))
                .isInstanceOf(TransacaoConflitanteException.class);
    }

    @Test
    void reenvioComOutroValorEhConflito() {
        UUID id = UUID.randomUUID();
        prepararReenvio(id, transacao(mercado, "52.90", "2026-11-03", "Feira"));

        assertThatThrownBy(() -> service.criar(novoComId(id, mercado, "60.00", "2026-11-03", "Feira")))
                .isInstanceOf(TransacaoConflitanteException.class);
    }

    @Test
    void reenvioComOutraDataEhConflito() {
        UUID id = UUID.randomUUID();
        prepararReenvio(id, transacao(mercado, "52.90", "2026-11-03", "Feira"));

        assertThatThrownBy(() -> service.criar(novoComId(id, mercado, "52.90", "2026-11-02", "Feira")))
                .isInstanceOf(TransacaoConflitanteException.class);
    }

    @Test
    void reenvioComOutraDescricaoEhConflito() {
        UUID id = UUID.randomUUID();
        prepararReenvio(id, transacao(mercado, "52.90", "2026-11-03", "Feira"));

        assertThatThrownBy(() -> service.criar(novoComId(id, mercado, "52.90", "2026-11-03", "Mercado")))
                .isInstanceOf(TransacaoConflitanteException.class);
    }

    // ---------------------------------------------------------------- atualizar

    @Test
    void atualizarLancamentoAntigoSemMudarADataNaoConfereAData() {
        UUID id = UUID.randomUUID();
        Transacao antiga = transacao(mercado, "10.00", "2020-01-15", null);
        when(repository.findById(id)).thenReturn(Optional.of(antiga));
        when(categoriaRepository.findById(mercado.getId())).thenReturn(Optional.of(mercado));

        service.atualizar(id, edicao(mercado, "10.00", "2020-01-15", "descrição corrigida"));

        assertThat(antiga.getDescricao()).isEqualTo("descrição corrigida");
    }

    @Test
    void atualizarMudandoParaDataForaDoLimiteNaoAltera() {
        UUID id = UUID.randomUUID();
        Transacao antiga = transacao(mercado, "10.00", "2020-01-15", null);
        when(repository.findById(id)).thenReturn(Optional.of(antiga));

        assertThatThrownBy(() -> service.atualizar(id, edicao(mercado, "10.00", "2020-02-15", null)))
                .isInstanceOf(CampoInvalidoException.class);
        assertThat(antiga.getData()).isEqualTo(LocalDate.parse("2020-01-15"));
    }

    @Test
    void atualizarPodeTrocarParaCategoriaDeOutroTipo() {
        UUID id = UUID.randomUUID();
        Transacao transacao = transacao(mercado, "3000.00", "2026-11-05", null);
        when(repository.findById(id)).thenReturn(Optional.of(transacao));
        when(categoriaRepository.findById(salario.getId())).thenReturn(Optional.of(salario));

        service.atualizar(id, edicao(salario, "3000.00", "2026-11-05", null));

        assertThat(transacao.getCategoria().getTipo()).isEqualTo(TipoCategoria.RECEITA);
    }

    @Test
    void atualizarIdInexistenteLancaNaoEncontrada() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.atualizar(id, edicao(mercado, "10.00", "2026-11-03", null)))
                .isInstanceOf(TransacaoNaoEncontradaException.class);
    }

    // ---------------------------------------------------------------- listar: paginação

    @Test
    void paginaDaApiComecaEm1EODoSpringEm0() {
        when(repository.buscar(any(), anyInt(), anyInt())).thenReturn(fatiaVazia());

        service.listar(FiltroDeTransacoes.NENHUM, 3, 20);

        verify(repository).buscar(any(), eq(2), eq(20));
    }

    @Test
    void respostaTrazAPaginaContandoDe1EDizSeTemMais() {
        // O Spring devolve a página 1 (a segunda, contando de 0) e diz que existe uma próxima.
        Slice<Transacao> segundaPagina = new SliceImpl<>(List.of(), PageRequest.of(1, 20), true);
        when(repository.buscar(any(), anyInt(), anyInt())).thenReturn(segundaPagina);

        PaginaResponse<TransacaoResponse> resposta = service.listar(FiltroDeTransacoes.NENHUM, 2, 20);

        assertThat(resposta.pagina()).isEqualTo(2);
        assertThat(resposta.tamanho()).isEqualTo(20);
        assertThat(resposta.temMais()).isTrue();
    }

    @Test
    void paginaMenorQue1AcusaOCampoPaginaSemConsultarOBanco() {
        assertThatThrownBy(() -> service.listar(FiltroDeTransacoes.NENHUM, 0, 20))
                .isInstanceOfSatisfying(CampoInvalidoException.class,
                        erro -> assertThat(errosDe(erro)).extracting(ErroDeCampo::campo).containsExactly("pagina"));
        verifyNoInteractions(repository);
    }

    @Test
    void tamanhoForaDe1A100AcusaOCampoTamanho() {
        for (int tamanho : new int[] {0, -1, 101}) {
            assertThatThrownBy(() -> service.listar(FiltroDeTransacoes.NENHUM, 1, tamanho))
                    .isInstanceOfSatisfying(CampoInvalidoException.class,
                            erro -> assertThat(errosDe(erro)).extracting(ErroDeCampo::campo)
                                    .containsExactly("tamanho"));
        }
        verifyNoInteractions(repository);
    }

    @Test
    void tamanhoNosLimitesEhAceito() {
        when(repository.buscar(any(), anyInt(), anyInt())).thenReturn(fatiaVazia());

        service.listar(FiltroDeTransacoes.NENHUM, 1, 1);
        service.listar(FiltroDeTransacoes.NENHUM, 1, TransacaoService.TAMANHO_MAXIMO_DA_PAGINA);

        verify(repository, times(2)).buscar(any(), anyInt(), anyInt());
    }

    // ---------------------------------------------------------------- listar: filtros (#93)

    @Test
    void periodoComSoADataInicialAcusaAFinal() {
        assertThatThrownBy(() -> service.listar(FiltroDeTransacoes.doPeriodo(LocalDate.parse("2026-11-01"), null), 1, 20))
                .isInstanceOfSatisfying(CampoInvalidoException.class,
                        erro -> assertThat(errosDe(erro)).extracting(ErroDeCampo::campo).containsExactly("ate"));
    }

    @Test
    void periodoComSoADataFinalAcusaAInicial() {
        assertThatThrownBy(() -> service.listar(FiltroDeTransacoes.doPeriodo(null, LocalDate.parse("2026-11-30")), 1, 20))
                .isInstanceOfSatisfying(CampoInvalidoException.class,
                        erro -> assertThat(errosDe(erro)).extracting(ErroDeCampo::campo).containsExactly("de"));
    }

    @Test
    void categoriaInexistenteNoFiltroAcusaOCampoCategoriaId() {
        UUID inexistente = UUID.randomUUID();
        when(categoriaRepository.existsById(inexistente)).thenReturn(false);

        assertThatThrownBy(() -> service.listar(filtro().categoriaId(inexistente).criar(), 1, 20))
                .isInstanceOfSatisfying(CampoInvalidoException.class,
                        erro -> assertThat(errosDe(erro)).extracting(ErroDeCampo::campo)
                                .containsExactly("categoriaId"));
        verifyNoInteractions(repository);
    }

    @Test
    void valorNegativoNoFiltroAcusaOCampo() {
        assertThatThrownBy(() -> service.listar(filtro().valorMinimo("-1").criar(), 1, 20))
                .isInstanceOfSatisfying(CampoInvalidoException.class,
                        erro -> assertThat(errosDe(erro)).extracting(ErroDeCampo::campo)
                                .containsExactly("valorMinimo"));
        assertThatThrownBy(() -> service.listar(filtro().valorMaximo("-0.01").criar(), 1, 20))
                .isInstanceOfSatisfying(CampoInvalidoException.class,
                        erro -> assertThat(errosDe(erro)).extracting(ErroDeCampo::campo)
                                .containsExactly("valorMaximo"));
        verifyNoInteractions(repository);
    }

    @Test
    void valorMinimoMaiorQueOMaximoAcusaOMaximo() {
        assertThatThrownBy(() -> service.listar(filtro().valorMinimo("500").valorMaximo("100").criar(), 1, 20))
                .isInstanceOfSatisfying(CampoInvalidoException.class,
                        erro -> assertThat(errosDe(erro)).extracting(ErroDeCampo::campo)
                                .containsExactly("valorMaximo"));
        verifyNoInteractions(repository);
    }

    @Test
    void valorMinimoIgualAoMaximoEhAceitoMesmoComEscalasDiferentes() {
        when(repository.buscar(any(), anyInt(), anyInt())).thenReturn(fatiaVazia());

        service.listar(filtro().valorMinimo("10").valorMaximo("10.00").criar(), 1, 20);

        verify(repository).buscar(any(), anyInt(), anyInt());
    }

    @Test
    void descricaoDoFiltroChegaAoBancoSemEspacosEEmBrancoViraSemFiltro() {
        when(repository.buscar(any(), anyInt(), anyInt())).thenReturn(fatiaVazia());

        service.listar(filtro().descricao("  uber ").criar(), 1, 20);
        service.listar(filtro().descricao("   ").criar(), 1, 20);

        ArgumentCaptor<FiltroDeTransacoes> filtros = ArgumentCaptor.forClass(FiltroDeTransacoes.class);
        verify(repository, times(2)).buscar(filtros.capture(), anyInt(), anyInt());
        assertThat(filtros.getAllValues()).extracting(FiltroDeTransacoes::descricao).containsExactly("uber", null);
    }

    @Test
    void periodoInvertidoNaoConsultaOBanco() {
        assertThatThrownBy(() -> service.calcularSaldo(LocalDate.parse("2026-11-30"), LocalDate.parse("2026-11-01")))
                .isInstanceOf(CampoInvalidoException.class);
        verifyNoInteractions(repository);
    }

    // ---------------------------------------------------------------- saldo

    @Test
    void saldoEhReceitasMenosDespesas() {
        prepararTotais("3200.00", "1300.00");

        SaldoResponse saldo = service.calcularSaldo(LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-30"));

        assertThat(saldo.saldo()).isEqualByComparingTo("1900.00");
        assertThat(saldo.de()).isEqualTo(LocalDate.parse("2026-11-01"));
        assertThat(saldo.ate()).isEqualTo(LocalDate.parse("2026-11-30"));
    }

    @Test
    void saldoNegativoQuandoGastaMaisDoQueRecebe() {
        prepararTotais("0", "150.75");

        SaldoResponse saldo = service.calcularSaldo(LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-30"));

        assertThat(saldo.saldo()).isEqualByComparingTo("-150.75");
    }

    @Test
    void periodoSemTransacoesDaZeroComDuasCasas() {
        // O COALESCE do banco devolve 0 sem casas decimais; o service padroniza para 0.00.
        prepararTotais("0", "0");

        SaldoResponse saldo = service.calcularSaldo(LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-30"));

        assertThat(saldo.receitas().toPlainString()).isEqualTo("0.00");
        assertThat(saldo.despesas().toPlainString()).isEqualTo("0.00");
        assertThat(saldo.saldo().toPlainString()).isEqualTo("0.00");
    }

    // ---------------------------------------------------------------- auxiliares

    private void prepararCriacaoBemSucedida() {
        when(categoriaRepository.findById(mercado.getId())).thenReturn(Optional.of(mercado));
        when(repository.inserirSeNaoExistir(any(), any(), any(), any(), any(), any())).thenReturn(1);
        when(repository.findById(any())).thenReturn(Optional.of(transacao(mercado, "10.00", "2026-11-03", null)));
    }

    /** O id já existe: o INSERT não grava nada (0) e a busca devolve a transação gravada antes. */
    private void prepararReenvio(UUID id, Transacao existente) {
        prepararReenvio(id, existente, mercado);
    }

    /** Igual ao de cima, mas o reenvio chega com outra categoria. */
    private void prepararReenvio(UUID id, Transacao existente, Categoria categoriaDoReenvio) {
        when(categoriaRepository.findById(categoriaDoReenvio.getId())).thenReturn(Optional.of(categoriaDoReenvio));
        when(repository.inserirSeNaoExistir(eq(id), any(), any(), any(), any(), any())).thenReturn(0);
        when(repository.findById(id)).thenReturn(Optional.of(existente));
    }

    private void prepararTotais(String receitas, String despesas) {
        TotaisDoPeriodo totais = new TotaisDoPeriodo() {
            @Override
            public BigDecimal getReceitas() {
                return new BigDecimal(receitas);
            }

            @Override
            public BigDecimal getDespesas() {
                return new BigDecimal(despesas);
            }
        };
        when(repository.somarPorTipo(any(), any())).thenReturn(totais);
    }

    private CriarTransacaoRequest novo(String valor, String data, String descricao) {
        return new CriarTransacaoRequest(null, new BigDecimal(valor), LocalDate.parse(data), descricao, mercado.getId());
    }

    private static CriarTransacaoRequest novoComId(UUID id, Categoria categoria, String valor, String data,
                                                   String descricao) {
        return new CriarTransacaoRequest(id, new BigDecimal(valor), LocalDate.parse(data), descricao, categoria.getId());
    }

    private static TransacaoRequest edicao(Categoria categoria, String valor, String data, String descricao) {
        return new TransacaoRequest(new BigDecimal(valor), LocalDate.parse(data), descricao, categoria.getId());
    }

    /**
     * A entidade não tem construtor público (a criação é por SQL, na #19). O construtor protegido
     * é acessível aqui porque o teste está no mesmo pacote; os dados entram pelo {@code atualizar}.
     */
    private static Transacao transacao(Categoria categoria, String valor, String data, String descricao) {
        Transacao transacao = new Transacao();
        transacao.atualizar(categoria, new BigDecimal(valor), LocalDate.parse(data), descricao);
        return transacao;
    }

    /** O id da categoria é gerado pelo Hibernate ao salvar; aqui não há banco, então ele é colocado à mão. */
    private static Categoria categoria(String nome, TipoCategoria tipo) {
        Categoria categoria = new Categoria(nome, tipo);
        ReflectionTestUtils.setField(categoria, "id", UUID.randomUUID());
        return categoria;
    }

    @SuppressWarnings("unchecked")
    private static List<ErroDeCampo> errosDe(CampoInvalidoException erro) {
        return (List<ErroDeCampo>) erro.getBody().getProperties().get("erros");
    }

    private static Slice<Transacao> fatiaVazia() {
        return new SliceImpl<>(List.of());
    }

    private static ConstrutorDeFiltro filtro() {
        return new ConstrutorDeFiltro();
    }

    /** Monta um filtro só com o que o teste precisa, para não repetir sete argumentos nulos. */
    private static final class ConstrutorDeFiltro {
        private UUID categoriaId;
        private String descricao;
        private BigDecimal valorMinimo;
        private BigDecimal valorMaximo;

        ConstrutorDeFiltro categoriaId(UUID id) {
            this.categoriaId = id;
            return this;
        }

        ConstrutorDeFiltro descricao(String texto) {
            this.descricao = texto;
            return this;
        }

        ConstrutorDeFiltro valorMinimo(String valor) {
            this.valorMinimo = new BigDecimal(valor);
            return this;
        }

        ConstrutorDeFiltro valorMaximo(String valor) {
            this.valorMaximo = new BigDecimal(valor);
            return this;
        }

        FiltroDeTransacoes criar() {
            return new FiltroDeTransacoes(null, null, categoriaId, null, descricao, valorMinimo, valorMaximo);
        }
    }
}
