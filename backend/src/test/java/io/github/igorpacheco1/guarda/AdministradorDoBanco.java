package io.github.igorpacheco1.guarda;

import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Só nos testes: uma conexão com o usuário principal do container de teste, que é superusuário e
 * por isso não passa pelas permissões nem pelo RLS.
 *
 * <p>Serve para testar regras do próprio schema (por exemplo, o nome único entre as categorias do
 * sistema) que o app, com o RLS, nem consegue mais alcançar. É outra conexão, fora da transação do
 * teste: o que ela gravar fica gravado. Use só para comandos que o banco recusa.
 */
public record AdministradorDoBanco(JdbcTemplate jdbc) {
}
