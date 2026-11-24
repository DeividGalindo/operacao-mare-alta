// C3 (iv) — original
MATCH (k:Container)-[:PASSOU_POR]->(t:Terminal) WHERE k.classe = 'Perigoso' RETURN t.nome, count(k) ORDER BY t.nome;

// contêineres perigosos que passaram 2 vezes pelo mesmo terminal
MATCH (k:Container)-[p:PASSOU_POR]->(t:Terminal) WHERE k.classe = 'Perigoso'
WITH k, t, count(p) AS passagens WHERE passagens > 1
RETURN k.id AS container, t.nome AS terminal, passagens ORDER BY terminal;

// corrigido, do lado do original pra comparar
MATCH (k:Container)-[:PASSOU_POR]->(t:Terminal) WHERE k.classe = 'Perigoso'
RETURN t.nome AS terminal, count(k) AS original, count(DISTINCT k) AS distintos ORDER BY terminal;
