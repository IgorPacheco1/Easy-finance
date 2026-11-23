#!/usr/bin/env bash
# Spike #224: mede o tempo de resposta do backend publicado.
#
# Uso (Git Bash ou Linux):
#   export GUARDA_EMAIL='spike@exemplo.com' GUARDA_SENHA='uma-senha-de-teste'
#   ./tools/spike-deploy/medir.sh https://endereco-do-backend
#
# Use só uma conta de teste: o banco é de teste e é apagado no fim do spike.
# Na primeira vez, a conta é criada sozinha (cadastro). Para medir a "partida a frio", deixe o
# serviço sem nenhum acesso por mais de 15 minutos antes de rodar.
set -euo pipefail

BASE="${1:?informe o endereço do backend, ex.: https://guarda-api.onrender.com}"
: "${GUARDA_EMAIL:?defina GUARDA_EMAIL}" "${GUARDA_SENHA:?defina GUARDA_SENHA}"
COOKIES="$(mktemp)"; trap 'rm -f "$COOKIES"' EXIT
CURL=(curl -s -b "$COOKIES" -c "$COOKIES" --max-time 180)

# Mostra o tempo total e o status HTTP de uma chamada.
medir() {
  local nome="$1"; shift
  local saida
  saida=$("${CURL[@]}" -o /dev/null -w '%{http_code} %{time_total}' "$@")
  printf '%-34s HTTP %s  %6.2f s\n' "$nome" "${saida% *}" "${saida#* }"
}

token() {
  "${CURL[@]}" "$BASE/api/v1/auth/csrf" | sed -E 's/.*"token":"([^"]+)".*/\1/'
}

corpo_entrar=$(printf '{"email":"%s","senha":"%s"}' "$GUARDA_EMAIL" "$GUARDA_SENHA")

echo "Medindo $BASE em $(date '+%d/%m/%Y %H:%M')"
medir "1. health (pode acordar o servidor)" "$BASE/actuator/health"
medir "2. health de novo (já acordado)"     "$BASE/actuator/health"

T=$(token)
codigo=$("${CURL[@]}" -o /dev/null -w '%{http_code}' -X POST "$BASE/api/v1/auth/entrar" \
  -H 'Content-Type: application/json' -H "X-XSRF-TOKEN: $T" -d "$corpo_entrar")
if [ "$codigo" = "401" ]; then
  echo "   (conta não existe ainda: criando a conta de teste)"
  T=$(token)
  "${CURL[@]}" -o /dev/null -X POST "$BASE/api/v1/auth/cadastro" -H 'Content-Type: application/json' \
    -H "X-XSRF-TOKEN: $T" -d "$(printf '{"email":"%s","senha":"%s","nome":"Spike"}' "$GUARDA_EMAIL" "$GUARDA_SENHA")"
fi

T=$(token)
medir "3. entrar (login)" -X POST "$BASE/api/v1/auth/entrar" \
  -H 'Content-Type: application/json' -H "X-XSRF-TOKEN: $T" -d "$corpo_entrar"

hoje=$(date +%Y-%m-%d); inicio=$(date +%Y-%m-01)
medir "4. saldo do mês"           "$BASE/api/v1/saldo?de=$inicio&ate=$hoje"
medir "5. categorias"             "$BASE/api/v1/categorias"
medir "6. saldo do mês de novo"   "$BASE/api/v1/saldo?de=$inicio&ate=$hoje"
