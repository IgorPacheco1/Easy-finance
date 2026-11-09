package io.github.igorpacheco1.easyfinance.transacao;

import io.github.igorpacheco1.easyfinance.categoria.Categoria;
import io.github.igorpacheco1.easyfinance.categoria.CategoriaRepository;
import io.github.igorpacheco1.easyfinance.shared.CampoInvalidoException;
import io.github.igorpacheco1.easyfinance.shared.PaginaResponse;
import io.github.igorpacheco1.easyfinance.transacao.dto.CriarTransacaoRequest;
import io.github.igorpacheco1.easyfinance.transacao.dto.SaldoResponse;
import io.github.igorpacheco1.easyfinance.transacao.dto.TransacaoRequest;
import io.github.igorpacheco1.easyfinance.transacao.dto.TransacaoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.Objects;
import java.util.UUID;

/**
 * Regras de negócio das transações.
 *
 * <ul>
 *   <li>A categoria é obrigatória e precisa existir (senão, 400 no campo {@code categoriaId}).</li>
 *   <li>Descrição em branco vira "sem descrição" ({@code null}); espaços nas pontas são removidos.</li>
 *   <li>Na edição, a categoria pode mudar, inclusive para uma de outro tipo.</li>
 *   <li>A data precisa estar entre 1 ano antes e 1 ano depois de hoje, para pegar erros de
 *       digitação ("2062" no lugar de "2026"). Na edição, só é conferida se a data mudou:
 *       assim um lançamento antigo continua podendo ter a descrição corrigida (decisão da #20).</li>
 *   <li>A listagem é paginada (#92): páginas a partir de 1, de 1 a 100 itens. Os filtros (#93)
 *       se combinam; valores não podem ser negativos e o mínimo não passa do máximo.</li>
 *   <li>Criação idempotente (#19): o cliente pode enviar o próprio id. Reenviar o mesmo id com
 *       os mesmos dados devolve a transação existente, sem duplicar; com dados diferentes, 409.</li>
 * </ul>
 *
 * <p>As regras de valor e de descrição ficam nos DTOs de entrada (Bean Validation).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TransacaoService {

    /** Distância máxima entre a data do lançamento e hoje, para trás e para frente. */
    private static final Period LIMITE_DA_DATA = Period.ofYears(1);

    /** Maior página que um cliente pode pedir (#92). */
    public static final int TAMANHO_MAXIMO_DA_PAGINA = 100;

    private static final DateTimeFormatter FORMATO_BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final TransacaoRepository repository;
    private final CategoriaRepository categoriaRepository;
    private final Clock clock;

    /**
     * Uma página das transações que atendem ao filtro, da mais recente para a mais antiga. Os
     * filtros preenchidos se combinam; sem nenhum, todas (#93).
     *
     * @param pagina  número da página, começando em 1 (na API; o Spring conta a partir de 0)
     * @param tamanho quantas transações por página, de 1 a {@value #TAMANHO_MAXIMO_DA_PAGINA}
     */
    public PaginaResponse<TransacaoResponse> listar(FiltroDeTransacoes filtro, int pagina, int tamanho) {
        validarPaginacao(pagina, tamanho);
        FiltroDeTransacoes filtroValidado = validarFiltro(filtro);
        Slice<Transacao> transacoes = repository.buscar(filtroValidado, pagina - 1, tamanho);
        return PaginaResponse.de(transacoes.map(TransacaoResponse::de));
    }

    /** Receitas, despesas e saldo do período. Período sem transações dá tudo zero. */
    public SaldoResponse calcularSaldo(LocalDate de, LocalDate ate) {
        validarPeriodo(de, ate);
        TotaisDoPeriodo totais = repository.somarPorTipo(de, ate);
        // setScale(2): o zero do COALESCE vem sem casas decimais; assim tudo sai como 0.00.
        // UNNECESSARY: os valores já têm no máximo 2 casas, então nunca há arredondamento.
        BigDecimal receitas = totais.getReceitas().setScale(2, RoundingMode.UNNECESSARY);
        BigDecimal despesas = totais.getDespesas().setScale(2, RoundingMode.UNNECESSARY);
        return new SaldoResponse(de, ate, receitas, despesas, receitas.subtract(despesas));
    }

    public TransacaoResponse buscar(UUID id) {
        return TransacaoResponse.de(buscarEntidade(id));
    }

    @Transactional
    public ResultadoDaCriacao criar(CriarTransacaoRequest request) {
        validarData(request.data());
        Categoria categoria = buscarCategoria(request.categoriaId());
        String descricao = normalizarDescricao(request.descricao());
        UUID id = (request.id() != null) ? request.id() : UUID.randomUUID();

        int gravadas = repository.inserirSeNaoExistir(
                id, categoria.getId(), request.valor(), request.data(), descricao, Instant.now());
        Transacao transacao = buscarEntidade(id);

        boolean criada = (gravadas == 1);
        if (!criada && !temOsMesmosDados(transacao, categoria, request.valor(), request.data(), descricao)) {
            throw new TransacaoConflitanteException();
        }
        return new ResultadoDaCriacao(TransacaoResponse.de(transacao), criada);
    }

    @Transactional
    public TransacaoResponse atualizar(UUID id, TransacaoRequest request) {
        Transacao transacao = buscarEntidade(id);
        if (!request.data().equals(transacao.getData())) {
            validarData(request.data());
        }
        transacao.atualizar(
                buscarCategoria(request.categoriaId()),
                request.valor(),
                request.data(),
                normalizarDescricao(request.descricao()));
        // Não precisa chamar save(): a entidade foi lida nesta transação, então o Hibernate
        // percebe a mudança e faz o UPDATE sozinho no fim do método ("dirty checking").
        return TransacaoResponse.de(transacao);
    }

    @Transactional
    public void excluir(UUID id) {
        repository.delete(buscarEntidade(id));
    }

    private Transacao buscarEntidade(UUID id) {
        return repository.findById(id).orElseThrow(TransacaoNaoEncontradaException::new);
    }

    private Categoria buscarCategoria(UUID categoriaId) {
        return categoriaRepository.findById(categoriaId)
                .orElseThrow(() -> new CampoInvalidoException("categoriaId", "Categoria não encontrada."));
    }

    /**
     * Compara um reenvio com o que já está gravado. O valor é comparado com {@code compareTo},
     * e não com {@code equals}, porque para o {@code equals} 52.9 e 52.90 são diferentes (ADR-0007).
     * A descrição já chega normalizada, então " Feira " e "Feira" contam como iguais.
     */
    private static boolean temOsMesmosDados(Transacao existente, Categoria categoria,
                                            BigDecimal valor, LocalDate data, String descricao) {
        return existente.getCategoria().getId().equals(categoria.getId())
                && existente.getValor().compareTo(valor) == 0
                && existente.getData().equals(data)
                && Objects.equals(existente.getDescricao(), descricao);
    }

    /**
     * A página e o tamanho vêm da URL, então qualquer cliente pode mandar qualquer número. O
     * limite do tamanho protege o servidor: sem ele, {@code tamanho=1000000} traria a tabela
     * inteira de uma vez, que é justamente o que a paginação existe para evitar.
     */
    private static void validarPaginacao(int pagina, int tamanho) {
        if (pagina < 1) {
            throw new CampoInvalidoException("pagina", "A página deve ser 1 ou maior.");
        }
        if (tamanho < 1 || tamanho > TAMANHO_MAXIMO_DA_PAGINA) {
            throw new CampoInvalidoException("tamanho",
                    "O tamanho da página deve ser de 1 a %d.".formatted(TAMANHO_MAXIMO_DA_PAGINA));
        }
    }

    /**
     * Confere os filtros e devolve a versão "limpa" (descrição sem espaços nas pontas; em branco
     * vira "sem filtro"). Tudo antes de consultar o banco: filtro inválido nem chega lá.
     */
    private FiltroDeTransacoes validarFiltro(FiltroDeTransacoes filtro) {
        if (filtro.de() != null || filtro.ate() != null) {
            validarPeriodo(filtro.de(), filtro.ate());
        }
        if (filtro.categoriaId() != null && !categoriaRepository.existsById(filtro.categoriaId())) {
            throw new CampoInvalidoException("categoriaId", "Categoria não encontrada.");
        }
        BigDecimal minimo = filtro.valorMinimo();
        BigDecimal maximo = filtro.valorMaximo();
        if (minimo != null && minimo.signum() < 0) {
            throw new CampoInvalidoException("valorMinimo", "O valor mínimo não pode ser negativo.");
        }
        if (maximo != null && maximo.signum() < 0) {
            throw new CampoInvalidoException("valorMaximo", "O valor máximo não pode ser negativo.");
        }
        // compareTo, e não equals, para 10 e 10.00 serem o mesmo valor (ADR-0007).
        if (minimo != null && maximo != null && minimo.compareTo(maximo) > 0) {
            throw new CampoInvalidoException("valorMaximo", "O valor máximo deve ser igual ou maior que o mínimo.");
        }
        return filtro.comDescricao(normalizarDescricao(filtro.descricao()));
    }

    private static void validarPeriodo(LocalDate de, LocalDate ate) {
        if (de == null) {
            throw new CampoInvalidoException("de", "Informe a data inicial ('de') junto com a final ('ate').");
        }
        if (ate == null) {
            throw new CampoInvalidoException("ate", "Informe a data final ('ate') junto com a inicial ('de').");
        }
        if (de.isAfter(ate)) {
            throw new CampoInvalidoException("ate", "A data final deve ser igual ou posterior à data inicial.");
        }
    }

    private void validarData(LocalDate data) {
        LocalDate hoje = LocalDate.now(clock);
        LocalDate minima = hoje.minus(LIMITE_DA_DATA);
        LocalDate maxima = hoje.plus(LIMITE_DA_DATA);
        if (data.isBefore(minima) || data.isAfter(maxima)) {
            throw new CampoInvalidoException("data", "A data deve estar entre %s e %s."
                    .formatted(minima.format(FORMATO_BR), maxima.format(FORMATO_BR)));
        }
    }

    private static String normalizarDescricao(String descricao) {
        if (descricao == null || descricao.isBlank()) {
            return null;
        }
        return descricao.strip();
    }
}
