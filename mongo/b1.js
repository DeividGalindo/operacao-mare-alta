// B1 — Relatório gerencial
load("/prova/comum.js");

const pipeline = [
  { $match: { classe: CLASSE_ALVO, ts: { $gte: DATA_CORTE } } },
  { $group: {
      _id: "$terminal",
      total_movimentacoes: { $sum: 1 },
      peso_total: { $sum: "$peso_kg" },
      peso_medio: { $avg: "$peso_kg" },
      maior_peso: { $max: "$peso_kg" }
  } },
  { $sort: { peso_total: -1 } },
  { $limit: 3 },
  { $project: { _id: 0, terminal: "$_id", total_movimentacoes: 1, peso_total: 1, peso_medio: 1, maior_peso: 1 } }
];

tentaDropar("movimentacoes", "classe_1_ts_1_terminal_1_peso_kg_1");

resumo("B1 sem índice", db.movimentacoes.explain("executionStats").aggregate(pipeline), "b1_sem_indice");

db.movimentacoes.createIndex({ classe: 1, ts: 1, terminal: 1, peso_kg: 1 });

print("\n==== resultado ====");
printjson(db.movimentacoes.aggregate(pipeline).toArray());

resumo("B1 com índice {classe, ts, terminal, peso_kg}", db.movimentacoes.explain("executionStats").aggregate(pipeline), "b1_com_indice");

print("\ndocumentos que passam no $match: " + db.movimentacoes.countDocuments({ classe: CLASSE_ALVO, ts: { $gte: DATA_CORTE } }));
print("\níndices: " + JSON.stringify(db.movimentacoes.getIndexes().map(i => i.name)));
