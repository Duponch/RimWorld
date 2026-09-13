# Noyau de simulation — schéma 5, besoins et matériaux

État du 13 septembre 2026 : collecte → piles au sol → prélèvement → portage → stockage ou chantier → construction. Cette tranche remplace le stock global autoritaire du schéma 1. Les besoins, le calendrier et une partie de la navigation restent simplifiés ; **G0 n'est pas déclaré entièrement achevé**. Les contrats détaillés sont dans [material-logistics.md](material-logistics.md), les adaptations fonctionnelles dans [les choix de gameplay](../gameplay/decisions.md).

Référence par défaut : corpus utilisateur, chapitres 2/4/5/9/10/21/30/32, SYS-005/020..022/041..061/113..117. Le moteur peut employer ses propres techniques tant qu'il conserve les conséquences documentées. Les constantes ci-dessous sont des paramètres de Lisière, pas des valeurs de RimWorld certifiées.

## Frontière et état

`src/sim/` est du TypeScript strict sans Three.js, DOM, horloge réelle, GPU ou `Math.random`. Le même noyau tourne dans le worker du navigateur, Vitest et Node. Le rendu observe les snapshots ; il ne transfère jamais de matière. Rust/WASM et navigation GPU restent des alternatives à mesurer derrière cette frontière.

L'API de `src/sim/index.ts` expose `createWorld`, `stepWorld`, `applyCommand`, `serializeWorld`, `deserializeWorld`, `validateWorld` et `hashWorld`. `canDesignate` partage les règles de placement avec l'aperçu ; `queryJobStatus` et `queryPawnStatus` donnent les diagnostics disponibles. Les helpers de matière servent au noyau et aux fixtures, sans autoriser une interface à modifier directement son snapshot.

Les dimensions du schéma 5 vont de 8 à **250 cellules par axe**, avec constantes centralisées dans `src/sim/map-config.ts`. `createWorld` conserve 32² comme défaut technique pour les fixtures et appels existants ; l'application demande 250² par défaut, propose 200² et conserve les essais 32²/64²/128². Les coordonnées x/z sont entières, les terrains rangés dans `tiles[z * width + x]`. Les IDs sont uniques entre colons, ressources, structures, travaux, piles et cellules de stockage ; `nextId` dépasse tous les IDs existants. L'extension de borne n'ajoute aucun champ : les cartes existantes ne sont ni agrandies ni régénérées.

`World` contient schéma, seed, RNG, tick, terrain, entités, piles, stockages, travaux, routes, cadences, phases de transport et `logisticsCursor`. Le journal d'événements est borné à 80 entrées. **Ce journal n'est pas un historique complet et rejouable des commandes.** Les versions explicites de contenu et de générateur ne figurent pas encore dans un manifeste de sauvegarde.

`items.ts` fournit les objets alimentaires/bois, `definitions.ts` les constructions et catégories ; les piles conservent leur `item` et les repas leur quantité réservée. Une pile a une quantité entière positive et un propriétaire unique : cellule au sol, colon ou chantier. `stock` est une vue des piles au sol et portées ; `job.escrow` est une vue des piles livrées au chantier. Incrémenter ces vues ne crée pas de matière et rendrait l'état invalide.

## Temps et déterminisme

La simulation reste à **10 ticks/seconde, 6 000 ticks/jour**. `stepWorld` accepte 0 à 100 000 ticks entiers par appel ; cette borne d'entrée n'est pas un budget conseillé pour une frame. Les vitesses changent le nombre de ticks exécutés, jamais les constantes de règles. La nutrition adulte et le profil historique sont définis dans [food-items.md](food-items.md) ; chaque futur profil conserve une conversion explicite.

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

Depuis le passage aux cartes 250², la grille de blocage est construite **au plus une fois par tick, lors du premier besoin de planification ou déplacement**. En l'absence de demande de navigation, un tick inactif ou du travail adjacent ne scanne plus automatiquement tout le terrain. La grille n'est jamais conservée entre ticks : commande, sauvegarde restaurée ou modification du terrain entre appels sont visibles à la recherche suivante. Le BFS ne crée plus un tableau de voisins pour chaque cellule visitée ; l'ordre nord/est/sud/ouest, les choix à distance égale et les routes restent identiques. La [mesure appariée](map-scale.md#mesure-du-noyau-cpu) compare le JSON complet de génération et de continuation hors chronométrage avec le moteur précédent. Aucun cache persistant ni nouveau champ de sauvegarde n'est introduit par cette optimisation.

Un tick partage deux budgets : **huit recherches BFS** et **32 768 couples source/destination examinés**. Le produit piles × destinations n'est pas matérialisé dans un immense tableau de candidats. Des index locaux regroupent quantités et réservations ; une fenêtre tournante utilise `logisticsCursor`, persistant dans la sauvegarde. Lorsque tous les couples ne tiennent pas dans la fenêtre, le classement ne prétend pas avoir trouvé le meilleur transport global en une seule visite. Les scans d'entités, copies, besoins et autres travaux subsistent : ces bornes ne garantissent pas une durée de tick constante.

Eau, terrain rocheux, murs et plans de murs bloquent le passage. Les colons ne se superposent pas ; un colon inactif peut céder une cellule de passage. Les lits sont des meubles franchissables dans cette tranche, mais occupent leurs deux cellules pour le placement et les conflits. Les anciennes emprises 1×1 sont explicites. Un trajet périmé est recalculé avec cadence ; une tâche inaccessible libère ses engagements.

La réservation d'un travail ne réserve pas encore une case de service ni un créneau temporel de passage. Les impasses entre plusieurs colons actifs ou endormis restent ouvertes. Le [laboratoire WebGPU](../research/gpu-navigation.md) ne pilote pas les colons ; son intégration devra préserver ordre d'adoption, révisions, réservations et continuation.

## Actions de repas et de sommeil

Les besoins sont désormais réalisés par des tâches exclusives : réservation, trajet, prise en main puis ingestion ; attribution et trajet jusqu'au lit, sommeil seulement à destination. Le repli au sol exige un couchage absent/inaccessible ou un épuisement. Aucun bonus de proximité, aucune nutrition accordée à distance. Le [contrat des besoins](needs.md) précise phases, paramètres provisoires, migrations, limites de contenu et tests.

## Sauvegardes et migration

Le schéma 5 conserve en plus les phases de besoin, la portion tenue, le propriétaire du lit et les cadences. Il conserve propriétaires, quantités, filtres, capacités, orientations, tâches, routes, cadences et curseur logistique. La validation contrôle types et bornes, IDs uniques, liens réciproques, quantités réservées, stock dérivé, emprises, chemins contigus et états de travail. Une route devenue bloquée peut rester sauvegardée : son recalcul appartient à la simulation. Le JSON est limité à 16 millions de caractères. Une entrée invalide n'est jamais renvoyée comme monde utilisable ni adoptée par le worker.

La lecture du schéma 1 commence par sa validation propre, puis migre explicitement : stock global en piles à un emplacement déterministe praticable près du camp ; escrow ancien en piles de chantier ; Transport à 3, priorités précédentes conservées. Les IDs existants, tick, terrain et ressources restent présents. Tous les anciens lits et plans de lits gardent `legacy-single` 1×1, y compris en bordure ; ils ne sont jamais agrandis silencieusement.

Une ancienne construction interrompue peut avoir une progression positive et un escrow nul : le schéma 1 remboursait ses matériaux. Cette migration conserve la progression, mais exige une nouvelle livraison avant de reprendre le travail. La continuation du schéma 5 est exacte ; la migration ne prétend pas reproduire le futur de l'ancien moteur à stock global. Les limites de quantité et de nombre de piles sont contrôlées avant allocation des stocks historiques.

Les clés locales `lisiere.save.v1` et `lisiere.previous.v1` restent identiques pour retrouver les parties existantes ; le schéma se lit dans le JSON. Caméra, sélection et vitesse d'affichage ne font pas partie du monde sauvegardé. Export/import de fichiers, autosauvegardes tournantes et manifeste contenu/générateur restent à livrer.

V2 est validé avant initialisation des nouveaux champs : les objets et travaux sont conservés ; un ancien dormeur réévalue son couchage au prochain tick. La fixture historique et la décision sont décrites dans [needs.md](needs.md).

## Preuves et suite

Les huit scénarios de `tests/simulation.test.ts` couvrent reprise aux transitions pickup/portage/dépôt/travail, réservations partagées et fusion, changements de filtres/capacités, interruptions et annulations, approvisionnement partiel, besoins, obstacles, congestion simple, charge de 40 colons et migrations/corruptions. Le soak exécute cinq graines × 12 000 ticks avec bilan bois, nourriture et invariants **à chaque tick**, plus résultats de colonie. Les régressions finales incluent une réserve dont la capacité diminue, un passage bloqué seulement à destination et une fenêtre de 40 000 couples poursuivie après 32 768 avec sauvegarde exacte du curseur. Les trois scénarios de génération vérifient aussi un premier camp avec collecte, stockage et reprise.

La validation de la tranche matérielle du 13 septembre 2026 avait réussi avec **13/13 scénarios** : huit simulation, trois génération, deux contrats GPU, puis build réussi. Ses trois parcours navigateur avaient passé lors de contrôles ciblés successifs, avec un contrôle WebGPU AMD/RDNA-1 sans erreur. Le passage aux cartes 250² réussit ensuite **14/14 scénarios dans quatre fichiers en 19,14 s**, avec les familles de génération enrichies et un contrat du flux de snapshots. Les preuves navigateur actuelles, backends et limites sont dans [validation.md](validation.md). Ces scénarios ne garantissent pas l'absence de tout bug ; aucune exécution logicielle ne prouve les performances GPU. Choisir les relances selon [testing.md](testing.md).

`npm run bench` mesure le noyau sur cartes ouvertes 64², cinq répétitions pour 3/30/100/300 colons : premier tick, 200 ticks par lots de 20, puis résultats de collecte et de stockage à 1 001 ticks, avec contrôle de conservation. Le monde inactif est distinct. Le benchmark schéma 2 inclut le transport ; les anciens chiffres schéma 1 ne constituent donc pas une comparaison A/B. Le p95 est celui des moyennes de lots, pas celui des pointes individuelles. GPU, navigateur, rendu, échanges et persistance sont exclus ; les fichiers de mesure doivent garder date, runtime et matériel.

Le [rapport final du 13 septembre à 12:39:49,525 UTC](../../artifacts/simulation-benchmark.json), Node v24.11.1 sur Ryzen 5 3600/Windows x64, vérifie la conservation et l'achèvement des collectes jusqu'à 300 colons. À cette population, le tick actif médian est de 0,914 ms et le p95 des moyennes de lots de 2,244 ms ; **2 783/3 600 bois seulement sont stockés au tick 1 001**. Les quantités restantes sont conservées, mais le transport n'est pas terminé. Cette fenêtre ne prouve donc pas la résolution de la congestion. Le tableau complet est dans [validation.md](validation.md#mesure-finale-du-noyau-matériel) ; les [mesures initiales](../../artifacts/simulation-benchmark-initial.json) restent séparées.

La suite G0 concerne notamment zones à plusieurs cellules et politiques communes, sélection et ordres contextuels, diagnostics d'accès, réservation des cases de travail et congestion, journal de commandes et manifestes. Les index persistants avec invalidation devront être évalués sur les charges réelles. L'agriculture, les recettes et les vrais trajets de besoins viennent avec G1 ; habitat, santé, combat et narration suivent [ROADMAP](../ROADMAP.md).

Le [contrat repas à table](dining.md) complète les besoins : places, phases et effets persistés, migration V3, limites des recherches partielles et réservations exclusives.
