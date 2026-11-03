package io.github.igorpacheco1.easyfinance.categoria;

import io.github.igorpacheco1.easyfinance.categoria.dto.AtualizarCategoriaRequest;
import io.github.igorpacheco1.easyfinance.categoria.dto.CategoriaResponse;
import io.github.igorpacheco1.easyfinance.categoria.dto.CriarCategoriaRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Regras de negócio das categorias.
 *
 * <ul>
 *   <li>Nome único sem diferenciar maiúsculas; espaços nas pontas são removidos.</li>
 *   <li>O tipo não muda depois de criado (o DTO de atualização nem tem esse campo).</li>
 *   <li>Categorias do sistema não podem ser alteradas nem excluídas (409 por enquanto;
 *       vira 403 quando houver login, no M5).</li>
 *   <li>Categoria com transações não pode ser excluída.</li>
 * </ul>
 *
 * <p>{@code readOnly = true} na classe: por padrão os métodos só leem. Os que gravam
 * declaram {@code @Transactional} de novo, sem o readOnly.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoriaService {

    /** Nomes definidos na migration V1. Aparecem na mensagem de erro do PostgreSQL. */
    private static final String INDICE_NOME_UNICO = "uk_categoria_nome";
    private static final String FK_TRANSACAO_CATEGORIA = "fk_transacao_categoria";

    private final CategoriaRepository repository;

    public List<CategoriaResponse> listar(TipoCategoria tipo) {
        List<Categoria> categorias = (tipo == null)
                ? repository.findAllByOrderByTipoAscNomeAsc()
                : repository.findByTipoOrderByNomeAsc(tipo);
        return categorias.stream().map(CategoriaResponse::de).toList();
    }

    public CategoriaResponse buscar(UUID id) {
        return CategoriaResponse.de(buscarEntidade(id));
    }

    @Transactional
    public CategoriaResponse criar(CriarCategoriaRequest request) {
        String nome = request.nome().strip();
        if (repository.existsByNomeIgnoreCase(nome)) {
            throw new NomeDeCategoriaJaExisteException(nome);
        }
        Categoria categoria = new Categoria(nome, request.tipo());
        return CategoriaResponse.de(salvar(categoria));
    }

    @Transactional
    public CategoriaResponse atualizar(UUID id, AtualizarCategoriaRequest request) {
        Categoria categoria = buscarEntidade(id);
        exigirPersonalizada(categoria);

        String nome = request.nome().strip();
        if (repository.existsByNomeIgnoreCaseAndIdNot(nome, id)) {
            throw new NomeDeCategoriaJaExisteException(nome);
        }
        categoria.setNome(nome);
        return CategoriaResponse.de(salvar(categoria));
    }

    @Transactional
    public void excluir(UUID id) {
        Categoria categoria = buscarEntidade(id);
        exigirPersonalizada(categoria);

        if (repository.possuiTransacoes(id)) {
            throw new CategoriaComTransacoesException();
        }
        try {
            repository.delete(categoria);
            // flush: executa o DELETE agora, para o erro do banco (se houver) aparecer aqui dentro.
            repository.flush();
        } catch (DataIntegrityViolationException e) {
            // Uma transação foi criada entre a verificação acima e o DELETE: a FK do banco barrou.
            if (violou(e, FK_TRANSACAO_CATEGORIA)) {
                throw new CategoriaComTransacoesException();
            }
            throw e;
        }
    }

    private Categoria buscarEntidade(UUID id) {
        return repository.findById(id).orElseThrow(CategoriaNaoEncontradaException::new);
    }

    private void exigirPersonalizada(Categoria categoria) {
        if (categoria.isSistema()) {
            throw new CategoriaDoSistemaException();
        }
    }

    /**
     * Salva e já envia ao banco (saveAndFlush). A verificação de nome feita antes cobre o caso
     * comum; o índice único do banco é a garantia final, quando duas requisições chegam ao
     * mesmo tempo. Nesse caso a resposta continua sendo 409, e não um erro 500.
     */
    private Categoria salvar(Categoria categoria) {
        try {
            return repository.saveAndFlush(categoria);
        } catch (DataIntegrityViolationException e) {
            if (violou(e, INDICE_NOME_UNICO)) {
                throw new NomeDeCategoriaJaExisteException(categoria.getNome());
            }
            throw e; // outra restrição: não é conflito de nome, então não escondemos o erro
        }
    }

    /** Confere, pela mensagem do PostgreSQL, qual restrição do banco foi violada. */
    private static boolean violou(DataIntegrityViolationException e, String restricao) {
        String mensagem = e.getMostSpecificCause().getMessage();
        return mensagem != null && mensagem.contains(restricao);
    }
}
