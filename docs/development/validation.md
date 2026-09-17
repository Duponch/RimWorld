# Validation courante — V53

18 septembre 2026. [Mobilisation et déplacements](drafting.md), [règles et incertitudes](../research/drafting-reference.md). Les [preuves V52](../history/validation-equipment-v52.md) conservent mesures et échecs antérieurs. Aucun résultat ne vaut couverture exhaustive ni fluidité universelle.

## Incrément de combat isolé après V53

[Requêtes de ligne/couvert/visée](combat-queries.md) : six scénarios passent (433 ms au dernier passage, dont 117 649 cas de l'oracle central), TypeScript passe après correction de l'inférence du tableau de directions. [Banc CPU](../../artifacts/combat-queries-v53.json) : mille lots de cent requêtes, p95 0,2223 ms, p99 0,2679 ms, maximum 0,5125 ms sur Ryzen 5 3600. Pas de World, worker ou rendu dans cette mesure ; aucune nouvelle fonctionnalité jouable. Les validations de partie V53 ci-dessous demeurent les dernières preuves intégrées, pas des résultats rejoués pour cet incrément.

L'incrément numérique suivant étend ce fichier à huit scénarios : profils de qualité du revolver, dommage/pénétration distincts, arrondis, temps Core/local, cycle d'apprentissage et précision sous pertes de Vue/Manipulation. Regroupement `combat-queries.test.ts` + `body.test.ts` : **15/15, 700 ms**, TypeScript réussi. Le premier passage a signalé une fixture anatomique privée de ses champs obligatoires `damage`/`pain`, corrigée sans affaiblir les attentes. La revue a aussi séparé cooldown arrondi et cycle flottant d'XP. Ni suite UI, ni banc complet rejoué pour ces calculs non appelés par World ; les mesures de requêtes précédentes ne couvrent pas un combat intégré.

## Simulation et continuité

Huit scénarios tactiques couvrent groupes et refus atomiques, files, porte/diagonale, conservation de l’arête, retour civil, sommeil/auto-démobilisation, incapacité/Manipulation, passager interrompu, repas/médicament/meuble indéposable, validation/migration et snapshots. Le premier regroupement a trouvé des erreurs de fixture : porte sans matériau explicite et ItemId médical inexistant ; la correction utilise les vraies définitions. La durée neutre sparse est lue avec son défaut 1 et la cellule libérée du scénario saturé est replacée hors du rayon de dépôt. Le passage corrigé réussit **8/8**. Aucun seuil de gameplay assoupli.

Le regroupement initial des contrats tactiques/équipement/cargaison/santé/secours/snapshots réussit **32/32**. Les contrôles médicaux et le pilote multi-graines réussissent lors du passage suivant ; le passage général final réussit **57 fichiers, 210/210 scénarios en 152,19 s**. Le pilote multi-graines inclut maintenant un aller-retour tactique physique avant le camp et conserve ses bilans sur cinq à huit jours.

## Interface et présentation

Le parcours natif de mobilisation réussit en **24,4 s** : R, groupe, clic droit, Maj, arrêt, sauvegarde/rechargement pendant déplacement et retour civil. La sonde relève 6 360 observations, dont 3 407 comparaisons de vitesse ; erreur maximale 6,3e−13, orientation 4,4e−8 radian. Elle mesure les attributs GPU réellement utilisés par corps/cargaison/sélection et vérifie vitesse linéaire sur chaque arête, orientation et attache du revolver. [Mesures](../../artifacts/drafting-ui-v53.json), [capture](../../artifacts/drafting-v53.png). Ces mesures de trajet n’exonèrent pas la garde séparée de changements de vitesse et récolte.

## Contrôles finaux

Suite générale, parcours UI, reprise, charge mixte et garde native passent selon les périmètres détaillés ci-dessous. Les retouches finales sont vérifiées par les scénarios ciblés ; la suite générale n’est pas annoncée comme rejouée après chacune.

Le pilote UI long V53 réussit en **7,6 minutes**, trois jours plus reprise du lendemain, avec reconnaissance tactique puis camp entretenu. [Compte rendu conservé](../../artifacts/drafting-colony-v53.json). Les sources sont restées figées pendant toute cette exécution. Une revue après ce passage renforce le dépôt tactique en plein pas : conserver la cargaison jusqu’à la fin de l’arête, au lieu de la poser sur sa destination logique avant l’arrivée du corps. Le scénario de cargaison est enrichi avant revalidation ciblée.

## Charge CPU mixte et optimisation ciblée

Node 24.11.1, Ryzen 5 3600, Windows 11 10.0.26200. `scripts/drafting-bench.ts`, forêt naturelle 250² avec chantier dégagé, 3/30/100 colons tous armés et porteurs de vingt petites lésions. Moitié mobilisée pour deux déplacements, autre moitié au minage/abattage ; démobilisation manuelle après 400 ticks, 800 ticks mesurés puis continuation stricte. Pas de navigateur de test simultané. [Premier passage](../../artifacts/drafting-cpu-initial-v53.json), [passage après correction](../../artifacts/drafting-cpu-v53.json).

| Acteurs | Tick p50 / p95 / p99 / max (ms) | Encodage p95 (ms) | Ordre de groupe immédiat / en file (ms) | Roches terminées |
|---|---|---|---|---|
| 3 | 0,18 / 1,14 / 3,51 / 16,13 | 6,04 | 16,54 / 1,35 | 12 |
| 30 | 2,08 / 6,65 / 12,01 / 19,38 | 3,77 | 36,19 / 8,47 | 120 |
| 100 | 5,72 / 15,88 / 22,67 / 27,76 | 9,19 | 72,45 / 26,98 | 400 |

Les ordres visent respectivement 2/15/50 colons. Le coût initial de file à 100 acteurs était 83,45 ms : il incluait une route pondérée immédiatement jetée, puisque l’activation revalide la destination. La file utilise maintenant la même preuve d’accès progressif sans reconstruire ce trajet. Même nombre de ticks de marche tactique (10 117 à 100), mêmes roches terminées, toutes les armes conservées, aucune tâche restante et continuation exacte. Les autres écarts entre deux passages ne sont pas attribués intégralement à cette seule optimisation. Les pointes, le coût de l’ordre immédiat et l’encodage restent des limites mesurées ; ces chiffres CPU ne sont pas des FPS.

Après la correction de dépôt en vol : **23/23** scénarios ciblés cargaison/équipement/tactique/snapshots, puis **8/8** tactiques après optimisation des files. TypeScript et build réussissent. L’alerte « colons disponibles » exclut maintenant les mobilisés ; maintenir R ne déclenche plus le raccourci Récolter sur les répétitions clavier.

Le parcours tactique final enrichi avec **sept bois déjà portés sur une arête** réussit en **33,0 s**. Le changement de mode conserve cette propriété, l’attribut de cargaison suit la même pose GPU que le corps, puis le dépôt est observé. 6 835 observations, 3 531 comparaisons de vitesse, erreur maximale 6,43e−13, orientation 4,38e−8 radian, zéro erreur navigateur. Le fichier de mesures porte ce dernier passage ; le premier sans cargaison était à 24,4 s.

Le premier banc natif mixte s’arrête trop tôt : à trois acteurs, le seul civil a fini les douze roches au tick 2 634 alors que deux colons attendent encore mobilisés. L’assertion finale de démobilisation échoue donc, sans erreur GPU ni perte d’arme. [Passage conservé](../../artifacts/drafting-native-initial-v53.json). Le critère d’attente est corrigé pour exiger **à la fois** minage terminé et démobilisation automatique, avec la même borne de 90 s ; aucun seuil de performance n’est élargi.

## Charge graphique native

Le passage corrigé [3/100 colons](../../artifacts/drafting-native-v53.json) termine le minage et la démobilisation, tous armés, vingt lésions par personne, carte naturelle 250² et worker 6×. Ryzen 5 3600, AMD RDNA 1, Chromium natif WebGPU, 1440×1000. Moitié en déplacements tactiques, moitié en travail avant reprise civile ; ce protocole n’est pas celui de cent mineurs actifs dès le départ.

| Acteurs | Images mesurées | Frame p95 / p99 / max (ms) | Application scène p95 / max (ms) | Roches / armes conservées |
|---|---|---|---|---|
| 3 | 4 923 | 4,3 / 8,3 / 25,0 | 6,4 / 16,3 | 12 / 3 |
| 100 | 3 867 | 12,5 / 20,8 / 33,3 | 12,0 / 18,6 | 400 / 100 |

Zéro erreur navigateur/GPU, zéro nouveau pipeline, zéro croissance des lots observés ; mêmes buffers de terrain/roche après excavation. Les percentiles mélangent marche, attente et travail : ne pas les annoncer comme débit garanti de cent combattants actifs. Préparation initiale exclue des frames mesurées, enregistrée séparément (~1,6 s puis ~0,2 s au chargement).

## Garde finale de synchronisation

[Minage 45 s + abattage 45 s, Chromium natif](../../artifacts/harvest-sync-drafting-v53.json), instrumentation worker active, seuils inchangés. 10 819 puis 10 611 images mesurées ; **zéro attente de présentation, saut, pénétration ou retrait de ressource anticipé**, zéro erreur navigateur. 22 changements de vitesse par phase, tous sous 100 ms pour le premier effet visible ; les délais au taux complet restent séparés dans le rapport. Les écarts entre publications sont des diagnostics distincts d’une image sans progression et ne sont pas annoncés comme nuls. Encodage p95 3,3 ms dans chaque phase, maxima 14,6/13,4 ms.

Compilation finale TypeScript/Vite réussie ; avertissement de taille du bundle principal (~1,10 Mo brut) inchangé et conservé. Vérification documentaire et revue du diff passent ; trois originaux préservés. Les captures UI ont été inspectées avec compteur FPS visible. Ce lot conserve G0 en consolidation, G1/G2 partiels et G3 en fondations humaines ; G4/G5 restent absents.
