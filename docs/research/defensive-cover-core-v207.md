# Couvert bas construit — recherche Core V207

Relevé du **4 octobre 2026**, après la production alimentaire V206. **Recherche : cette note ne prouve ni une implémentation, ni une partie, ni une mesure de performance.** La tranche recommandée est un **sac de sable en tissu**, construit physiquement, franchissable, endommageable et réparable, dont le couvert agit sur les vrais tirs. Les barricades sont comparées ci-dessous, sans devenir un second ouvrage automatique.

## Provenance, corpus et contrats

Installation lue sans modification : `E:/Steam/steamapps/common/RimWorld`, `Version.txt = 1.6.4871 rev590`. SHA-256 d'`RimWorldWin64_Data/Managed/Assembly-CSharp.dll`, recalculé ce jour : `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`.

Définitions primaires locales : `Data/Core/Defs/ThingDefs_Buildings/Buildings_Security.xml` (Sandbags, Barricade), `Buildings_Base.xml` (BuildingBase), `ThingDefs_Items/Items_Resource_Stuff.xml` (Cloth, WoodLog), `Stats/Stats_Basics_General.xml` (PV, beauté), `Stats/Stats_Building_Special.xml` (travail), `ThingDefs_Misc/Filth_Various.xml` (SandbagRubble). Aucun matériau DLC, mod, texture ou code commercial n'est incorporé au produit.

Classes du binaire actuel extraites avec ILSpyCmd 8.2 uniquement sous `tmp/v207/core/` : `Verse.BuildableDef`, `Verse.ThingDef`, `RimWorld.BuildingProperties`, `Verse.GenGrid`, `Verse.CoverGrid`, `Verse.CoverUtility`, `Verse.Verb_LaunchProjectile`, `Verse.Projectile`, `Verse.AI.PathGrid`, `Verse.AI.Pawn_PathFollower`, `Verse.AI.CastPositionFinder`, `RimWorld.GenConstruct`, `RimWorld.GenLeaving`, `RimWorld.RepairUtility`, `RimWorld.JobDriver_Repair`, `RimWorld.WorkGiver_Repair`. Les essais de namespaces inexistants ne sont pas des sources. Les sorties restent ignorées et ne doivent pas être committées.

Recherche Internet précise effectuée ce jour : l'[annonce officielle de la mise à jour 1.6](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/) distingue le jeu de base gratuit de l'extension Odyssey ; elle ne fournit pas les chiffres des sacs. Contre-lecture du code exposé par le miroir décompilé : [CoverUtility](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/Verse/CoverUtility.cs), [GenGrid](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/Verse/GenGrid.cs), [PathGrid](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/Verse.AI/PathGrid.cs), [CastPositionFinder](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/Verse.AI/CastPositionFinder.cs), [Projectile](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/Verse/Projectile.cs), [BuildableDef](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/Verse/BuildableDef.cs), [BuildingProperties](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/BuildingProperties.cs), [GenLeaving](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/GenLeaving.cs), [JobDriver_Repair](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/JobDriver_Repair.cs), [WorkGiver_Repair](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/WorkGiver_Repair.cs). Ce miroir non officiel et mobile expose les branches du programme ; il **ne certifie pas la version installée**. Les nombres retenus sont ceux des XML et de l'assembly local identifié. Les résumés communautaires anciens à 57 % ou annonçant l'impossibilité absolue de tirer sur un sac ne prévalent pas sur ce relevé.

Corpus original relu : [chapitre 10](../reference/originals/Documentation_developpement.html#chap-10) pour plans, livraisons, travail, réparation/restitution ; chapitres 18–21 pour visibilité, couverture, émission, interception, dégâts et accès. SYS/TEST-051..058, 098..107 et 110..117, UI-019/024 et les chapitres restent des cibles plus larges. **Adopter** propriété/contacts, distinction ligne-couvert-impact et arrêt/transit ; **adapter** horloge et représentation 3D ; **différer** remplacement direct, catalogue de défense et stratégie Core exhaustive ; **vérifier** transitions et charge, sans déclarer ces identifiants clos. La [table d'adoption](reference-adoption.md) conserve ses décisions et originaux.

Contrats relus : [capture tactique](../development/combat-world.md), [requêtes de tir](../development/combat-queries.md), [ouvrages et réparation](../development/barriers.md), [transit du mobilier](../development/furniture-travel.md), [déconstruction](../development/deconstruction.md). Sections pertinentes de l'archive immuable : V22 transit/arrêt, V53–V54 requêtes/captures, V67 dégâts/réparation. Leurs versions et résultats sont historiques ; leurs invariants restent applicables.

## Deux ouvrages Core comparés

| Propriété | Sac en tissu | Barricade en bois |
| --- | --- | --- |
| Définition / parent | Sandbags / BuildingBase | Barricade / BuildingBase |
| Empreinte, rotation | 1×1, non rotatable | 1×1, non rotatable |
| Coût | 5 Cloth | 5 WoodLog |
| Matières Core admissibles | Fabric ou Leathery | Metallic, Woody ou Stony |
| Travail de base | 180 unités Core | 320 unités Core |
| Facteur de matière de ce choix | tissu : 1 | bois : 0,7 |
| Travail effectif neutre | 180 Core, soit 18 ticks locaux à facteur 1 | 224 Core, soit 22,4 ticks locaux avant politique locale d'arrondi |
| PV de base et facteur | 300 × 1 = 300 | 300 × 0,65 = 195 |
| Remplissage logique | 0,55 | 0,55 |
| Coût d'entrée / répétition | 42 ; pathCostIgnoreRepeat vrai | identique |
| Passabilité | PassThroughOnly | PassThroughOnly |
| Beauté de base | −10 | −3 |
| Inflammabilité | 0, malgré le tissu | 1 × facteur bois 1 = 1 |
| Support de terrain | Light fixe | dépend de la matière ; Heavy annoncé pour pierre |
| Peinture Core | paintable absent, donc faux | paintable vrai |
| Profil de clôture | isFence absent, donc faux | isFence vrai ; certaines espèces ne passent pas |

Aucun prérequis de recherche ou de compétence n'est déclaré par ces définitions ni leur parent. `BuildableDef` initialise le seuil Construction à zéro et la liste de recherches à null : **ne pas inventer Mobilier complexe, Usinage ou un niveau minimal**. La compétence/capacité/lumière de construction continue d'affecter l'exécution ordinaire. `WorkToBuild` possède une borne statistique minimale zéro ; le sac a bien une valeur explicite 180, sans nouveau plancher arbitraire.

`ThingDef` donne 1×1 et `useHitPoints=true` par défaut. Aucun CompQuality ou `minifiedDef` n'est hérité/déclaré ici : pas de qualité tirée à la finition, pas de paquet/réinstallation du sac achevé. `BuildingProperties` donne `isEdifice=true`, `repairable=true`; le sac est un ouvrage enregistré, mais pas un mur, une clôture ou un support de toit (`holdsRoof` reste faux). Il ne doit pas fermer une pièce parce qu'il est appelé « barrière » dans une API. `canOverlapZones=false` conserve le dégagement matériel ordinaire ; le sac n'est pas une étagère.

## Valeur marchande du sac en tissu

Relecture primaire du 4 octobre dans les XML de l'installation **1.6.4871 rev590** : `Buildings_Security.xml` donne à Sandbags `costStuffCount=5`, `WorkToBuild=180` et `PassThroughOnly`, sans `MarketValue` explicite ni qualité ; `Items_Resource_Stuff.xml` donne à Cloth `MarketValue=1,5`, sans facteur ou décalage de travail spécifique. `Stats_Basics_General.xml` raccorde le stat MarketValue à `StatWorker_MarketValue` et n'arrondit au multiple de cinq qu'au-dessus de 200. `ThingDef.VolumePerUnit` de l'assembly identifié vaut 1 pour ce tissu, qui n'a pas `smallVolume`.

La formule primaire de `StatWorker_MarketValue.CalculatedBaseMarketValue`, déjà inspectée dans **le même assembly local** et consignée dans la [recherche des valeurs physiques V103](room-market-value-reference-v103.md), est réutilisée ici : coûts fixes + `costStuffCount / VolumePerUnit × valeur de matière`, puis `0,0036 × max(WorkToMake, WorkToBuild)` si le travail dépasse 2. Sandbags n'a aucun coût fixe ; son travail de construction 180 domine le défaut WorkToMake de 1. Un sac en tissu **intact vaut donc 5 × 1,5 + 180 × 0,0036 = 8,148 argent**, sans multiplicateur de qualité ni arrondi supplémentaire. Ses PV suivent ensuite la courbe de valeur existante. Le profil local correspondant est `def(5,180,'pass-through')`, calculé à partir de ces propriétés, sans prix fixe inventé.

Le parent primaire `BuildingBase` porte également **SellPriceFactor=0,70**. Ce facteur concerne le prix de vente ; il ne multiplie ni la MarketValue ci-dessus ni sa contribution à la richesse de pièce. Négociation, prix de transaction et patrimoine colonial conservent leurs consommateurs distincts. Ce relevé de définition et de formule ne constitue pas un contrôle produit ou une mesure.

## Passage, arrêt et exception de tir 1.6

`PathGrid` traite le sac comme franchissable. Son coût 42 se combine par maximum avec les autres suppléments applicables, puis s'ajoute à la durée de mouvement du pawn. La non-répétition vaut si la cellule précédente contient **n'importe quel** objet à coût au moins 25 avec `pathCostIgnoreRepeat=true`, pas uniquement un sac identique. Une ligne de sacs ne facture donc pas 42 à chaque entrée ; une table puis un sac peut aussi supprimer ce supplément.

La conversion locale déjà retenue est un supplément de **4,2 ticks**, capturé dans l'arête, avec la base de marche et le terrain locaux conservés. Le contexte peut changer après le départ sans réécrire l'arête engagée. Le calcul de chemin conserve les budgets/coins existants et sa comparaison exacte ; pas de solveur GPU nouveau.

`GenGrid.Standable` et `StandableBy` refusent PassThroughOnly pour les destinations ordinaires. Mais `CastPositionFinder` actuel évalue les cellules **WalkableBy**, puis applique un facteur de préférence **0,4** en présence de PassThroughOnly. Il peut donc admettre une place de tir sur ce type d'objet. **Ne pas présenter le sac comme une interdiction universelle d'arrêt ou de tir pour les hostiles**, ni comme une sortie forcée garantie d'un corridor. Si Lisière conserve son refus générique de destination pour ses ordres actuels, cette limite doit être nommée comme adaptation locale ; l'extension de la tactique Core entière ne se déduit pas de ce seul objet.

## Couvert voisin et vrais projectiles

À 0,55, `ThingDef.Fillage` est **Partial**, donc `GenGrid.CanBeSeenOver` reste vrai. La ligne de tir peut le traverser : aucun masque de mur ni volume graphique opaque ne doit le bloquer systématiquement. Le sac ne protège pas la mêlée.

`CoverGrid` retient le plus grand remplissage de la cellule. `CoverUtility` examine huit voisins de la cible ; 0,55 est la base, pas une réduction universelle de chaque dommage. Le multiplicateur d'angle vaut 1/0,8/0,6/0,4/0,2 sous les seuils stricts 15°/27°/40°/52°/65° ; au-delà, pas de contribution. Le voisin diagonal multiplie l'angle par 1,75 avant ces seuils. La distance tireur-couvert inférieure à 1,9 ou 2,9 multiplie encore par 0,3333 ou 0,66666. Les passages des couverts admissibles se multiplient, et la cellule du tireur est exclue du blocage global. Ces règles sont déjà séparées dans le rapport local ; ajouter un ouvrage ne justifie pas leur réécriture.

À l'émission, `Verb_LaunchProjectile` distingue précision puis passage du couvert. Un tir arrêté par le couvert est lancé vers l'ouvrage choisi avec ses flags, en conservant le colon comme cible intentionnelle. À l'arrivée, un ouvrage utilisé comme cible peut recevoir un impact réel. L'interception libre pendant le vol est encore distincte : pour un objet partiel de remplissage supérieur à 0,2, elle part de `fillPercent × 0,15` loin de la destination ou `fillPercent` dans son voisinage à huit directions, puis applique le facteur de distance et les flags. Pour le sac cela donne des bases 0,0825 ou 0,55, **pas une collision pleine systématique**. Ne pas effectuer une seconde roulette de couvert à l'impact après la décision d'émission.

Une réception effective doit retirer des PV au sac, produire un résultat d'impact d'ouvrage et conserver les phases de vol/récupération. Après destruction, toutes captures de tir, projectile et contact concernées expirent avant la requête suivante, même au même tick. Les rapports historiques gardent leur copie. Aucun calcul de protection ni lecture métier ne doit migrer au rendu.

## Réparation, destruction et restitution

La réparation normale est autorisée pour le bâtiment de même faction à PV incomplets, réparable, réservé et réellement touchable. Pour la faction joueur, le foyer est exigé même en ordre forcé ; une déconstruction ou un feu empêche le travail. Le driver apprend Construction au contact, prépare 80 unités Core, puis restaure un PV par échéance de 20 unités, avec vitesse ConstructionSpeed × 1,7. Il ne livre ni ne consomme de tissu. La règle locale de contacts cardinaux, interruption et replanification existante reste une adaptation déclarée.

Le parent BuildingBase met **leaveResourcesWhenKilled=true** : la règle de murs sans remboursement ne s'applique pas au sac. `GenLeaving` lit le coût ajusté, puis renvoie à destruction 25 % avec arrondi stochastique ; cinq tissus donnent **un ou deux tissus**, avec espérance 1,25. La déconstruction utilise le défaut **50 %**, soit **deux ou trois tissus**, espérance 2,5. Annuler un cadre est encore un autre mode, restituant les livraisons selon les règles de chantier. Ne pas confondre ces causes, ni créer du sable gratuit ou un nouvel ItemId de rembourrage.

La prévalidation locale de place, capacité, identités, pertes et PRNG avant mutation est plus conservative que le placement Core. Elle doit rester atomique, et les pertes textiles prospectives être comptées sans histoire rétroactive. Déconstruction et destruction ne peuvent restituer deux fois le même ouvrage.

Core produit aussi **SandbagRubble**, salissure spécifique à nettoyer (35 unités de travail par épaisseur, disparition après 45–50 jours), et peut en produire pendant les dégâts. Ce n'est ni un composant textile récupérable ni Filth_RubbleBuilding. Le premier lot peut explicitement différer cette famille de salissures, ou adapter son aspect à une salissure existante en nommant la divergence ; il ne peut revendiquer la détérioration/salissure Core exhaustive sans la brancher réellement.

## Choix local recommandé et représentation

**Un seul ouvrage : sac de sable en tissu existant**, cinq `cloth`, 180 unités de travail Core, 300 PV, remplissage 0,55, supplément de transit 4,2, sans recherche/qualité/électricité/minification. Le tissu est déjà produit par coton et transportable par les recettes d'ameublement ; aucun nouvel item ni producteur gratuit n'est requis. La matière unique est une portée locale explicite : autres textiles/cuirs et barricades restent différés. Le choix joueur oppose son investissement textile à vêtements, fauteuils ou vente, puis place une couverture autour d'une vraie position de tir.

Le XML Core emploie un graphisme connecté par voisinage de sacs et un pigment spécial pour Cloth ; il ne fournit pas une hauteur 3D en mètres. `altitudeLayer=Building` est une couche logique, non une élévation physique. `staticSunShadowHeight=0,20` ne devient pas une mesure de hauteur du sac. Une silhouette originale de sacs bas empilés, pastel/chalk, peut rejoindre les lots résidents et se connecter aux changements de voisinage, sans importer atlas Core ni créer un mesh par ouvrage. Pigments, ombres, vues proches/éloignées et sélection doivent présenter le même état confirmé ; Textures désactivées interdit le prélèvement du pigment. Ni 0,55 ni la hauteur visuelle ne commande la marche ou la collision du projectile.

Risques à contrôler avant livraison : vraie acquisition/livraison et dégagement, absence de gain au trajet, reprise à chaque phase, refus des champs futurs avant migration stricte de 188, neutralité historique, arêtes engagées et non-répétition entre objets différents, ordre tactique sur sac clairement traité, angles/diagonales/proximité, interception avec flags, PV sans qualité/feu fictif, destruction puis impact suivant au même tick, réparation/annulation/déconstruction concurrentes, arrondis/restitution et sol saturé. La scène préparée doit construire puis combattre réellement ; elle ne prouve pas fréquence naturelle, campagne longue ni coût général. Les mesures CPU/worker, adoption et GPU doivent rester séparées, successives et sur sources gelées. Aucune mesure ou exécution de tests n'a été effectuée pour cette recherche.
