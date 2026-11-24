// C3 (i) — antes: quantos nós E1 e E2 existem
MATCH (e:Empresa) WHERE e.cnpj IN ['E1', 'E2'] RETURN e.cnpj AS cnpj, count(*) AS nos ORDER BY cnpj;
MATCH (:Empresa {cnpj: 'E1'})-[r:SOCIA_DE]->(:Empresa {cnpj: 'E2'}) RETURN count(r) AS arestas_E1_E2;
MATCH (e:Empresa) RETURN count(e) AS total_empresas;

// código original
CREATE (a:Empresa {cnpj:'E1'})-[:SOCIA_DE {pct:30}]->(b:Empresa {cnpj:'E2'});

// depois do código original
MATCH (e:Empresa) WHERE e.cnpj IN ['E1', 'E2'] RETURN e.cnpj AS cnpj, count(*) AS nos, collect(e.nome) AS nomes ORDER BY cnpj;
MATCH (e:Empresa) RETURN count(e) AS total_empresas;
