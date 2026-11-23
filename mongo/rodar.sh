#!/usr/bin/env bash
# uso (Git Bash, na raiz do repo):  bash mongo/rodar.sh a1
# copia os scripts pro container, roda e traz de volta a saída e os JSONs de explain
set -e
export MSYS_NO_PATHCONV=1
mkdir -p mongo/saidas mongo/explain
docker exec mongo-lab rm -rf /prova
docker cp mongo/. mongo-lab:/prova/
docker exec mongo-lab mongosh logiporto --quiet --file "/prova/$1.js" | tee "mongo/saidas/$1.txt"
docker cp mongo-lab:/prova/explain/. mongo/explain/ 2>/dev/null || true
