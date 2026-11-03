package io.github.igorpacheco1.easyfinance.shared;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.TypeMismatchException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import tools.jackson.databind.exc.InvalidFormatException;
import tools.jackson.databind.exc.MismatchedInputException;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Ponto único de tratamento de erros da API. Toda resposta de erro sai no formato
 * ProblemDetail (RFC 9457), com título e mensagem em português, para o PWA mostrar ao usuário.
 *
 * <p>Herda de {@link ResponseEntityExceptionHandler}, que já trata as exceções do próprio Spring
 * (rota inexistente, método não permitido, nossas {@code ErrorResponseException} etc.). Aqui só
 * sobrescrevemos os casos que precisam de uma mensagem melhor, e acrescentamos dois:
 * violação de integridade do banco (409) e erro inesperado (500).
 *
 * <p>Regra de segurança: nenhuma resposta leva stack trace, nome de tabela, nome de restrição
 * ou mensagem interna. Esses detalhes vão só para o log.
 */
@Slf4j
@RestControllerAdvice
public class TratadorGlobalDeErros extends ResponseEntityExceptionHandler {

    /** 400: campos do corpo que falharam no Bean Validation ({@code @NotBlank}, {@code @Size}...). */
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
                                                                  HttpHeaders headers,
                                                                  HttpStatusCode status,
                                                                  WebRequest request) {
        List<ErroDeCampo> erros = ex.getBindingResult().getFieldErrors().stream()
                .map(erro -> new ErroDeCampo(erro.getField(), erro.getDefaultMessage()))
                // Ordem fixa: a mesma requisição sempre gera a mesma resposta.
                .sorted(Comparator.comparing(ErroDeCampo::campo).thenComparing(ErroDeCampo::mensagem))
                .toList();

        ProblemDetail problema = problema(HttpStatus.BAD_REQUEST, "Dados inválidos",
                "Um ou mais campos estão inválidos.");
        problema.setProperty("erros", erros);
        return handleExceptionInternal(ex, problema, headers, status, request);
    }

    /** 400: corpo ausente, JSON mal formado ou valor de tipo errado (ex.: {@code "tipo": "OUTRO"}). */
    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
                                                                  HttpHeaders headers,
                                                                  HttpStatusCode status,
                                                                  WebRequest request) {
        ProblemDetail problema = problema(HttpStatus.BAD_REQUEST, "Corpo da requisição inválido",
                detalheDoCorpoInvalido(ex));
        return handleExceptionInternal(ex, problema, headers, status, request);
    }

    /** 400: parâmetro da URL com formato errado (ex.: {@code /categorias/123} ou {@code ?tipo=OUTRO}). */
    @Override
    protected ResponseEntity<Object> handleTypeMismatch(TypeMismatchException ex,
                                                        HttpHeaders headers,
                                                        HttpStatusCode status,
                                                        WebRequest request) {
        String parametro = (ex instanceof MethodArgumentTypeMismatchException argumento)
                ? argumento.getName()
                : ex.getPropertyName();
        Class<?> tipoEsperado = ex.getRequiredType();

        String detalhe = (tipoEsperado != null && tipoEsperado.isEnum())
                ? "Valor inválido para '%s'. Valores aceitos: %s.".formatted(parametro, valoresAceitos(tipoEsperado))
                : "O valor informado para '%s' tem um formato inválido.".formatted(parametro);

        ProblemDetail problema = problema(HttpStatus.BAD_REQUEST, "Parâmetro inválido", detalhe);
        return handleExceptionInternal(ex, problema, headers, status, request);
    }

    /**
     * 409: o banco recusou a gravação por uma restrição que o service não traduziu.
     * Os casos conhecidos (nome repetido, categoria em uso) já viram mensagens próprias no
     * service; este é a rede de segurança para os demais.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ProblemDetail> tratarViolacaoDeIntegridade(DataIntegrityViolationException ex) {
        log.warn("Violação de integridade não tratada pelo service", ex);
        ProblemDetail problema = problema(HttpStatus.CONFLICT, "Conflito com dados existentes",
                "A operação não pôde ser concluída porque conflita com dados já registrados.");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problema);
    }

    /** 500: qualquer erro não previsto. O usuário recebe uma mensagem genérica; o detalhe fica no log. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> tratarErroInesperado(Exception ex) {
        log.error("Erro inesperado", ex);
        ProblemDetail problema = problema(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno",
                "Ocorreu um erro inesperado. Tente novamente em alguns instantes.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problema);
    }

    // ------------------------------------------------------------------ auxiliares

    private static ProblemDetail problema(HttpStatus status, String titulo, String detalhe) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(status, detalhe);
        problema.setTitle(titulo);
        return problema;
    }

    /**
     * Descobre, pela exceção do Jackson (a biblioteca que lê o JSON), qual campo veio errado.
     * Só olha erros de valor com tipo errado ({@link MismatchedInputException}); JSON quebrado
     * e corpo ausente caem na mensagem geral.
     */
    private static String detalheDoCorpoInvalido(HttpMessageNotReadableException ex) {
        if (ex.getCause() instanceof MismatchedInputException erro && !erro.getPath().isEmpty()) {
            String campo = erro.getPath().getLast().getPropertyName();
            if (campo != null) {
                if (erro instanceof InvalidFormatException formato
                        && formato.getTargetType() != null
                        && formato.getTargetType().isEnum()) {
                    return "Valor inválido para o campo '%s'. Valores aceitos: %s."
                            .formatted(campo, valoresAceitos(formato.getTargetType()));
                }
                return "Valor inválido para o campo '%s'.".formatted(campo);
            }
        }
        return "O corpo da requisição está ausente ou não é um JSON válido.";
    }

    /** Ex.: para TipoCategoria, devolve "RECEITA, DESPESA". */
    private static String valoresAceitos(Class<?> tipoEnum) {
        return Arrays.stream(tipoEnum.getEnumConstants())
                .map(Object::toString)
                .collect(Collectors.joining(", "));
    }
}
