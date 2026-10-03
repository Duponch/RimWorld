# Destination commerciale civile — recherche Core V193

Relevé du 3 octobre 2026, après V192 `53fd6d8`. **Recherche appliquée au [contrat V193](../development/caravan-trade-v193.md), livré dans le périmètre de sa [preuve ciblée](../history/validation-commercial-v193.md).** Le lot ferme une décision : charger réellement rations et argent, envoyer un colon adulte libre et sain vers un comptoir civil fixe, choisir des médicaments industriels et/ou composants selon argent et charge, puis ramener les mêmes possessions au foyer. Il prolonge la [reconnaissance V182](../development/caravan-scout-v182.md) et le [commerce V88](../development/trade.md), sans transformer le circuit abstrait en planète. L'ordre reste dans [ROADMAP](../ROADMAP.md) ; l'[inventaire](../gameplay/implementation-status.md) distingue les frontières encore ouvertes.

## Provenance et corpus

Installation en lecture seule : `E:/Steam/steamapps/common/RimWorld`, **`Version.txt = 1.6.4871 rev590`**. SHA-256 d'`RimWorldWin64_Data/Managed/Assembly-CSharp.dll`, recalculé le 3 octobre : `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. ILSpyCmd 8.2 (`tmp/reference-tools/ilspycmd-8.2/ilspycmd.dll`) fournit les décompilations ciblées sur stdout ; aucun fichier de jeu modifié ou distribué. Les relevés V182 et V88 sont relus avec leurs [preuves de voyage](../history/validation-scout-v182.md) et [commerce](../history/validation-trade-v88.md). Ces preuves historiques ne valident pas la future destination.

Classes relues : `MassUtility`, `CollectionsMassCalculator`, `Settlement_TraderTracker`, `TradeUtility`, `StockGenerator`, `StockGenerator_SingleDef`, `IntRange`, `CaravanArrivalAction_Trade`, `BestCaravanPawnUtility`, `Dialog_Trade`, `TradeDeal`. Les captures antérieures attestées de `Tradeable`, `Caravan`, `CaravanInventoryUtility` et `Caravan_NeedsTracker` complètent les chaînes. Defs : `TraderKindDefs/TraderKinds_Base_Outlander.xml`, `FactionDefs/Factions_Misc.xml`, `Stats/Stats_Pawns_Social.xml`, `Stats/Stats_Basics_General.xml`, `ThingDefs_Races/Races_Humanlike.xml`, ressources/aliments, vêtements et armes cités ci-dessous.

Lecture des [chapitres 24, 26 et 27 originaux](../reference/originals/Documentation_developpement.html#chap-26) et des lignes du classeur `Referentiel_developpement.xlsx`, originaux préservés :

| Identifiant | Décision pour cette tranche |
| --- | --- |
| SYS/TEST-138, manifeste | **Adopter** quantité, masse, propriétaire et séparation de l'équipement porté ; **adapter** à une seule personne et trois familles de biens embarqués. |
| SYS/TEST-139, chargement | **Adopter** réservations, collecte et sortie physiques ; tout bien non chargé reste sur carte. |
| SYS/TEST-140, trajet | **Adapter** destination et aller/retour courts sans graphe ; **différer** relief mondial, saison, routes, montures et estimation variable. |
| SYS/TEST-141, besoins | **Adopter** portions réellement possédées, faim/repos pendant les jambes du voyage ; toute suspension locale doit rester annoncée. **Différer** soins et incapacités hors carte, camp et expositions nouvelles. |
| SYS/TEST-142..144 | **Différer** rencontres, camps, division/fusion ; conserver dès maintenant identité et propriétaire uniques. |
| SYS/TEST-145, UI-032 | **Adopter** panier sans transfert au clic, devis revalidé et transaction atomique ; canal distinct du visiteur local. |
| UI-029..031 | **Adapter** manifeste, destination explicite et phases depuis Monde ; pas de carte étrangère simulée. |
| SYS/TEST-146..147 | **Différer** orbital et diplomatie générale ; ne pas confondre neutralité du comptoir et opinions individuelles. |
| SYS/TEST-132..137, chapitre 24 | **Différer** nouveau calendrier d'incident/quête : l'expédition est une décision du joueur, le restock est un cycle du stock, pas une récompense de narrateur. |

Le classeur associe **CAT-052 aux structures de fin de partie**, pas au manifeste de caravane. Les anciennes synthèses le citaient dans le front G5 : V193 ne doit pas le déclarer servi. Aucun identifiant global n'est clos par cette tranche ; les lignes `P` et tests du corpus ne sont pas des observations Core acquises.

## Capacité, masse et possessions

`MassUtility.Capacity(p)` retourne zéro si `CanEverCarryAnything` est faux, sinon **`p.BodySize × 35 kg`**. Un outil-utilisateur humain admissible peut porter ; bébé/sous-humain/animal relève d'autres branches, notamment `packAnimal`. Le profil humain définit `baseBodySize=1` : **35 kg pour l'adulte ordinaire** de cette tranche. Cette capacité n'est pas `CarryingCapacity` d'un job local et ne multiplie ni Manipulation ni Déplacement. Les capacités de santé influencent d'autres règles de déplacement, pas cette formule.

`GearMass` additionne les vêtements **effectivement portés** et toutes les armes équipées, une fois chacun. `InventoryMass` additionne `stackCount × Mass` des contenus ; `GearAndInventoryMass` est leur somme. Ni le poids du corps vivant ni une seconde copie des équipements n'est ajouté. `Caravan.MassUsage` passe ses membres à `CollectionsMassCalculator` avec `DontIgnore` ; la collection compte équipement et inventaire, puis somme les capacités. Dans le devis commercial, Core retire l'inventaire du calcul sur les Pawns (`Ignore`) **parce que les piles sont déjà présentes séparément** dans la simulation du transfert : cela ne rend pas l'inventaire gratuit.

`IsOverEncumbered` emploie le rapport **strictement supérieur à 1** ; exactement la capacité n'est pas une surcharge. `FreeSpace=max(capacity−usage,0)` ; la prise locale vérifie la masse de la quantité demandée. `Caravan.ImmobilizedByMass` compare également usage>capacité. L'achat Core ne garantit pas que le groupe peut repartir : `FindPawnToMoveInventoryTo` préfère un porteur non surchargé puis accepte un autre porteur admissible. **Refuser un panier V193 qui surchargerait l'unique colon est une adaptation**, utile tant qu'abandon, transfert et groupes ne sont pas livrés ; ce n'est pas une règle universelle de refus Core.

| Bien | Masse unitaire kg | Valeur de marché de base | XML Core |
| --- | ---: | ---: | --- |
| `Silver` / `silver` | 0,008 | 1 | `ThingDefs_Items/Items_Resource_Stuff.xml` |
| `MealSurvivalPack` / `survival-meal` | 0,3 | 24 | `ThingDefs_Items/Items_Food.xml` |
| `MedicineIndustrial` / `medicine` | 0,5 | 18 | `ThingDefs_Items/Items_Resource_Manufactured.xml` |
| `ComponentIndustrial` / `component` | 0,6 | 32 | même XML |

Les rations ont 0,9 nutrition, pas de pourriture, mais détérioration extérieure possible. La quantité restante et la monnaie rendue pèsent après échange. Un paiement consomme/transfère de vrais argent, aucune bourse parallèle. Par exemple 800 argent pèsent 6,4 kg ; ce nombre n'est pas une allocation de départ V193.

Table complète des familles d'équipement actuellement livrées, à inclure même hors catalogue commercial :

| ItemId/famille locale | Def Core correspondant | Masse kg |
| --- | --- | ---: |
| `*-tribalwear` | `Apparel_TribalA` | 0,5 |
| `*-shirt` | **`Apparel_CollarShirt`**, chemise boutonnée | **0,3** |
| `*-pants` | `Apparel_Pants` | 0,5 |
| `*-duster` | `Apparel_Duster` | 2 |
| `*-parka` | `Apparel_Parka` | 2 |
| `flak-vest` | `Apparel_FlakVest` | 4 |
| `flak-helmet` | `Apparel_AdvancedHelmet` | 1,2 |
| `recon-helmet` | `Apparel_ArmorHelmetRecon`, héritage `ApparelArmorHelmetReconBase` | 1 |
| `revolver` | `Gun_Revolver` | 1,4 |
| `bolt-action-rifle` | `Gun_BoltActionRifle` | 3,5 |
| `plasteel-knife` | `MeleeWeapon_Knife` | 0,5 |

Sources : `ThingDefs_Misc/Apparel_Various.xml`, `Apparel_Headgear.xml`, `Weapons/RangedIndustrial.xml`, `Weapons/MeleeNeolithic.xml`. **La chemise locale n'est pas `Apparel_BasicShirt` à0,25 kg** : ses45 matières,2700 travaux et couverture torse/cou/épaules/bras (`production-recipes.ts`, [recherche V90](apparel-renewal-reference-v90.md)) attestent `Apparel_CollarShirt`. De même le casque pare-balles n'est pas `Apparel_SimpleHelmet` à2 kg.

Les sept préfixes textiles présents dans `APPAREL_MATERIALS` sont `cloth`, `light-leather`, `plainleather`, `bluefur`, `camelhide`, `muffalo-wool`, `foxfur` : **35 combinaisons** des cinq familles, plus3 protections et3 armes. Chaque pièce a `quantity=1` ; `validApparel`/`validWeapon` l'exigent, `validateEquipment` admet une seule arme portée, et `validateWornApparel` refuse les couches/couvertures incompatibles. Compter les vraies piles de propriétaire `apparel`/`equipment`, pas les slots théoriques ou `droppedWeaponId`. Aucun maximum de nombre de vêtements arbitraire n'est substitué à ces règles. La statistique `Mass` n'a pas de facteur de qualité/PV ni de facteur matière générique dans les Defs relues ; qualité/usure restent pertinentes au prix et à la conservation. Le corps et les objets inachevés ont des stat-parts distincts, hors manifeste V193.

**Dépendance locale :** `ItemDefinition` et les anciens profils d'équipement n'exposent pas encore cette masse de voyage. Une table limitée aux familles effectivement transportables et portées suffit ; masse inconnue doit refuser l'expédition, pas valoir zéro. Ne pas modifier la charge de tous les transports coloniaux sous prétexte de cette capacité mondiale.

## Destination, arrivée et négociateur

`OutlanderCivil` hérite d'`OutlanderFactionBase`, dont `baseTraderKinds` contient **`Base_Outlander_Standard`**. Ce profil n'est ni `Visitor_Outlander_Standard` ni un marchand de caravane. `Settlement_TraderTracker.TraderKind` choisit dans cette liste depuis le hash du site ; avec une seule entrée, le profil est déterminé.

`CaravanArrivalAction_Trade.CanTradeWith` exige un site existant, présent dans le monde, **sans carte locale active**, avec faction autre que le joueur, ni ennemi permanent ni hostile, stock négociable et négociateur admissible. Le site/destination est revalidé à l'arrivée. `Arrived` sélectionne la caravane et ouvre `Dialog_Trade` : aucun trajet jusqu'à un marchand d'une carte étrangère n'est requis pour ce canal mondial.

`BestCaravanPawnUtility.FindBestNegotiator` choisit le meilleur **TradePriceImprovement**, pas `NegotiationAbility` ni `SocialImpact`. Il exige propriétaire conscient, vivant, non à terre/non en crise, statistique active et acceptation de `CanTradeWith`; l'action d'arrivée refuse aussi Social totalement désactivé. La tranche ne peut pas envoyer un négociateur incapable et le remplacer par un marchand imaginaire. Les conditions DLC/xénotypes de `CanTradeWith` ne sont pas une diplomatie livrée par ce relevé.

**Adapter** un seul comptoir civil identifié et stable, sans tuile planétaire, groupe ou carte étrangère. Le voyageur n'est jamais un visiteur figé archivé : il reste propriétaire vivant de ses objets. Le Core expose les inventaires de la caravane à `ColonyThingsWillingToBuy`, pas les stocks laissés au foyer, ni les vêtements/armes encore portés. Dans V193, argent sert seulement au paiement ; rations réservées au trajet restent hors panier. Commerce général des équipements portés et des autres biens est différé.

## Prix et argent

Les fonctions attestées `TradeUtility.GetPricePlayerBuy/Sell` composent séparément **bonus du négociateur B** et **bonus du comptoir C=0,02**. Pour médecine/composant à `PriceType.Normal`, difficulté locale sans perte L=0 :

- Achat : `max(0,5 ; V × 1,4 × (1+L) × (1−B−C))`.
- Vente : `max(0,01 ; V × 0,6 × SellPriceFactor × (1−L) × (1+B+C))`, puis plafonnée au prix d'achat par `Tradeable`.
- Prix unitaire >99,5 : arrondi entier `Mathf.Round`. Argent : valeur1 dans les deux sens.

Le profil `TradePriceImprovement` : `clamp(0,0,395, 0,015×Social×FTalking×FHearing)` ; `F=0,1+0,9×clamp01(capacité/(1−défautAutorisé))`, défauts0,05 Parole et0,20 Audition. Titre de chef, inspiration et modificateurs de DLC restent séparés/absents localement. **Ne pas clamper B+C à0,395** : le clamp concerne la statistique du Pawn avant le bonus de site. Exemple sans bonus social : dose18×1,4×0,98=24,696 ; composant32×1,4×0,98=43,904. Un panier d'une unité de chaque vaut68,6, puis **69 argent après l'arrondi final unique** ; aucune unité à bas prix n'est arrondie prématurément.

`TradeDeal.UpdateCurrencyCount` agrège les coûts du panier ; `Tradeable.CostToInt` emploie `Mathf.RoundToInt` (moitiés au pair dans Unity installée, déjà attesté V88). Le moteur revalide solvabilité et quantités avant transfert ; argent manquant côté joueur refuse. Les détails de cadeau/acceptation d'un manque côté marchand restent au contrat V88 et hors achats seuls. Aucun apprentissage Social générique n'est accordé par la chaîne ordinaire V88 relue : ne pas fabriquer une XP commerciale V193.

**Dépendance locale :** `tradeUnitPrice` accepte actuellement un bonus unique≤0,395 et `tradeRefusal` parle de visiteur. Ajouter un contexte explicite de site, conserver le garde sur B et appliquer C séparément ; ne pas changer les anciens prix ou permissions des visiteurs. Médecine/composant ont déjà valeurs et ItemIds, sans nouveau produit nécessaire. Le devis expose les prix réels ; la confirmation recalcule santé, monnaie, quantité, version du stock, masse après paiement et destinations de possession, sans RNG.

## Stock, tirages et trente jours

`Base_Outlander_Standard` déclare trois `StockGenerator_SingleDef` utiles : **argent800–3000**, **composants ordinaires20–70**, **médicaments industriels25–50**. Les bornes sont inclusives : `StockGenerator.RandomCountOf` prend `IntRange.RandomInRange`, qui appelle `Rand.RangeInclusive`. Ces générateurs n'ont pas de `totalPriceRange` ni de prix spécial : pas de budget partagé à répartir entre les deux produits, pas de sélection de catégorie préalable. Les autres générateurs (acier, textiles, armes, nourriture, mobilier, animaux, etc.) restent distincts : les omettre ne doit pas augmenter ces quantités ou leur probabilité.

`Settlement_TraderTracker` conserve un conteneur propre, `lastStockGenerationTicks` et `everGeneratedStock`. **`ShouldTickContents=false`**, conteneur `dontTickContents=true` : ne pas appliquer une détérioration coloniale au stock abstrait du site. Premier accès à `StockListForReading`, stock null **ou entièrement vide**, appelle `RegenerateStock`; celui-ci remplace le stock, génère les biens et date cette génération au tick courant. Le tick du tracker invalide le stock lorsque **elapsed>30×60 000 Core**, pas à égalité ; nouvelle génération paresseuse au prochain accès. `NextRestockTick` annonce cependant la borne arithmétique égale. À rapport temporel×10, la limite est180000 ticks locaux ; invalidation au premier tick local strictement après. Le délai part de la génération réelle, pas de la migration ni de chaque fermeture de panier.

Les achats débitent le stock existant et restent absents à la prochaine visite avant restock. Le paiement accroît l'argent du site ; l'achat seul n'épuise donc normalement pas **tout** le conteneur. Un sous-catalogue local sans argent reproduirait à tort le cas « entièrement vide » lorsque ses deux produits sont achetés. **Conserver argent du site** ou déclarer une adaptation d'épuisement ; ne jamais reroll sur chaque consultation, chaque achat ou sur stock produit zéro. Les objets transférés conservent état et identité, les splits seuls allouent une nouvelle identité.

Les quantités de stock sont des totaux commerciaux, pas une autorisation de pile locale surdimensionnée : limites actuelles **médecine25, composant50, argent500, ration10** dans `ITEM_DEFINITIONS`. Les achats et monnaie transférés vers l'inventaire doivent être divisés en piles admissibles si nécessaire, avec allocation d'identités prévalidée pour l'ensemble du panier ; les lignes implicites du comptoir peuvent conserver leur total. Le stock ne doit pas entrer dans `World.piles`, le stock colonial ou une vue de Pawn inventé. La limite de lignes transportées demeure distincte des35 kg.

**Adapter** le catalogue du site aux deux produits et à sa monnaie, avec un PRNG privé persisté pour leurs trois tirages ; le Core utilise sa chaîne mondiale plus large, la suite binaire complète n'est pas prétendue identique. Une lecture d'UI ne doit pas produire un stock ou consommer le PRNG : première arrivée confirmée ou commande autoritaire de consultation matérialise le stock. Après expiration, afficher « à renouveler » puis regénérer sur la prochaine transition autoritaire ; ne pas générer les trente jours d'absence rétroactivement. Rejeter atomiquement un échec d'allocation d'identité/capacité en conservant les flux. Le détail exact de seed/init de ce PRNG relève du contrat, pas d'un nombre Core inventé.

## Boucle minimale et frontières

**Adopter :** un adulte libre sain, propriétaire d'équipement/vêtements distincts ; rations et argent sélectionnés au sol, réservés puis collectés au contact ; aucune cargaison de travail exportée. Départ après arrivée physique au bord et fin d'arête, autre colon capable au foyer, contraintes de santé/reprise V182 conservées. Achats depuis stock civil fini, argent réel, conservation stricte, retour au bord puis mise à disposition physique des objets. Migration neutre sans destination découverte, argent, marchandises ou historique accordés rétroactivement.

**Adapter :** un comptoir fixe, jambes de voyage abstraites courtes et bornées, sans vitesse mondiale prétendue ; choix médicament/composant selon besoin, argent et charge. Le contrat retient trois heures par jambe et une visite bornée à une heure, adaptations locales explicites. Ne pas étendre l'absence par une attente commerciale illimitée sans nourriture/repos/camp : ouvrir le panier en pause demandée, poursuivre les jambes avec les besoins existants, fermer/valider puis retour explicite borné. Toute suspension de besoins en attente d'entrée bloquée reste la limite V182 déclarée, jamais une règle Core de camp. Préserver les horloges d'âge, compétences, souvenirs et éventuel dossier sain selon le propriétaire réel.

**Différer :** groupes, animaux/prisonniers, camp, maladie ou combat hors carte, rencontres, terrain/routes, démultiplication des destinations, diplomatie/cadeaux, commerce orbital, ventes générales, changement d'équipement au comptoir et économie mondiale autonome. Médecine/composants existants ferment déjà un usage concret au foyer : soins/chirurgie et industrie/construction. Aucun prix manquant des nouvelles familles de vêtements n'est nécessaire aux achats limités.

Le lot reste borné si chargement et retour sont extraits en responsabilités communes en conservant les règles de la reconnaissance historique. **Risque qui bloque une simple extension :** `caravan-trip.ts:returnEntry` valide actuellement chaque pile séparément pour la même case puis y dépose tout l'inventaire ; trois types ne peuvent pas tenir cette unique case. Solution à contractualiser : retour avec inventaire conservé, puis déchargement physique borné des familles de V193, ou plan de plusieurs cellules prévalidé atomiquement. Le premier suit le retour Core avec inventaire et évite une recherche de placement de toutes les piles avant entrée, mais exige une action de déchargement exploitable et sa persistance ; le second conserve le mode local V182 mais doit réserver la capacité cumulée de cellules distinctes. Jamais plusieurs `groundCapacity` indépendants sur la même case, crédit en stock global, suppression d'un achat ou transfert au sol distant.

Dépendances exactes : `caravan-state.ts`, `caravan-loading.ts`, `caravan-trip.ts`, `caravan-save.ts` pour état/propriété/rations/retour ; `materials.ts` et réservations sources pour argent et manifeste multi-piles ; `trade-prices.ts`, `trade-catalogue.ts` et un module de stock/destination séparé pour permissions et devis ; `ground-placement.ts` et accès pour déchargement ; `types.ts`, `serialization.ts` et bridge pour migration/continuation et adoption atomique ; panneau Monde pour manifeste, autonomie, charge, arrivée/panier, retour et attente. Les vues de registre hors carte servent à valider identités/politiques, jamais à rendre les piles au stock du foyer. Un comptoir ne crée pas de Pawn marchand de carte ni d'archive humaine.

**Arbitrage central retenu pendant le cadrage :** état `commercialTrip` distinct de la reconnaissance, retour avec inventaire puis déchargement au contact. Le comptoir possède un stock implicite de lignes `{id,kind,item,quantity}` pour médecine/composant/argent, avec identités globales et reçus bornés séparés ; aucun nouveau propriétaire `MaterialOwner` ni NPC fictif. Le calcul `settlementTradeUnitPrice` peut partager le noyau V88 avec une borne totale0,415, tout en conservant l'admissibilité historique du bonus négociateur≤0,395. Les nouveaux modules cohérents envisagés sont `commercial-post.ts` (stock privé/réassort/devis/transaction) et `commercial-mass.ts` ; leurs signatures et le contrat de production restent à fixer avant édition de code.

## Contrôles requis, non exécutés pour cette recherche

Capacité adulte et égalité/surcharge ; vêtements+arme comptés exactement une fois ; coût des rations/argent restant/achats et refus d'une masse inconnue ; limites des trois tirages, identité et pause du stock, exact30j puis>30j, produit zéro sans reroll, consultation sans RNG et reprise du cycle ; bonus0,02 séparé à Social0 et au plafond, perte difficulté, arrondis unité/net et devise ; chargement multi-source/contact/split, réservations concurrentes, annulation après chaque prise et restitution sans perte ; aucune vente depuis le foyer ou équipement porté ; arrivée confirmée avant échange, devis périmé/refus atomique, argent insuffisant/identités épuisées ; reprise avant/pendant/après échange ; ration consommée une fois ; bord bloqué et retour multi-piles/déchargement réel, aucune identité présente chez deux propriétaires ; migration stricte/refus des champs futurs, sauvegarde/transport/UI au même tick. Une scène préparée doit effectuer demande, prises, marche, absence, échange, retour et dépôt, pas seulement présenter le stock final. Les résultats acquis sont consignés séparément dans la [preuve V193](../history/validation-commercial-v193.md) ; ils ne se déduisent pas de cette recherche, et aucune campagne naturelle ni mesure générale GPU n’est établie.

## Recoupement Internet et limites de version

Sources **primaires officielles**, historiques : [Alpha16, 20 décembre2016](https://ludeon.com/blog/2016/12/rimworld-alpha-16-wanderlust-released/) décrit chargement réel, limite de poids, visite des bases et prix/stock plus favorables ; [Alpha17, 24 mai2017](https://ludeon.com/blog/2017/05/alpha-17-on-the-road-released/) complète formation et voyage ; [Trade interfaces, 19 juin2013](https://ludeon.com/blog/2013/06/trade-interfaces/) décrit panier, stocks et solvabilité. Ces textes établissent les familles de boucles, **pas les nombres courants ni la révision1.6.4871**. Les formules et échéances ci-dessus viennent des XML/IL locaux.

Recoupement technique des mêmes chemins sur le [miroir de `MassUtility`](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/MassUtility.cs), [`Settlement_TraderTracker`](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld.Planet/Settlement_TraderTracker.cs), [`TradeUtility`](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/TradeUtility.cs) et [`CaravanArrivalAction_Trade`](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld.Planet/CaravanArrivalAction_Trade.cs). Ces fichiers décompilés corroborent capacité, conteneur/échéance, bonus de site et action d'arrivée ; **`master` n'atteste pas la version locale et n'est pas une publication officielle Ludeon**. Ne pas remplacer l'installation attestée par une valeur du wiki ou une ancienne observation de sauvegarde. La tentative publique `CollectionsMassCalculator` a échoué ; sa règle est vérifiée uniquement dans l'IL installé.
