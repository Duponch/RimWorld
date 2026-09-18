# Validation courante — V55

## Bilan de retour en mode jour — 18 septembre

Le lot de code V55 est déjà publié dans `37a6791`. Cette reprise consolide l'[inventaire courant](../gameplay/implementation-status.md), corrige les absences périmées dans l'index/catalogue et reprend les [estimations dans ROADMAP](../ROADMAP.md#estimation-de-charge--18-septembre-2026). Recherche renouvelée sur les [interruptions de préparation et la récupération](../research/combat-preparation.md#préparation-et-récupération--relecture-du-18-septembre), sans ajout de commande ni changement de règle livré. Le retour en mode jour suspend l'automatisation de nuit ; prochain lot visible défini dans ROADMAP.

Vérifications adaptées : liens/ancres, identifiants de domaines, empreintes des trois originaux et `git diff --check`. Aucun code, état de sauvegarde ou rendu changé ; les suites de simulation/UI et les mesures V55 ci-dessous ne sont pas annoncées comme rejouées pour ce bilan documentaire. Les estimations sont un jugement de planification, pas une nouvelle preuve de couverture ou de performance.

## Vols persistants et ordre des impacts V55

18 septembre 2026. [Contrat](projectiles.md), [relecture des sources](../research/projectiles-reference.md). Cinq scénarios intégrés ajoutés : sauvegarde réelle à chaque phase, cible mobile, impact unique, ordre des sous-pas entre balles, mort avant contact suivant, scènes renouvelées, sorties/disparition, enveloppes invalides et comparaison de la capture optimisée avec la capture complète. La première passe a révélé que le décodeur gardait une collection optionnelle supprimée du World. Le correctif supprime les champs dynamiques absents et préserve les snapshots précédents ; les attentes du scénario n'ont pas été affaiblies.

**40/40 scénarios passent en 290,88 s**, dont le pilote civil de cinq à huit jours sur trois cartes, déplacements tactiques, noyau de vol, anatomie et bridge. TypeScript passe. Après renforcement des bornes de position, **7/7 scénarios ciblés** repassent en 5,11 s et le build passe (avertissement existant de taille de chunk). Le pilote ne déclenche aucun tir artificiel : les commandes du joueur restent inchangées. La longue UI de colonie et la garde graphique complète ne sont pas annoncées comme rejouées pour ce service sans déclencheur joueur.

Régression **Chromium natif WebGPU : 2/2 parcours** passent en 1,2 minute : mobilisation/déplacement/file/arrêt/reprise (43,5 s), accident de toiture/posture/cargaison puis soins Gunshot et sauvegarde (19,6 s). Zéro erreur navigateur et FPS visible. [Rapport tactique](../../artifacts/drafting-ui-v55.json), [rapport médical](../../artifacts/health-ui-v55.json), [capture tactique](../../artifacts/drafting-v55.png) et [clinique](../../artifacts/bullet-care-v55.png). Ces parcours valident les boucles existantes sous le nouveau schéma, pas un rendu de projectile inexistant. `VALIDATION_VERSION=v55` conserve les preuves historiques V53/V54.

Audit intégré 250² à 3/30/100 acteurs, émissions injectées dans minage/coupe/besoins. La recapture complète du décor après chaque impact faisait monter le p95 du premier tick de cent contacts à **284,789 ms**. Le décor est maintenant partagé pendant la transaction médicale, avec une nouvelle capture mobile après chaque impact : **65,738 ms** au p95, **85,904 ms** au maximum. Le p99 de la séquence mixte cent acteurs passe **200,176 → 27,811 ms**, mais son p95 monte **7,106 → 15,865 ms** ; le témoin sans balle varie aussi. Ce sont des passes successives CPU, sans worker/rendu, avec des pointes résiduelles. Bilans médicaux/contact identiques, aucune promesse de fluidité. [Données initiales](../../artifacts/projectile-system-baseline-v55.json), [finales](../../artifacts/projectile-system-v55.json), [protocole complet](projectiles.md#validation-et-mesure).

## Preuves antérieures V54

18 septembre 2026. [Impact anatomique Bullet](bullet-impact.md), [règles et limites vérifiées](../research/bullet-impact-reference.md). Le producteur médical est validé ; tirs dirigés et adversaires ne sont pas livrés. Les preuves de mobilisation V53 ci-dessous restent datées et ne sont pas annoncées comme rejouées intégralement.

## Émission et vol isolés sous V54

Complément du 18 septembre : capture des cibles World, test de recouvrement et vues de relations explicites, [contrat](projectiles.md). **TypeScript et 18/18 scénarios décor/vol passent en 3,03 s** après optimisation. Cinq scénarios supplémentaires comprennent vrais secours et déplacements V53, continuation sauvegardée et liaison au producteur médical ; les commandes de tir restent absentes. Le premier typecheck a identifié des erreurs de fixture (helper de matériau sans retour et mauvais identifiant du riz), corrigées sans changement des attentes métier. Contrôle documentaire : 201 documents, 2 159 liens locaux, trois originaux inchangés.

Audit capture + vols complets : cent acteurs/plans sur 250², plus de 12 000 ressources et 8 800 massifs. Capture p95 **8,0959 → 1,8939 ms**, total final p95 **3,1338 ms**, p99 **3,7564 ms**, maximum **4,5183 ms**. Colonnes/incidences, suppression d'objets temporaires, identités différées puis recherche binaire sur ordre vérifié ; mêmes résultats de vol et sommes des dates d'impact. [Initiale](../../artifacts/projectile-world-baseline-v54.json), [finale](../../artifacts/projectile-world-v54.json), Ryzen 5 3600 / Windows 11 / Node 24.11.1, 50 chauffes/300 mesures. Premier accès aux plantes + cent consultations : p95 **0,1487 ms**, sur 100 mesures séparées. Le cas réordonné est validé fonctionnellement mais pas chiffré par ces mesures du générateur ordonné. Plans synthétiques sans émission/portée, sans pas World, worker ou rendu ; ce ne sont ni cent combattants ni un budget de frame. Pas d'UI ou de colonie longue rejouée pour l'adaptateur non branché.

18 septembre. [Noyau de projectile](projectiles.md) et [recherche renouvelée](../research/projectiles-reference.md). TypeScript passe ; **27/27 scénarios en 9,26 s**, regroupant neuf nouveaux scénarios d'émission/vol, six d'impact, huit de requêtes et quatre de décor World. Au-delà des huit masques et probabilités, les scénarios contrôlent cibles déplacées/supprimées/recouvertes, portes modifiées pendant le vol, trajectoires rapides, sortie de carte, zéro distance, budget, ordre aléatoire et 72 reprises dans les octants. La fixture médicale vérifie le même Gunshot après vraie sauvegarde ; l'état de vol y est une enveloppe de test séparée.

La relecture de référence avant publication a révélé deux détails que les premiers scénarios du brouillon ne discriminaient pas : franchissement cardinal limité à sa cellule d'arrivée et sélection d'un seul couvert sans tirage. Code et assertions ont été corrigés ; le contrôle d'émission distingue également ancre de couvert et cellule d'empreinte, puis posture à l'arrivée. Aucun ancien test permissif présenté comme preuve suffisante.

Audit : lots complets de 3/30/100 vols dans une scène indexée 250². Sur Ryzen 5 3600 / Windows 11 / Node 24.11.1, lot cent : **p95 1,3412 ms, p99 1,8975 ms, maximum 2,5924 ms**, sur trois cents mesures après cinquante chauffes. [Données brutes](../../artifacts/bullet-flight-v54.json), protocole et autres charges dans le contrat. Extraction de la fonction d'interception hors des closures de sous-pas ; aucun changement de règle. Le lot termine tous les vols, ce n'est ni une frame ni cent combattants avec travail/navigation. Émission, construction de scène, santé, World, worker et rendu exclus ; aucune conclusion de FPS.

Aucune commande, donnée World, phase bridge ou géométrie n'est modifiée : pas de longue colonie ni d'UI rejouée. Après extraction finale de l'interception, TypeScript et les neuf scénarios de projectile repassent (**9/9, 4,82 s**). Contrôle documentaire : **201 documents, 2 154 liens locaux**, originaux identiques. La migration de projectiles, le parcours de tir visible et les audits mixtes restent obligatoires lors du branchement. Aucun jalon global fermé, aucune couverture exhaustive revendiquée.

## Capture tactique du décor sous V54

18 septembre, après le producteur anatomique : [adaptateur World](combat-world.md) et [recherche fraîche](../research/combat-world-reference.md). **12/12 scénarios, 1,43 s**, TypeScript et contrôle documentaire passent. Quatre scénarios nouveaux couvrent onze familles de bâtiments dans quatre orientations, remplissages/plantes/piles/coexistence, portes modifiées au même tick, carte rectangulaire, identifiants au-delà de 32 bits, puis vrais minage/coupe/construction et reprise sauvegardée exacte. Huit scénarios antérieurs de géométrie/rapport/statistiques rejoués. Le premier passage avait deux échecs de fixture : sauvegarde stricte appelée sur des objets géométriques sans tous leurs attributs fonctionnels ; l'immutabilité de ces fixtures utilise maintenant une copie JSON. Le parcours de travaux conserve bien la validation stricte et la véritable sérialisation.

Audit CPU complet de cette frontière : capture de cartes générées 250² avec environ 12 000 ressources, 3/30/100 acteurs et leurs désignations, puis requêtes groupées. La première passe a révélé les allocations par plante ; colonnes numériques et création différée des rapports ramènent la capture p95 de 2,3644 à 0,8929 ms pour cent candidats. Le lot capture + cent requêtes passe de 2,6155 à 1,0856 ms p95 ; p99 final 1,2667 ms, maximum 1,4343 ms. Résultats géométriques identiques, [données initiales](../../artifacts/combat-world-baseline-v54.json), [données finales](../../artifacts/combat-world-v54.json). Ryzen 5 3600, Windows 11 10.0.26200, Node 24.11.1 ; une passe avant/après, génération et mutations exclues, allocations de capture incluses.

Ce banc ne fait avancer ni la simulation, ni des tirs, ni le worker/rendu. Aucune nouvelle commande, présentation, horloge ou donnée persistante : pas de nouvelle suite UI, de longue colonie ou de build de rendu pour ce module non branché. Les preuves médicales ci-dessous restent celles du lot précédent. Le parcours visible et la charge mixte seront nécessaires avec l'intégration du combat. 199 documents, 2 132 liens locaux et les trois originaux inchangés contrôlés avant ajout de ce relevé.

## Impact, migration et clinique V54

Regroupement de onze fichiers : **65/65 scénarios, 10,23 s** (impact, blessures, santé, soins, médicaments, équipement, mobilisation et migrations). Puis sauvegardes générales, snapshots, anatomie, requêtes et pilote de colonie multi-jours : **26/26, 115,57 s**. Le premier passage ciblé avait 36 réussites et un échec de fixture : phase de trajet médical appelée `travel` au lieu de `approach`, également signalée par TypeScript. Corrigée sans assouplir l'exigence de trajet et de travail au contact.

Six scénarios nouveaux regroupent 100 000 choix anatomiques, préservation du dernier PV, parties manquantes/hauteur/profondeur, propagation létale complète, Gunshot sur os et tissus, soins/reprise et refus atomique. Le contrôle de migration refuse Gunshot en V53 avant toute montée de version. Le pilote civil relève la nouvelle lésion sans créer artificiellement des tirs ; sa partie reste un parcours de camp.

Le parcours médical **Chromium natif WebGPU passe en 14,1 s** : accident réel de toiture, poses au sol et cargaison, puis chargement d'une fixture Gunshot, inspection, traitement physique, sauvegarde/rechargement. Deux blessures traitées, XP du médecin, zéro erreur navigateur ; [compte rendu](../../artifacts/health-ui-v54.json), [capture inspectée](../../artifacts/bullet-care-v54.png), compteur FPS visible. Une fixture de blessure ne valide pas une émission de projectile ni la synchronisation d'un combat.

TypeScript et build Vite passent ; avertissement du bundle principal (~1,10 Mo brut) inchangé. Pas de longue UI civile ni garde minage/abattage rejouée : aucune commande, horloge de présentation, pose ou phase de récolte n'est changée ; l'UI médicale et les snapshots ciblent ici le nouveau type persistant. Elles seront complétées avec émission/vol/impact visibles.

## Coût de résolution V54

[Données brutes](../../artifacts/bullet-impact-v54.json), Ryzen 5 3600, Node 24.11.1, Windows 11 10.0.26200. Cinquante lots de chauffe puis cinq cents mesures : un tiers d'impacts extérieurs avec excès, un tiers cerveau/couches externes, un tiers sélection pondérée. Dossiers initiaux identiques par lot, sains ou avec vingt petites lésions ; copie et résolution incluses, création/validation et comptage hors mesure. Aucun navigateur de test concurrent.

| Impacts par lot | Lésions préexistantes par personne | p95 | p99 | Maximum |
|---|---:|---:|---:|---:|
| 3 | 0 / 20 | 0,0879 / 0,0779 ms | 0,2530 / 0,1622 ms | 0,4088 / 0,2905 ms |
| 30 | 0 / 20 | 0,5051 / 0,6346 ms | 0,6683 / 0,8170 ms | 1,0465 / 1,0141 ms |
| 100 | 0 / 20 | 1,3631 / 1,6487 ms | 1,5434 / 1,9245 ms | 1,5773 / 2,0750 ms |

La suite vérifie la continuation exacte du dossier et du PRNG. Ce sont des **impacts simultanés isolés**, pas cent combattants avec navigation/worker/rendu ; aucune promesse de FPS. Aucun coût observé ne justifie ici de cache médical persistant ou de compute supplémentaire. Reprendre la charge mixte intégrée lors du premier affrontement.

## Dernières preuves intégrées de mobilisation — V53

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
