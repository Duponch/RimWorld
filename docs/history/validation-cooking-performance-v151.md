# Réutilisation des places réservées en cuisine — V151

V151 est une optimisation CPU locale de `planCooking`. Le schéma reste **150** ; aucune facture, recette, ressource, règle alimentaire, décision sauvegardée ou apparence ne change. La [référence V146](validation-performance-v146.md) situait la cuisine autour de 6,8 % des échantillons `stepWorld`, mais ne prédit pas le gain de cette retouche. [Contrat et invariant](../development/cooking-service-cache-v151.md).

## Égalité des décisions

Une copie figée de la proposition V150 dans [`benchmark-cooking-v151.ts`](../../scripts/benchmark-cooking-v151.ts) sert d'oracle. La scène `public/test-saves/v98/mixed-100.json`, SHA-256 `4d5b34a4a37e0f478a813e472212d923cffaa4f3ed0391764d615972a5f7c26b`, migre du schéma 91 au 150 **hors chronométrage**. Elle a 250² cases, 104 personnages et 68 postes avec factures au tick 2 000. Les propositions de **104/104** personnages sont comparées sur des accès `candidateAccess` frais et indépendants : plan complet, chemins ordonnés, ingrédients, budget de paires restant, World sérialisé et RNG monde/feu/faune. **49 plans**, **223 cellules de chemin** et **49 paires** concordent ; le World et les RNG restent inchangés.

Le test dédié compare aussi une première place réservée par un autre colon, physiquement bloquée ou inaccessible avant un deuxième poste, ainsi que les deux ordres forcés. Les contrôles ciblés cuisine et voisins passent **25/25** dans six fichiers ; le typage passe. L'hypothèse d'absence de mutation des réservations pendant une proposition est vérifiée pour les callbacks du moteur ; un callback `Reachability` arbitraire et mutateur n'est pas couvert.

Après intégration, `npm run test:regression` passe sur **283 fichiers, 1 227 tests réussis et un ignoré** ; `npm run build` passe avec typage et `python scripts/check-docs.py` passe. Les campagnes longues et un parcours natif n'ont pas été rejoués pour ce changement interne de proposition.

## Mesure locale

Node 24.11.1 sous Windows, AMD Ryzen 5 3600. Le banc chauffe les deux variantes, construit l'accès de navigation **hors chrono** pour chaque invocation, puis alterne ancien/nouveau/nouveau/ancien sur quatre tours, soit huit lots chronométrés par variante. Chaque lot regroupe les **49** personnages éligibles de la même carte figée. Le rapport de travail `tmp/benchmark-cooking-v151.json` conserve les échantillons, empreintes de code et métadonnées ; une répétition indépendante est dans `tmp/benchmark-cooking-v151-controlled-a.json`.

| Répétition | Ancien, moyenne par lot de 49 appels | V151, moyenne par lot | Ratio ancien / V151 |
| --- | ---: | ---: | ---: |
| A/B/B/A no 1 | 133,44 ms | 128,35 ms | ×1,040 |
| A/B/B/A no 2 | 133,76 ms | 125,67 ms | ×1,064 |

Une charge **préparée de proposition seule** marque les 24 premières places de service physiquement libres comme retenues par d'autres personnes ; ce montage n'est pas une colonie valide à continuer. Il force le parcours de plusieurs postes et vérifie encore l'égalité du plan et du budget. Deux passages donnent **344,59 → 333,07 ms** et **341,39 → 330,05 ms** par 49 appels, ratios ×1,035 et ×1,034. Ce cas ne mesure ni la fréquence naturelle de telles retenues ni une partie jouée.

Le gain est **petit** et mesuré seulement sur ce sous-coût. Les accès frais, une carte figée et le montage préparé ne donnent ni temps de tick complet, ni débit du worker, du navigateur ou du GPU. Une baisse globale de charge, 240 FPS ou vitesse ×6 atteinte ne sont pas démontrées. La retouche ne change pas les lots GPU ni les décisions ; elle évite seulement un balayage répété de personnes et d'ordres quand plusieurs postes sont examinés.
