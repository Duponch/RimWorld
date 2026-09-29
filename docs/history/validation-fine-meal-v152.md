# Validation du plat raffiné mixte V152

## Périmètre livré

Le schéma courant est 152. Une facture « Cuisiner un plat raffiné » est disponible sur les cuisinières à bois et électriques, avec Cuisine 6 et cinq unités de protéines (viande ou lait) plus cinq végétaux. Le produit distinct a 0,9 nutrition, se conserve quatre jours à taux plein et donne le souvenir « A mangé un bon repas » (+5 pendant un jour) après ingestion physique achevée. La [recherche Core](../research/fine-meal-core-v152.md) et le [contrat local](../development/fine-meal-v152.md) bornent ces règles et les adaptations.

## Contrôles établis à ce stade

| Contrôle | Résultat et portée |
| --- | --- |
| `tests/fine-meal-production-v152.test.ts` | **2/2 réussis**, y compris dans la régression finale : 5 viande + 5 végétaux, Cuisine 6, cuisinière et refus du feu, reprise du travail ; 3 laits + 2 viandes sur plusieurs piles et refus de dix végétaux. |
| `tests/fine-meal-consumption-v152.test.ts` et `tests/fine-meal-interface-v152.test.ts` | **6/6 réussis** : préférence et autorisation alimentaires, ingestion réelle avec reprise puis souvenir +5/expiration, alimentation assistée, diagnostic par groupe et compétence, refus d'ordre en file invalide, cue de cuisine existant. Ces tests utilisent des états préparés et exercent les transitions réelles ; le second fichier ne remplace pas un parcours DOM/navigateur. |
| `tests/fine-meal-persistence-v152.test.ts` | **6/6 réussis** : migration V150→152 neutre, reprise déterministe et rejets V150 des repas, filtres de réserve et de facture, politiques, quantités pourries, souvenirs, maladie, factures actives et postes emballés ; ordre en file 5+5 et refus d'un objet produit comme ingrédient. Les fixtures historiques sont inchangées. |
| Régression ciblée de persistance | **8 fichiers / 35 tests réussis** avant le dernier ajout à la suite V152 : `production`, `food-items`, `feeding`, `food-policy`, `mood`, `food-binge-migration-v150`, `food-workstations` et `fine-meal-persistence-v152`. Ce chiffre ne comprend pas le sixième test de la nouvelle suite, exécuté séparément. |
| `npm run build` | Réussi sur l'arbre final : TypeScript sans erreur et 609 modules transformés par Vite. L'avertissement de taille des gros chunks subsiste ; il n'établit pas un coût du nouveau plat. |
| `npm run test:integration -- tests/integration/fine-meal-v152.spec.ts` | **1/1 réussi** dans Chromium (scénario 56,8 s, commande 1,3 min) : facture et filtre dans l'interface, 5 laits et 5 riz apportés physiquement, travail repris depuis une sauvegarde, combustible consommé, un plat produit, ingestion par un second colon et souvenir +5 après une seconde reprise ; `validateWorld` et console sans erreur. Le renderer a utilisé le repli **WebGL2** (`WebGPU is not available`) : ceci ne valide pas WebGPU natif. |
| `npm run test:regression` | **287/287 fichiers réussis, 1 242 tests réussis et un ignoré** (1 243 au total, 204,50 s), après correction des préparations de sauvegardes historiques dans les tests seulement. Journal `tmp/v152-regression-fixtures-short.log`. Le validateur de production continue de refuser `fine-meal` dans les schémas antérieurs. |
| `npm run test:presentation` | Réussi sur les scènes minage et abattage : 7 729 et 7 779 images, `jumpCount=0` et `solidOccupancyCount=0` dans chacune ; p95 CPU image ≈6,1 ms dans ces deux parcours locaux. Ce test ne mesure pas isolément le plat raffiné ou l'audio. |
| `npm run check:docs` | **530 documents, 5 242 liens locaux**, six en-têtes courants au schéma 152 et trois sources originales inchangées. |

## À compléter après intégration

- **Persistance et conservation :** les tests ciblés ci-dessus établissent migration, refus des champs futurs et continuation préparée ; inscrire toute vérification de conservation supplémentaire après intégration.
- **Campagnes longues :** une commande `npm run test` incluant `colony-player.test.ts` a été interrompue après trois échecs, sans résumé d'assertions. Les checkpoints écrits sont valides mais le pilote conserve des attentes historiques sur tous les fragments naturels et sur l'absence de blessure malgré une bagarre sociale. Ce passage interrompu n'est ni une suite complète verte ni une preuve de régression V152 ; il demande une réparation de pilote et une campagne distincte.
- **Interface native :** le parcours ci-dessus part d'une fixture préparée et exerce les transitions réelles du worker ; il ne prouve pas la fréquence d'acquisition en colonie naturelle. Le contrôle d'un régime alimentaire choisi dans l'UI et le rendu WebGPU natif restent distincts du scénario validé.
- **Campagnes et performances :** aucun parcours long, coût CPU/GPU ni FPS n'est établi par les tests ci-dessus. Ne pas inférer ×6 ou 240 FPS de la réutilisation des postes et des lots existants.

Les recettes végétarienne, carnivore, par quatre et somptueuse, la composition persistée du plat et le catalogue Core complet restent absents.
