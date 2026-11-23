// Auditoria de índices
print("==== movimentacoes ====");
db.movimentacoes.getIndexes().forEach(i => print("  " + i.name + "  " + EJSON.stringify(i.key)));
print("\n==== alertas ====");
db.alertas.getIndexes().forEach(i => print("  " + i.name + "  " + EJSON.stringify(i.key) +
  (i.expireAfterSeconds !== undefined ? "  expireAfterSeconds: " + i.expireAfterSeconds : "")));
