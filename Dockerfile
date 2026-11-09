# Self-hosted Chipper: the app, accounts and sync in one container.
# Published as ghcr.io/leachh02/chipper (see docker-compose.yml and
# SELF_HOSTING.md). Nothing personal goes in it: the Spotify client ID is
# read when the server starts.

# 1. Build the app, set up to sync with the server it's served from. The app
# and the jar are the same on every platform, so they're built only once.
FROM --platform=$BUILDPLATFORM node:22-alpine AS app
WORKDIR /src
COPY apps/frontend/package.json apps/frontend/package-lock.json ./
RUN npm ci
COPY apps/frontend/ ./
# The Watch Later extension's IDs, as for VITE_EXTENSIONS_ID in .env
ARG VITE_EXTENSIONS_ID=""
ENV VITE_SERVER=true VITE_EXTENSIONS_ID=$VITE_EXTENSIONS_ID
RUN npm run build

# 2. Build the server, with the app bundled inside
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk-alpine AS server
WORKDIR /src
COPY apps/backend/.mvn .mvn
COPY apps/backend/mvnw apps/backend/pom.xml ./
RUN ./mvnw -q -B dependency:go-offline
COPY apps/backend/src src
COPY --from=app /src/dist src/main/resources/static
RUN ./mvnw -q -B -DskipTests package

# 3. Run it
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S chipper && adduser -S chipper -G chipper \
  && mkdir /data && chown chipper:chipper /data
USER chipper
WORKDIR /app
COPY --from=server /src/target/chipper-server-*.jar chipper.jar
ENV CHIPPER_DATA_DIR=/data PORT=8080
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- http://127.0.0.1:8080/actuator/health || exit 1
ENTRYPOINT ["java", "--enable-native-access=ALL-UNNAMED", "-jar", "chipper.jar"]
