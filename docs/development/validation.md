# Validation courante — V45

16–17 septembre 2026. [Santé active](health.md), [références recontrôlées](../research/health-reference.md). Les preuves antérieures du noyau médical isolé et des interruptions de fatigue sont [archivées](../history/validation-health-preparation-v44.md).

## Simulation et intégration

La suite entière passe : **163 scénarios**, dont quinze anatomiques/médicaux isolés et cinq scénarios de santé intégrée. Le pilote normal conserve ses résultats métier sur cinq/huit jours et trois graines 250², avec nouveaux contrôles de santé. [Suite avant optimisation locale](../../artifacts/core-health-v45.json). Après réutilisation du calcul anatomique dans la décision courante, les treize scénarios ciblés de santé, lumière, compétences et loisirs repassent : [rapport](../../artifacts/health-optimized-v45.json). Aucune mise en cache entre ticks ou acteurs.

Cas intégrés : retrait réel du support et retrait volontaire ; blessé/mort pendant une arête avec sol saturé, second colon libérant le dépôt ; pertes de capacités et refus du travail ; ingestion fractionnée sans gain lors d’interruption ; hémorragie/décès, récupération, conscience et vrai sommeil ; lit et réaffectation ; corruption et migration V44 stricte. Le premier contrôle a révélé l’exclusion trop large des patients dans la validation des lits : corrigée uniquement en V45. Les erreurs d’oracle (arrondi du travail, récupération immédiate à un seuil exact et saignement attendu) ont été corrigées sur les règles indépendantes du module. [Essai initial](../../artifacts/health-world-v45-first.json), [interactions](../../artifacts/health-world-v45-second.json), [dernier cas de fixture](../../artifacts/health-world-v45-third.json).

## Charge CPU séparée

Ryzen 5 3600, Windows 11 10.0.26200, Node 24.11.1. Neuf combinaisons : 3/30/100 colons × 0/20/100 petites lésions initiales, carte 250², 24 arbres désignés par colon, travail/besoins/santé/navigation réels ; 60 ticks d’échauffement, 540 mesurés, 20 copies intégrales séparées. Guérison active et continuation exacte contrôlée hors chronométrage. [Avant](../../artifacts/health-world-cpu-v45.json), [après réutilisation locale](../../artifacts/health-world-cpu-optimized-v45.json).

| Colons / lésions initiales | Tick médian avant → après | p95 après | p99 / maximum après | Copie intégrale p95 après |
|---|---|---|---|---|
| 3 / 100 | 0,287 → 0,211 ms | 0,422 ms | 1,667 / 2,621 ms | 39,84 ms |
| 30 / 100 | 1,574 → 0,938 ms | 4,565 ms | 14,58 / 20,54 ms | 54,18 ms |
| 100 / 0 | 3,690 → 3,752 ms | 26,19 ms | 32,23 / 41,36 ms | 46,62 ms |
| 100 / 20 | 6,660 → 4,830 ms | 25,45 ms | 33,29 / 42,21 ms | 49,23 ms |
| 100 / 100 | 7,697 → 5,175 ms | 26,02 ms | 36,01 / 40,97 ms | 64,38 ms |

Les pointes de planification sont déjà présentes sans blessure. Le calcul médical répété a été réduit, mais ces chiffres ne prouvent pas une fluidité parfaite à cent colons. La copie intégrale de 62 500 cellules est un diagnostic volontairement séparé, pas le coût exact d’un message différentiel du worker. Un seul passage par combinaison, effets GC et charge hôte possibles ; aucun FPS déduit de ce tableau. Prochaines optimisations doivent suivre les profils de décisions et publications réelles, sans fausser les règles ni les réservations.

## Partie et présentation natives

Chromium natif WebGPU, 1440×1000, AMD RDNA 1, même Ryzen 5 3600. Le parcours de trois jours par l'interface passe en sept minutes : dix-neuf recettes préparées, dix-huit portions consommées, trois dormeurs, réserves entretenues, bois conservé, bilan alimentaire réconcilié et aucun accident dans l'aménagement sûr. [Partie et commandes](../../artifacts/health-colony-v45.json). Les checkpoints passent par pause, sauvegarde et rechargement ; la capture finale a été inspectée.

Le scénario médical passe en 8,5 s : dernier support retiré par commande, blessure létale du travailleur et blessure du témoin, inspection, puis colon à terre chargé, pause et reprise exacte. La première image avec lésions montre déjà le toit retiré au tick affiché ; 735 observations de poses à terre/mortes exigent animation de travail nulle et pose GPU allongée. [Rapport](../../artifacts/health-ui-v45.json). L'oracle initial attendait un survivant ; la graine produit une blessure létale au cou, maintenant exigée également par le test de simulation. Les cinq scénarios médicaux ont repassé après cet ajustement : [contrôle final](../../artifacts/health-final-v45.json). Les captures d'accident et de patient ont été inspectées ; le compteur exclut les morts et leurs quatre besoins principaux affichent un tiret.

`npm run test:presentation` passe : 45 s de minage puis 45 s d'abattage naturels, carte 250², 1×/6×/3× répétés. Aucun saut, aucune occupation solide, aucune famine du tampon ; réponses maximales aux changements de vitesse 21 et 22,3 ms. Intervalles entre images p95 4,3 ms dans les deux phases ; maximum 12,5 / 20,9 ms. [Mesures et chronologie des retraits](../../artifacts/health-presentation-v45.json). Les pauses ordinaires entre trajets restent distinctes des sauts et des attentes anormales : aucun FPS seul n'est utilisé comme preuve de synchronisation.

## Charge navigateur avec santé

`MINING_MEDICAL_WOUNDS=20 node --experimental-strip-types scripts/mining-render-bench.mjs artifacts/health-mining-render-v45.json` : 3/30/100 colons avec vingt petites lésions initiales chacun, monde naturel 250² et zone d'extraction dégagée, vrai worker en 6×. Quatre parois et un arbre désignés par colon, arrêt après achèvement des extractions ; ce parcours court ne mesure pas l'entretien d'une colonie de cent personnes pendant plusieurs jours. [Rapport brut](../../artifacts/health-mining-render-v45.json).

| Colons | Parois extraites | Intervalle image p50 / p95 / p99 / max | Application de scène p95 | Réception snapshot p95 | Draw calls max |
|---|---|---|---|---|---|
| 3 | 12 | 4,2 / 4,3 / 8,3 / 12,5 ms | 7,1 ms | 0,1 ms | 165 |
| 30 | 120 | 4,2 / 4,3 / 8,4 / 24,9 ms | 8,4 ms | 0,1 ms | 178 |
| 100 | 400 | 4,2 / 16,7 / 25 / 37,5 ms | 13,1 ms | 0,1 ms | 188 |

Aucune erreur JS/GPU, aucun pipeline créé pendant la mesure, aucune croissance des lots de boîtes ; identités des buffers roche/sol conservées. Préparation et échauffement exclus des intervalles actifs. La réception des snapshots est distincte de leur application graphique. La médiane proche de 240 Hz ne masque pas les pointes à cent colons : publications groupées, application de scène et planification restent des axes mesurés pour les prochains audits. Ce n'est ni une garantie de 240 FPS sur tout matériel ni une mesure directe du temps GPU.

## Livraison

Compilation TypeScript et bundle Vite réussis ; avertissement habituel sur la taille du chunk graphique conservé, sans impact déduit sur les FPS. Contrôle documentaire réussi : 167 documents, 1 711 liens locaux, 25 domaines et cinq familles de validation ; les trois originaux sont inchangés octet pour octet. Soins, secours, soins auto-administrés, ramper, dépouilles transportables et combat ne sont pas validés par ce lot : ils restent absents. Aucun test ne prétend couvrir toutes les combinaisons futures.
