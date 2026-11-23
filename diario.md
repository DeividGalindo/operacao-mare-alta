# Diário de bordo

---

## Preparação

No `logiporto_gerador.js` o comentário `// String de propósito (armadilha da A3)` quebrou, e o "propósito (armadilha da A3)" foi parar sozinho na linha de baixo, como se fosse código. No `grafo_gerador.js` foi pior: o `"Empresa` ficou numa linha e o `" + i` na outra, e vários `print("UNWIND ...` também vieram partidos no meio da string, o que dá erro de string não fechada.

Juntei essas linhas e não mexi em mais nada. Tomei cuidado com isso porque, se eu mudasse a ordem de alguma chamada do `rand()`, o meu banco ia sair diferente do que foi proposto.

**RA com dígito.** Meu RA é 24173416-2. O gerador pede só números, então coloquei `241734162`.

**Sem mongosh no PC.** Eu não tenho o mongosh instalado no Windows, então usei o que já vem dentro do container do Mongo (`docker exec mongo-lab mongosh ...`). No Git Bash eu deixo o `MSYS_NO_PATHCONV=1` ligado, porque ele costuma trocar caminhos tipo `/tmp/...` por caminho do Windows.

**Carga.** O gerador do Mongo levou uns 18 segundos. O `grafo.cypher` rodou inteiro de uma vez no cypher-shell, sem precisar ir bloco por bloco. Conferi as contagens no final e bateu tudo.
