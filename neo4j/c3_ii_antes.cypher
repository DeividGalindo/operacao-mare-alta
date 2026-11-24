// C3 (ii) — original com LIMIT 20
MATCH (s:Empresa {sancionada:true})-[:SOCIA_DE*]-(x:Empresa) RETURN x.nome LIMIT 20;
