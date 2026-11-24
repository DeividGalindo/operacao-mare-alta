// C1 — sancionada e sócios diretos, nos dois sentidos, com o pct
MATCH (s:Empresa {sancionada: true})-[r:SOCIA_DE]-(x:Empresa)
RETURN startNode(r).cnpj AS socia, endNode(r).cnpj AS participada, r.pct AS pct
ORDER BY socia, participada;

// contêineres da sancionada
MATCH (s:Empresa {sancionada: true})<-[:PERTENCE_A]-(k:Container)
RETURN s.cnpj AS empresa, k.id AS container, k.classe AS classe
ORDER BY container;
