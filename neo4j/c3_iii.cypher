// C3 (iii) — original, do jeito que veio
MATCH (base:Container {id:'BASE_DA_PILHA'})-[:EMPILHADO_SOBRE*1..3]->(x:Container) RETURN x.id;
MATCH (base:Container {id:'BASE_DA_PILHA'}) RETURN count(base) AS nos_com_id_BASE_DA_PILHA;

// original só trocando pelo id real da minha base
MATCH (base:Container {id:'K48'})-[:EMPILHADO_SOBRE*1..3]->(x:Container) RETURN x.id;
MATCH (:Container {id:'K48'})-[r:EMPILHADO_SOBRE]->() RETURN count(r) AS setas_saindo_da_K48;
MATCH ()-[r:EMPILHADO_SOBRE]->(:Container {id:'K48'}) RETURN count(r) AS setas_chegando_na_K48;

// a pilha inteira
MATCH (a:Container)-[:EMPILHADO_SOBRE]->(b:Container) WHERE b.id IN ['K48','K49','K50']
RETURN a.id AS em_cima, b.id AS embaixo ORDER BY embaixo;

// corrigido
MATCH (x:Container)-[:EMPILHADO_SOBRE*1..3]->(base:Container {id:'K48'})
RETURN DISTINCT x.id AS preso_acima_da_base ORDER BY preso_acima_da_base;
