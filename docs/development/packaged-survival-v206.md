# V206 — Produire les repas de survie emballés

Lot en mode jour : une chaîne renouvelable de rations pour la reconnaissance et le comptoir existants. Le produit `survival-meal` est déjà consommable ; V206 ajoute sa production unitaire, pas un nouvel objet ni un nouveau voyage. Schéma **188**, après validation stricte de **187** et migration neutre : aucune recherche, facture, ration, ressource ou histoire rétroactive.

## Règle Core et adaptation

La [recherche Core 1.6.4871](../research/packaged-survival-core-v206.md) établit un projet de 500 points, Cuisine 8 et deux quotas de 0,30 nutrition chacun. Avec les crus locaux à 0,05, la recette `cook-survival-meal` prélève **six protéines crues, viande et/ou lait, plus six végétaux crus**, pour produire **un** repas de survie existant. Les filtres par ingrédient, distance, fraîcheur, accès et réservations restent effectifs ; six plantes supplémentaires ne remplacent pas les protéines.

Travail de 450 Core, soit **45 ticks locaux neutres** avant facteurs de Cuisine, capacités, pièce/lumière/température et énergie existants. Seules les cuisinières à bois et électriques admettent cette facture ; un feu ne l’exécute pas. La recherche peut être accomplie sur un bureau simple ou avancé réellement utilisable, sans multi-analyseur obligatoire.

Core exige auparavant Pâte nutritive, après Électricité. Ce projet et son distributeur sont absents localement ; le préalable est explicitement différé avec son contenu. L’électricité de base suit ses adaptations antérieures. Aucun projet vide ne prétend livrer cette filière. La recette par quatre reste différée ; elle n’est pas remplacée par un multiplicateur de sortie implicite.

## Transactions physiques

Collecte, dépôt sur la surface, place de travail, combustible/courant, transformation et transport du produit suivent le pipeline culinaire existant. Les ingrédients ne sont retirés qu’à la finition prévalidée. Le produit ne naît pas à la destination : son propriétaire courant est le cuisinier, qui doit le déposer réellement. Une facture X fois est décrémentée une seule fois. Jusqu’à X compte le produit existant selon les réserves/filtres et cargaisons courantes ; le registre hors carte ne devient pas du stock colonial.

Annulation et interruptions conservent les piles et leur condition ; pas d’objet culinaire inachevé. Une tâche active sauvegardée garde son progrès et son PRNG. Les enveloppes de facture, tâche et ordre en file sont refusées sous 187, y compris le poste emballé. Sauvegarde et bridge partagent les gardes du nouveau projet et de sa production, avant adoption atomique.

La ration conserve ses propriétés existantes : nutrition 0,9, pile dix, masse 300 g, absence de pourriture. Ce n’est pas une immunité à la contamination : le PRNG de cuisine s’engage à la vraie transformation et le produit conserve son état pendant fusion/division/transport/ingestion. Une ration contaminée ne peut pas servir à la reconnaissance ni au comptoir ; ces refus existants demeurent. Les préférences alimentaires, effets d’ingestion et anciennes rations ne sont pas modifiés.

## Présentation et preuves

Recherche, factures et diagnostic exposent coût, Cuisine 8, six protéines/six végétaux, poste et blocages réels. Objet, acteur, VFX et bruitages de cuisine réutilisent leurs systèmes existants ; aucun nouveau shader ou lot graphique. Le nouveau choix a néanmoins un coût de sélection/validation à mesurer séparément du rendu.

Les contrôles ciblés doivent exercer quotas, lait/viande et piles distinctes, niveau 7/8, recherche réelle, feu refusé, énergie, annulation et saturation, continuation au travail/transport, contamination et refus du voyage. La scène préparée « Repas de survie · production et voyage » fournit ingrédients et infrastructure mais aucune ration. Produire, charger, sortir et consommer restent de vraies transitions ; sa préparation ne prouve pas l’autonomie d’une campagne naturelle.

La [preuve V206](../history/validation-packaged-survival-v206.md) distingue les 147 ciblés uniques/24 fichiers par reprises, 17 nouveaux cas finaux, Chromium matériel préparé, présentation, build et 52 payloads stricts/hash/repris. Le témoin CPU exerce une consommation en voyage ; les besoins hauts de la scène native ne l'exercent pas. La garde bridge couvre le nouveau projet et les enveloppes culinaires ciblées ; réservations et capacités complètes restent sous validation de sauvegarde. Le parcours natif réutilise géométries et pipelines ; la garde de publication et la proposition des tâches ont des coûts CPU mesurés séparément, sans preuve de coût général nul.

Cuisine exhaustive, pâte nutritive, pemmican, recette par quatre, détérioration extérieure exhaustive et monde/caravanes générales restent différés. Mesures CPU, navigateur natif et présentation sont exécutés successivement, sources gelées. Après le commit local, attendre une nouvelle relance.
