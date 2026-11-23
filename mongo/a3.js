// A3 — O TTL que não apaga
load("/prova/comum.js");

print("==== documento de exemplo ====");
printjson(db.alertas.findOne({}, { _id: 0 }));

print("\n==== tipo do campo registrado_em ====");
printjson(db.alertas.aggregate([
  { $group: { _id: { $type: "$registrado_em" }, qtd: { $sum: 1 } } }
]).toArray());

// índice TTL igual ao que o dev anterior criou: 30 dias
db.alertas.createIndex({ registrado_em: 1 }, { expireAfterSeconds: 2592000 });
print("\n==== índices de alertas ====");
printjson(db.alertas.getIndexes());

// dois alertas antigos de teste, mesma data: um Date e um string
db.alertas.deleteMany({ sensor: { $in: ["TESTE_DATE", "TESTE_STRING"] } });
db.alertas.insertMany([
  { sensor: "TESTE_DATE", nivel: "info", registrado_em: new Date("2026-01-01T00:00:00Z") },
  { sensor: "TESTE_STRING", nivel: "info", registrado_em: "2026-01-01T00:00:00.000Z" }
]);

const antes = db.serverStatus().metrics.ttl;
print("\n==== antes de esperar ====");
print("total de alertas: " + db.alertas.countDocuments({}));
print("ttl.passes: " + antes.passes + "  ttl.deletedDocuments: " + antes.deletedDocuments);

sleep(130000);

const depois = db.serverStatus().metrics.ttl;
print("\n==== depois de 130 segundos ====");
print("total de alertas: " + db.alertas.countDocuments({}));
print("ttl.passes: " + depois.passes + "  ttl.deletedDocuments: " + depois.deletedDocuments);
print("TESTE_DATE existe: " + (db.alertas.countDocuments({ sensor: "TESTE_DATE" }) > 0));
print("TESTE_STRING existe: " + (db.alertas.countDocuments({ sensor: "TESTE_STRING" }) > 0));

db.alertas.deleteMany({ sensor: "TESTE_STRING" });
print("total de alertas no fim: " + db.alertas.countDocuments({}));
