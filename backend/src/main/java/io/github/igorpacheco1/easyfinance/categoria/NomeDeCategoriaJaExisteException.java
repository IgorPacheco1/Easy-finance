package io.github.igorpacheco1.easyfinance.categoria;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

/** 409: já existe uma categoria com esse nome (sem diferenciar maiúsculas). */
public class NomeDeCategoriaJaExisteException extends ErrorResponseException {

    public NomeDeCategoriaJaExisteException(String nome) {
        super(HttpStatus.CONFLICT);
        setTitle("Nome de categoria já existe");
        setDetail("Já existe uma categoria chamada \"" + nome + "\".");
    }
}
