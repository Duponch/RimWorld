# Validation courante — V46

17 septembre 2026. [Secours physiques et lits médicaux](../development/rescue.md), [recherche et limites de parité](../research/care-preparation.md). La validation de la santé V45 et ses mesures de charge sont [archivées](../history/validation-health-v45.md).

## Simulation et continuation

La suite entière a passé **168 scénarios** : [rapport](../../artifacts/core-rescue-final-v46.json). La relecture suivante a ajouté un sixième scénario de secours et corrigé les frontières temporelles de guérison et l'attribution du lit ordinaire dès le départ. Les **18 scénarios ciblés** de secours, santé, ordres et horaires passent après ces changements : [rapport](../../artifacts/rescue-review-final-v46.json). Enfin, les six scénarios de secours repassent après ajout du transfert d'un lit médical emballé et correction du repos porté sous le profil historique : [contrôle final](../../artifacts/rescue-latest-v46.json). La suite entière n'a pas été rejouée après ces derniers ajustements ciblés ; ces comptes ne sont pas additionnés comme des scénarios uniques.

Les cas croisent concurrence entre sauveteurs, dernier lit, chemin inaccessible et repli, changement de rôle, propriété ordinaire et utilisation médicale, interruption, fatigue, perte des mains, récupération, décès, perte du lit et cargaison indéposable. Approche, portage et dépôt conservent une seule personne ; sauvegarde/reprise et snapshots conservent ses relations et sa physiologie. Les horloges sont ancrées sous l'ancienne posture avant prise/dépôt/interruption. La validation compare les valeurs des arêtes, indépendamment de l'ordre des clés JSON.

Les premiers essais ont révélé des fixtures anciennes contenant la nouvelle priorité Médecin : elles ont été corrigées sans assouplir le validateur V45. Un oracle d'épuisement incomplet a également été corrigé. Les échecs restent disponibles : [suite initiale](../../artifacts/core-rescue-v46.json), [migrations](../../artifacts/rescue-migrations-v46.json), [relecture initiale](../../artifacts/rescue-review-v46.json). Ces scénarios ne constituent pas une preuve de couverture exhaustive.

## Partie et gestes réels dans le navigateur

Chromium natif WebGPU, AMD RDNA 1, Ryzen 5 3600, Windows 11 10.0.26200, viewport 1440×1000. Le pilote de colonie réalise **trois jours** par les commandes de l'interface, avec pauses, sauvegarde et rechargement : 20 repas préparés, trois lits, table et tabourets, 28 cellules couvertes, 15 cellules de riz, taille de pierre, extraction, générateur et lampe. Bois conservé, nourriture réconciliée, faim minimale 44,05 et repos minimal 55,49, aucune erreur : [partie et secours](../../artifacts/rescue-colony-v46.json). Ce camp sûr reste sans blessure ; les secours sont exercés dans un scénario dédié, sans injecter de blessure dans le parcours normal.

Le parcours de secours utilise Travail, le rôle médical dans l'inspection, le clic droit, les vitesses et la sauvegarde pendant le portage ; il vérifie le placement final et la couleur réelle du matelas. Une inspection visuelle a révélé une invalidation manquante du mobilier au changement de rôle ; elle est corrigée et contrôlée par le test. Le dernier passage, après la relecture médicale, passe en 7,4 s : [rapport UI](../../artifacts/rescue-ui-v46.json). Les captures de portage et de lit ont été inspectées. Aucun pipeline supplémentaire ni squelette CPU n'est nécessaire pour la pose portée.

`npm run test:presentation` passe après les changements de phase : 45 s de minage puis 45 s d'abattage naturels, carte 250², trois colons et changements 1×/6×/3× toutes les deux secondes. **Aucun saut, aucune occupation solide, aucune famine du tampon** ; réponses maximales aux changements de vitesse 17,2 et 24,6 ms. Intervalles entre images p95 4,3 ms dans les deux phases ; maximum 12,6 / 20,8 ms. [Chronologie et mesures](../../artifacts/rescue-presentation-v46.json). La correction finale du profil historique de repos ne modifie pas le profil adulte utilisé par ces parcours.

## Charge CPU séparée

Même Ryzen 5 3600 et Windows, Node 24.11.1. Carte dégagée 250², 400 ticks incluant les décisions initiales, 1/15/50 secours concurrents, besoins et santé actifs. Continuation exacte et conservation vérifiées hors chronométrage ; copies intégrales mesurées séparément. [Mesures finales](../../artifacts/rescue-cpu-v46.json).

| Acteurs / secours | Tick p50 | p95 | p99 / maximum | Copie intégrale p95 |
|---|---|---|---|---|
| 2 / 1 | 0,032 ms | 0,206 ms | 2,095 / 18,363 ms | 40,47 ms |
| 30 / 15 | 0,302 ms | 0,995 ms | 10,541 / 21,170 ms | 64,11 ms |
| 100 / 50 | 0,979 ms | 7,596 ms | 17,123 / 23,078 ms | 65,28 ms |

La copie des 62 500 cellules n'est pas le coût d'un message différentiel du worker. Un passage par combinaison, GC et charge hôte possibles ; aucun FPS déduit de ces ticks. Le [premier passage](../../artifacts/rescue-cpu-before-boundaries-v46.json) reste disponible, mais les variations entre passages ne constituent pas une démonstration d'optimisation.

## Charge WebGPU et synchronisation du portage

Même matériel, vrai worker en 6×, carte dégagée 250², 90 images d'échauffement. Les patients ont de vraies lésions incapacitantes ; les couples sauveteur/patient passent par les réservations et déplacements communs. [Mesures finales](../../artifacts/rescue-native-v46.json).

| Acteurs / secours | Intervalle image p50 / p95 / p99 / max | CPU image p95 | Draw calls max | Observations de corps portés |
|---|---|---|---|---|
| 2 / 1 | 4,2 / 4,3 / 8,4 / 8,4 ms | 4,9 ms | 121 | 136 |
| 30 / 15 | 4,2 / 8,4 / 12,5 / 12,6 ms | 5,1 ms | 121 | 2 070 |
| 100 / 50 | 4,2 / 16,7 / 29,2 / 33,2 ms | 6,7 ms | 122 | 5 226 |

Aucune pose incohérente détectée, aucune erreur JS/GPU, aucun pipeline créé pendant la mesure et géométries stables. Les corps partagent les véritables attributs GPU du porteur ; les résultats ne se limitent pas à l'état final de simulation. Le [premier audit](../../artifacts/rescue-native-before-boundaries-v46.json) a mesuré un maximum de 37,6 ms à cent acteurs. **Les pointes de 33–38 ms restent ouvertes**, notamment côté planification/publications ; ces essais courts en terrain dégagé ne prouvent ni une fluidité parfaite, ni le comportement d'une forêt ou d'un combat complet, ni celui d'une colonie de cent personnes entretenue plusieurs jours. Le temps GPU direct n'est pas mesuré.

## Livraison et périmètre

Compilation TypeScript et bundle Vite réussis après le dernier ajustement ; avertissement habituel sur le chunk graphique conservé, sans déduire d'effet sur les FPS. Contrôle documentaire et intégrité des trois originaux vérifiés avant commit. La version 46 migre strictement la V45 sans inventer blessure, secours, lit ou historique.

Le traitement des plaies, les médicaments, l'alimentation assistée et le repos médical volontaire restent absents. File de secours, températures extrêmes, ennemis proches et autres catégories de personnes restent explicitement ouverts dans le [contrat](../development/rescue.md). La pose 3D et les cellules de service constituent des adaptations documentées, pas une parité visuelle ou binaire certifiée avec RimWorld.
