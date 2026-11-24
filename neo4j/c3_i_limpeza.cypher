// C3 (i) — apaga os nós duplicados: são os únicos Empresa sem nome
MATCH (e:Empresa) WHERE e.nome IS NULL DETACH DELETE e;
MATCH (e:Empresa) WHERE e.cnpj IN ['E1', 'E2'] RETURN e.cnpj AS cnpj, count(*) AS nos ORDER BY cnpj;
MATCH (e:Empresa) RETURN count(e) AS total_empresas;
