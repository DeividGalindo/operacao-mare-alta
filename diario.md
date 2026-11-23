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
