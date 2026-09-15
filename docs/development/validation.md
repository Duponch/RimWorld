# Validation courante — synchronisation sous V38

15 septembre 2026. [Contrat](presentation-timing.md), [sources revérifiées](../research/presentation-timing-reference.md), [inventaire](../gameplay/implementation-status.md). La [validation thermique V38](../history/validation-v38-temperature.md) reste archivée avec ses conditions. Schéma 38 inchangé, aucune règle de récolte modifiée.

## Reproduction et correction

Windows, Ryzen 5 3600, Chromium natif WebGPU, AMD RDNA-1, 1440×1000, Three 0.186.0. [Banc des zones](../../scripts/harvest-sync-bench.mjs), graine 42, 250², trois colons, vraie simulation worker, 45 secondes par phase. Le témoin est le commit `355ea54` ; les rapports « après » correspondent au présent correctif. Aucun autre test lourd de cet agent en parallèle des mesures.

À vitesse 6× stable, [le témoin](../../artifacts/harvest-sync-before.json) ne reproduit pas les téléportations : il révèle cependant les ressources retirées avec environ 24 ticks d’avance sur le corps. En alternant 1×/3×/6× toutes les deux secondes, [le témoin reproduit 23 sauts](../../artifacts/harvest-sync-switches-before.json), avec un retard maximum de **268,492 ticks**. Le p95 de frame reste 8,3 ms : un bon FPS ne garantit pas la cohérence de l’animation.

L’[essai intermédiaire](../../artifacts/harvest-sync-switches-clock.json) sans publications de phases supprime les sauts mais détecte **171 images avec un colon dans une roche encore dessinée**. Ce résultat a motivé la publication au tick de la transition, avant de déclarer le problème résolu.

| Après correction, changements répétés | Travaux réalisés | Sauts détectés | Images dans une roche dessinée | Retard max (ticks) | Frame p95 / p99 / max (ms) |
|---|---:|---:|---:|---:|---:|
| Zone de minage, 186 ordres | 41 | 0 | 0 | 23,956 | 4,3 / 8,3 / 16,6 |
| Zone d’abattage, 262 ordres | 42 | 0 | 0 | 24,096 | 4,3 / 8,4 / 20,9 |

[Rapport après](../../artifacts/harvest-sync-after.json). Aucune suppression observée avant son tick de présentation ; aucune erreur navigateur. Les poses sont calculées à partir des attributs effectivement partagés par les modèles GPU, pas à partir de la cellule logique. Le critère de saut est une borne physique de 21 cases/s + 0,02 case de tolérance entre deux frames espacées de moins de 100 ms ; le critère de pénétration exige un centre dans une roche dessinée à moins de 0,35 case. Ces critères ciblent les défauts signalés ; ils ne démontrent pas l’absence de toute anomalie visuelle. Les captures statiques ont été inspectées pour l’intégrité de scène/UI, pas comme preuve de fluidité. Le champ `gapCount` inclut l’attente normale avant la toute première arête et n’est pas un compteur de bugs.

La valeur `adoptions` de ce premier rapport agrège réception et application : ne pas la comparer directement au témoin qui n’avait qu’une réception. Le banc distingue désormais `deliveries` et `sceneApplications`. La métadonnée `switches` corrige explicitement le libellé initial trop général « 6× » ; les données mesurées n’ont pas été réécrites.


Le [banc final](../../artifacts/harvest-sync-final.json), après limitation du HUD et protection contre les historiques périmés, repasse les deux séquences de 45 secondes avec assertions actives : **zéro saut, zéro pénétration, zéro suppression anticipée, aucune erreur**. Frame p95/p99 : 4,3/4,3 ms pour chaque zone ; maxima 12,6 ms en minage et 20,8 ms en abattage. Ensuite, hors mesure de performance, une attente active volontaire de 1 600 ms bloque seulement la page de test pendant que son worker avance à 6×. Dans les deux cas, l’autorité avance de plus de 64 ticks ; scène et poses se recalent dans l’historique disponible, file bornée et aucun état affiché dans le futur. Cela vérifie la récupération après blocage, pas la fluidité pendant ce blocage intentionnel.

## Charge avec cent colons

[Banc de minage](../../scripts/mining-render-bench.mjs), même matériel, forêt naturelle 250² avec zone de travail préparée, **100 mineurs, quatre roches et un arbre par colon**, vitesse 6×, 90 frames d’échauffement. Fixture synthétique de forte activité ; aucune sérialisation intégrale dans les frames. L’application du monde affiché date les extractions ; les réceptions sont mesurées séparément.

Les [premières mesures du correctif](../../artifacts/mining-render-sync-v38.json) ont montré un coût du HUD répété à chaque transition. Après limitation de ses rafraîchissements automatiques à 5 Hz, [le même banc](../../artifacts/mining-render-sync-hud-v38.json) réalise **400 extractions**, avec 114 fragments produits dans cette graine et les mêmes buffers de terrain/roches.

| Mesure | Avant limitation HUD | Après limitation HUD |
|---|---:|---:|
| Frame p95 / p99 / max (ms) | 20,8 / 29,2 / 37,5 | 16,6 / 20,9 / 33,4 |
| Callback de réception p50 / p95 / max (ms) | 4,3 / 6,0 / 9,3 | 0 / 4,5 / 5,9 |
| CPU frame p95 / max (ms) | 11,7 / 19,8 | 12,4 / 25,5 |
| Pipelines créés / croissances de lots | 0 / 0 | 0 / 0 |

Aucune erreur GPU ni longue frame signalée par Long Animation Frames ; des pointes au-delà de 16,7 ms restent présentes. La meilleure cadence globale ne signifie pas que chaque coût diminue : l’application de scènes plus fréquentes reste mesurable, et la seconde exécution n’est pas une moyenne de nombreuses répétitions. Le correctif traite la désynchronisation ; il ne promet pas une fluidité parfaite à toute population. Le précédent audit de cent ateliers chauffés conserve aussi ses limites CPU, documentées dans l’archive thermique.

## Contrôles ciblés

- `bridge-snapshot.test.ts`, `spatial-contracts.test.ts`, `render-retention.test.ts` : **sept tests passent** (1,82 s lors du dernier lot). L’oracle rejoue 30 secondes de vitesses variables, puis des changements espacés de 100 ms incluant pause/reprise au même tick et plusieurs marqueurs dans une frame. La chaîne simulation→codec→file→attributs GPU vérifie vrais minages, abattage, contact avant retrait, quantité produite, duplications et remplacement.
- Trois parcours natifs mouvement : croisement civil/sauvegarde, vitesse/coins/orientation sur quatre abattages, meubles/cargaisons/hauteurs et reprise. Les deux premiers passent en 7,7 et 14,8 s. Le troisième a révélé un défaut de son instrumentation : elle enregistrait des callbacks sans rendu pendant la préparation d’un chargement. En ignorant ces callbacks, le même seuil de vitesse passe en 14,1 s ; aucune tolérance augmentée.

Le [pilote UI de trois jours](../../artifacts/colony-sync-three-days.json) passe en **6,2 minutes**, sans ressources injectées : 21 repas produits, 18 prises alimentaires, trois dormeurs observés, atelier/porte/constructions et 28 cases couvertes. Bois conservé, nourriture réconciliée, 50 acier rangés et 30 incorporés à l’atelier, 15 blocs rangés et nouvelle extraction commandée. Sauvegardes/rechargements quotidiens et aucune erreur navigateur. TypeScript/Vite compilent : 195 modules, worker 229,99 kB, bundle jeu 1 077,20 kB (302,71 kB gzip). Aucune dépendance ajoutée ; avertissement préexistant de chunk supérieur à 500 kB conservé. Contrôle documentaire : 139 documents, liens et trois originaux inchangés vérifiés. La suite complète de règles n’est pas relancée pour ce changement de présentation/transport.

G0 reste en consolidation, G1 partiel, G2 en cours. Aucun nouveau contenu : la prochaine mécanique reste la température des plantes, puis le refroidissement passif. Inventaires personnels, équipement, santé/combat, faune/social, électricité, météo/saisons, économie/recherche et une grande partie du catalogue restent absents ou partiels selon l’inventaire.
