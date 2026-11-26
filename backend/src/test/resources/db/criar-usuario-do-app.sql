-- Usuário do banco que o app usa nos testes (ADR-0034). Roda uma vez, quando o container de
-- teste sobe, antes das migrations. Senha só de teste: o container é descartável.
CREATE ROLE guarda_app LOGIN PASSWORD 'guarda_app_teste';
