# Imagem do backend do Guardá (spike #224: medir a hospedagem do M7).
#
# Duas etapas:
# 1. "build": compila com o JDK e o Maven Wrapper e gera o .jar. Os testes NÃO rodam aqui,
#    porque os de integração precisam do Docker (Testcontainers), que não existe dentro do build.
#    Eles continuam obrigatórios no CI, antes de qualquer merge.
# 2. "execucao": só o JRE e o .jar. Fica menor e sem as ferramentas de compilação.
#
# Construir (na raiz do repositório):  docker build -t guarda-api ./backend
# Rodar: ver backend/README.md ou o comentário da issue #224.

# ---------- 1. build ----------
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Primeiro só o que define as dependências: se o código mudar e o pom não, o Docker reaproveita
# esta camada e não baixa tudo de novo.
COPY mvnw pom.xml lombok.config ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src src
RUN ./mvnw -B -q -DskipTests package && cp target/*.jar app.jar

# ---------- 2. execução ----------
FROM eclipse-temurin:21-jre
WORKDIR /app

# Roda com um usuário sem privilégios, e não como root.
RUN useradd --system --no-create-home guarda
USER guarda

COPY --from=build /app/app.jar app.jar

# Ajustes para 512 MB de memória e pouca CPU (plano grátis):
# - MaxRAMPercentage: o heap usa até 75% da memória do container, e o resto fica para a JVM;
# - SerialGC: o coletor de lixo mais leve, bom para uma CPU só;
# - TieredStopAtLevel=1: compila menos na partida, o que acelera a subida (o pico fica um pouco
#   mais lento, o que não pesa para poucas requisições).
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -XX:TieredStopAtLevel=1"
# A porta vem do serviço (Render e Cloud Run usam PORT); 8080 se não vier nenhuma.
ENV SERVER_PORT=8080
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java -Dserver.port=${PORT:-$SERVER_PORT} -jar app.jar"]
