#!/bin/sh
# Cria o usuário do banco que o app usa (ADR-0034).
#
# O PostgreSQL roda os scripts de /docker-entrypoint-initdb.d só na PRIMEIRA subida de um volume
# vazio, como o usuário principal do container (POSTGRES_USER, o dono das tabelas). Num volume que
# já existe, este script não roda: para aplicar, recrie o banco local (ver docs/guias).
#
# O guarda_app só pode entrar (LOGIN). As permissões nas tabelas vêm da migration
# V9__dar_permissoes_ao_usuario_do_app.sql, para valerem igual em todo ambiente.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v senha="$GUARDA_APP_PASSWORD" <<'SQL'
CREATE ROLE guarda_app LOGIN PASSWORD :'senha';
SQL
