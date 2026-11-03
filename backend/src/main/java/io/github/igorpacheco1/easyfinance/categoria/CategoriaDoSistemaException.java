package io.github.igorpacheco1.easyfinance.categoria;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

/**
 * 409: tentativa de alterar ou excluir uma categoria do sistema.
 *
 * <p>Quando houver login (M5), este caso passa a responder 403 Forbidden.
 */
public class CategoriaDoSistemaException extends ErrorResponseException {

    public CategoriaDoSistemaException() {
        super(HttpStatus.CONFLICT);
        setTitle("Categoria do sistema");
        setDetail("Categorias do sistema não podem ser alteradas nem excluídas.");
    }
}
