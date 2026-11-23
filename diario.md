# Diário de bordo

---

## Preparação

No `logiporto_gerador.js` o comentário do final do campo registrado_em quebrou, e o pedaço "propósito, armadilha da A3" foi parar sozinho na linha de baixo, como se fosse código. No `grafo_gerador.js` foi pior: o `"Empresa` ficou numa linha e o `" + i` na outra, e vários `print("UNWIND ...` também vieram partidos no meio da string, o que dá erro de string não fechada.

Juntei essas linhas e não mexi em mais nada. Tomei cuidado com isso porque, se eu mudasse a ordem de alguma chamada do `rand()`, o meu banco ia sair diferente do que foi proposto.

**RA com dígito.** Meu RA é 24173416-2. O gerador pede só números, então coloquei `241734162`.

**Sem mongosh no PC.** Eu não tenho o mongosh instalado no Windows, então usei o que já vem dentro do container do Mongo com `docker exec mongo-lab mongosh`. No Git Bash eu deixo o `MSYS_NO_PATHCONV=1` ligado, porque ele costuma trocar caminhos tipo `/tmp/...` por caminho do Windows.

**Carga.** O gerador do Mongo levou uns 18 segundos. O `grafo.cypher` rodou inteiro de uma vez no cypher-shell, sem precisar ir bloco por bloco. Conferi as contagens no final e bateu tudo.

## A1

**Errei a previsão do b).** Eu achava que com o índice {terminal, classe, ts, peso_kg} ele ia abrir uns 10 mil documentos e depois ordenar. A parte das chaves acertei: totalKeysExamined deu 9.886. Mas o totalDocsExamined deu só **20**. Olhando o plano, a ordem era IXSCAN → SORT → FETCH, e não IXSCAN → FETCH → SORT. Como o peso_kg está dentro do índice, ele ordenou usando só as chaves e só buscou no disco os 20 que sobraram. O SORT em memória continua lá, que era o principal, mas ele é mais esperto do que eu pensei pra buscar os documentos.

**O c) bateu.** Previ umas 40 chaves e deu 43, com 20 documentos e sem SORT.

**Teste do DATA_CORTE como texto.** Fiquei na dúvida se dava pra escrever a data direto como `"2026-06-01"` no filtro. Testei: com `ts: { $gte: "2026-06-01" }` voltou **0 documentos**, contra 9.886 usando `new Date(...)`. O ts é Date e o Mongo não compara Date com string, porque são tipos diferentes no BSON, então ninguém passa no filtro. Por isso deixei o DATA_CORTE como Date no `comum.js`.

## A2

**Bateu quase tudo.** Deu o erro que eu esperava antes do índice e, depois, o plano veio com GEO_NEAR_2DSPHERE, sem SORT e com 10 resultados. Eu tinha chutado de dezenas a algumas centenas de documentos examinados e foram 35, com 63 chaves.

**Testei a ordem errada das coordenadas.** Fiquei curioso pra ver o que acontecia se eu colasse do jeito que o Google Maps mostra, latitude primeiro. Não dá erro nenhum, simplesmente volta **0 documentos**. Isso é perigoso, porque parece que não tem nada perto do incidente, quando na verdade o ponto foi parar em outro lugar do planeta. Com `[lon, lat]` vieram os 10.

## A3

**A hipótese principal estava certa.** Os 100 mil alertas estão com `registrado_em` em string, nenhum em Date.

**Como descartei as outras hipóteses.** O `getIndexes()` mostrou `expireAfterSeconds: 2592000`, que é exatamente 30 dias, então não era valor errado. O índice está no campo `registrado_em` mesmo. Sobre o TTL não ter rodado ainda: olhei o `serverStatus().metrics.ttl` e o `passes` foi de 51 pra 53 em 130 segundos, então ele está rodando sim.

**O teste que me convenceu.** Só ver que o campo era string não provava que era esse o motivo. Então coloquei dois alertas com a mesma data, 01/01/2026, um em Date e outro em string. Depois de esperar, o de Date sumiu e o de string ficou. Aí não tem mais dúvida.

**Uma coisa que me confundiu.** O `deletedDocuments` já estava em 8 antes do meu teste, e eu não tinha apagado nada. Acho que são coisas internas do próprio Mongo que também usam TTL. O que importa é que subiu só 1 depois do teste, que foi o alerta em Date.

## A4

**Bateu certinho.** Eu tinha chutado uns 16 mil e deram 16.143. Com `_id: 0` veio PROJECTION_COVERED e 0 documentos examinados. Sem ele, apareceu o FETCH e foram 16.143 documentos.

**O índice da A1 entrou na disputa.** Olhando o JSON do explain, vi que o índice da A1, o `terminal_1_classe_1_peso_kg_-1_ts_1`, apareceu como plano rejeitado. Faz sentido, porque ele começa por `terminal` e o filtro tem `terminal: "T2"`, então dava pra usar ele também. Só que por ele o Mongo teria que passar por todo o T2, de todos os tipos, e ainda abrir os documentos pra conferir o tipo. O índice novo ganhou porque já vai direto em inspecao + T2 e não precisa abrir nada.

## B1

**Bateu, até o coberto.** Eu tinha chutado uns 50 mil no $group e deram 49.423. Com o índice ficou PROJECTION_COVERED com 0 documentos lidos, como eu esperava.

**Me perdi um pouco pra achar o número que entrou no $group.** Eu esperava ver no explain um `stages` com o `$cursor` mostrando os documentos que saíam do $match e depois o `$group`. Mas o `$cursor` mostrou nReturned = 5, que é a saída do group, não a entrada. Olhando o plano, o Mongo 8 colocou o $group dentro do próprio plano da consulta, como um estágio GROUP. Aí tive que descer na árvore do executionStages e pegar o nReturned do estágio logo abaixo do group, que deu 49.423. Pra ter certeza, comparei com um `countDocuments` do mesmo filtro e bateu.
