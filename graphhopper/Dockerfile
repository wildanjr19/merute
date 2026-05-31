# GraphHopper routing engine untuk MeRute (produksi).
# Memakai config.yml + runner.json yang SAMA dengan setup lokal agar perilaku
# routing identik. Versi JAR dipin ke 11.0 (sesuai lokal).
FROM eclipse-temurin:17-jre

ARG GH_VERSION=11.0
WORKDIR /gh

# curl untuk healthcheck container (tidak selalu ada di base image).
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Unduh JAR GraphHopper versi terkunci (sumber sama dgn start-graphhopper.ps1).
ADD https://repo1.maven.org/maven2/com/graphhopper/graphhopper-web/${GH_VERSION}/graphhopper-web-${GH_VERSION}.jar /gh/graphhopper-web.jar

# Config + custom model identik dengan lokal.
COPY config.yml /gh/config.yml
COPY runner.json /gh/runner.json

# Folder data (OSM pbf di-mount), graph-cache & logs (volume agar persist).
RUN mkdir -p /gh/data /gh/graph-cache /gh/logs

# Lokasi file OSM (override via env bila nama file berbeda).
ENV OSM_FILE=/gh/data/surakarta.osm.pbf \
    JAVA_OPTS="-Xmx2g -Xms1g"

EXPOSE 8989

# datareader.file di-set saat runtime; graph.location mengikuti config.yml (graph-cache).
CMD ["sh", "-c", "java $JAVA_OPTS -Ddw.graphhopper.datareader.file=$OSM_FILE -jar graphhopper-web.jar server config.yml"]
