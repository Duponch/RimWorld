# Validation V218 — clinique et métadonnées du bridge

**Livré dans le périmètre contrôlé ; suffixe long distinct.** [Contrat](../development/architecture-consolidation-v218.md), [référence](../research/architecture-consolidation-v218.md). Base V217 `33ccd51b70f15a7e9b08257766af42e13f859361`, commité le 5 octobre à 13:39:03 Paris, schéma 196 inchangé. Régression complète, build et présentation passent ; le suffixe long V218 reste attendu.

V217 est livré 109min50s après V216. Treize commandes journalisées totalisent882,105s ; cette mesure n’attribue pas le délai restant aux tokens/s. La file des quatre suffixes V216 occupe77min46,327s pendant la préparation V217, avec trois reprises vertes et Énergie rouge conservé. Les résultats Node/navigateur V217 restent dans leur [preuve historique](validation-snapshot-consolidation-v217.md).

## Suffixe V217 rouge conservé

La copie V217 contient 4287 fichiers suivis byte-à-byte et un manifeste ; les dépendances déjà installées sont liées sans mutation. Le suffixe Énergie seul commence le 5 octobre à 13:41:36 Paris, depuis le vrai checkpoint V215 J32/tick192000. Runner privé SHA aabe3d9c4b413cf0d0dad403c1c192f2bdf1217ef679ba4cff1ef05d3da1c456 ; manifeste SHA 51b893e1214b9ca25ffc8ad96d9cde93c030b1d7edd8fac0da0d8d787b9ad6b5. Préfixe copié sans changement, SHA f32d63aa5f24cf2be92b0e49d13e6d37dedd5a101e830a7795126de1f799b9d2. Horizon 288000, assertions de santé/besoins/bilans conservées, stabilité 600 explicitement requise. Les changements V218 du dépôt principal ne sont pas chargés par ce contrôle et aucun contrôle lourd concurrent n’est lancé.

**FAIL en 552,864 s**, à tick 261600 : Ada est à terre et l’assertion de survie sans chute refuse la continuation. `copyStillExact:true`. Le résumé est conservé sous [summary.json](../../tmp/milestone-validation/33ccd51b70f1/tmp/campaign-suffix-runs/v217-energy-suffix-2026-10-05T11-41-36.908Z-26284/summary.json), avec [journal](../../tmp/milestone-validation/33ccd51b70f1/tmp/campaign-suffix-runs/v217-energy-suffix-2026-10-05T11-41-36.908Z-26284/energy.log) et checkpoint rouge SHA ed1fb6ef8ce6de4bf6d7b1922f61766d22d260c4052e7a3782270bc4b567404c. Les rouges V215/V216/V217 restent historiques. Une réussite courte V218 ne certifie pas le suffixe J32→J48.

## Trois changements bornés

Extraction thermique adoptée après relecture statique : heat-severity SHA 26383898bbabd6697e926d4702ebde899764d428f36cba444ab6faa8c4350c8d ; heat-rules a39fdb24f73e195cdfdb6e42ae0535b67effde954909922b73f0a5e7df89af0a ; cold-rules 2c1a6ede5614932fc4ca2b1ec1505d0ef98066b0054546eef47370dbe9670d13 ; injury-state 235dbf835fd464d6020636ddbc26ecd800b1f44a1e4e9c1c28edaf38371eb58d. Les constantes, courbes et évolutions sont déplacées exactement ; confort et réexports historiques restent dans l’adaptateur. Aucun effet métier, PRNG, horloge ou champ de sauvegarde ajouté. Les contrôles cliniques existants et le graphe ci-dessous complètent cette preuve textuelle.

Guard bridge SHA b827cae661f344d1de49b78baf618d31917eea4c2f5ebbe454d80c112c55cbc9 : schéma entier sûr dans `1..SCHEMA_VERSION`, après `stale`, sans normalisation. Quatre oracles checkpoint/delta/epoch/historique et les deux attentes fractionnaires V217 adaptées explicitement au refus. Première ciblée : 24/26 passent ; les deux échecs viennent de `projectiles:[]`, collection propre vide refusée par la sauvegarde complète. La préparation est corrigée par une vraie émission du producteur, sans relâcher `validateWorld`. Le contrôle final ci-dessous passe les sources corrigées. Encodeur et banc historique V217 restent inchangés ; banc SHA 10615c6a787d7eba030cee61f28cc5be00172adab56b1b668f3cb9ed912692a8. Aucun gain de cache ni permission de groupe n’est attribué au nouveau refus intentionnel.

Pilote Énergie : le refuge est refusé lorsqu’un adversaire occupe sa frontière ou porte, puis tant que son ancien endpoint appartient encore à un déplacement engagé. Une autre pièce réelle, complète et accessible peut être choisie. Le test admet l’adversaire par le vrai producteur de raid et laisse le driver engager son segment ; l’aperçu reste non mutant, l’ordre est adopté, l’arête de l’adversaire reste intacte et la reprise est exacte. Source pilote SHA 5edc26568f291fb21f561a650353b17f0138ac0145438884106576dca207b2ef ; test de secours/repli SHA 87768b003897454ddf3ce5dbe471a40df73cc221659d9a542b7040b7e33c66be. Cette politique ne garantit pas encore la survie de la campagne et ne change aucun dégât, seed, soin ou horizon.

## Contrôles courts journalisés

Tous les contrôles ci-dessous sont exécutés par root après la fin du suffixe V217 ; cette mise à jour documentaire n’exécute aucun contrôle.

| Contrôle | Résultat établi | Trace |
|---|---|---|
| Typage | PASS | [journal](../../tmp/validation-runs/v218-typecheck-2026-10-05T11-53-21.843Z-25792/output.log) |
| Oracles privés du parser AST | PASS ; aucune certification runtime/performance | [journal](../../tmp/validation-runs/v218-import-oracles-2026-10-05T11-54-05.875Z-22512/output.log) |
| Clinique, thermique, vêtements et groupe | 7 fichiers, 39 PASS / 1 SKIP ; enveloppe journalisée 10,776 s | [journal](../../tmp/validation-runs/v218-clinical-targeted-2026-10-05T11-58-23.695Z-9084/output.log) |
| Bridge, cache et pilote finaux | 6 fichiers, 38 PASS ; enveloppe journalisée 17,264 s | [journal](../../tmp/validation-runs/v218-boundaries-pilot-final-2026-10-05T12-01-02.419Z-25764/output.log) |

Les durées d’enveloppe journalisée sont distinctes de celles internes à Vitest. Le cas ignoré n’est pas compté réussi. Le rouge de préparation bridge et sa reprise restent distingués de la correction de comportement du transport et du pilote.

## Graphe observé, baseline non approuvée

Captures privées [avant V217](../../tmp/architecture-next/graph-v217-before.json) et [candidat V218](../../tmp/architecture-next/graph-v218-candidate.json) : 796→797 modules, 4276→4278 arêtes runtime, 4→3 composantes cycliques, zéro violation de frontière ou résolution. La composante thermique de quatre modules disparaît ; la plus grande composante conserve 151 modules et 648 arêtes internes. La réduction est locale, sans nouvelle mesure de tick, mémoire ou GPU.

Les deux captures restent `unreviewed-capture`, code de sortie 2. La première est rapprochée du manifeste immuable ; la seconde indique honnêtement `dirty:true`. Sources/configurations et inventaire sont vérifiés avant/après. Aucun graphe du jour n’est adopté automatiquement comme baseline CI et aucune exception historique n’est approuvée par ces relevés.

État intermédiaire avant fin des contrôles : la régression complète était en cours. Build, présentation sur le bridge et suffixe authentique V218 sur copie de son commit restent à exécuter. Aucune livraison, campagne longue verte ou accélération générale n’est annoncée ; les contrôles futurs devront être attribués à leurs propres sources gelées.


## Validation finale avant commit

Régression complète sur les sources finales : **561 fichiers, 2 547 réussis et un ignoré**, en 469,947 s, dans [le journal](../../tmp/validation-runs/v218-regression-2026-10-05T12-09-17.988Z-18436/output.log). Il s’agit ici d’un lancement complet unique, sans bilan agrégé par reprises. Le build incluant le typage passe en 6,640 s ([journal](../../tmp/validation-runs/v218-build-2026-10-05T12-17-55.831Z-28068/output.log)). Présentation sur les snapshots courants : 117,528 s ([journal](../../tmp/validation-runs/v218-presentation-2026-10-05T12-18-15.882Z-10488/output.log)), sans saut, dépassement continu ou occupation solide dans les deux travaux observés. Les huit hashes produit/pilote/banc décrits plus haut sont encore identiques après ces contrôles. Aucune mesure nouvelle de gain thermique, de tick complet ou de GPU.

Vitest attribue 40 % de son temps suivi aux imports : 1 448 modules évalués 4 333 fois, 336,77 s cumulées. Cette métrique de plusieurs workers n’est pas une part exclusive des 469,947 s murales. Son estimation pour isolate:false n’est pas une mesure et ce réglage n’est pas adopté : les instruments, mocks et ordres d’import doivent rester isolés. Tokens/s et causalité du délai de développement restent non mesurés.

Archive privée V217 gelée : [manifest](../../tmp/validation-artifacts/v217-energy-suffix/archive.json), 20 fichiers exacts dont 13 sorties, SHA256 4d3922bceb1af1708a8724dad8a2717ed5e90310d9ff07d324a371af2d417339. Échec261600 et préfixe authentique conservés. Le runner V218 prévoit un diagnostic J43 partiel et un suffixe J32 distinct ; aucun résultat de ces exécutions n’est annoncé avant le commit figé.

Documentation finale : 742 documents, 7 373 liens locaux, six en-têtes courants au schéma196 et trois sources originales byte-identiques, en1,102s. Onze commandes V218 journalisées totalisent646,366s (10min46,366s), avec les deux captures non approuvées/code2 et le rouge de préparation bridge inclus. Le lancement documentaire bloqué EPERM n’a produit aucun résultat validé ; sa reprise passe. Ces durées ne mesurent ni tokens/s ni toute la rédaction et la coordination. La répétition des suites déjà vertes a été limitée aux changements d’oracle puis au seul lancement général final.
