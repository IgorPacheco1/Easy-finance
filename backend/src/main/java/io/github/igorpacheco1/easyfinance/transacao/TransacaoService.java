package io.github.igorpacheco1.easyfinance.transacao;

import io.github.igorpacheco1.easyfinance.categoria.Categoria;
import io.github.igorpacheco1.easyfinance.categoria.CategoriaRepository;
import io.github.igorpacheco1.easyfinance.shared.CampoInvalidoException;
import io.github.igorpacheco1.easyfinance.transacao.dto.TransacaoRequest;
import io.github.igorpacheco1.easyfinance.transacao.dto.TransacaoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.List;
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
 * </ul>
 *
 * <p>As regras de valor e de descrição ficam no {@code TransacaoRequest} (Bean Validation).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TransacaoService {

    /** Distância máxima entre a data do lançamento e hoje, para trás e para frente. */
    private static final Period LIMITE_DA_DATA = Period.ofYears(1);

    private static final DateTimeFormatter FORMATO_BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final TransacaoRepository repository;
    private final CategoriaRepository categoriaRepository;
    private final Clock clock;

    public List<TransacaoResponse> listar() {
        return repository.findAllByOrderByDataDescCriadoEmDesc().stream()
                .map(TransacaoResponse::de)
                .toList();
    }

    public TransacaoResponse buscar(UUID id) {
        return TransacaoResponse.de(buscarEntidade(id));
    }

    @Transactional
    public TransacaoResponse criar(TransacaoRequest request) {
        validarData(request.data());
        Transacao transacao = new Transacao(
                buscarCategoria(request.categoriaId()),
                request.valor(),
                request.data(),
                normalizarDescricao(request.descricao()));
        return TransacaoResponse.de(repository.save(transacao));
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
