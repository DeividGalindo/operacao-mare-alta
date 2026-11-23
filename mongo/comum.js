// Parâmetros da minha prova (saída do gerador) e uma função pra resumir o explain.
globalThis.CLASSE_ALVO   = "Granel";
globalThis.TERMINAL_ALVO = "T2";
globalThis.DATA_CORTE    = new Date("2026-06-01T00:00:00Z"); // tem que ser Date, não string
globalThis.INCIDENTE_LAT = -25.4880;   // Google Maps dá "lat, lon"
globalThis.INCIDENTE_LON = -48.5160;

// apaga um índice se existir (pra poder rodar o script de novo)
globalThis.tentaDropar = function (colecao, nome) {
  try { db.getCollection(colecao).dropIndex(nome); } catch (e) { }
};

function cadeia(st) {
  const nomes = [];
  while (st) {
    nomes.push(st.stage);
    st = st.inputStage || (st.inputStages ? st.inputStages[0] : null);
  }
  return nomes.join(" -> ");
}

function arvore(st, nivel, linhas) {
  if (!st || typeof st !== "object") return;
  let l = "  ".repeat(nivel) + st.stage;
  if (st.nReturned !== undefined) l += "  nReturned=" + st.nReturned;
  if (st.keysExamined !== undefined) l += "  keysExamined=" + st.keysExamined;
  if (st.docsExamined !== undefined) l += "  docsExamined=" + st.docsExamined;
  linhas.push(l);
  ["inputStage", "outerStage", "innerStage", "thenStage", "elseStage"].forEach(k => arvore(st[k], nivel + 1, linhas));
  (st.inputStages || []).forEach(s => arvore(s, nivel + 1, linhas));
}

// imprime as métricas pedidas e salva o JSON completo do explain em /prova/explain/<arquivo>.json
globalThis.resumo = function (titulo, exp, arquivo) {
  const cur = exp.stages ? exp.stages[0].$cursor : exp;
  const wp = cur.queryPlanner.winningPlan;
  const es = cur.executionStats;
  print("\n==================== " + titulo + " ====================");
  print("plano               : " + cadeia(wp.queryPlan || wp));
  print("nReturned           : " + es.nReturned);
  print("totalDocsExamined   : " + es.totalDocsExamined);
  print("totalKeysExamined   : " + es.totalKeysExamined);
  print("executionTimeMillis : " + es.executionTimeMillis);
  const linhas = []; arvore(es.executionStages, 1, linhas);
  print("executionStages:"); linhas.forEach(l => print(l));
  if (exp.stages) {
    print("estágios do pipeline:");
    exp.stages.forEach((s, i) => {
      const nome = Object.keys(s).find(k => k.startsWith("$"));
      print("  [" + i + "] " + nome + (s.nReturned !== undefined ? "  nReturned=" + s.nReturned : ""));
    });
  }
  if (arquivo) {
    const fs = require("fs");
    fs.mkdirSync("/prova/explain", { recursive: true });
    fs.writeFileSync("/prova/explain/" + arquivo + ".json", EJSON.stringify(exp, null, 2));  }
};
