package io.github.igorpacheco1.easyfinance.transacao;

import io.github.igorpacheco1.easyfinance.transacao.dto.TransacaoRequest;
import io.github.igorpacheco1.easyfinance.transacao.dto.TransacaoResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/** Endpoints HTTP de transações. As regras ficam no {@link TransacaoService}. */
@RestController
@RequestMapping("/api/v1/transacoes")
@RequiredArgsConstructor
public class TransacaoController {

    private final TransacaoService service;

    @GetMapping
    public List<TransacaoResponse> listar() {
        return service.listar();
    }

    @GetMapping("/{id}")
    public TransacaoResponse buscar(@PathVariable UUID id) {
        return service.buscar(id);
    }

    @PostMapping
    public ResponseEntity<TransacaoResponse> criar(@Valid @RequestBody TransacaoRequest request) {
        TransacaoResponse criada = service.criar(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(criada.id())
                .toUri();
        return ResponseEntity.created(location).body(criada);
    }

    /** PUT substitui a transação inteira: o corpo traz todos os campos, como no POST. */
    @PutMapping("/{id}")
    public TransacaoResponse atualizar(@PathVariable UUID id, @Valid @RequestBody TransacaoRequest request) {
        return service.atualizar(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable UUID id) {
        service.excluir(id);
    }
}
