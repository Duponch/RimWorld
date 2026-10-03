# Validation des réserves par qualité/PV — V188

Lot livré dans le périmètre ci-dessous le 3 octobre 2026. [Contrat](../development/storage-condition-v188.md), [recherche Core](../research/storage-condition-core-v188.md). Schéma 176, validation stricte de 175 avant migration neutre, sans critères ni objets rétroactifs. Le joueur règle l'admission par qualité/PV ; prise, portage et dépôt restent physiques, y compris pour les bâtiments emballés.

## Contrôles ciblés

**108/108 tests uniques sur vingt et un fichiers** : le groupe principal passe 102/102 sur vingt fichiers, puis les six contrôles de l'oracle de rejet logistique s'ajoutent. Les dernières gardes passent **16/16 sur quatre fichiers** après l'optimisation finale du cache. Rapports : `tmp/storage-condition-targeted-v188.json` et `tmp/storage-condition-final-guards-v188.json`.

Les familles exercées comprennent prédicat et UI, sauvegarde/commande/delta, livraison réelle, production de tenue, meubles et réinstallation, filtres V101, logistique, habillement, chasse/interruption, art, commerce, réservations de cuisine, snapshots, codec, capsule V187 et les six colonies historiques V98. Ce groupe n'est pas la régression exhaustive.

Les scénarios vérifient deux instances d'un même ItemId, la priorité source zéro, le refus en cours de portage, une seule qualité produite, conservation des identités/quantités/états, reprise exacte, ancien schéma avec champs futurs refusé et delta au même tick atomique. L'oracle indépendant confronte **36 combinaisons préparées** de plages/priorités/occupation/liste/permission, puis neuf changements au même tick par combinaison, sans mutation du World/PRNG par la requête.

Deux préparations initiales de tests copiaient tout un `StockpileCell` dans le propriétaire d'un objet : corrigées en copiant seulement x/z, sans relâcher les assertions. Une attente de rejet rapide omettait une réserve source devenue libre de priorité supérieure : les deux destinations admissibles de même priorité empêchent ce second transport légitime dans la fixture finale. Les compteurs de facture ont été conservés après la recherche Core complémentaire ; les plages d'admission ne sont pas celles des factures.

Build/typage : **647 modules**, typage final rejoué après ajout de l'oracle. Documentation : **648 documents / 6 145 liens**, six en-têtes au schéma 176 et trois originaux byte-identiques. Les sources servies sont restées gelées pendant le natif et la présentation ; seuls tests/documentation ont été achevés ensuite.

## Menu public et navigateur

La **39e colonie publique**, « Tri des réserves · 3 colons », est préparée sur 32². Deux rectangles et six objets explicitement fournis, aucun transport achevé. SHA-256 de `public/test-saves/v188/tri-reserves.json` : `fd52ba06a49c7b611806b86238fbdf72474f2e564eb96af510a3a1c2c3a2c85c`.

Chromium **natif WebGPU 1/1**, vrai menu puis vrai inspecteur : plages des trois cases droites réglées au tick 0 ; premier objet porté au tick **7**, sauvegarde/rechargement exact pendant portage ; six dépôts distincts au tick **303**. Quatre unités matérielles et deux lits emballés, mêmes IDs/états, aucune allocation supplémentaire ni erreur console. Rapport `tmp/test-runs/2026-10-03T02-52-50.850Z-16500/artifacts/storage-condition-v188-browser.json`, captures de portage et tri dans le même dossier. Les avertissements TSL sur les fonctions inline restent présents ; ils ne sont pas corrigés par ce lot.

`npm run test:presentation` : carte naturelle 250², minage **7 781 images**, p95 **6,2 ms** ; coupe **7 729 images**, p95 **6,4 ms**. Aucun saut, excès continu ou occupation solide signalés. Ce contrôle de chronologie ne mesure pas le GPU isolé.

## Coût CPU borné

Banc successif, navigateur fermé : Node **24.11.1**, Ryzen **5 3600**, Windows x64, 16 Gio. Scènes préparées 250², **1 024 piles / 128 cellules**, deux rotations A/B/B/A, vingt valeurs de cinq appels après dix échauffements. L'oracle exhaustif indépendant, World, PRNG et empreinte des 656 fichiers de `src` restent exacts. Script `scripts/benchmark-storage-condition-v188.ts`, rapport `tmp/storage-condition-benchmark-v188.json`.

| Rejet rapide seul | p50 actuel (ms/appel) | p95 actuel (ms/appel) | p50 comparateur (ms/appel) |
| --- | --- | --- | --- |
| Critères actifs, toutes instances refusées | 1,0232–1,0462 | 1,1384–1,7385 | 25,3882–26,9895 |
| Critères actifs, seule dernière instance admise | 1,0318–1,5185 | 1,2544–1,7805 | 25,8011–26,3535 |
| Critères absents | 1,0859–1,1044 | 1,1239–1,2451 | 1,5137–1,7285 |

Pour les critères actifs, le comparateur partage les candidats géométriques mais revérifie toutes les instances sans cache d'état ; il n'est pas un ancien moteur. Pour l'absence de critères, il reconstruit l'expression historique. L'actuel prépare seulement les types présents lorsque les critères sont actifs, regroupe les plages identiques par priorité maximale puis partage l'admission par état. Les premières mesures non regroupées, conservées dans `tmp/storage-condition-benchmark-v188-first.json` et `tmp/storage-condition-benchmark-v188-second.json`, ont motivé ce correctif sûr ; aucun nombre de tick complet ou gain général n'en est déduit.

Les nouvelles sorties restent dans `tmp/`. Régression complète, campagnes naturelles longues, tick complet, worker, CPU image, charge GPU et FPS généraux ne sont pas établis par ce lot. Pas de nouvelle géométrie ni de buffer GPU. Étagères, fraîcheur, contamination, vêtement porté par un mort, type de meuble et filtres de facture restent absents.
