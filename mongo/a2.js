// A2 — Incidente no pátio
load("/prova/comum.js");

// Google Maps dá "lat, lon"; GeoJSON é [lon, lat]
const ponto = { type: "Point", coordinates: [INCIDENTE_LON, INCIDENTE_LAT] };
const consulta = () => db.movimentacoes.find(
  { posicao: { $near: { $geometry: ponto, $maxDistance: 300 } } }
).limit(10);

tentaDropar("movimentacoes", "posicao_2dsphere");

print("==== antes do índice ====");
try {
  consulta().toArray();
} catch (e) {
  print("ERRO: " + e.message);
}

db.movimentacoes.createIndex({ posicao: "2dsphere" });

print("\n==== depois do índice 2dsphere ====");
consulta().forEach(d => print("  " + d.container + "  " + d.tipo + "  " + d.terminal + "  [lon, lat] = " + JSON.stringify(d.posicao.coordinates)));

resumo("A2 $near com 2dsphere", consulta().explain("executionStats"), "a2_near_2dsphere");

const invertido = db.movimentacoes.find(
  { posicao: { $near: { $geometry: { type: "Point", coordinates: [INCIDENTE_LAT, INCIDENTE_LON] }, $maxDistance: 300 } } }
).limit(10).toArray();
print("\ncoordenadas na ordem lat, lon: " + invertido.length + " documentos");

print("\níndices: " + JSON.stringify(db.movimentacoes.getIndexes().map(i => i.name)));
