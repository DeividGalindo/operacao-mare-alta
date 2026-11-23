# Previsões

## A1 — Painel do pátio

Contas que fiz antes:
- O próprio código de autenticidade já mostra que Granel + T2 tem **19.995** movimentações.
- O `ts` vai de 01/01 até uns 300 dias depois. O meu corte é 01/06, que é o dia 151, então sobra uns (300 - 151) / 300 ≈ 50% do período.
- Então o filtro completo deve pegar uns **10 mil** documentos.

**a) sem índice**
- stage: COLLSCAN e depois um SORT em memória (com limit 20)
- totalDocsExamined: 400.000 
- totalKeysExamined: 0 
- SORT em memória: sim
- nReturned: 20
- tempo: algumas centenas de ms

**b) índice {terminal: 1, classe: 1, ts: 1, peso_kg: -1}**
- stage: IXSCAN → FETCH → SORT
- totalKeysExamined: uns 10 mil 
- totalDocsExamined: uns 10 mil também
- SORT em memória: **sim**. Depois do terminal e da classe o índice fica ordenado por ts, não por peso. O peso só desempata quando o ts é igual, o que quase nunca acontece.
- nReturned: 20
- tempo: bem menor que o a), umas dezenas de ms

**c) índice ESR {terminal: 1, classe: 1, peso_kg: -1, ts: 1}**
- E = terminal e classe, S = peso_kg, R = ts
- stage: IXSCAN → FETCH → LIMIT, **sem SORT**
- totalKeysExamined: poucas dezenas. Ele vai do maior peso pro menor e metade das chaves não passa no ts, então deve ler umas 40 chaves pra achar 20 que passam (talvez um pouco mais).
- totalDocsExamined: 20
- SORT em memória: não
- nReturned: 20
- tempo: perto de 0 ms
