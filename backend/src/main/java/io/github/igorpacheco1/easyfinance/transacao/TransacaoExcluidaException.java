package io.github.igorpacheco1.easyfinance.transacao;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

/**
 * 410: o app tentou criar uma transação com o id de uma que já foi excluída (#98).
 *
 * <p>Acontece com um reenvio atrasado, por exemplo da fila offline: o lançamento chegou ao
 * servidor antes, alguém o excluiu, e agora a mesma cópia chega de novo. 410 (Gone) quer dizer
 * "existiu e foi removido de propósito", diferente do 404 ("não existe") e do 409 ("existe com
 * dados diferentes"). Com isso, o app sabe que deve perguntar ao usuário se descarta o lançamento
 * ou se lança de novo, com um id novo.
 */
public class TransacaoExcluidaException extends ErrorResponseException {

    public TransacaoExcluidaException() {
        super(HttpStatus.GONE);
        setTitle("Transação excluída");
        setDetail("Este lançamento foi excluído e não pode ser enviado de novo.");
    }
}
