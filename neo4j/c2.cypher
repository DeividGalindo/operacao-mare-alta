// C2 — empresas ligadas à sancionada por até 3 níveis, seguindo a seta de SOCIA_DE,
// que tenham contêiner no mesmo terminal e na mesma data que um contêiner da sancionada
MATCH (s:Empresa {sancionada: true})-[:SOCIA_DE*1..3]->(x:Empresa)
WHERE x <> s
WITH DISTINCT s, x
MATCH (s)<-[:PERTENCE_A]-(ks:Container)-[ps:PASSOU_POR]->(t:Terminal)<-[px:PASSOU_POR]-(kx:Container)-[:PERTENCE_A]->(x)
WHERE ps.data = px.data
RETURN DISTINCT x.nome AS empresa_investigada, kx.id AS container, t.nome AS terminal, px.data AS data
ORDER BY data, empresa_investigada;

// empresas alcançadas em cada sentido, pra comparar a direção
MATCH (s:Empresa {sancionada: true})-[:SOCIA_DE*1..3]->(x:Empresa) WHERE x <> s
RETURN "saindo da sancionada" AS sentido, count(DISTINCT x) AS empresas, collect(DISTINCT x.cnpj) AS quais;
MATCH (s:Empresa {sancionada: true})<-[:SOCIA_DE*1..3]-(x:Empresa) WHERE x <> s
RETURN "chegando na sancionada" AS sentido, count(DISTINCT x) AS empresas, collect(DISTINCT x.cnpj) AS quais;
MATCH (s:Empresa {sancionada: true})-[:SOCIA_DE*1..3]-(x:Empresa) WHERE x <> s
RETURN "sem direção" AS sentido, count(DISTINCT x) AS empresas, collect(DISTINCT x.cnpj) AS quais;
