// C3 (ii) — corrigido: com direção, até 3 níveis, sem a própria sancionada e sem repetição
MATCH (s:Empresa {sancionada:true})-[:SOCIA_DE*1..3]->(x:Empresa)
WHERE x <> s
RETURN DISTINCT x.nome AS empresa ORDER BY empresa;
