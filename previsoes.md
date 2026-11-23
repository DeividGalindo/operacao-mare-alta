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

## A2 — Incidente no pátio

O INCIDENTE é -25.4880, -48.5160 no formato do Google Maps, que é lat, lon. No GeoJSON a ordem é **[lon, lat]**, então vou usar `[-48.5160, -25.4880]`.

**Antes do índice**
- Acho que vai dar **erro**, algo como "unable to find index for $geoNear query". O `$near` precisa de índice geoespacial pra funcionar, não faz COLLSCAN.

**Depois do índice 2dsphere**
- stage: algo como GEO_NEAR_2DSPHERE com IXSCAN e FETCH por dentro, e LIMIT no topo
- SORT em memória: **não**, porque o `$near` já devolve ordenado pela distância
- nReturned: **10**. Os pontos estão espalhados num quadrado de mais ou menos 5 km × 5,5 km, que é 0,05° de lat e de lon, uns 28 km². Um círculo de 300 m tem uns 0,28 km², então cabem uns 400.000 × 0,28 / 28 ≈ **4 mil** pontos dentro do raio. Dá e sobra pra 10.
- totalKeysExamined e totalDocsExamined: **dezenas até algumas centenas**. Ele começa pelo pedaço mais perto do ponto e vai aumentando, não precisa olhar os 4 mil.
