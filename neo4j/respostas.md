# Respostas — Neo4j (Parte C)

EMPRESA_SANCIONADA = E12 · BASE_DA_PILHA = K48

As consultas estão em `neo4j/*.cypher` e as saídas em `neo4j/saidas/`. Rodei com `bash neo4j/rodar.sh <arquivo>`, que usa o cypher-shell do container.

---

## C1 — Modelagem

O diagrama está em `neo4j/diagrama.md`, em Mermaid. Ele tem o modelo com os rótulos Empresa, Container e Terminal, as arestas SOCIA_DE, PERTENCE_A, PASSOU_POR e EMPILHADO_SOBRE com direção e propriedades, a legenda e o subgrafo real da E12:

- E12 → SOCIA_DE {pct: 68} → E10
- E12 → SOCIA_DE {pct: 84} → E9

Nenhuma empresa é sócia da E12.

---

## C2 — Investigação societária e operacional

Consulta: `neo4j/c2.cypher` · saída: `neo4j/saidas/c2.txt`

```cypher
MATCH (s:Empresa {sancionada: true})-[:SOCIA_DE*1..3]->(x:Empresa)
WHERE x <> s
WITH DISTINCT s, x
MATCH (s)<-[:PERTENCE_A]-(ks:Container)-[ps:PASSOU_POR]->(t:Terminal)<-[px:PASSOU_POR]-(kx:Container)-[:PERTENCE_A]->(x)
WHERE ps.data = px.data
RETURN DISTINCT x.nome AS empresa_investigada, kx.id AS container, t.nome AS terminal, px.data AS data
ORDER BY data, empresa_investigada
```

Como funciona:
1. a primeira parte sai da E12 e segue a seta de SOCIA_DE por 1 a 3 saltos. O `WHERE x <> s` tira a própria E12, caso algum caminho dê a volta e chegue nela de novo
2. o `WITH DISTINCT` deixa cada empresa uma vez só, mesmo que dê pra chegar nela por mais de um caminho
3. a segunda parte desenha o cruzamento: um contêiner da E12 e um contêiner da empresa investigada apontando pro **mesmo nó Terminal**. O `WHERE ps.data = px.data` garante que foi no mesmo dia
4. o `RETURN DISTINCT` tira as linhas repetidas

**Resultado, 10 linhas:**

| empresa_investigada | container | terminal | data |
|---|---|---|---|
| Empresa 14 | K43 | T3 | 2026-10-02 |
| Empresa 8 | K65 | T1 | 2026-10-05 |
| Empresa 9 | K73 | T1 | 2026-10-05 |
| Empresa 1 | K27 | T1 | 2026-10-06 |
| Empresa 17 | K81 | T4 | 2026-10-12 |
| Empresa 14 | K19 | T2 | 2026-10-13 |
| Empresa 25 | K70 | T4 | 2026-10-16 |
| Empresa 1 | K64 | T3 | 2026-10-17 |
| Empresa 8 | K65 | T3 | 2026-10-20 |
| Empresa 9 | K14 | T3 | 2026-10-22 |

Pra conferir, rodei uma versão que mostra também qual contêiner da E12 cruzou com cada um (`neo4j/c2_conferencia.cypher`). O K64 da Empresa 1 cruzou com **dois** contêineres da E12, o K0 e o K51, no T3 em 17/10. Sem o DISTINCT essa linha apareceria duas vezes no resultado.

**Por que escolhi essa direção.** No grafo, `(a)-[:SOCIA_DE]->(b)` quer dizer que a empresa A tem uma parte da B. Seguindo a seta a partir da E12, eu chego nas empresas em que ela tem participação, direta ou por meio de outras empresas. Essas são as que a sancionada controla ou influencia e que ela pode usar pra continuar movimentando carga depois de sancionada, que é justamente o que a investigação procura.

Comparei os três sentidos possíveis:

| sentido | empresas alcançadas em até 3 níveis |
|---|---|
| saindo da E12, seguindo a seta | 14 |
| chegando na E12, contra a seta | 0 |
| sem direção | 23 |

Contra a seta não sai nada, porque ninguém é sócio da E12. Sem direção daria 23 empresas, mas aí entra muita coisa que não tem a ver. Por exemplo, a E12 é sócia da E10, e se outra empresa também for sócia da E10, a busca sem direção puxaria essa empresa, só porque as duas têm parte da mesma empresa. Isso não quer dizer que a E12 tenha qualquer poder sobre ela. Seguindo a seta, a ligação sempre passa por participação da E12, mesmo que indireta.
