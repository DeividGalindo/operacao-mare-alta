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

## B2

**A previsão da saída bateu, mas com uma surpresa.** Eu tinha chutado `kg_total` 0 e 0 ou 1 documento. Veio 1 documento, o T2 Granel, com kg_total 0. Só que, quando rodei o mesmo pipeline pelo explain, o `$match` do final devolveu **2** documentos. Primeiro achei que tinha errado alguma coisa no script, mas o pipeline era o mesmo. O problema é o `$limit` antes do `$sort`: ele pega os 3 primeiros grupos que saírem do `$group`, e essa ordem não é fixa. Ou seja, o bug não só dá o resultado errado, ele dá um resultado diferente cada vez que roda.

**O otimizador mexeu na ordem.** No explain do original, os estágios apareceram como `$limit` → `$match` → `$sort`, e não `$limit` → `$sort` → `$match` como está no código. O Mongo passou o `$match` pra antes do `$sort`, porque filtrar antes de ordenar dá o mesmo resultado. Mas ele não pode passar o `$match` pra antes do `$limit`, porque aí mudaria o resultado. Por isso o otimizador não salva esse pipeline: o erro de lógica continua lá.

**A prova com o código de autenticidade funcionou.** Eu não tinha outro jeito fácil de saber se a soma estava certa, então usei o próprio código: o T2 deu 19.995 movimentações e o resto da divisão do peso total por 99991 deu 61.269, exatamente os números do código.

## C1

**A E12 não tem nenhum sócio.** Quando fui pegar o subgrafo real, pesquisei a SOCIA_DE nos dois sentidos, porque não sabia se "sócios diretos" ia dar seta saindo ou chegando. Só veio seta saindo: a E12 tem 68% da E10 e 84% da E9, e ninguém tem parte da E12. Coloquei isso no diagrama.

**Mais contêineres do que eu achava.** Pensei que a E12 teria só os 3 que o gerador força, K0, K1 e K2, mais um ou outro. Mas ela tem 10. O gerador sorteia o dono de todos os 90 e alguns caíram nela também.

## C2

**Errei a ordem de grandeza.** Eu tinha previsto de 0 a 5 linhas e vieram **10**. Errei em duas contas:
- achei que a E12 ia alcançar de 3 a 7 empresas em 3 níveis, e foram **14**. Eu calculei como se cada empresa tivesse só 1,5 saída, mas a E12 já começa com 2, e no caminho estão a E9 e a E14, que são sócias de 4 empresas cada
- achei que a E12 teria umas 6 passagens, e são **20**, porque ela tem 10 contêineres e não 3

Refazendo a conta com esses números, 14 empresas com umas 6 passagens cada dá umas 84 passagens. Cada uma tem chance de umas 20 / 150 de bater com alguma da E12, o que dá uns 11. Bem perto dos 10 que vieram.

**A direção eu mantive.** Ela saiu como eu tinha pensado. Testei os outros dois sentidos só pra comparar: contra a seta voltou nada, porque ninguém é sócio da E12, e sem direção voltaram 23 empresas.

**Uma consulta que não voltou nada.** A consulta "chegando na sancionada" não imprimiu nenhuma linha, nem o 0. Fiquei sem entender, até ver que, se o MATCH não acha nada, o RETURN não roda, então nem o count aparece. Pra deixar isso provado, fiz uma consulta separada contando as setas que chegam na E12, e deu 0.

**O DISTINCT fez diferença de verdade.** Na conferência apareceu o K64 da Empresa 1 duas vezes no T3 em 17/10, uma por causa do K0 e outra por causa do K51, que são dois contêineres da E12 que passaram lá no mesmo dia. No resultado final ele aparece uma vez só por causa do `RETURN DISTINCT`.

## C3

**No (i) descobri que a aresta já existia.** Antes de rodar o CREATE errado, contei as arestas E1 → E2 só pra ter o "antes", e deu 1. Fui no `grafo.cypher` e vi que o gerador já tinha criado a E1 sócia da E2 com pct 14. Isso mudou a correção. Se eu fizesse `MERGE (a)-[:SOCIA_DE {pct:30}]->(b)`, o MERGE ia procurar a aresta com pct 30 junto, não ia achar, porque a que existe tem 14, e ia criar outra aresta. Por isso fiz `MERGE (a)-[r:SOCIA_DE]->(b) SET r.pct = 30`, que acha a aresta que já existe e só atualiza o valor.

**Pra apagar os duplicados do (i)** eu precisava separar os nós falsos dos verdadeiros, já que os dois têm o mesmo cnpj. Reparei que o CREATE só colocou o cnpj, sem nome, então apaguei os Empresa com nome nulo. Depois de apagar o total voltou pra 30 empresas, então eram só aqueles 2 mesmo.

**No (ii) achei que ia travar.** A prova avisava que podia travar o Neo4j, então rodei com LIMIT 20 e um timeout de 30 segundos. Voltou em uns 5 segundos, porque o LIMIT faz ele parar quando junta 20. Mas já dava pra ver empresas repetidas nas 20 linhas. Não rodei o original sem limite. Pra mostrar a explosão, fui medindo a quantidade de caminhos com 2, 4, 6 e 8 saltos, e ela multiplica por umas 7 vezes a cada 2 saltos.

**O (iii) tinha dois erros, não um.** Primeiro achei que era só trocar o 'BASE_DA_PILHA' pelo K48. Troquei e continuou vazio. Aí fui ver as setas: a K48 tem 0 saindo e 1 chegando. A seta vai de quem está em cima pra quem está embaixo, então tinha que inverter.

**No (iv)** achei curioso que o K51 aparece entre os que passaram duas vezes no mesmo terminal, e ele também é um contêiner da E12 e o topo da pilha da K48.
