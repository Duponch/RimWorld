# Salissures, nettoyage et sols — référence V89

Recherche des 20–21 septembre 2026, **périmètre livré et validé V89** : voir les [preuves](../history/validation-hygiene-v89.md). Périmètre Core, sans extension. Le [contrat](../development/cleanliness.md) sépare comportement retenu et limites explicites.

## Sources et méthode

Le corpus utilisateur a été relu dans le HTML, chapitres **8, 9, 10, 11 et 12**, et dans les lignes originales du classeur : **SYS/TEST-027** (domicile distinct du stockage), **056/058** (chantier/restitution), **062–064/077** (production et nourriture), **094** (soins), **CAT-041/059/086** (sols, terrain, traces). Adopter travail physique, réservations et causalité ; adapter représentation 3D et ordonnancement ; ne pas transformer ces statuts proposés en preuves locales.

Référence primaire mesurée : installation locale **RimWorld 1.6.4871 rev590**, `Version.txt`, Defs Core et `Assembly-CSharp.dll`, SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Lecture seule ; aucune définition propriétaire, classe décompilée ou sauvegarde personnelle publiée. Les extraits de travail restent sous `tmp/cleanliness-reference-v89`. Le rev591 d'une sauvegarde n'est pas substitué à la version de cette DLL.

Classes relues : `Filth`, `FilthProperties`, `FilthMaker`, `Pawn_FilthTracker`, `WorkGiver_CleanFilth`, `JobDriver_CleanFilth`, `RoomStatWorker_Cleanliness`, `SteadyEnvironmentEffects`, `Pawn_HealthTracker`, `JobDriver_Vomit`, `TerrainGrid`, `JobDriver_RemoveFloor`, `JobDriver_AffectFloor`, `GenLeaving`, `FloatMenuOptionProvider_CleanRoom`, `Room`, `RegionAndRoomQuery`, `ThingDefGenerator_Buildings`, `ThingDef`. Defs : `Filth_Various`, `Terrain_Floors`, `Terrain_Floors_StoneTile`, `Terrain_Floors_Burned`, `Terrain_Natural`, `WorkTypes`, `WorkGivers`, statistiques de travail et bâtiments de production.

Recoupements Internet frais : [salissures](https://rimworldwiki.com/wiki/Filth), [pièces](https://rimworldwiki.com/wiki/Rooms), [plancher bois](https://rimworldwiki.com/wiki/Wood_floor), [dalles pierre](https://rimworldwiki.com/wiki/Stone_tile), [acier](https://rimworldwiki.com/wiki/Steel_tile). Le wiki est secondaire et certaines fiches affichent une ancienne version vérifiée ; les nombres ci-dessous viennent des fichiers locaux actuels. L'[annonce officielle 1.6](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/) situe le changement de version et les améliorations de conception des bases ; elle ne certifie aucun coefficient de nettoyage. Les anciennes discussions de forum et les mods de nettoyage n'ont pas servi d'oracle.

## Traces et sources physiques

| Trace Core retenue | Propreté par objet | Travail par couche, Core | Disparition après dernier épaississement | Pluie |
|---|---:|---:|---:|---|
| Terre | −5 | 35 | 45–50 jours | oui |
| Déchets humains | −5 | 35 | 45–50 jours | non |
| Sang | −10 | 70 | 35–40 jours | oui |
| Cendres | −15 | 70 | 10–15 jours | non |
| Vomi | −15 | 70 | 35–40 jours | oui |
| Bile de dépouille | −20 | 80 | 35–40 jours | oui |

Plusieurs espèces de traces peuvent occuper une cellule avec objets/personnes. Elles n'occupent pas la place d'une pile et ne ralentissent pas le passage. `Filth.CanBeThickened` limite les dépôts ordinaires à **5 couches**, malgré `FilthProperties.maxThickness=100` par défaut : ne pas confondre les deux bornes. L'épaisseur augmente le temps de nettoyage ; **elle ne multiplie pas la contribution de propreté** : le calcul de pièce utilise `stackCount`, qui n'est pas `thickness`. La durée de disparition est tirée à la création ; épaissir remet à jour le dernier épaississement sans retirer une nouvelle durée.

Le suivi des pieds teste à chaque entrée de cellule : dépôt **5 %**, prise **10 %**, génération **FilthRate × 0,005**. La terre portée est limitée à une couche. Les traces existantes ne s'attachent que si elles ont plus d'une couche et ont été épaissies il y a **strictement plus de 400 Core**. Prendre une trace existante l'amincit ; un dépôt refusé ne nettoie pas les pieds. L'humain produit sa dernière terre connue avec probabilité **0,66**, sinon des déchets. Les humains Core ont un FilthRate de base **1**. Les animaux, sable, insectes et autres débris demandent leurs profils propres : aucune saleté animale n'est renommée terre humaine.

Les masques sont importants : le terrain naturel ordinaire accepte les traces non naturelles mais pas la terre issue du sol extérieur. Un dépôt spontané de personne peut être accepté sous toit ou dans une pièce à température intérieure même sur terre. Les sols construits acceptent les traces. Eau et roche pleine sont exclus de notre support praticable. Les déchets portent aussi le drapeau Terrain : ils suivent le même refus sur sol naturel extérieur que la terre. Le suivi au pied n’invente aucune récolte ni pile matérielle.

Sang : le dossier Core produit des gouttes si saignement total **≥0,1/jour**. Chance par Core = débit × taille corporelle × **0,004 debout**, **0,0004 allongé** ; le tick par intervalle multiplie par `delta`. Les traînées spécifiques au rampement restent distinctes. Cendres : `DamageWorker_Flame` en produit dans l'emprise d'un objet non-pawn réellement détruit ; une flamme seule ne crée pas périodiquement des cendres. Le vomissement et la bile sont raccordés aux épisodes et dépouilles réels, pas à des événements décoratifs.

La pluie tente d'enlever une couche lorsque la cellule est visitée par `SteadyEnvironmentEffects`, sans toit, avec probabilité `rainRate`. La carte Core visite `ceil(surface × 0,0006)` cellules par tick, dans un ordre mélangé. Lisière retient une échéance locale échelonnée par cellule, de période équivalente, et son PRNG privé : adaptation explicite de l'ordonnancement, pas reproduction de la séquence aléatoire Unity. Le contrôle d'expiration porte sur le dernier épaississement. Les cendres ne sont pas lavées par cette règle.

## Nettoyage et propreté de pièce

Le fournisseur automatique vérifie domicile, cible réservée et âge **≥600 Core depuis épaississement**, même quand il est appelé comme fournisseur forcé. Travail `Cleaning`, priorité naturelle **200**, actif par défaut ; la recherche reste une catégorie séparée. L'exigence est la manipulation disponible, sans gain de compétence ni facteur de capacité dans la vitesse : `CleaningSpeed=1` pour les humains retenus.

Le menu direct `CleanRoom` utilise un autre chemin : il ne filtre pas l’âge de 600 Core. Il exige `ProperRoom`, foyer et accès ; `PsychologicallyOutdoors` rejette une pièce fermée avec au moins 300 cases découvertes, et non toute pièce ayant un quart de son toit absent. Cette dernière borne de 25 % concerne `UsesOutdoorTemperature` et l’exception de dépôt spontané, pas cet ordre. Le geste se fait au contact. Par Core, progression `CleaningSpeed / CleaningTimeFactor` ; la couche disparaît lorsque la progression est **strictement supérieure** au travail demandé, puis le compteur de couche repart à zéro. Sortir du foyer ou perdre la cible libère le travail. Le fournisseur Core rassemble les cibles voisines de la même pièce, accepte aussi ses portes adjacentes, et vise environ quinze traces : ce regroupement ne permet pas de nettoyer à distance. Le parcours Lisière reste déterministe et partage son budget de navigation.

`RoomStatWorker_Cleanliness` additionne les statistiques des objets contenus **et adjacents**, plus chaque terrain de la pièce, puis divise par le nombre de cellules de cette pièce. Parmi notre catalogue, table de boucherie **−15**, tailleur de pierre **−5** ; les autres objets présents n'ajoutent pas arbitrairement une saleté. Sols terre/terre riche/gravier **−1** par cellule. Le lieu de soin ou du cuisinier compte ; un atelier dans une autre pièce n'est pas agrégé. Une porte est un espace distinct et ses traces peuvent contribuer aux pièces adjacentes. La porte seule ne constitue pas une `ProperRoom` : son `GetStat` prend la valeur extérieure du consommateur. Une pièce n'a pas besoin d'un toit pour être fermée. Extérieur relié au bord : la Room peut exister, mais `UpdateRoomStatsAndRole` laisse ses statistiques absentes, donc absence de score de pièce, et chaque consommateur applique sa règle extérieure (soins ou intoxication), sans moyenne de toute la carte. La limite Core en régions immenses n'est pas remplacée par un nombre arbitraire de cellules.

## Catalogue de sols retenu

| Sol | Coût/cellule | Travail Core | Propreté | Temps de nettoyage | Inflammabilité | Prérequis Core |
|---|---|---:|---:|---:|---:|---|
| Plancher bois | 3 bois | **85** | 0 | 1 | 0,22 | aucun |
| Dalles granite/calcaire/marbre/grès/ardoise | 4 blocs correspondants | 1100 | 0 | 0,8 | 0 | taille de pierre, Construction 3 |
| Dalles acier | 7 acier | 800 | +0,2 | 0,6 | 0 | forge, Construction 3 |

Ces sept sols ont coût de passage ajouté nul, fertilité nulle et support Heavy. Le matériau sous-jacent reste conservé ; enlever le sol le révèle. La valeur **300** parfois associée au plancher est incorrecte : elle concerne la dalle béton, hors tranche. Une dalle en marbre n'hérite pas du bonus de beauté des meubles en marbre : les cinq dalles valent toutes +1 de beauté dans ces Defs.

Retrait : `JobDriver_RemoveFloor` demande **200 Core de travail**, vitesse Construction ×1,7, au contact, réservation de couche Floor. Il supprime les traces présentes sur cette cellule après retrait. Les restitutions passent par `GenLeaving` avec fraction de déconstruction du terrain (défaut moitié) et arrondi stochastique ; conservation et placement doivent être prévalidés avant mutation dans Lisière. Remplacement par un autre sol n'est pas une couche infinie empilée : la tranche impose retrait puis nouveau chantier.

## Limites et critères

Pas de tapis, stérile, paille, ponts, terre lissée, neige à pelleter, mod de nettoyage automatique avant cuisine ni salissures de tous les ateliers. Les matériaux manquants ne sont pas substitués. Les effets de propreté sur beauté/humeur/recherche/chirurgie restent limités aux consommateurs explicitement intégrés ; le présent lot vise cuisine et infection.

Validation réalisée en scénarios groupés : entrée de cellule sans dépôt à distance ; partage/épaisseur/pluie/âge et seuils ; pièce/porte/extérieur et objet adjacent ; nettoyage au contact avec interruption/réservation ; recettes des sept sols, plans et transport réels, annulation/retrait saturé sans perte ni RNG ; migration V88 neutre et continuation. La campagne commune distingue développement naturel et checkpoints contrôlés pour les salissures rares.

## Couches, recherche et combustion

Le cadre généré pour un terrain est Standable, sans PV ni surcharge de passage ; il ne reçoit pas les 14 Core du cadre de bâtiment. `ThingDef.CoexistsWithFloors` exige absence de `coversFloor` et `neverOverlapFloors` : murs et climatiseurs du catalogue couvrent le sol, portes et autres meubles retenus coexistent. Les plans de sol ne consomment pas une seconde place de pile.

Stonecutting vaut 300 points et porte `ClassicStart` dans les Defs : les nouveaux Crashlanded le connaissent. Smithing vaut 700 points sans tag ClassicStart : il faut le rechercher, même pour ce départ. L’ouverture historique des blocs sans cette recherche est conservée pour compatibilité, sans prétendre que les anciennes colonies avaient déjà appris cette connaissance.

`Fire.TryBurnFloor` est essayé à partir de 7 500 Core après création du feu, seulement pour une flamme au sol et si `TerrainFlammableNow` reste vrai. Ce dernier exige un terrain inflammable et aucun objet `FireBulwark`. `TerrainGrid.Notify_TerrainBurned` retire la couche sans restes puis applique son `burnedDef`. Le bois devient un revêtement brûlé non inflammable (passage +1 Core, fertilité 0), pas trois unités de bois encore récupérables. Son retrait ultérieur coûte le travail de retrait mais rend zéro. La ledger Lisière conserve explicitement les trois unités perdues.
