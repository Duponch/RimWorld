# Table de taille de pierre — V31

[Référence et incertitudes](../research/stonecutter-reference.md), [construction matérielle](construction-materials.md), [transferts](furniture-transfer.md), [circulation](furniture-travel.md).

## Périmètre livré

Architecte → Production propose une table de taille, en bois ou acier, orientable par Q/E. Construction exige respectivement 75 bois + 30 acier, ou 105 acier, réellement livrés. Le travail dure 140/200 ticks locaux. Désinstallation, rangement filtré, réinstallation avec rotation et déconstruction sont utilisables. **La fabrication de blocs est désormais livrée en [V32](stonecutting.md)** ; ce document décrit le bâtiment introduit en V31.

## Modèle et règles communes

`StructureKind.stonecutter` passe par les chantiers, réservations, fournisseurs et annulations existants. `construction-materials.ts` agrège les ingrédients fixes et substituables par ItemId avant de figer une recette. Une exigence de 105 acier accepte plusieurs piles de chantier plafonnées à 75 ; leur somme demeure l'autorité. La vue historique `escrow.wood` ne remplace pas cette somme typée. Tous les ingrédients sont requis avant le premier tick de finition.

`footprintCells` et `footprintContains` définissent les trois cases centrées sur l'ancre. Le second ne crée pas de tableau dans les recherches ponctuelles. La rotation emploie la convention existante : orientation 0 sur X, orientation 1 sur Z. Plans, approvisionnement, sélection, cadres, finitions, transferts et prévisualisation utilisent cette même empreinte ; aucun changement des anciennes emprises de lits/tables.

Le profil `Item` conserve les piles compatibles et interdit les zones. Les suppressions de zones et les cargaisons déjà promises passent par les transactions existantes. Le plateau ne donne aucun bonus de repas : ce n'est pas une table `Eat`. Passage autorisé sur trois cases, arrêt ordinaire exclu, supplément 5 ticks à l'entrée depuis le sol ; pas de répétition entre objets qualifiants. Le coût est capturé dans l'arête et validé à la reprise.

La déconstruction prépare les dépôts de **tous** les ingrédients sur une vue indépendante. Deux types ne peuvent promettre la même cellule vide. Saturation, limite d'ID ou de compteur : pas de retrait ni de consommation PRNG. La réinstallation déplace l'identité et le matériau sans reconstruire la recette et reste accessible au Transport seul.

## Sauvegarde et présentation

Schéma **31** : V30 validée strictement avant incrément, sans changement d'entité, route, quantité ou recette historique. Un atelier exige un matériau explicite ; il ne possède pas de variante historique à zéro coût. Ancien schéma contenant atelier, paquet ou cible d'installation futurs refusé. La validation de forme accepte les progressions longues en V31, puis le contrôle métier exige `progress < jobDuration` ; la borne 119 historique reste appliquée avant migration. Supplément de trajet 5 refusé avant V31.

Plateau de 2,9×0,9 m, hauteur 0,85 m, pieds, traverse, scie manuelle et ciseau : `stonecutter-parts.ts`, une responsabilité extraite. Les onze boîtes par atelier rejoignent le lot de mobilier existant et son matériau partagé. Pas de nouveau draw call par atelier ; cela ne signifie pas coût GPU nul. Les poses GPU du colon et les piles utilisent la hauteur centralisée dans `scale.ts`. Les outils restent statiques ; le colon utilise son animation de travail GPU pendant la taille V32.

## Vérification et prochain lot

Deux scénarios profonds enrichissent construction-matériaux : deux livreurs, manque d'une unité, réserve retirée/pile conservée, total 105 réparti sur deux piles, travail au-delà de 119, annulation portée, reprise exacte, transfert tourné, refus de champs futurs, remboursements multiples sur carte saturée et stabilité PRNG. L'oracle dirigé du mobilier couvre les quatre orientations de l'atelier. Le pilote de colonie installe un atelier après le premier acier ; son bilan garde 80 acier extraits = 30 incorporés + 50 en réserve.

Les bancs existants admettent le mode atelier : `construction-bench.ts --workshops` pour CPU/snapshots, `CONSTRUCTION_WORKSHOPS=1 MINING_COUNTS=100` avec `mining-render-bench.mjs` pour la construction réelle dans le worker. Le second garde ses noms internes d'événement de minage pour partager l'instrumentation ; son protocole explique que ces événements sont des achèvements d'ateliers, sur une carte dégagée. [Preuves](validation.md).

Suite livrée : [production V32](stonecutting.md) après [nouvelle recherche](../research/stonecutting-reference.md). Constructions en pierre, pièces et lumière fonctionnelle restent ouvertes.
