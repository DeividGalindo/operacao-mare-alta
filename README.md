# Operação Maré Alta

Prova prática de Banco de Dados NoSQL, 2º bimestre, prof. Leonardo Rocha.

Aluno: Deivid Aparecido Galindo Oliveira
RA: 24173416-2

## Meus parâmetros

Rodei o `logiporto_gerador.js` e saiu isso (deixei salvo também em `mongo/saidas/gerador.txt`):

```
=== PARÂMETROS DA SUA PROVA ===
CLASSE_ALVO   : Granel
TERMINAL_ALVO : T2
DATA_CORTE    : 2026-06-01
INCIDENTE (formato Google Maps 'lat, lon'): -25.4880, -48.5160
CÓDIGO DE AUTENTICIDADE: LP-241734162-19995-61269
```

E a primeira linha do `grafo.cypher` ficou assim:

```
// BASE_DA_PILHA da sua prova: K48 | EMPRESA SANCIONADA: E12
```

Então ficou:
- CLASSE_ALVO = Granel
- TERMINAL_ALVO = T2
- DATA_CORTE = 2026-06-01
- INCIDENTE = -25.4880, -48.5160
- EMPRESA_SANCIONADA = E12
- BASE_DA_PILHA = K48
- Código de autenticidade = **LP-241734162-19995-61269**

## Como eu montei o ambiente

Subi tudo no Docker. O Mongo ficou no container `mongo-lab` e o Neo4j no `neo4j-lab`, sem senha. Não tenho o mongosh instalado no PC, então usei o que já vem dentro do container do Mongo. No Neo4j rodei as consultas pelo cypher-shell.

```bash
docker run --name mongo-lab -p 27017:27017 -d mongo:latest
docker run --name neo4j-lab -p 7474:7474 -p 7687:7687 -d --env NEO4J_AUTH=none neo4j:latest

export MSYS_NO_PATHCONV=1   # por causa do Git Bash

docker cp mongo/logiporto_gerador.js mongo-lab:/tmp/
docker exec mongo-lab mongosh --quiet --file /tmp/logiporto_gerador.js

docker cp neo4j/grafo_gerador.js mongo-lab:/tmp/
docker exec mongo-lab mongosh --nodb --quiet --file /tmp/grafo_gerador.js > neo4j/grafo.cypher
docker exec -i neo4j-lab cypher-shell < neo4j/grafo.cypher
```

Depois conferi se entrou tudo. No Mongo tinha 400 mil movimentações e 100 mil alertas. No Neo4j tinha 5 terminais, 30 empresas e 90 contêineres (`neo4j/saidas/carga.txt`).

## O que tem em cada lugar

- `previsoes.md`: o que eu achava que ia dar antes de rodar cada questão
- `diario.md`: os problemas que apareceram e como resolvi
- `mongo/`: scripts e resultados das partes A e B
- `neo4j/`: consultas, resultados e o diagrama da parte C
