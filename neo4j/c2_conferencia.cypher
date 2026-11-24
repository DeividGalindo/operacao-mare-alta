// C2 — conferência: qual contêiner da sancionada cruzou com cada contêiner investigado
MATCH (s:Empresa {sancionada: true})-[:SOCIA_DE*1..3]->(x:Empresa)
WHERE x <> s
WITH DISTINCT s, x
MATCH (s)<-[:PERTENCE_A]-(ks:Container)-[ps:PASSOU_POR]->(t:Terminal)<-[px:PASSOU_POR]-(kx:Container)-[:PERTENCE_A]->(x)
WHERE ps.data = px.data
RETURN DISTINCT x.cnpj AS empresa, kx.id AS container, ks.id AS container_sancionada, t.nome AS terminal, px.data AS data
ORDER BY data, empresa;

// quantas empresas são sócias da sancionada
MATCH (s:Empresa {sancionada: true})<-[r:SOCIA_DE]-(x:Empresa)
RETURN count(r) AS setas_chegando_na_sancionada;
