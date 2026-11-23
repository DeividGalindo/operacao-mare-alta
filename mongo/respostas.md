# Respostas — MongoDB (Partes A e B)

Banco `logiporto`. Meus parâmetros: CLASSE_ALVO = Granel, TERMINAL_ALVO = T2, DATA_CORTE = 2026-06-01.

Cada questão tem um script em `mongo/`, a saída em `mongo/saidas/` e o JSON completo do explain em `mongo/explain/`. Rodei com `bash mongo/rodar.sh <questão>`.

---

## A1 — Painel do pátio

Script: `mongo/a1.js` · saída: `mongo/saidas/a1.txt`

```js
db.movimentacoes.find({
  terminal: "T2",
  classe: "Granel",
  ts: { $gte: ISODate("2026-06-01T00:00:00Z") }
}).sort({ peso_kg: -1 }).limit(20)
```

Contei com `countDocuments` e 9.886 documentos batem no filtro.

**a)** sem índice nenhum, só o `_id`

**b)**
```js
db.movimentacoes.createIndex({ terminal: 1, classe: 1, ts: 1, peso_kg: -1 })
```

**c)** removi o b) e criei pela regra ESR. Igualdade são terminal e classe, Sort é peso_kg e Range é ts:
```js
db.movimentacoes.dropIndex("terminal_1_classe_1_ts_1_peso_kg_-1")
db.movimentacoes.createIndex({ terminal: 1, classe: 1, peso_kg: -1, ts: 1 })
```

**d) Comparação**

| | a) sem índice | b) ordem do filtro | c) ESR |
|---|---|---|---|
| plano | COLLSCAN → SORT | IXSCAN → SORT → FETCH | IXSCAN → FETCH → LIMIT |
| totalDocsExamined | 400.000 | 20 | 20 |
| totalKeysExamined | 0 | 9.886 | 43 |
| nReturned | 20 | 20 | 20 |
| executionTimeMillis | 305 | 19 | 3 |
| SORT em memória | sim | **sim** | **não** |

O tempo muda de uma execução pra outra, o resto é sempre igual.

**Diferença entre b) e c)**

O índice é uma B-Tree e guarda as chaves ordenadas campo por campo, na ordem em que foram criadas.

No b) a ordem é terminal, classe, **ts**, peso. O Mongo vai direto pra parte da árvore que é T2 + Granel e percorre o pedaço com ts >= 01/06. Só que ali dentro as chaves estão em ordem de **data**, não de peso. O peso só serviria de desempate se dois documentos tivessem exatamente o mesmo ts, e isso praticamente não acontece. Então o índice não entrega na ordem que o `sort({peso_kg: -1})` pede. Ele precisou ler **todas as 9.886 chaves** do intervalo e fazer um **SORT em memória** pra achar os 20 mais pesados. Uma coisa que eu não esperava: como o peso está dentro do índice, ele ordenou usando só as chaves e só buscou os 20 documentos no final, por isso docsExamined = 20. Mesmo assim, o trabalho de ler as 9.886 chaves e ordenar continua lá.

No c) a ordem é terminal, classe, **peso**, ts. Depois das duas igualdades a próxima coisa na árvore já é o peso, do maior pro menor. Ou seja, o índice já está na ordem do sort. O Mongo vai descendo do mais pesado pro mais leve e confere o ts direto na chave. Se não passa, pula pra próxima. Quando junta 20 que passam, o LIMIT para tudo. Leu só **43 chaves**, abriu 20 documentos e **não teve SORT**.

O ponto é que o campo de range, que é o ts, tem que ficar **depois** do campo de ordenação. Um range pega vários valores e bagunça a ordem dos campos que vêm depois dele no índice. Por isso a ESR coloca o Range por último.
