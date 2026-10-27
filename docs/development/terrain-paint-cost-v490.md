# V490 — peinture identique, gain local retenu

**Qualifiée localement le 27 octobre 2026, schéma 296 inchangé ; enregistrement en clôture, non publiée.** Le gain retenu concerne le calcul de peinture, sans instantanéité ni gain global établi. Les correctifs de commandes V488 et du garde Monde V489 restent publiés séparément.

Le changement se limite à `paintPixels` dans `src/render/TerrainLayer.ts` : quatre offsets de palette calculés une fois par texel, hors boucle RGB, et classification de l'eau dans un masque propre à chaque appel, borné au rectangle peint et à ses voisins. Bruits, ordre flottant RGB/écume et Float32 restent identiques. Le domaine est celui des Worlds denses et stables déjà validés par le rendu ; l'ordre et le nombre de lectures du terrain changent, sans équivalence prétendue pour des accesseurs à effets de bord arbitraires. Le masque transitoire couvre62500octets pour250²,25octets pour un patch3×3 intérieur. Aucun cache entre appels, changement Core, schéma, règle ou résolution. Avant : `4a23b8c3e2cf98b3de92d307c6e8a2de525b71bf8914abceb23f1db066f97bd3` ; retenu : `84714ced9e33a380504ec1dea1c5fc6b5109bd57d7b425be1efcf1e4f2edd143`, réinstallé exactement par ROOT.

## Identité et qualification

Treize enregistrements RGBA/palette ont été acquis **avant** le candidat : oracle `baseline-oracle-20261027-061554-17552.json`, SHA `1e96882661602f0dac74087dbdd166ef08f6259567057227076581c6549389b9`. Terrains, pierres, eau, brouillard/révélations, échelles 8/7/1, rectangles non nuls, bords, chevauchements et changements 1/16/17 sont couverts. Le candidat reproduit ces données exactement ; les tests durables reprennent ces constantes sans recopier l'algorithme.

Les premiers voisins donnaient 24/27. Les trois rouges ont été reproduits **sur l'original 4a23** : deux attendaient le refus de 282 malgré le domaine actuel 281…296 ; le dernier attendait deux meshes d'eau dans une largeur 65 contenue dans un chunk de 128. Maintenance des seuls tests : rejet de 280/futur 297 conservé, admissions 282/296 explicites, fixture eau traversant réellement une frontière de chunk, mêmes contrôles de triangles/UV. Puis **27 contrats, six fichiers PASS en 19,877 s**. Le typage final **après les derniers tests** passe en 15,177 s (`v490-final-types-2026-10-27T07-14-58.213Z-21564`) ; build Pages final en **5,252 s** (`v490-final-pages-build-2026-10-27T07-24-01.929Z-9948`).

Les transitions natives W/C/W utilisent une **fixture historique séparée** : textures 1600²→2000², RGBA/palettes/options, réglages/vues et viewport 1440×1000/DPR1 concordants. Zéro tick, RNG inchangé ; 2055 sources comparées, seule différence TerrainLayer. Fixture `0a528…`→`c617…` : seule la sélection 0 change, recharge entière exacte. La vraie campagne `94de34…`, T3328, reste protégée et n'est jamais chargée par ces mesures.

## Gains locaux et pointes

Même fixture 250², volumes, ordre et chauffes ; hashes hors chronométrage et distributions complètes conservées.

| Coût CPU, moyenne ms | W1 | C | W2 |
| --- | ---: | ---: | ---: |
| Création complète | 1419,553 | 1033,887 | 1414,289 |
| Patch 1 | 0,347 | 0,270 | 0,342 |
| Patch 16 chevauchants | 3,693 | 2,570 | 3,618 |
| Patch 17, chemin complet | 1331,338 | 956,508 | 1320,489 |

Création : moyenne réduite de **26,9–27,2 %**, médiane de 37,1–37,5 %. **Maximum C 1527,969 ms contre W1 1429,853/W2 1425,034 ; écart-type C 249,739 ms contre 7,365/8,554.** Le patch 1 garde aussi un maximum supérieur : 0,573 contre 0,441/0,474 ms. Le gain moyen ne signifie pas absence de pointes ; leur cause n'est pas attribuée sans preuve.

| Transition native, ms | W1 | C | W2 |
| --- | ---: | ---: | ---: |
| Geste→adoption stabilisée | 4147,3 | 3938,5 | 4257,7 |
| Intervalle MAIN maximal | 2762,4 | 2475,1 | 2823,6 |
| p99 des intervalles MAIN | 140,6 | 183,7 | 152,0 |
| Frame synchrone maximale | 2756,5 | 2470,5 | 2818,3 |

Le maximum baisse ici d'environ **10–12 %**, mais une coupure de **2,475 s** et un p99 défavorable subsistent. Chaque bloc conserve trois intervalles >50 ms et >100 ms. Ces durées se recouvrent : ne pas les additionner. Soumissions CPU et cadence de callbacks ne mesurent ni FPS physique ni GPU.

## Cadence ordinaire

En pause, puis ×1 et ×3, les mêmes départs migrés sont rejoués dans chaque comparaison. Les TPS ci-dessous sont des bornes MAIN livrées ; les ticks après fenêtre et après Pause sont exclus. Les fins réellement jouées sont sauvegardées/rechargées individuellement, sans égalité fictive entre fins.

| Mesure W1 / C1 / W2 | Pause | ×1 | ×3 |
| --- | --- | --- | --- |
| TPS MAIN | 0 / 0 / 0 | 6,0665 / 6,0663 / 6,0634 | 17,9908 / 18,0980 / 17,9964 |
| p99 intervalle, ms | 6,5 / 6,3 / 6,3 | 24 / 22,3 / 23,1 | 32,5 / 33,5 / 35,2 |
| Maximum, ms | 6,6 / 6,6 / 6,6 | 41,6 / 44,9 / 42,3 | 55,2 / 54,8 / 54,3 |

×6 court W1/C1/W2/C2 :229/207/229/229ticks sur environ7s, soit32,710/29,562/32,684/32,689TPS ; le déficitC1−9,62% est réel dans sa fenêtre et n'est pas reproduit parC2. Maxima56,4/53,9/64,2/77,1ms,0intervalle>100ms chacun. La dernière paire longue ci-dessous ne l'efface pas et ne prouve pas sa cause.

## Échecs conservés et limite globale

Le profil initial reste **FAIL** : delta −11 µs à l'index 2050, parmi 3245 samples/2388 nœuds, aucun ID absent ou delta non fini. RAW `77066bf9…3286aefbb` intact, garde inchangé, aucun PASS rétroactif. Une dérivation distincte conserve les comptes non pondérés et reconstruit les timestamps signés, puis trie stablement les couples sample/index : une inversion 2049↔2050. Intervalles attribués au sample gauche ; lead 1033488 µs et queue 313 µs laissés non attribués : **4248937+1033488+313=5282738 µs**. Ce diagnostic ne remplace pas la pondération du helper ni n'attribue tout au rendu. La [source officielle du lecteur Chrome](https://raw.githubusercontent.com/ChromeDevTools/devtools-frontend/main/front_end/models/cpu_profile/CPUProfileDataModel.ts), relue le 27 octobre, motive la reconstruction signée puis le tri couplé ; notre dérivation laisse les franges non attribuées et ne prétend pas reproduire exactement tous ses traitements.

Le déficit du candidat dans la première fenêtre courte ×6 reste enregistré. Le bloc long C3 livre **641 ticks/20000,5 ms = 32,0492 TPS MAIN**, sans intervalle >100 ms ; W3 livre **589 ticks/20004,8 ms = 29,4429 TPS**. Ce signe inverse ne démontre pas un gain global. Charge, phase et JIT ne sont pas égalisés ; leurs contributions restent inconnues. Aucun recul systématique n'est établi, mais variabilité et déficit ×6 initial restent ouverts. La [jointure finale hors ligne](../../tmp/main-map-profile-v490/global-joined-offline-v490.receipt.json), SHA `6af81ac1228b287d438828c15b91cf60427a2a8d5dde9bdb38a1c926ae36ec4d`, vérifie neuf rapports et quinze seules fenêtres acquises : RAW/gzip, tailles, sources, mêmes départs, réglages, vue et observateur. Le premier rapport W1 reste FAIL pour préparation127,624s au-delà de115s : ses trois fenêtres intègres participent, son ×6 non acquis est exclu ; les plafonds restent inchangés. Aucun claim CPU OS, FPS physique, GPU ou confort général.

## Décision et reprise bornée

ROOT retient **ce seul variant** pour son gain CPU local et la réduction du gel maximal à pixels strictement identiques. Aucun nouveau variant ni mesure supplémentaire de peinture dans ce lot. Le changement de carte reste loin de l'instantanéité et demeure une frontière ouverte de l'ensemble 1.

Après enregistrement, reprendre le [réarbitrage transversal](audit-core-20261022.md#réévaluation-après-v490) : préparation bornée de la voie de victoire entière, avec ses acquisitions physiques et son autorité terminale, concurrent commerce vivant conservé. La vraie campagne `94de34…`, T3328, reste exclusive : trois originaux vivants au foyer et biens réellement revenus. Aucun replay de la fixture Camp. Les six ensembles, SYS069, le confort général et la victoire restent ouverts.

Preuves privées : `cpu-comparison-2026-10-27T07-02-25.470Z-27184.{json,md}`, `map-comparison-2026-10-27T07-07-12.329Z-648.{json,md}`, `profile-anomaly-77066.md`, `main-profile-derived-77066.{json,md}`. Les JSON gardent distributions/cadres complets, hashes, contrôles et positions JS générées. Tous les échecs, variantes de pilotes, RAW et résultats restent conservés sous `tmp/main-map-profile-v490/` ; aucun de ces pilotes ou états privés n'est livré avec le jeu.
