// C3 (i) — corrigido: acha os nós que já existem e só cria a aresta
MATCH (a:Empresa {cnpj:'E1'}), (b:Empresa {cnpj:'E2'})
MERGE (a)-[r:SOCIA_DE]->(b)
SET r.pct = 30
RETURN a.nome AS socia, b.nome AS participada, r.pct AS pct;

// rodando de novo pra ver se duplica
MATCH (a:Empresa {cnpj:'E1'}), (b:Empresa {cnpj:'E2'})
MERGE (a)-[r:SOCIA_DE]->(b)
SET r.pct = 30;

MATCH (e:Empresa) WHERE e.cnpj IN ['E1', 'E2'] RETURN e.cnpj AS cnpj, count(*) AS nos ORDER BY cnpj;
MATCH (:Empresa {cnpj: 'E1'})-[r:SOCIA_DE]->(:Empresa {cnpj: 'E2'}) RETURN count(r) AS arestas_E1_E2, collect(r.pct) AS pct;
MATCH (e:Empresa) RETURN count(e) AS total_empresas;
