package io.github.igorpacheco1.easyfinance.categoria;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

/** 409: a categoria ainda tem transações, então não pode ser excluída (FK com ON DELETE RESTRICT). */
public class CategoriaComTransacoesException extends ErrorResponseException {

    public CategoriaComTransacoesException() {
        super(HttpStatus.CONFLICT);
        setTitle("Categoria em uso");
        setDetail("A categoria tem transações vinculadas e não pode ser excluída.");
    }
}
