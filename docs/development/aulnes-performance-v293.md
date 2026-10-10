# V293 — registre strict partagé des Aulnes

V293 est retenue : **104,00→113,65 images RAF/s (+9,28 %)** sur Les Aulnes intégrées à vrai **6,016→6,010×**. Le coût CPU moyen d'adoption baisse de **12,28 %**. Base produit V291, commit documentaire de départ `a1deceb3` ; moteur, rendu, schéma218 et63sauvegardes/66fichiers publics conservés. Les240FPS et la fluidité constante ne sont pas atteints ; aucun gain GPU mesuré.

## Cause et domaine

Le Decoder relisait les17890identités Resource après leur capture privée. Une seule adoption fournit maintenant unicité, admissibilité, maximum et appartenance. Le registre contrôle les propriétaires dans leur ordre historique : préfixe pawns/structures/jobs, frontière Resource, suffixe puis archives. Les ressources ne deviennent visibles qu'à leur frontière ; les mêmes motifs de refus et gardes restent exécutés. Aucun cache entre adoptions.

Le domaine est le World ordinaire stable de la fermeture native MAIN V290. Le helper exporté ne confère aucune autorité native. RAW, non-strict et captures atypiques conservent le parcours historique ; getters/Proxy restent hors du domaine privé. L'union expose honnêtement `has`/`add` et `Iterable<number>`. Le groupe mécanique actif demande encore son `new Set(registeredIds)` : l'itérateur produit préfixe/Resource/suffixe/ajouts dans le même ordre, et ce parcours reste payé lorsqu'il est demandé. Trois feuilles changent le runtime ; neuf corps de validateurs restent identiques, leurs signatures et les interfaces NumericMembership changent seulement de types. Quantités, possessions, réservations, capacités et engagement final ne sont pas supprimés.

## Attribution préalable

Toutes les preuves privées suivantes sont sous `tmp/performance-v293/`. `namespace-cost-reprise2/namespace-9kxh6y/report.json`, SHA E2596DCF, gel3DCB74E1, PASS53,059s :479adoptions, registre1,4138ms sur8,0236ms, soit17,62%. Les spans sont imbriqués, non additionnables ; reprise9058 exacte. Cette attribution a motivé le candidat, sans mesurer son gain.

Le rouge initial TS7016 (1,159s) est conservé. La première exécution (25,651s) s'arrête avant mesure sur un census supposant une requête par module. La reprise distincte conserve chaque réponse/URL/inverse et vérifie les chemins uniques ; le nombre de requêtes ne prouve pas une double exécution. Typage reprise2 PASS1,153s ; compilation/gel PASS2,466s.

## Coût complet et jeu

Gel7B08A83C sous `cost-native/freeze-B2n5uo` :13feuilles candidates,12existantes en A et nouveau helper B seulement, identités de modules canoniques. Encodeur, Source, client et rendu inchangés. Chrome matériel AMD/WebGPU,2560×1440/DPR1/dev, source8434, caméra129/122/zoom1, chauffe3s/fenêtre14s. Quatre cohortes neuves A/B/B/A par comparaison, recharges exactes et sources/publics inchangés.

`cost-native/abba-v6ysXx/report.json`, SHA6E091B5D, PASS211,226s :996/980appels, adoption **7,7484→6,7971ms**, p9510,5→9,6ms ; pic16,4→23,7ms défavorable. Moyennes A1/B1/B2/A2 :7,759/6,942/6,657/7,737ms. Coût cumulé275,14→237,81ms/s, dépendant aussi de la fréquence observée. Getter séparé1,9898→1,9579ms : faible variation, aucun gain de clonage complet attribué. Recharges9055/9054/9052/9054. Ces spans ne couvrent pas tout MAIN, livraison, rendu ou GPU ; ils incluent le surcoût des captures et unions.

`cost-native/abba-6J6mJX/report.json`, SHA3DFA6455, PASS210,728s : quatre nouvelles cohortes GAME, aucun timer d'adoption/getter ni profil CPU pendant la mesure.

| Cohorte | RAF/s | Débit réel | p95 intervalles | Pire intervalle | Recharge exacte |
| --- | ---: | ---: | ---: | ---: | ---: |
| A1 |106,06|6,023×|20,9ms|42,8ms|9056|
| B1 |112,77|6,011×|18,1ms|45,1ms|9053|
| B2 |114,52|6,009×|19,0ms|43,1ms|9054|
| A2 |101,93|6,008×|21,0ms|37,6ms|9057|

Les deux B dépassent les deux A. Agrégation pondérée :103,995→113,647RAF/s, débit6,0155→6,0102× ; moyenne des p9520,95→18,55ms. Les pics B restent défavorables : aucun problème de longues images déclaré résolu. Les huit cohortes passent avec erreurs vides et navigateur/port5328 fermés. Banc headless local, pas certification d'un écran240Hz ni de toutes les vues/parties. Ne pas additionner ce gain aux pourcentages précédents. Le chemin est commun au jeu ; le bénéfice dépend notamment du nombre de ressources et du mode strict.

## Validation

60cas/10fichiers, dont16nouveaux, passent par reprises :59/60initialement en13,542s, puis5/5en5,134s après correction de l'oracle same-World comparé au lecteur RAW. Typage initial5,758s révèle l'itération réellement utilisée par le raid, corrigée avant gel ; reprise5,466s PASS. Un second rouge5,501s concerne seulement le type Iterator d'une fixture, adapté sans changer le produit ; build avec typage PASS7,662s,11cas helper finaux PASS4,746s. Les rouges restent dans les journaux.

`public-controls/public-context-check-UXlHMn/report.json`, SHADCC19294, PASS61,832s :63références/66fichiers, classe MAIN extraite littéralement comparée au RAW, checkpoints/deltas/anciennes vues et un vrai tick de continuation exacts. Froid vérifié fonctionnellement, aucun gain de chargement à froid attribué. Pas de nouvelle campagne longue ni de contrôle graphique inchangé : aucun rendu, horloge ou déplacement modifié. Les revues indépendantes du contrat et de l'agrégation sont conservées dans le dossier privé.

Documentation PASS1,040s :900documents,8544liens locaux,25identifiants de domaines et5familles de validation ; six en-têtes courants au schéma218 et trois sources originales byte-identical.

## Suite

Faire une attribution exclusive du MAIN actuel, en séparant validation, application de scène différée depuis RAF et préparation Three. Le profil V291 existant représente V290 avant les derniers gains : ses poids ne sont pas le budget restant. Piste et emplacements dans `next-causal.md`, sans nouveau candidat engagé. Le transport territorial V292 reste conditionnel ; aucun noyau WASM dominant établi. Autonomie de cette nuit, commit/push et bilan/pause à08h Europe/Paris après le lot engagé maintenus.
