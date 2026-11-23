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

---

## A2 — Incidente no pátio

Script: `mongo/a2.js` · saída: `mongo/saidas/a2.txt`

O INCIDENTE veio como `-25.4880, -48.5160`, que é o formato do Google Maps: latitude primeiro. O GeoJSON é o contrário, longitude primeiro, então o ponto fica `[-48.5160, -25.4880]`.

```js
db.movimentacoes.find({
  posicao: {
    $near: {
      $geometry: { type: "Point", coordinates: [-48.5160, -25.4880] },
      $maxDistance: 300
    }
  }
}).limit(10)
```

**Antes do índice** deu erro:

```
unable to find index for $geoNear query
```

O `$near` precisa calcular distância e devolver em ordem de proximidade, e o Mongo só faz isso com um índice geoespacial. Ele nem tenta varrer a coleção, já recusa a consulta.

**Índice criado:**

```js
db.movimentacoes.createIndex({ posicao: "2dsphere" })
```

Usei `2dsphere` porque os pontos estão em GeoJSON, com coordenadas de verdade na Terra, e a distância é em metros.

**Resultado**, já do mais perto pro mais longe:

| # | container | tipo | terminal |
|---|---|---|---|
| 1 | CTN30338 | descarga | T4 |
| 2 | CTN59133 | carga | T2 |
| 3 | CTN48531 | carga | T3 |
| 4 | CTN27149 | gate_out | T2 |
| 5 | CTN49183 | inspecao | T5 |
| 6 | CTN26829 | carga | T4 |
| 7 | CTN16260 | descarga | T3 |
| 8 | CTN57783 | inspecao | T4 |
| 9 | CTN41368 | inspecao | T3 |
| 10 | CTN32044 | gate_in | T2 |

**Explain:**

| métrica | valor |
|---|---|
| plano | IXSCAN → FETCH → GEO_NEAR_2DSPHERE → LIMIT |
| nReturned | 10 |
| totalKeysExamined | 63 |
| totalDocsExamined | 35 |
| executionTimeMillis | 1 |

Cada etapa, de baixo pra cima:

- **IXSCAN**: o índice 2dsphere divide a superfície da Terra em células. O Mongo não olha a coleção toda, ele pega só as células que ficam em volta do ponto, começando pelas mais próximas. Leu 63 chaves.
- **FETCH**: abre os documentos dessas células, 35 no total, pra pegar a coordenada exata e calcular a distância de verdade até o incidente.
- **GEO_NEAR_2DSPHERE**: é o estágio que organiza a busca em "anéis". Ele procura num anel pequeno em volta do ponto, ordena o que achou pela distância e, se ainda faltar resultado, aumenta o anel. Por isso não aparece SORT: o resultado já sai em ordem de proximidade.
- **LIMIT**: quando chegou em 10, parou. Mesmo tendo uns 4 mil pontos dentro dos 300 m, ele só precisou mexer em 35 documentos.

---

## A3 — O TTL que não apaga

Script: `mongo/a3.js` · saída: `mongo/saidas/a3.txt`

**Comprovação no banco.** Primeiro olhei um documento:

```
{ sensor: 'S252', nivel: 'critico', registrado_em: '2026-05-08T19:22:02.796Z' }
```

A data está entre aspas, ou seja, é texto. Pra ter certeza de que não era só esse, agrupei pelo tipo do campo:

```js
db.alertas.aggregate([
  { $group: { _id: { $type: "$registrado_em" }, qtd: { $sum: 1 } } }
])
// [ { _id: 'string', qtd: 100000 } ]
```

Os **100.000** alertas têm o `registrado_em` como string. Nenhum é Date.

Depois criei o índice TTL igual ao do desenvolvedor anterior e coloquei dois alertas de teste com a mesma data antiga, 01/01/2026: um gravado como Date e o outro como string. Esperei 130 segundos:

| | antes | depois de 130 s |
|---|---|---|
| ttl.passes | 51 | 53 |
| ttl.deletedDocuments | 8 | 9 |
| alerta TESTE_DATE | existe | **apagado** |
| alerta TESTE_STRING | existe | **continua lá** |
| total de alertas | 100.002 | 100.001 |

O processo do TTL rodou duas vezes nesse tempo e apagou só o de Date. O de string, com a mesma data, ficou, assim como os 100 mil antigos.

**Causa raiz.** No gerador o campo é gravado com `new Date(...).toISOString()`, e o `toISOString()` converte a data em texto. O TTL do MongoDB funciona com uma tarefa em segundo plano que roda a cada 60 segundos e apaga os documentos em que o campo do índice é um **Date** mais antigo que agora menos o `expireAfterSeconds`. Se o valor não é Date, o documento não entra na conta e nunca expira. O índice existe e a tarefa roda, mas nenhum documento serve pra ela.

**Comando de índice correto:**

```js
db.alertas.createIndex(
  { registrado_em: 1 },
  { expireAfterSeconds: 2592000 }
)
```

2592000 segundos = 30 × 24 × 60 × 60 = 30 dias. O comando em si já estava certo, o problema era o tipo do dado.

**Como a aplicação deve gravar os alertas novos:**

```js
db.alertas.insertOne({
  sensor: "S252",
  nivel: "critico",
  registrado_em: new Date()
})
```

Tem que mandar um `Date` de verdade, sem `.toISOString()` nem nenhuma conversão pra texto. Assim cada alerta novo é apagado sozinho 30 dias depois.
