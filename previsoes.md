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

## A3 — O TTL que não apaga

Pelo que eu vi no gerador, o `registrado_em` é criado com `new Date(...).toISOString()`. Esse `toISOString()` transforma a data num **texto**, tipo "2026-03-10T14:22:00.000Z".

**Minha hipótese:** o TTL do Mongo só apaga documentos quando o campo do índice é do tipo **Date**. Como aqui o campo é string, o processo que limpa os documentos vencidos ignora todos eles, e nada nunca expira, não importa quanto tempo passe.

Outras coisas que poderiam ser, caso essa hipótese esteja errada:
- o `expireAfterSeconds` ter sido colocado com valor errado
- o processo do TTL ainda não ter rodado, mas ele roda a cada 60 segundos e o enunciado fala em horas, então acho difícil
- o índice ter sido criado em outro campo

Espero que um `countDocuments` com `$type: "string"` dê **100 mil** e com `$type: "date"` dê **0**.

## A4 — Consulta coberta

Índice que vou criar: `{ tipo: 1, terminal: 1, container: 1 }`. Os dois campos do filtro são igualdade e o `container` é o único campo que a projeção devolve, então tudo o que a consulta precisa fica dentro do índice.

Conta: são 5 tipos e 5 terminais, então inspecao + T2 deve dar uns 400.000 / 25 = **16 mil** documentos.

**Com `_id: 0`**
- stage: IXSCAN → PROJECTION_COVERED
- totalKeysExamined: uns 16 mil
- totalDocsExamined: **0**
- SORT em memória: não, a consulta nem pede ordenação
- nReturned: uns 16 mil

**Sem `_id: 0`**
- stage: IXSCAN → FETCH → PROJECTION_SIMPLE
- totalKeysExamined: uns 16 mil, igual
- totalDocsExamined: uns 16 mil. O `_id` volta por padrão e não está no índice, então ele vai ter que abrir cada documento só pra pegar o `_id`
- SORT em memória: não
- nReturned: uns 16 mil

## B1 — Relatório gerencial

Conta: Granel é 1/4 das 400 mil, uns 100 mil. Com ts >= 01/06 sobra mais ou menos metade, igual na A1, então devem entrar uns **50 mil** documentos no `$group`.

O pipeline vai ser `$match` → `$group` → `$sort` → `$limit` → `$project`.

**Sem índice pro $match**
- stage: COLLSCAN. Os índices que já existem não começam por classe, então não servem
- totalDocsExamined: 400.000
- totalKeysExamined: 0
- docs entrando no $group: uns 50 mil

**Com o índice `{ classe: 1, ts: 1, terminal: 1, peso_kg: 1 }`**
- classe vem primeiro porque é igualdade e ts depois porque é range, igual a ESR. Coloquei terminal e peso_kg no final porque são os únicos outros campos que o pipeline usa
- stage: IXSCAN. Acho que fica coberto, com PROJECTION_COVERED, porque tudo o que o $group precisa está no índice
- totalKeysExamined: uns 50 mil
- totalDocsExamined: **0**, se ficar coberto mesmo
- docs entrando no $group: uns 50 mil, o mesmo número, porque o índice muda o caminho e não o resultado
- SORT em memória: tem o `$sort` do pipeline, mas ele ordena só os 5 terminais, então não pesa nada
- nReturned do pipeline: **3**

## B2 — Debug arquitetural

Olhando o pipeline antes de rodar, vejo estes problemas:
1. `$sum: "peso_kg"` está sem o `$`, então é um texto e não o campo. Acho que vai somar 0
2. o `$project` do começo só deixa terminal e classe, então o peso some antes do $group
3. o `$limit: 3` vem antes do `$sort`, então pega 3 grupos quaisquer e não os 3 maiores
4. o `$match` da classe está no final, então agrupa tudo das 4 classes e não usa índice nenhum
5. agrupa por terminal e classe juntos, o que dá 20 grupos em vez de 5

**a) saída do original:** acho que o `kg_total` vai dar **0** em tudo. O $group gera 20 grupos, o $limit pega 3 quaisquer e o $match só deixa os que forem Granel. A chance é de sair **0 ou 1 documento**, no máximo 3.

**Plano do original**
- stage: COLLSCAN, sem filtro nenhum no começo
- totalDocsExamined: 400.000
- totalKeysExamined: 0
- SORT: tem o `$sort`, mas em cima de só 3 grupos

**Plano do corrigido**, com $match primeiro, $sum com `$`, $sort antes do $limit e agrupando só por terminal
- stage: IXSCAN usando o índice da B1, porque ele começa por classe. Deve ficar coberto também
- totalKeysExamined: uns **100 mil**, todo o Granel do ano
- totalDocsExamined: 0
- nReturned: 3

Pra provar que o corrigido está certo vou usar o código de autenticidade: LP-241734162-**19995**-**61269**. O gerador calcula esses números pra Granel + T2 no período todo, então a linha do T2 tem que dar mov = 19.995 e kg_total % 99991 = 61.269.
