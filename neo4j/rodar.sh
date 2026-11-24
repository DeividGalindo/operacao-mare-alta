#!/usr/bin/env bash
# uso (Git Bash, na raiz do repo):  bash neo4j/rodar.sh c2
set -e
mkdir -p neo4j/saidas
docker exec -i neo4j-lab cypher-shell --format plain < "neo4j/$1.cypher" | tee "neo4j/saidas/$1.txt"
