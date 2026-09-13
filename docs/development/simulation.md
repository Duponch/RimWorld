# Noyau de simulation — schéma 2, tranche matérielle G0

État du 13 septembre 2026 : collecte → piles au sol → prélèvement → portage → stockage ou chantier → construction. Cette tranche remplace le stock global autoritaire du schéma 1. Les besoins, le calendrier et une partie de la navigation restent simplifiés ; **G0 n'est pas déclaré entièrement achevé**. Les contrats détaillés sont dans [material-logistics.md](material-logistics.md), les adaptations fonctionnelles dans [les choix de gameplay](../gameplay/decisions.md).

Référence par défaut : corpus utilisateur, chapitres 2/4/5/9/10/21/30/32, SYS-005/020..022/041..061/113..117. Le moteur peut employer ses propres techniques tant qu'il conserve les conséquences documentées. Les constantes ci-dessous sont des paramètres de Lisière, pas des valeurs de RimWorld certifiées.

## Frontière et état

`src/sim/` est du TypeScript strict sans Three.js, DOM, horloge réelle, GPU ou `Math.random`. Le même noyau tourne dans le worker du navigateur, Vitest et Node. Le rendu observe les snapshots ; il ne transfère jamais de matière. Rust/WASM et navigation GPU restent des alternatives à mesurer derrière cette frontière.

L'API de `src/sim/index.ts` expose `createWorld`, `stepWorld`, `applyCommand`, `serializeWorld`, `deserializeWorld`, `validateWorld` et `hashWorld`. `canDesignate` partage les règles de placement avec l'aperçu ; `queryJobStatus` et `queryPawnStatus` donnent les diagnostics disponibles. Les helpers de matière servent au noyau et aux fixtures, sans autoriser une interface à modifier directement son snapshot.

Les dimensions vont de 8 à 128 cellules par axe ; `createWorld` conserve 32² par défaut, l'application demande 64² et propose 32/64/128. Les coordonnées x/z sont entières, les terrains rangés dans `tiles[z * width + x]`. Les IDs sont uniques entre colons, ressources, structures, travaux, piles et cellules de stockage ; `nextId` dépasse tous les IDs existants.

`World` contient schéma, seed, RNG, tick, terrain, entités, piles, stockages, travaux, routes, cadences, phases de transport et `logisticsCursor`. Le journal d'événements est borné à 80 entrées. **Ce journal n'est pas un historique complet et rejouable des commandes.** Les versions explicites de contenu et de générateur ne figurent pas encore dans un manifeste de sauvegarde.

`definitions.ts` fournit le petit catalogue immuable de matériaux et constructions. Une pile a une quantité entière positive et un propriétaire unique : cellule au sol, colon ou chantier. `stock` est une vue des piles au sol et portées ; `job.escrow` est une vue des piles livrées au chantier. Incrémenter ces vues ne crée pas de matière et rendrait l'état invalide.

## Temps et déterminisme

La simulation reste à **10 ticks/seconde, 6 000 ticks/jour**. `stepWorld` accepte 0 à 100 000 ticks entiers par appel ; cette borne d'entrée n'est pas un budget conseillé pour une frame. Les vitesses changent le nombre de ticks exécutés, jamais les constantes de règles. Les unités de temps et de nutrition devront être décidées avant la calibration de G1.

L'ordre des colons tourne selon le tick. Les parcours utilisent un ordre stable nord/est/sud/ouest ; le classement des travaux utilise priorité, rang naturel, distance puis identifiant. Routes, cadences et curseur logistique sont sérialisés puisqu'ils affectent le futur. À version de règles et de générateur identiques, même seed et mêmes commandes aux mêmes ticks produisent le même état, indépendamment des lots de ticks et d'une sauvegarde/reprise.

La génération emploie des hachages et des champs spatiaux déterministes ; le RNG persistant du monde ne pilote pas le paysage. Les sauvegardes conservent chaque case et ressource, sans régénération au chargement. Une seed seule ne reproduit pas un ancien générateur. `hashWorld` fournit un diagnostic FNV-1a du JSON, sans garantie cryptographique.

## Commandes et travaux

La carte commence avec trois colons, 12 bois et 18 nourritures **en piles près du camp**, sans réserve prédéfinie. Deux arbres et un buisson proches permettent les premiers essais. La collecte exige une désignation explicite.

| Travail | Durée hors trajet | Conséquence |
|---|---:|---|
| Abattage `chop` | 100 ticks | L'arbre entier devient du bois à sa position. |
| Récolte `harvest` | 60 ticks | Le buisson entier devient de la nourriture à sa position. |
| Mur `wall` | 70 ticks | 5 bois livrés deviennent un mur. |
| Lit `bed` | 120 ticks | 8 bois livrés deviennent un lit orienté 1×2. |

Un colon avance d'une cellule tous les trois ticks. Le travail et la livraison au chantier utilisent une case voisine orthogonale du périmètre, extérieure à son empreinte. Prélèvement et stockage peuvent se faire sur la cellule ou à côté. Il n'y a pas encore de repousse, recette ou récolte partielle du végétal.

```ts
{ type: 'designate', kind: 'chop' | 'harvest' | 'wall' | 'bed', x, z, orientation?: 0 | 1 | 2 | 3 }
{ type: 'cancel', x, z }
{ type: 'priority', pawnId, work: 'gather' | 'build' | 'haul', value: 0 | 1 | 2 | 3 | 4 }
{ type: 'stockpile', x, z, enabled, filters?: { wood, food }, priority?: number, capacity?: number }
```

Les priorités de travail vont de **1 haute à 4 basse**, 0 désactivant la famille. Les valeurs initiales sont collecte 2, construction 2, transport 3. À priorité égale, le rang naturel actuel favorise collecte, construction puis transport. Changer une priorité active s'applique au prochain choix ; désactiver interrompt immédiatement la famille concernée. Désactiver Construction ne désactive pas les livraisons si Transport reste actif.

Les commandes refusées rendent un code et une raison sans modifier l'état. Le placement valide toute l'empreinte contre terrain, ressources, objets, bâtiments, plans, stockages et colons. Annuler depuis l'une des deux cellules d'un lit cible le même plan. Les motifs expliquent matériaux manquants, livraison et travail désactivé ; le diagnostic exhaustif de l'accès reste à construire.

## Propriété, stockage et interruptions

Le portage est limité à **10 unités**, la pile à **75**. Une réserve est actuellement une cellule, avec filtres bois/nourriture, capacité totale 1–75 et priorité **1 basse à 4 haute**, défaut 2. Une réserve n'est pas un propriétaire supplémentaire : les objets y restent des piles au sol. Modifier un filtre n'efface pas les objets présents. Une réserve pleine n'accepte pas de nouvelles livraisons ; des réserves équivalentes n'entraînent pas de transport circulaire.

Un colon possède au plus un travail ou un transport. Un travail actif est réservé par un seul colon, avec références réciproques. Une tâche de transport persistée décrit source, quantité, destination, phase `pickup` ou `deliver` et ID de cargaison. Les engagements de source et de capacité sont calculés depuis ces tâches. Plusieurs colons peuvent réserver des fractions distinctes d'une même pile.

Le prélèvement fractionne la source et donne la cargaison au porteur. Le dépôt transfère vers le sol ou le chantier et fusionne les piles compatibles. Le constructeur ne peut être affecté qu'après livraison du coût complet. Une livraison partielle reste au chantier sans permettre une progression prématurée ; une nouvelle source peut compléter ce même chantier plus tard.

Interrompre conserve les transformations déjà faites : progression et matériaux livrés restent au chantier ; une cargaison est déposée à la position du colon. Changer le filtre ou retirer une réserve invalide ses engagements. Annuler un plan retire sa progression et dépose ses matériaux livrés à son emplacement. Une nouvelle construction sur cette pile est refusée tant qu'elle n'a pas été déplacée. Le déplacement automatique des obstacles n'est pas livré.

Le bilan bois indépendant additionne **arbres + piles de tous propriétaires + matériaux incorporés aux bâtiments**. Les vues `stock` et `escrow` ne s'y ajoutent pas. Le bilan nourriture additionne buissons, piles et portions consommées. Les plafonds de piles et d'identifiants doivent être vérifiés avant une allocation ou un transfert ; une récolte qui ne peut produire sa sortie reste inachevée sans supprimer la ressource.

## Navigation et budgets

Le gameplay utilise encore un **BFS CPU**. Son champ d'accessibilité est partagé entre les candidats d'un colon, puis seul le chemin choisi est conservé. Les nouvelles tâches et dépôts réveillent les planificateurs ; sans changement, la cadence de réexamen habituelle est de 20 ticks.

Un tick partage deux budgets : **huit recherches BFS** et **32 768 couples source/destination examinés**. Le produit piles × destinations n'est pas matérialisé dans un immense tableau de candidats. Des index locaux regroupent quantités et réservations ; une fenêtre tournante utilise `logisticsCursor`, persistant dans la sauvegarde. Lorsque tous les couples ne tiennent pas dans la fenêtre, le classement ne prétend pas avoir trouvé le meilleur transport global en une seule visite. Les scans d'entités, copies, besoins et autres travaux subsistent : ces bornes ne garantissent pas une durée de tick constante.

Eau, terrain rocheux, murs et plans de murs bloquent le passage. Les colons ne se superposent pas ; un colon inactif peut céder une cellule de passage. Les lits sont des meubles franchissables dans cette tranche, mais occupent leurs deux cellules pour le placement et les conflits. Les anciennes emprises 1×1 sont explicites. Un trajet périmé est recalculé avec cadence ; une tâche inaccessible libère ses engagements.

La réservation d'un travail ne réserve pas encore une case de service ni un créneau temporel de passage. Les impasses entre plusieurs colons actifs ou endormis restent ouvertes. Le [laboratoire WebGPU](../research/gpu-navigation.md) ne pilote pas les colons ; son intégration devra préserver ordre d'adoption, révisions, réservations et continuation.

## Besoins encore simplifiés

| Règle | Valeur actuelle |
|---|---|
| Faim | Perte de 0,015/tick, soit 90/jour ; 100 signifie rassasié. |
| Repas | À faim ≤ 45, prélève une unité de nourriture au sol non réservée, ajoute 35 points. |
| Faim critique | À faim ≤ 20 sans repas, interrompt transport et travaux autres que récolte de baies. |
| Repos éveillé | Perte de 0,008/tick, soit 48/jour. |
| Sommeil | Sur place, de repos ≤ 20 jusqu'à repos ≥ 85. |
| Récupération | +0,12/tick au sol ; +0,22 sur ou à côté d'une cellule de lit. |
| Humeur | Arrondi de `0,6 × faim + 0,4 × repos`. |

Le repas consomme de la matière réelle mais **reste à distance**, sans trajet, ingestion ou vérification d'accès. Il ne consomme ni quantité réservée, ni cargaison, ni matériaux de chantier. Le colon peut manger pendant son sommeil. Il ne cherche pas de lit libre et ne se déplace pas jusqu'à un couchage. Ces adaptations attendent G1 ; pensées et crises relèvent de G3. La faim ne provoque encore ni blessure ni décès.

## Sauvegardes et migration

Le schéma 2 conserve propriétaires, quantités, filtres, capacités, orientations, tâches, routes, cadences et curseur logistique. La validation contrôle types et bornes, IDs uniques, liens réciproques, quantités réservées, stock dérivé, emprises, chemins contigus et états de travail. Une route devenue bloquée peut rester sauvegardée : son recalcul appartient à la simulation. Le JSON est limité à 16 millions de caractères. Une entrée invalide n'est jamais renvoyée comme monde utilisable ni adoptée par le worker.

La lecture du schéma 1 commence par sa validation propre, puis migre explicitement : stock global en piles à un emplacement déterministe praticable près du camp ; escrow ancien en piles de chantier ; Transport à 3, priorités précédentes conservées. Les IDs existants, tick, terrain et ressources restent présents. Tous les anciens lits et plans de lits gardent `legacy-single` 1×1, y compris en bordure ; ils ne sont jamais agrandis silencieusement.

Une ancienne construction interrompue peut avoir une progression positive et un escrow nul : le schéma 1 remboursait ses matériaux. Cette migration conserve la progression, mais exige une nouvelle livraison avant de reprendre le travail. La continuation du schéma 2 est exacte ; la migration ne prétend pas reproduire le futur de l'ancien moteur à stock global. Les limites de quantité et de nombre de piles sont contrôlées avant allocation des stocks historiques.

Les clés locales `lisiere.save.v1` et `lisiere.previous.v1` restent identiques pour retrouver les parties existantes ; le schéma se lit dans le JSON. Caméra, sélection et vitesse d'affichage ne font pas partie du monde sauvegardé. Export/import de fichiers, autosauvegardes tournantes et manifeste contenu/générateur restent à livrer.

## Preuves et suite

Les huit scénarios de `tests/simulation.test.ts` couvrent reprise aux transitions pickup/portage/dépôt/travail, réservations partagées et fusion, changements de filtres/capacités, interruptions et annulations, approvisionnement partiel, besoins, obstacles, congestion simple, charge de 40 colons et migrations/corruptions. Le soak exécute cinq graines × 12 000 ticks avec bilan bois, nourriture et invariants **à chaque tick**, plus résultats de colonie. Les régressions finales incluent une réserve dont la capacité diminue, un passage bloqué seulement à destination et une fenêtre de 40 000 couples poursuivie après 32 768 avec sauvegarde exacte du curseur. Les trois scénarios de génération vérifient aussi un premier camp avec collecte, stockage et reprise.

La validation finale du 13 septembre 2026 réussit avec **13/13 scénarios** : huit simulation, trois génération, deux contrats GPU, puis build réussi. Les trois parcours navigateur passent lors de contrôles ciblés successifs ; le contrôle graphique réel utilise WebGPU AMD/RDNA-1 sans erreur. Résultats, backends et limites sont dans [validation.md](validation.md). Ces scénarios ne garantissent pas l'absence de tout bug ; aucune exécution logicielle ne prouve les performances GPU. Choisir les relances selon [testing.md](testing.md).

`npm run bench` mesure le noyau sur cartes ouvertes 64², cinq répétitions pour 3/30/100/300 colons : premier tick, 200 ticks par lots de 20, puis résultats de collecte et de stockage à 1 001 ticks, avec contrôle de conservation. Le monde inactif est distinct. Le benchmark schéma 2 inclut le transport ; les anciens chiffres schéma 1 ne constituent donc pas une comparaison A/B. Le p95 est celui des moyennes de lots, pas celui des pointes individuelles. GPU, navigateur, rendu, échanges et persistance sont exclus ; les fichiers de mesure doivent garder date, runtime et matériel.

Le [rapport final du 13 septembre à 12:39:49,525 UTC](../../artifacts/simulation-benchmark.json), Node v24.11.1 sur Ryzen 5 3600/Windows x64, vérifie la conservation et l'achèvement des collectes jusqu'à 300 colons. À cette population, le tick actif médian est de 0,914 ms et le p95 des moyennes de lots de 2,244 ms ; **2 783/3 600 bois seulement sont stockés au tick 1 001**. Les quantités restantes sont conservées, mais le transport n'est pas terminé. Cette fenêtre ne prouve donc pas la résolution de la congestion. Le tableau complet est dans [validation.md](validation.md#mesure-finale-du-noyau-matériel) ; les [mesures initiales](../../artifacts/simulation-benchmark-initial.json) restent séparées.

La suite G0 concerne notamment zones à plusieurs cellules et politiques communes, sélection et ordres contextuels, diagnostics d'accès, réservation des cases de travail et congestion, journal de commandes et manifestes. Les index persistants avec invalidation devront être évalués sur les charges réelles. L'agriculture, les recettes et les vrais trajets de besoins viennent avec G1 ; habitat, santé, combat et narration suivent [ROADMAP](../ROADMAP.md).
