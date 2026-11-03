package io.github.igorpacheco1.easyfinance.transacao;

import io.github.igorpacheco1.easyfinance.categoria.Categoria;
import io.github.igorpacheco1.easyfinance.categoria.CategoriaRepository;
import io.github.igorpacheco1.easyfinance.shared.CampoInvalidoException;
import io.github.igorpacheco1.easyfinance.transacao.dto.TransacaoRequest;
import io.github.igorpacheco1.easyfinance.transacao.dto.TransacaoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Regras de negócio das transações.
 *
 * <ul>
 *   <li>A categoria é obrigatória e precisa existir (senão, 400 no campo {@code categoriaId}).</li>
 *   <li>Descrição em branco vira "sem descrição" ({@code null}); espaços nas pontas são removidos.</li>
 *   <li>Na edição, a categoria pode mudar, inclusive para uma de outro tipo.</li>
 * </ul>
 *
 * <p>As regras de valor (positivo, 2 casas) e de data entram na #20.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TransacaoService {

    private final TransacaoRepository repository;
    private final CategoriaRepository categoriaRepository;

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

    private static String normalizarDescricao(String descricao) {
        if (descricao == null || descricao.isBlank()) {
            return null;
        }
        return descricao.strip();
    }
}
