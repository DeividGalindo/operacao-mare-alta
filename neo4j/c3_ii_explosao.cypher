// C3 (ii) — quantos caminhos existem sem direção, conforme aumenta a profundidade
MATCH p = (:Empresa {sancionada:true})-[:SOCIA_DE*1..2]-(:Empresa) RETURN 2 AS ate_saltos, count(p) AS caminhos;
MATCH p = (:Empresa {sancionada:true})-[:SOCIA_DE*1..4]-(:Empresa) RETURN 4 AS ate_saltos, count(p) AS caminhos;
MATCH p = (:Empresa {sancionada:true})-[:SOCIA_DE*1..6]-(:Empresa) RETURN 6 AS ate_saltos, count(p) AS caminhos;
MATCH p = (:Empresa {sancionada:true})-[:SOCIA_DE*1..8]-(:Empresa) RETURN 8 AS ate_saltos, count(p) AS caminhos;

// quantas vezes cada empresa se repete, até 4 saltos
MATCH (:Empresa {sancionada:true})-[:SOCIA_DE*1..4]-(x:Empresa)
RETURN x.nome AS empresa, count(*) AS vezes ORDER BY vezes DESC LIMIT 10;
