// A1 — Painel do pátio
load("/prova/comum.js");

const filtro = { terminal: TERMINAL_ALVO, classe: CLASSE_ALVO, ts: { $gte: DATA_CORTE } };
const consulta = () => db.movimentacoes.find(filtro).sort({ peso_kg: -1 }).limit(20);

tentaDropar("movimentacoes", "terminal_1_classe_1_ts_1_peso_kg_-1");
tentaDropar("movimentacoes", "terminal_1_classe_1_peso_kg_-1_ts_1");

print("índices antes: " + JSON.stringify(db.movimentacoes.getIndexes().map(i => i.name)));
print("documentos que batem no filtro: " + db.movimentacoes.countDocuments(filtro));

// a) sem índice
resumo("A1 a) SEM ÍNDICE", consulta().explain("executionStats"), "a1_a_sem_indice");

// b) índice na ordem do filtro
db.movimentacoes.createIndex({ terminal: 1, classe: 1, ts: 1, peso_kg: -1 });
resumo("A1 b) {terminal:1, classe:1, ts:1, peso_kg:-1}", consulta().explain("executionStats"), "a1_b_ordem_filtro");

// c) tira o b) e cria pela ESR: Equality (terminal, classe) -> Sort (peso_kg) -> Range (ts)
db.movimentacoes.dropIndex("terminal_1_classe_1_ts_1_peso_kg_-1");
db.movimentacoes.createIndex({ terminal: 1, classe: 1, peso_kg: -1, ts: 1 });
resumo("A1 c) ESR {terminal:1, classe:1, peso_kg:-1, ts:1}", consulta().explain("executionStats"), "a1_c_esr");

print("\ntop 5 do resultado:");
consulta().limit(5).forEach(d => print("  " + d.container + "  peso_kg=" + d.peso_kg + "  ts=" + d.ts.toISOString()));

print("\nfiltro com ts >= '2026-06-01' em string: " +
  db.movimentacoes.countDocuments({ terminal: TERMINAL_ALVO, classe: CLASSE_ALVO, ts: { $gte: "2026-06-01" } }) + " documentos");

print("\níndices depois: " + JSON.stringify(db.movimentacoes.getIndexes().map(i => i.name)));
