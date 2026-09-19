# Murs, portes, dégâts et réparation — 19 septembre 2026

Lot V67, première dépendance **jouable** de la menace en colonie (étape 2). La revue a constaté des enceintes indestructibles et aucune réparation. Livrer un raid maintenant produirait des adversaires bloqués ; cette tranche n'est ni un raid livré ni la clôture de l'étape 2.

## Corpus et confrontation

Chapitres 10, 20, 22 et 24 relus dans le HTML original ; tableur `Systemes` SYS-057/058 et `Tests` TEST-057/058 : objet encore valide, libération du réparateur après destruction, distinction restitution/dommages. Adopter ces invariants, adapter les transactions et volumes à notre moteur. SYS-132..135 restent la cible du prochain incident, pas une validation acquise.

Sources consultées de nouveau :

- [Mur](https://rimworldwiki.com/wiki/Wall), [porte](https://rimworldwiki.com/wiki/Door), [structure](https://rimworldwiki.com/wiki/Structure), [blocs](https://rimworldwiki.com/wiki/Stone_Blocks) : bases 300/160 PV, facteurs bois 0,65, acier 1, granite 1,7, calcaire 1,55, marbre 1,2, grès 1,4, ardoise 1,3. Les fiches des deux ouvrages indiquent aucun matériau récupéré après destruction.
- [Construction Speed](https://rimworldwiki.com/wiki/Construction_Speed) : compétence et capacités. [Repair Success Chance](https://rimworldwiki.com/wiki/Repair_Success_Chance) et [Breakdown](https://rimworldwiki.com/wiki/Breakdown) décrivent une panne avec composant, distincte d'une restauration de PV.
- Miroir **non officiel**, révision `2d508035082e7cb0c8e29e230d26bda6e546928f`, datée du 20 mai 2026, se déclarant 1.6.9438.38202 : [JobDriver_Repair](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/JobDriver_Repair.cs), [WorkGiver_Repair](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/WorkGiver_Repair.cs), [RepairUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/RepairUtility.cs). Réservation exclusive, accès Touch, zone de foyer même pour un ordre forcé, exclusion d'un objet désigné pour déconstruction ; aucune dépense de matière. Travail initial 80 puis 20 Core, vitesse ConstructionSpeed × 1,7, +1 PV par échéance, apprentissage 0,05 XP/Core travaillé.
- Même révision, [Verb_MeleeAttack](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/Verb_MeleeAttack.cs), [Verb_MeleeAttackDamage](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/Verb_MeleeAttackDamage.cs), [GenLeaving](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/GenLeaving.cs). Une cible immobile court-circuite le raté ; outils/cadence existants, variation de dégâts 0,8–1,2. La branche générale de restitution 25 % ne s'applique que si `leaveResourcesWhenKilled` l'autorise : ne pas la généraliser aux murs/portes.
- [Raids](https://rimworldwiki.com/wiki/Raids) : les assaillants ordinaires peuvent attaquer des murs faute de cible accessible ; retraite humaine, délais et tactiques de groupe restent à confronter lors de leur implémentation. La page signale elle-même des parties anciennes. Une classe de poursuite individuelle n'est pas un groupe de raid.

## Décisions et limites

Adopter PV, dégâts persistants, absence de remboursement de ces deux ouvrages, réparation au contact sans matériau, foyer et concurrence déconstruction. Réutiliser dégâts/outils, PRNG et cadence de combat ; les balles interceptées peuvent aussi abîmer ces ouvrages.

Adapter : grille de foyer triée peinte explicitement dans Architecte ; pas encore d'extension automatique du foyer après construction. Réparation cardinale pour les volumes 3D, comme les autres travaux présents ; le Touch Core peut admettre d'autres contacts. Dix sous-pas de travail par tick local ; XP regroupée par tick local pour éviter l'arrondi répété à 0,018 au lieu de 0,0175 XP sans passion. Le gain de niveau affecte la cadence à partir du tick local suivant. Les constructions historiques non typées restent bois pour leurs PV, comme leur recette et apparence.

Différer : dégâts aux autres meubles/plans/plantes/objets, feu/pannes, décombres et nettoyage, outil de tir dirigé sur un bâtiment, remplacement automatique, foyer automatique, raids et devenir des victimes. Les projectiles ont une géométrie logique ; aucun impact issu d'un collider graphique.

Certitude : comportement et chiffres convergent entre fiches et classes pour ce périmètre, mais le miroir précède d'éventuels correctifs 1.6 ultérieurs. Aucune parité exhaustive annoncée. Copies consultées dans `tmp/barrier-reference` (diagnostic local), contrat maintenu dans [barriers](../development/barriers.md).
