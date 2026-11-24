// B2 — Debug arquitetural
load("/prova/comum.js");

const original = [
  { $project: { terminal: 1, classe: 1 } },
  {
    $group: {
      _id: { terminal: "$terminal", classe: "$classe" },
      kg_total: { $sum: "peso_kg" },
      mov: { $sum: 1 }
    }
  },
  { $limit: 3 },
  { $sort: { kg_total: -1 } },
  { $match: { "_id.classe": CLASSE_ALVO } }
];

const corrigido = [
  { $match: { classe: CLASSE_ALVO } },
  { $group: { _id: "$terminal", kg_total: { $sum: "$peso_kg" }, mov: { $sum: 1 } } },
  { $sort: { kg_total: -1 } },
  { $limit: 3 },
  { $project: { _id: 0, terminal: "$_id", kg_total: 1, mov: 1 } }
];

print("==== a) pipeline original ====");
printjson(db.movimentacoes.aggregate(original).toArray());

print("\n==== c) pipeline corrigido ====");
printjson(db.movimentacoes.aggregate(corrigido).toArray());

print("\n==== conferência: todos os terminais de " + CLASSE_ALVO + ", sem $limit ====");
const todos = db.movimentacoes.aggregate([
  { $match: { classe: CLASSE_ALVO } },
  { $group: { _id: "$terminal", kg_total: { $sum: "$peso_kg" }, mov: { $sum: 1 } } },
  { $sort: { kg_total: -1 } }
]).toArray();
todos.forEach(t => print("  " + t._id + "  kg_total=" + t.kg_total + "  mov=" + t.mov));
const alvo = todos.find(t => t._id === TERMINAL_ALVO);
print(TERMINAL_ALVO + ": mov=" + alvo.mov + "  kg_total % 99991 = " + (Number(String(alvo.kg_total)) % 99991));
print("código de autenticidade: LP-241734162-19995-61269");

resumo("B2 original", db.movimentacoes.explain("executionStats").aggregate(original), "b2_original");
resumo("B2 corrigido", db.movimentacoes.explain("executionStats").aggregate(corrigido), "b2_corrigido");
