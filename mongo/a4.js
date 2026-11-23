// A4 — Consulta coberta
load("/prova/comum.js");

const filtro = { tipo: "inspecao", terminal: TERMINAL_ALVO };

tentaDropar("movimentacoes", "tipo_1_terminal_1_container_1");
db.movimentacoes.createIndex({ tipo: 1, terminal: 1, container: 1 });

print("documentos que batem no filtro: " + db.movimentacoes.countDocuments(filtro));

resumo("A4 com _id: 0", db.movimentacoes.find(filtro, { _id: 0, container: 1 }).explain("executionStats"), "a4_com_id0");
resumo("A4 sem _id: 0", db.movimentacoes.find(filtro, { container: 1 }).explain("executionStats"), "a4_sem_id0");

print("\níndices: " + JSON.stringify(db.movimentacoes.getIndexes().map(i => i.name)));
