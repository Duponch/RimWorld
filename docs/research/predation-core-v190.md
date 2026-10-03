# Prédation et ingestion animale — relevé Core V190

Relevé du **3 octobre 2026**, après livraison V189 `dd1f63e`, schéma local **177**. Cette recherche accompagne le [contrat V190 écrit avant implémentation](../development/predation-v190.md) : elle ne livre ni prédateur ni nouvelle transition et ne constitue pas une preuve de validation. Le périmètre retenu est une première **boucle complète avec le renard roux sauvage**, catalogue animal encore partiel : aliment accessible, proie, poursuite, combat, dépouille physique puis ingestion anatomique. Les humains adultes existants ne sont pas des proies admissibles de cette espèce par leur taille ; cette observation n'est pas une exclusion Core de tous les humains.

## Sources et version

L'installation de référence est `E:/Steam/steamapps/common/RimWorld`. Son `Version.txt` indique **1.6.4871 rev590**. Lecture des XML Core, puis décompilation ciblée en lecture seule du binaire `RimWorldWin64_Data/Managed/Assembly-CSharp.dll`, avec ILSpy CLI 8.2 déjà disponible. SHA-256 du binaire consulté : `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Aucun XML, binaire ou original utilisateur modifié, aucune décompilation complète exportée ni dépendance incorporée.

XML consultés, chemins relatifs à `Data/Core/Defs` :

- `ThingDefs_Races/Races_Animal_Base.xml` et `Races_Animal_WildCanines.xml` : héritage du renard, outils, régime, anatomie, tailles, stades et produits.
- `Misc/LifeStageDefs/LifeStages.xml`, `Bodies/Bodies_Animal_Quadruped.xml` : facteurs de stade et quadrupède à pattes/queue.
- `Stats/Stats_Pawns_General.xml`, `Stats/Stats_Basics_General.xml`, `ThingDefs_Items/Items_Resource_Stuff_Leather.xml` : capacité alimentaire, viande/cuir, nutrition de dépouille et fourrure de renard.
- `BiomeDefs/Biomes_Temperate.xml`, `BiomeDefs/Biomes_Cold.xml` : entrées naturelles tempérées/boréales.
- `ThinkTreeDefs/Animal.xml` et `SubTrees_Misc.xml` : priorités animales et dernier essai alimentaire mondial avant sortie de famine.
- `ThingDefs_Races/Races_Animal_Hares.xml`, `Races_Animal_PigGroup.xml`, `Races_Animal_CowGroup.xml` : puissances des six espèces existantes ; `HediffDefs/Hediffs_Global_Misc.xml`, `Hediffs_Global_Needs.xml`, `Hediffs_Local_Infections.xml`, `Hediffs_Global_Temperature.xml` et `DamageDefs/Damages_Stun.xml` : classes médicales et dommage d'étourdissement.

Classes locales consultées : `RimWorld.FoodUtility`, `JobGiver_GetFood`, `JobDriver_PredatorHunt`, `Need_Food`, `FoodTypeFlags`, `Verb_MeleeAttack`, `ThingDefGenerator_Corpses`, `StatPart_IsCorpseFresh`, `Verse.AI.Toils_Combat`, `Verse.Corpse`, `RaceProperties`, `PawnKindDef`, `SummaryHealthHandler`, `Hediff`, `HediffDef`, `HediffWithComps`, `Hediff_Injury`, `Hediff_MissingPart` et `DamageWorker_Stun`.

Recoupement Internet précis, consulté ce même jour : [FoodUtility](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/FoodUtility.cs) pour recherche alimentaire/sélection, [JobGiver_GetFood](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/JobGiver_GetFood.cs) pour le job de prédation, [Toils_Combat](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/Verse.AI/Toils_Combat.cs) pour poursuite/frappes et [Corpse](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/Verse/Corpse.cs) pour ingestion. Le [second miroir de JobDriver_PredatorHunt](https://github.com/RimWorld-zh/RimWorld-Decompile/blob/master/Assembly-CSharp/RimWorld/JobDriver_PredatorHunt.cs) recoupe la chaîne de chasse. Ce sont des sources primaires du code reproduit, **pas une publication officielle ni une attestation du patch installé**. Les branches `master` sont mobiles, non épinglées et peuvent être anciennes ou divergentes ; toutes les valeurs et conclusions versionnées ci-dessous reposent sur les XML/IL locaux, non sur les dates de crawl Web.

## Renard roux : héritage résolu et filière

`Fox_Red` hérite de `ThingBaseFox`, lui-même de `AnimalThingBase`/`BasePawn`. Son `PawnKindDef` hérite de `AnimalKindBaseFox`/`AnimalKindBase`. Ne pas lire seulement le bloc terminal `Fox_Red`, qui ne répète pas ses statistiques.

| Propriété | Valeur Core et provenance |
| --- | --- |
| Corps | `QuadrupedAnimalWithPawsAndTail`, `ThingBaseFox.race.body` ; dents, tête et pattes avant sont des groupes d'outils, pas des parties médicales inventées |
| Prédation/régime | `predator=true`, `maxPreyBodySize=0.80`, `foodType=CarnivoreAnimal` |
| Taille/santé adultes | `baseBodySize=0.55`, `baseHealthScale=0.70` |
| Mouvement | `MoveSpeed=4.6` ; les ralentissements de stade et les capacités restent distincts |
| Faim de base | `baseHungerRate=0.1` ; `Need_Food.BaseHungerRate` multiplie par `2.6666667E-05`/tick Core, soit **×1,6 par jour de 60 000 ticks** : **0,16 nutrition/jour adulte**, avant modificateurs de catégorie, santé ou contexte |
| Capacité alimentaire | `MaxNutrition` base 1 × taille effective × `foodMaxFactor` : **0,55 adulte** ; la réserve normalisée n'est pas une quantité nutritionnelle universelle |
| Combat/écologie | `combatPower=45`, `ecoSystemWeight=0.25`, `AnimalKindBaseFox` |
| Groupe sauvage | Aucun remplacement XML de `wildGroupSize` ; défaut local `PawnKindDef = IntRange.One`, donc **un** |
| Stades | Bébé dès 0, juvénile à **0,1 année**, adulte à **0,3333 année** ; année Core de soixante jours |
| Longévité | `lifeExpectancy=9` années ; ce nombre ne définit pas une mort automatique au neuvième anniversaire |
| Viande | `Fox_Red.useMeatFrom=Fox_Fennec`, dont `meatLabel=fox meat` ; filière de viande de renard commune, pas viande de lièvre |
| Cuir | `leatherDef=Leather_Fox`, libellé XML `foxfur` ; filière distincte des cuirs existants |
| Valeur/sauvagerie/température | `MarketValue=200`, `Wildness=0.75`, `ComfyTemperatureMin=-35` hérités de `ThingBaseFox` |
| Familiarité/dressage | `petness=0.1`, `trainability=Intermediate`, nom à apprivoisement chance 1 ; données de référence, pas autorisation d'ouvrir tout le dressage dans V190 |
| Reproduction | Gestation 10 jours et courbe de portée héritées ; reproduction sauvage et élevage carnivore à différer |

`Leather_Fox` dans `Items_Resource_Stuff_Leather.xml` hérite de `LeatherBase` : valeur marchande **3,5**, couleur **(178, 100, 34)**, soit `#b26422`, facteur d'armure tranchante **0,81**, contondante **0,21**, chaleur **1,5** hérité ; décalages d'isolation froid **20** et chaleur **16** hérité. Son facteur de matière `MaxHitPoints` est explicitement **1,0**, remplaçant **1,3** du cuir de base : ne pas le copier depuis `plainleather`. Beauté **2**, commonalité **0,075**. Les vêtements utilisent les familles et leurs facteurs déjà livrés ; cette matière n'ajoute aucune recette ni garantit des statistiques finales indépendantes de la qualité.

Les stades animaux Core ont respectivement taille **0,2 / 0,5 / 1**, `foodMaxFactor` **3 / 1,5 / 1** et facteur de faim **0,4 / 0,75 / 1**. Pour ce renard : tailles **0,11 / 0,275 / 0,55**, capacités nutritionnelles **0,33 / 0,4125 / 0,55**, consommations de base **0,064 / 0,12 / 0,16 par jour**. Santé de stade **0,25 / 0,6 / 1**, dégâts de mêlée **0,5 / 0,75 / 1**, vitesse **0,5 / 0,9 / 1**. Ces facteurs n'impliquent pas de produire des petits ni de faire reproduire une espèce non encore admise.

Outils hérités, sans arme ni armure ajoutées :

| Outil | Capacité / puissance adulte | Groupe / récupération / surprise |
| --- | --- | --- |
| Griffe gauche | `Scratch`, **8** | `FrontLeftPaw`, **2 s = 120 ticks Core**, supplément `Stun` **14** |
| Griffe droite | `Scratch`, **8** | `FrontRightPaw`, **120 ticks Core**, supplément `Stun` **14** |
| Dents | `Bite`, **9** | `Teeth`, **120 ticks Core**, `chanceFactor=0.9`, supplément `Stun` **14** |
| Tête | `Blunt`, **4** | `HeadAttackTool`, **120 ticks Core**, `chanceFactor=0.2`, groupe toujours utilisable ; **aucun supplément de surprise déclaré** |

Les griffes n'explicitent pas de `chanceFactor` dans le XML. Les pondérations du kernel commun et la disponibilité anatomique doivent rester cohérentes ; ne pas convertir ces quatre outils en quatre frappes simultanées. **14 est un montant de dommage Stun, pas une durée de quatorze ticks**. Conversion de récupération à l'horloge locale ×10 : 12 ticks neutres, avant les modificateurs existants.

Les bases de boucherie sont `MeatAmount=140` par défaut statistique et `LeatherAmount=40` hérité de `AnimalThingBase`, puis taille, couverture naturelle restante et autres facteurs. Un adulte intact donne les valeurs intermédiaires **77 viande / 22 cuir**, avant courbe, rendement, blessures, mode d'abattage et arrondis. Ce n'est donc pas une promesse de sortie constante : les statistiques comportent une courbe post-traitement, le facteur **0,66** de mort non soigneusement abattue, la difficulté ; la viande possède aussi un facteur de malnutrition. L'ingestion anatomique doit diminuer la couverture restante employée par la boucherie, sans produire en parallèle de viande ou de cuir.

`Fox_Red` possède un ticket **0,07** en `TemperateForest` et **0,07** en `BorealForest`. Densités XML respectives **3,7 / 2,8**. Les enveloppes locales actuelles **12,27 / 10,12** ne doivent pas être diminuées ni redistribuées vers les espèces livrées. Ajouter prospectivement le ticket de renard n'autorise pas à retoucher les anciens profils de génération, recalculer les animaux déjà présents ou distribuer les tickets d'extensions absentes. Toundra, aride, renard arctique, fennec et autres canidés ne sont pas déduits de ces deux lignes.

## Faim, aliment puis proie

`RaceProperties.FoodLevelPercentageWantEat` distingue **Carnivorous = 0,30** et **Herbivorous = 0,45**. `JobGiver_GetFood.GetPriority` ouvre le choix sous ce seuil ; il ne faut pas conserver automatiquement 45 % pour le renard. `Need_Food` place les bandes à seuil ×0,8 pour faim, ×0,4 pour urgence, puis zéro pour famine : **24 % / 12 % / 0 %** chez ce carnivore. Les besoins continuent pendant poursuite et combat.

Le drapeau local Core `CarnivoreAnimal = 0xB0A` comprend **Meat, Corpse, Meal, Processed et Kibble**, contrairement à `CarnivoreAnimalStrict = 0xA`. Il n'admet pas automatiquement végétaux crus, herbe ou lait (`Fluid`/`AnimalProduct`). La présence d'un repas préparé compatible doit empêcher une chasse alimentaire inutile ; les recettes, ingrédients et politiques éventuellement applicables restent leurs propres règles.

`FoodUtility.TryFindBestFoodSourceFor` cherche d'abord un aliment compatible sur la carte. C'est seulement après échec, si le chercheur est aussi le mangeur et peut être prédateur, qu'elle appelle la sélection de proie. Une dépouille fraîche accessible constitue déjà un aliment : tuer un animal vivant n'est pas obligatoire pour manger. `JobGiver_GetFood` autorise les dépouilles pour un animal et fabrique `PredatorHunt` avec `killIncappedTarget=true` lorsque la source sélectionnée est un Pawn.

La famine V186 effectue une dernière recherche alimentaire mondiale avant sortie ; cette recherche doit pouvoir trouver également nourriture carnivore, dépouille et proie avant de conclure à la sortie. Le sommeil déjà engagé, incapacité, feu, fuite et réaction de danger conservent leurs priorités, attestées par `Animal.xml`. Prédation, riposte, manhunter, migration et ordre humain de chasse demeurent des intentions distinctes.

## Admissibilité et score de proie

Sélection locale IL `BestPawnToHuntForPredator` : un outil de mêlée utilisable est requis. Sous **25 % de santé synthétique**, seules les proies déjà à terre sont candidates. Le parcours de régions est borné normalement, étendu par `forceScanWholeMap`; la sélection vérifie **même District**, autre individu, admissibilité, trajet `ClosestTouch` avec `Danger.Deadly`, absence d'interdiction et exclusion des cibles du joueur en tutoriel.

`IsAcceptablePreyFor` impose :

- Proie autorisée par `canBePredatorPrey`, en chair ; option de difficulté spécifique si humanoïde.
- Taille effective de la proie ≤ maximum de l'espèce prédatrice, **0,80** ici. Les stades de vie changent cette taille.
- Pour une proie **debout** : puissance de combat ≤ deux fois celle du prédateur, puis `CP_proie × santé_proie × taille_proie < CP_prédateur × santé_prédateur × taille_prédateur`. Ces deux restrictions de puissance ne s'appliquent pas à la proie déjà à terre ; taille et autres restrictions demeurent.
- Si les deux ont une faction, le prédateur doit être hostile à la proie ; même garde avec faction hôte de la proie. Deux membres de la faction du joueur sont explicitement exclus. Un animal sauvage sans faction n'est pas exclu simplement parce que la proie est domestique.
- Pas de même espèce pour un prédateur défini comme animal de troupeau. Le renard n'hérite pas de `herdAnimal=true`.
- Invisibilité et certaines exclusions d'extensions sont présentes dans le binaire ; leur présence ne livre pas ces systèmes dans Lisière.

Le score maximisé est :

```text
S = -distance horizontale euclidienne
    -56 × santé_proie² × (CP_proie / CP_prédateur) × facteur_taille_du_stade_proie
    -35 si humanoïde
    -17 sinon si protégée par clôture selon la fonction Core
```

Si à terre, la santé employée **dans le score** est plafonnée à **0,2**. Le dernier facteur est celui du stade (**0,2 / 0,5 / 1**), pas la taille corporelle absolue. Les égalités de score conservent le premier candidat de l'énumération Core ; une politique locale stable doit être déclarée. La fonction de pénalité de clôture compare les Districts et un trajet avec `forceFenceblocked=true`; la sélection étudiée impose déjà le même District. Ne pas présenter cette pénalité isolée comme une preuve qu'un renard choisit nécessairement une proie de l'autre côté de toute clôture. Navigation et protection des enclos demandent des témoins locaux.

`SummaryHealthHandler` ne retourne ni PV globaux ni capacité Moving. Mort : 0 ; vivant : produit des `(1 - min(impact, 0,95))` pour les lésions non MissingPart, puis pour les seuls ancêtres communs des parties manquantes, borné **[0,05 ; 1]**. Une blessure visible non permanente a un impact `Severity / (75 × HealthScale)` ; une blessure permanente ou invisible n'en a pas. La perte de partie apporte un impact seulement sous les conditions `IsFreshNonSolidExtremity`, tags/enfants/saignement du binaire, puis `Part.def.hitPoints / (75 × HealthScale)`. Un remplacement par douleur, pourcentage de couverture ou minimum de capacités serait une **adaptation différente**, à nommer et justifier, pas la formule Core vérifiée.

Limite d'intégration V190 : la santé sommaire animale utilise l'échelle sanitaire du modèle clinique local, déjà partagée par les blessures, et les PV de définition capturés avant `ceil(hp × healthScale)`. Le modèle local ne module pas encore sa santé par stade jeune ; V190 ne lui ajoute pas les facteurs Core 0,25/0,6/1 uniquement dans le score. Les renards obtenables arrivent adultes, sans reproduction ouverte. Cette limite des jeunes est distincte des facteurs de taille appliqués à l'admissibilité et au score ; elle ne permet pas de prétendre à une physiologie Core exhaustive.

Puissances `PawnKindDef` des six espèces déjà admises, à ajouter comme données de référence sans modifier rétroactivement leurs animaux :

| ID local / définition Core | CombatPower | Source XML locale |
| --- | ---: | --- |
| `hare` / `Hare` | **33** | `Races_Animal_Hares.xml`, hérite de `HareBase` |
| `snow-hare` / `Snowhare` | **33** | Même `HareBase` |
| `deer` / `Deer` | **50** | `Races_Animal_PigGroup.xml` |
| `gazelle` / `Gazelle` | **40** | `Races_Animal_PigGroup.xml` |
| `muffalo` / `Muffalo` | **100** | `Races_Animal_CowGroup.xml` |
| `dromedary` / `Dromedary` | **90** | `Races_Animal_CowGroup.xml` |

Ces puissances sont celles du type, non les dégâts d'un outil ni un compteur de PV. Le score applique séparément santé et taille de stade ; ne pas multiplier une seconde fois CombatPower par un stade arbitraire.

Impacts médicaux directs de `SummaryHealthPercent` dans le périmètre étudié :

| État | Impact avant plafond individuel 0,95 | Vérification et limite |
| --- | --- | --- |
| Blessure | `severity / (75 × HealthScale)` si visible et non permanente ; sinon **0** | Override `Hediff_Injury`. Une cicatrice ne réduit pas directement ce score, même si elle affecte une capacité |
| MissingPart | `Part.def.hitPoints / (75 × HealthScale)` sous conditions ; sinon **0** | Override `Hediff_MissingPart`, uniquement les ancêtres communs dans le produit ; PV de définition non pré-multipliés par HealthScale |
| Hémorragie / `BloodLoss` | **0** | XML sans remplacement de classe, `HediffDef.hediffClass` par défaut `Hediff`, propriété de base nulle |
| Malnutrition | **0** | Même classe de base, malgré faim/capacités/mortalité affectées par d'autres règles |
| Infection / `WoundInfection` | **0** | Hérite de `InfectionBase` → `HediffWithComps` ; aucun override de l'impact dans cette classe |
| Hypothermie | **0** | Classe de base `Hediff`, capacités et décès traités ailleurs |
| Hyperthermie / `Heatstroke` | **0** | Même distinction |
| Étourdissement / `Stun` | **0 direct** | DamageDef `harmsHealth=false`, `DamageWorker_Stun` signale un résultat étourdi ; ce n'est pas une blessure/Hediff de santé à soustraire au score |

Les conditions complètes de MissingPart excluent entrée hors partie, perte non fraîche, partie interne ou solide, parent artificiel/ancêtre remplacé et parent déjà manquant. Même fraîche et externe, une extrémité sans tags, sans enfants et sans saignement apporte zéro. Les termes non nuls plafonnent chacun à 0,95 avant multiplication ; le résultat vivant garde son plancher 0,05. **Impact nul ne signifie pas état médical bénin** : saignement, infection, famine, froid et chaleur peuvent mettre à terre ou tuer ; cela change alors les branches d'admissibilité et, à la mort, le score devient zéro. Ajouter à la formule un facteur `1-bloodLoss`, `1-malnutrition`, `1-infection` ou une durée de stun ne reproduirait pas cette version Core.

## Poursuite, combat et passage à la dépouille

`JobDriver_PredatorHunt.TryMakePreToilReservations` retourne vrai sans réservation exclusive de proie. Le job suit sa cible avec `FollowAndMeleeAttack` ; `Toils_Combat` relance le trajet vers une cible mobile et contrôle périodiquement l'accessibilité. `killIncappedTarget=true` permet de continuer les véritables frappes sur une proie incapable : aucun décès instantané ou achèvement distant n'est autorisé par ce drapeau.

L'échec temporel vérifié est **tick > startTick + 5 000 ET distance² > 4**. En échelle locale ×10, cela correspond à 500 ticks, mais la condition spatiale doit rester explicite : une chasse au contact ne s'arrête pas automatiquement au cinq-centième tick. Réévaluation d'accessibilité du toil toutes les 250 ticks Core, soit 25 locaux si cette cadence est retenue ; les obstacles doivent également rester revalidés sur les arêtes physiques existantes.

`firstHit` commence vrai et est persisté. Le driver demande une surprise pour le premier coup si la cible **n'est pas un colon** ; il ne consomme ce marqueur que si `TryMeleeAttack` retourne vrai. Le verbe de mêlée impose alors non-miss **1** et esquive **0**, puis les outils concernés ajoutent le dommage Stun déclaré. La tête n'a pas ce supplément. Cela ne supprime ni armure, anatomie, outils indisponibles, récupération, ni conditions qui empêchent d'engager une attaque. Une cible immobile bénéficie aussi de non-miss 1/esquive 0 dans le verbe commun, indépendamment du marqueur de surprise.

Après mort, le driver résout la vraie dépouille de la même proie et exige qu'elle soit apparue sur la carte. Il remplace le target du job par cette dépouille, se déplace jusqu'au contact puis mâche. Core change également son état Forbidden selon faction du prédateur ; Lisière ne possède pas cette politique générale et ne doit pas inventer une capture/propriété de dépouille à partir de ce geste. Une blessure distante infligée au prédateur par un tiers peut interrompre la chasse au profit d'une fuite.

Les notifications Core distinguent une proie du joueur poursuivie à moins de 60 cellules, avec délai de 2 500 ticks depuis la notification précédente, et le contact attaqué. Elles ne rendent pas le renard commandable. Une inspection locale d'activité et une alerte de danger peuvent adapter cette information sans ouvrir le catalogue de lettres Core.

## Ingestion anatomique et satiété

`ThingDefGenerator_Corpses` fixe Nutrition de base à **5,2**, type alimentaire `Corpse`, quantité maximale d'ingestion à un objet. Les StatParts modulent par taille, couverture naturelle restante, chair et fraîcheur. `StatPart_IsCorpseFresh` multiplie par **1 si Fresh, 0 sinon** : pourriture et dessiccation n'accordent aucune nutrition. Les blessures ordinaires ne sont pas un facteur de nutrition identique au facteur de rendement de boucherie.

Pour une partie `p`, `FoodUtility.GetBodyPartNutrition` retourne :

```text
nutrition_actuelle_dépouille × couverture_naturelle_restante(p)
                              / couverture_naturelle_restante(racine)
```

Couverture de racine nulle : zéro. `Corpse.GetBestBodyPartToEat` énumère les parties **présentes et externes**, avec nutrition **>0,001**, puis minimise l'écart absolu au besoin nutritionnel. La racine externe n'est pas exclue de cette compétition. Si aucune partie ne convient, la finalisation utilise la racine comme repli ; ce n'est pas une permission locale de manger une dépouille périmée sans revalidation.

Racine choisie : `numTaken=1`, l'objet dépouille est consommé. Autre partie : ajout réel d'une `MissingBodyPart` fraîche avec dernière blessure Bite, `numTaken=0`, quantité de dépouille toujours **1**. La nutrition retournée correspond à **toute la partie**, et peut dépasser le déficit alimentaire ; réserver moins de nutrition ne crée pas une demi-patte persistante. Le registre nutritionnel et la satiété plafonnée sont distincts.

Le driver répète déplacement/contact, mastication à durée multipliée par **1/EatingSpeed**, puis finalisation tant que réserve < **90 %**. La durée doit provenir de l'ingestible/statistique, pas d'une durée arbitraire choisie pour terminer le scénario. Chaque bouchée revalide présence, fraîcheur, partie, contact et propriétaire/réservation. Le cadavre restant conserve blessures, parties manquantes, identité et pourriture ; le rendement futur de boucherie lit ce même état. Pas de viande produite simultanément, pas de dépouille fractionnée en plusieurs propriétaires.

Le contrat local choisit une représentation différente, **`CorpseState.consumedParts?: {part; atTick}[]`**, afin de conserver le dossier médical ante mortem figé. Elle projette l'absence des sous-arbres consommés pour nutrition, boucherie et rendu, sans modifier le sexe, l'âge biologique, la santé historique, l'heure du décès ou l'âge thermique. C'est une **adaptation de représentation**, pas le champ persisté par Core : les effets physiques doivent rester ceux d'une perte anatomique. Les blessures du sous-arbre consommé ne doivent plus peser sur le rendement restant ; conserver le dossier original ne signifie pas continuer d'appliquer toutes ses lésions à des parties absentes. L'ordre anatomique local départage sans tirage, les racines consommées restent uniques/non imbriquées, et l'ingestion du tronc retire le corps entier.

## Corpus et décisions locales proposées

Originaux relus sans mutation : [Documentation de développement, chapitre 12](../reference/originals/Documentation_developpement.html#chap-12) pour la chaîne alimentaire et la distinction des intentions ; chapitres 14/15 pour besoin et anatomie, 20/21 pour combat/navigation, 23/30 pour continuation et frontières. Le suivi [reference-adoption](reference-adoption.md) conserve **SYS/TEST-121..125**, **SYS-076..078** et les familles anatomiques **SYS/TEST-089..091/096** ; la recherche de mêlée antérieure conserve aussi **SYS/TEST-098..112**. Ces identifiants désignent des obligations de domaine, pas des systèmes clos par une espèce ou une preuve préparée. Aucun identifiant CONST/UI/STAT/GAP n'est renuméroté ni ajouté par inférence.

**Adopter** la chaîne complète et physique ; régime carnivore précis, faim propre à ce régime, nourriture avant proie, admissibilité/score avec vraie santé et stades, poursuite/frappes/cooldowns, surprise distincte, dépouille conservée, ingestion des parties et satiété. Les réservations métier locales restent indispensables même si Core ne réserve pas la proie pendant la chasse.

**Adapter** la représentation originale 3D aux lots résidents, l'horloge ×10 et les trajets déterministes existants, et représenter l'anatomie consommée dans `consumedParts` avec dossier ante mortem conservé. Nourriture, proie et départ doivent partager le budget de recherche mondiale et sa rotation V186 ; pas de double inondation mondiale systématique ni de recherche métier par image. La sélection spatiale locale, le départage des égalités, la cadence de replanification et les alertes doivent être motivés dans le contrat. Attendre la conversion physique animal mort → pile au sol, y compris cellule bloquée, est nécessaire dans le modèle local ; cela ne justifie aucune ingestion à distance.

**Différer** loups et autres prédateurs, prédation humaine, élevage/apprivoisement/dressage carnivore, reproduction sauvage, groupes et écologie exhaustive, factions animales générales, vol, destruction de portes, migration saisonnière et systèmes d'extensions. La taille maximale du renard exclut les humains adultes actuels ; une exclusion de tous les humains, même petits ou modifiés, serait une restriction locale explicite. Le loup Core porte maximum de proie 2,3 et ouvre ces problèmes supplémentaires ; ce n'est pas un simple changement de silhouette.

**Vérifier** avant de qualifier le lot de jouable : aliment/cadavre avant proie, petite proie mobile et proie incapable, obstacles/enclos, premier coup et outils perdus, mort par un tiers, dépouille bloquée, ingestion partielle puis boucherie, pourriture entre choix et contact, concurrence de chasseurs/transport/boucherie, reprise à chaque phase et ancien schéma neutre. L'ID vivant → dépouille → dépouille consommée et les récupérations de mêlée encore référentes sont une frontière prioritaire ; aucune référence invalide, duplication ou réutilisation d'ID ne doit être couverte par un oracle accommodant.

## Limites

Le socle Lisière V189 n'offre encore que repas animaux plante/pile herbivore et riposte courte visant un humain. Le kernel partagé sait porter des cibles animales, mais ses resolvers et gardes de sauvegarde doivent être étendus conjointement ; ni une nouvelle définition ni un bouton ne valent prédation jouable. Les archives d'identité et cadavres humains restent hors du premier périmètre recommandé, sans assouplissement de leur validation.

Aucun scénario, test, build, banc CPU/GPU, navigateur ni campagne naturelle exécuté pour ce relevé. La certitude porte sur les XML et branches IL inspectées de la version indiquée, pas sur une parité exhaustive avec le jeu. Le coût d'une recherche et d'un score de proie doit être mesuré séparément après implémentation ; une espèce unique ou un lot graphique résident ne prouve aucun coût nul. Le contrat, les sources nouvelles et une future preuve doivent rester distincts de cette recherche.
