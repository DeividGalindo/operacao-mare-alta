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

---

## C3 — Debug Cypher

### (i) CREATE que duplica

Arquivos: `c3_i_antes.cypher`, `c3_i_limpeza.cypher`, `c3_i_corrigido.cypher` · saídas em `neo4j/saidas/`

```cypher
CREATE (a:Empresa {cnpj:'E1'})-[:SOCIA_DE {pct:30}]->(b:Empresa {cnpj:'E2'})
```

**Sintoma.** Depois de rodar, passaram a existir dois nós E1 e dois nós E2, e o total de empresas foi de 30 pra 32. Os nós novos nem têm nome:

| | antes | depois do CREATE |
|---|---|---|
| nós com cnpj E1 | 1 | **2** |
| nós com cnpj E2 | 1 | **2** |
| total de empresas | 30 | **32** |
| nomes dos E1 | Empresa 1 | Empresa 1 e um sem nome |

**Causa raiz.** O `CREATE` sempre cria tudo o que está no padrão. Quando a gente escreve `(a:Empresa {cnpj:'E1'})` dentro de um CREATE, o Neo4j não procura se já existe uma empresa com esse cnpj, ele cria uma nova. Então o comando criou dois nós novos, E1 e E2, com uma aresta entre eles, e as empresas de verdade ficaram de fora. É a mesma pegadinha do estagiário da aula 6.

**Limpeza.** Os nós duplicados são os únicos Empresa sem a propriedade `nome`, então apaguei só eles:

```cypher
MATCH (e:Empresa) WHERE e.nome IS NULL DETACH DELETE e
```

Voltou pra 1 nó E1, 1 nó E2 e 30 empresas.

**Código corrigido:**

```cypher
MATCH (a:Empresa {cnpj:'E1'}), (b:Empresa {cnpj:'E2'})
MERGE (a)-[r:SOCIA_DE]->(b)
SET r.pct = 30
```

O `MATCH` encontra as empresas que já existem e o `MERGE` só cria a aresta se ela ainda não existir.

**Evidência depois:** continuou 1 nó E1, 1 nó E2 e 30 empresas, com **1** aresta E1 → E2 com pct 30. Rodei o corrigido duas vezes e não duplicou nada.

Uma coisa que eu descobri: no meu grafo **já existia** uma aresta E1 → E2, com pct 14. O MERGE achou essa aresta e só atualizou o pct pra 30, que é o que o objetivo pede. Por isso deixei o pct no `SET` e não dentro do padrão. Se eu escrevesse `MERGE (a)-[:SOCIA_DE {pct:30}]->(b)`, o Neo4j ia procurar uma aresta com pct 30, não ia achar, porque a que existe tem 14, e ia criar uma **segunda** aresta entre as mesmas empresas.

### (ii) caminho sem limite e sem direção

Arquivos: `c3_ii_antes.cypher`, `c3_ii_explosao.cypher`, `c3_ii_corrigido.cypher`

```cypher
MATCH (s:Empresa {sancionada:true})-[:SOCIA_DE*]-(x:Empresa) RETURN x.nome
```

**Sintoma.** Rodei com `LIMIT 20`, como a prova pede. Voltou rápido, em uns 5 segundos, mas os 20 nomes vieram cheios de repetição: Empresa 9, 14, 13, 16, 19 e 4 aparecem duas vezes cada. Sem o LIMIT o número de caminhos explode. Medi quantos caminhos existem só até certa profundidade:

| até quantos saltos | caminhos |
|---|---|
| 2 | 11 |
| 4 | 134 |
| 6 | 1.093 |
| 8 | 7.598 |

A cada 2 saltos o número multiplica por umas 7 vezes. E o `*` sem número não tem limite, ele continua até o maior caminho possível sem repetir aresta, e no meu grafo tem 46 arestas SOCIA_DE. Até 4 saltos, a Empresa 15 já aparece 13 vezes, e a 9 e a 14 aparecem 9 vezes cada.

**Causa raiz.** São três problemas juntos:
1. `*` sem limite de profundidade: o Neo4j tenta todos os caminhos possíveis, de qualquer tamanho
2. `-` sem seta: anda nos dois sentidos, o que gera muito mais caminhos, inclusive voltas e empresas que só têm um sócio em comum
3. sem DISTINCT: o Neo4j devolve uma linha por **caminho**, não por empresa. Se dá pra chegar na Empresa 15 por 13 caminhos diferentes, ela aparece 13 vezes

**Código corrigido:**

```cypher
MATCH (s:Empresa {sancionada:true})-[:SOCIA_DE*1..3]->(x:Empresa)
WHERE x <> s
RETURN DISTINCT x.nome AS empresa
```

Usei o mesmo limite e a mesma direção da C2. O `WHERE x <> s` tira a própria sancionada, caso algum caminho volte nela.

**Evidência depois:** voltaram **14 empresas**, cada uma uma vez só, na hora: Empresa 1, 10, 11, 13, 14, 15, 16, 17, 18, 23, 25, 5, 8 e 9.

### (iii) contêineres presos acima da base

Arquivo: `c3_iii.cypher`

```cypher
MATCH (base:Container {id:'BASE_DA_PILHA'})-[:EMPILHADO_SOBRE*1..3]->(x:Container) RETURN x.id
```

**Sintoma.** Não volta nenhum contêiner. E mesmo trocando 'BASE_DA_PILHA' pelo id da minha base, que é K48, continua vazio.

**Causa raiz.** Tem dois erros:
1. `'BASE_DA_PILHA'` está escrito como texto, então ele procura um contêiner com id igual a "BASE_DA_PILHA", e isso não existe. Contei e deu 0 nós
2. a seta está ao contrário. No gerador a aresta é `(topo)-[:EMPILHADO_SOBRE]->(base)`, ou seja, sai de quem está em cima e aponta pra quem está embaixo. Os contêineres presos acima da base são os que **apontam pra ela**. A consulta original sai da base seguindo a seta, mas a base é o último da pilha e não tem seta saindo

Conferi no meu grafo:

| | quantidade |
|---|---|
| setas saindo da K48 | 0 |
| setas chegando na K48 | 1 |

A pilha é: K51 em cima da K50, K50 em cima da K49 e K49 em cima da K48.

**Código corrigido:**

```cypher
MATCH (x:Container)-[:EMPILHADO_SOBRE*1..3]->(base:Container {id:'K48'})
RETURN DISTINCT x.id AS preso_acima_da_base
```

**Evidência depois:** voltaram **K49, K50 e K51**, que são os 3 que ficam presos se tirarem a K48. Antes não voltava nenhum.

### (iv) contagem de perigosos sem DISTINCT

Arquivo: `c3_iv.cypher`

```cypher
MATCH (k:Container)-[:PASSOU_POR]->(t:Terminal) WHERE k.classe = 'Perigoso' RETURN t.nome, count(k)
```

**Sintoma.** Os números ficam maiores que a quantidade real de contêineres diferentes.

**Causa raiz.** O MATCH gera uma linha pra cada **aresta** PASSOU_POR, ou seja, pra cada passagem, e não pra cada contêiner. Como cada contêiner tem 2 passagens, se as duas forem no mesmo terminal, o mesmo contêiner vira 2 linhas, e o `count(k)` conta as linhas. Achei 6 contêineres perigosos que passaram duas vezes pelo mesmo terminal:

| container | terminal | passagens |
|---|---|---|
| K58 | T1 | 2 |
| K73 | T1 | 2 |
| K7 | T2 | 2 |
| K84 | T2 | 2 |
| K51 | T3 | 2 |
| K38 | T4 | 2 |

**Código corrigido:**

```cypher
MATCH (k:Container)-[:PASSOU_POR]->(t:Terminal) WHERE k.classe = 'Perigoso'
RETURN t.nome AS terminal, count(DISTINCT k) AS conteineres_perigosos
```

**Evidência, antes e depois lado a lado:**

| terminal | count(k), original | count(DISTINCT k), corrigido |
|---|---|---|
| T1 | 8 | **6** |
| T2 | 11 | **9** |
| T3 | 8 | **7** |
| T4 | 11 | **10** |
| T5 | 2 | **2** |

A diferença em cada terminal é exatamente o número de contêineres da tabela de cima: 2 no T1, 2 no T2, 1 no T3, 1 no T4 e nenhum no T5.
