package io.github.igorpacheco1.guarda.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;

/**
 * Segurança da API (ADR-0020): sessão no servidor com cookie, CSRF e API fechada por padrão.
 *
 * <p>Regra de ouro: <b>tudo exige login, exceto o que está listado aqui como público</b>. Uma
 * rota nova esquecida fica fechada, e não aberta.
 *
 * <p>O login em si não usa o {@code formLogin} do Spring Security: são endpoints JSON próprios
 * ({@code AuthController}), mais simples para o app e sem redirecionamentos.
 */
@Configuration
@EnableConfigurationProperties(LimiteDeLoginProperties.class)
public class SegurancaConfiguration {

    /** Cabeçalho em que o app devolve o token CSRF. */
    public static final String CABECALHO_CSRF = "X-XSRF-TOKEN";

    /**
     * O token CSRF mora na sessão (e não num cookie legível pelo JavaScript). O app o recebe no
     * corpo de {@code GET /api/v1/auth/csrf} e o devolve no cabeçalho {@value #CABECALHO_CSRF}.
     */
    @Bean
    CsrfTokenRepository csrfTokenRepository() {
        HttpSessionCsrfTokenRepository repositorio = new HttpSessionCsrfTokenRepository();
        repositorio.setHeaderName(CABECALHO_CSRF);
        return repositorio;
    }

    /** Guarda quem está logado dentro da sessão (que o Spring Session grava no PostgreSQL). */
    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    SecurityFilterChain filtrosDeSeguranca(HttpSecurity http,
                                           CsrfTokenRepository csrfTokenRepository,
                                           SecurityContextRepository securityContextRepository,
                                           RespostasDeSegurancaHandler respostas) throws Exception {
        http
                // Token CSRF "puro" (sem o embaralhamento XOR do padrão): ele é entregue no corpo
                // de uma resposta JSON, e não escondido num formulário HTML, e o app o devolve
                // como veio. O embaralhamento serve contra o ataque BREACH em HTML, que não se
                // aplica aqui.
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository)
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
                .securityContext(contexto -> contexto.securityContextRepository(securityContextRepository))
                .sessionManagement(sessao -> sessao.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                // Nada de tela de login, Basic nem logout do Spring: o login é feito pelo AuthController.
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .requestCache(cache -> cache.disable())
                .exceptionHandling(erros -> erros
                        .authenticationEntryPoint(respostas)
                        .accessDeniedHandler(respostas))
                .authorizeHttpRequests(rotas -> rotas
                        // Monitoramento: só mostra UP/DOWN para quem está de fora.
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        // Documentação da API: só existe no perfil dev (ADR-0010). Nos outros
                        // perfis estas rotas nem existem e a resposta é 404.
                        .requestMatchers("/v3/api-docs", "/v3/api-docs/**", "/v3/api-docs.yaml",
                                "/swagger-ui.html", "/swagger-ui/**").permitAll()
                        // O que o app precisa antes de ter login.
                        .requestMatchers(HttpMethod.GET, "/api/v1/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/cadastro", "/api/v1/auth/entrar",
                                "/api/v1/auth/sair").permitAll()
                        // O resto, inclusive rotas que ainda nem existem: só com login.
                        .anyRequest().authenticated());
        return http.build();
    }
}
