# Carte, relief et populations naturelles — référence de calibration

Recherche du **20 septembre 2026**, avant tout nouvel ajustement du générateur. Cible : **RimWorld Core**, avec les vrais choix de nouvelle partie et leurs valeurs par défaut. Décision utilisateur courante : seul **Atterrissage forcé / Récit d'aventure** sera actif ; les autres scénarios et difficultés pourront être présentés désactivés. Cela ne transforme pas la forêt tempérée, les petites collines ou une rivière en défauts universels du jeu original.

**Conclusion : garder 250×250.** La priorité n'est pas d'agrandir arbitrairement la carte, mais de distinguer le contexte du site, les sols, les plantes basses, les arbres, les massifs, les minerais et les fragments détachés. Le profil naturel V80 a déjà un nombre d'arbres du même ordre que les cartes locales examinées. Sa rivière systématiquement infranchissable, ses conifères hauts et son absence de sous-bois produisent cependant une expérience différente. Les mesures disponibles ne certifient aucune difficulté équivalente à Core.

## Sources, versions et méthode

### Référence primaire actuelle

Installation locale consultée **en lecture seule** : `E:/Steam/steamapps/common/RimWorld`, `Version.txt` = **1.6.4871 rev590**. Les définitions de `Data/Core/Defs` et les classes de `RimWorldWin64_Data/Managed/Assembly-CSharp.dll` font autorité pour les valeurs constatées ici. Les entrées conditionnées par `MayRequire` ne deviennent pas du contenu Core parce qu'elles figurent dans un XML de Core.

Empreintes SHA-256 pour reproduire la consultation :

| Source locale | SHA-256 |
|---|---|
| `Assembly-CSharp.dll` | `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a` |
| `BiomeDefs/Biomes_Temperate.xml` | `4d6a48e5f6f0b5eed5f239077a1af78cadd8924785d76bdde2329da137dbc7ae` |
| `BiomeDefs/Biomes_Cold.xml` | `2045aaa108fa37ec0b60c7ffb1f39aede75ae0345fa2d1bed158e70914c29b3b` |
| `ThingDefs_Buildings/Buildings_Natural.xml` | `d0c032a63781ca1a2ee12ea667b54237fe65d38738bcc81a76771653a0b6b9d6` |

Classes relues : `GameInitData`, `Dialog_AdvancedGameConfig`, `TileFinder`, `Page_SelectStartingSite`, `CameraDriver`, `MapGenTuning`, `GenStep_ElevationFertility`, `GenStep_RocksFromGrid`, `GenStep_ScatterLumpsMineable`, `GenStep_Scatterer`, `GenStep_RockChunks`, `GenStep_Terrain`, `MapGenUtility`, `RockNoises`, `World.NaturalRockTypesIn`, `GenStep_Plants`, `WildPlantSpawner` et `GenStep_FindPlayerStartSpot`. XML : `MapGeneration/CommonMapGenerator.xml`, `BasePlayerMapGenerator.xml`, biome tempéré, terrains naturels/eau et bâtiments naturels.

La lecture décompilée est confrontée au [miroir daté du 20 mai 2026](https://github.com/Chillu1/RimWorldDecompiled/tree/2d508035082e7cb0c8e29e230d26bda6e546928f), puis aux annonces originales : [Alpha 17, 24 mai 2017](https://ludeon.com/blog/2017/05/alpha-17-on-the-road-released/) pour les rivières et la distribution végétale, [montagnes, 10 juillet 2013](https://ludeon.com/blog/2013/07/big-big-mountains/) pour l'intention historique, [annonce 1.6 et Odyssey, 11 juin 2025](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/) pour séparer enrichissement Core et extension. Ces annonces anciennes donnent une intention et une chronologie, pas des constantes actuelles. Le [wiki de génération](https://rimworldwiki.com/wiki/World_generation) et sa [table des tailles de filons](https://rimworldwiki.com/wiki/Property%3AMineable_Scatter_Lump_Size_Range) servent de recoupement secondaire.

Les extractions de travail et leurs manifestes sont dans `tmp/map-calibration-reference`. Aucun XML, code décompilé ou enregistrement complet propriétaire n'est destiné au dépôt. Les tableaux ci-dessous sont des mesures et paraphrases, pas une redistribution des sources.

### Corpus et décision

Via [reference-adoption](reference-adoption.md), chapitres **5–7, 10 et 12** :

| Référence | Décision pour ce chantier |
|---|---|
| SYS/TEST-016, génération par graine et passes | Adopter la séparation contexte → relief/sols → contenu → arrivée ; versionner le profil, jamais régénérer une sauvegarde. |
| SYS/TEST-017, relief et minerais | Adopter des classes de relief et distinguer roche/minerai ; adapter l'algorithme aux contrats et performances de Lisière. |
| SYS/TEST-018, cours d'eau et côtes | Corriger le faux défaut « rivière partout » ; le contexte du site gouverne sa présence. Eau peu profonde et profonde sont des catégories fonctionnelles distinctes. |
| SYS/TEST-019–022, grottes, ruines, brouillard, couches et empreintes | Conserver les dépendances ; ne pas prétendre livrer ces systèmes avec un simple changement de densité. |
| SYS/TEST-061, extraction | Préserver identité géologique, rendement, interaction au contact et conséquences de la suppression d'une cellule. |
| SYS/TEST-070–072, plantes | Séparer espèce, croissance, maturité et récolte ; ne pas convertir un poids végétal en probabilité d'arbre. |

Les nombres et architectures proposés par le corpus ne prouvent pas leur identité aux définitions actuelles. Le calendrier reste [ROADMAP](../ROADMAP.md).

## Taille, caméra et contexte du site

`GameInitData` initialise la dimension à **250 cellules par côté**. `Dialog_AdvancedGameConfig` propose **200, 225, 250, 275, 300 et 325** ; les tailles 350/400 sont des options de test conditionnelles. Le code affiche un avertissement au-delà de 280. Une carte 300² représente 1,44 fois la surface de 250² ; 325² représente 1,69 fois, pas six fois.

Le jeu original utilise une caméra orthographique : la taille des cellules à l'écran dépend de la hauteur d'écran et du double de `RootSize`. Dans la sauvegarde initiale étudiée, `RootSize=24` représente environ **48 cellules verticalement**, avant rapport d'aspect et superpositions UI. Ce champ de vision n'est pas la dimension de la carte. Les silhouettes verticales et occultations d'une caméra 3D sont une autre variable. La convention Lisière « 1 cellule = 1 mètre », humain 1,75 m, mur 2,8 m, arbres 5–7 m, est une interprétation artistique explicite ; ces lectures ne démontrent pas un mètre physique officiel par case Core.

Le choix aléatoire d'emplacement passe par `TileFinder.RandomStartingTile`, puis une recherche de tuile de colonie admissible. Il exclut notamment les biomes non implantés/non constructibles, le relief infranchissable et les sites interdits ; il pondère par `settlementSelectionWeight` et les exigences de température de la faction lorsqu'elles existent. Il n'impose **ni forêt tempérée, ni petites collines, ni rivière**. Ce sont les propriétés d'une tuile du monde généré. Sans monde complet, un preset local peut être utile, mais doit porter ce nom et ses limites : il ne reproduit pas le bouton aléatoire de Core.

Le point d'arrivée vise une zone centrale, non couverte, au sol supportant les constructions lourdes, hors emprises réservées de structures. Attention : la décompilation locale de `FindLargestContiguousOpenArea` montre un prédicat capturant la cellule de départ plutôt que la cellule explorée. Cette anomalie apparente interdit de certifier le comportement effectif « plus grande composante » sur le seul nom de la méthode ; aucune reproduction native de ce cas n'a été faite. La sélection explicite d'une composante reliée au bord de Lisière reste un choix robuste documenté, sans copier un éventuel défaut.

## Relief, sols et eau

Le relief du monde n'est pas une pente 3D sur laquelle marchent les pions : il règle notamment la distribution des massifs bloquants. La passe actuelle produit un champ d'élévation Perlin déformé/étiré et un champ de fertilité indépendant. Pour l'élévation : fréquence tirée entre 0,015 et 0,0225, trois octaves, deux familles de déformations et rotation ; fertilité : fréquence 0,021, six octaves. Ce sont des données de la version examinée, pas une obligation d'utiliser le même bruit.

| Relief du site | Facteur d'élévation | Filons demandés / 10 000 cellules | Nombre nominal sur 250² |
|---|---:|---:|---:|
| Plat | 0,8 | 4 | 25 |
| Petites collines | 0,9 | 8 | 50 |
| Grandes collines | 1 | 11 | 69 |
| Montagnes | 1,1 | 15 | 94 |
| Infranchissable | 1,2 | 16 | 100 ; pas un départ aléatoire admissible |

La roche naturelle apparaît au-dessus de **0,7** d'élévation, hors grottes. Des toits rocheux apparaissent ensuite : mince au-dessus de 0,728, épais au-dessus de 0,798. Le nettoyage de groupes de moins de vingt cellules concerne les **toits**, pas une règle de suppression de tous les petits massifs. Les modificateurs de site peuvent changer les conditions. Aucune part universelle de 22 % de roche ne découle de ce code.

Le terrain et la roche solide sont séparés. À conditions ordinaires, `TerrainFrom` examine les patches du biome ; hors patch, les altitudes intermédiaires 0,55–0,61 donnent du gravier et les valeurs ≥0,61 un sol de pierre naturelle. Une dalle de roche au sol ne signifie donc pas nécessairement un obstacle minable. En forêt tempérée, les autres sols dérivent notamment de la fertilité : terre ordinaire puis terre riche à partir de 0,87. Les mares du biome ont une bande de terre riche, de boue et d'eau peu profonde, avec leurs propres seuils de bruit.

Exemples Core actuels : fertilité terre 1, terre riche 1,4, gravier 0,7, sable 0,1 ; la boue n'est pas un substitut fertile. Ces terrains ont aussi des contraintes de construction et des coûts distincts. L'eau peu profonde est traversable avec surcoût (`pathCost=30` dans sa base) et support de pont ; l'eau profonde est infranchissable. Une rivière ne peut donc pas être résumée à une coupure infranchissable unique de trois à cinq cases. Sa présence et sa catégorie proviennent du site ; la description officielle des rivières distingue quatre tailles et leur continuité mondiale. [Source historique Ludeon](https://ludeon.com/blog/2017/05/alpha-17-on-the-road-released/)

## Trois objets différents derrière « rochers »

1. **Massif naturel** : cellules solides minables, liées à une roche et éventuellement à un toit. Les cinq roches Core sont granite, calcaire, marbre, grès et ardoise ; un site ordinaire en choisit deux ou trois distinctes. Des champs spatiaux lents répartissent leurs territoires, au lieu d'une loterie indépendante par cellule.
2. **Filon minéral** : amas irrégulier de cellules minables dont le centre est choisi dans la roche naturelle. La génération n'exige pas qu'il soit exposé en surface. Le nombre de demandes dépend de la surface et du relief, puis les tentatives et l'espace admissible limitent ce qui est effectivement placé.
3. **Fragment détaché** : objet transportable au sol. La passe `RockChunks` les regroupe par parcours locaux sur terrain admissible, sans les confondre avec les montagnes. Sa probabilité de base 0,006, modulée par un bruit et le contexte, concerne un **départ de groupe**, pas le pourcentage final de fragments sur la carte.

### Minerais actuels

`GenStep_ScatterLumpsMineable` choisit la définition selon sa fréquence relative, demande un centre dans la roche et impose un espacement minimal de cinq entre centres. Il utilise des amas irréguliers, évite notamment les grottes/emprises déjà utilisées, et peut manquer des placements. **Seul le centre exige une roche naturelle** : le validateur périphérique contrôle grottes et emprises, sans imposer une roche préexistante sous chaque cellule. Le nombre nominal de la table précédente est partagé entre **tous** les minerais ; il n'est pas appliqué intégralement à chaque espèce. Dans la classe actuelle, la dispersion est ignorée pendant `MapInitializing` si le narrateur est en mode tutoriel ; autre raison de ne pas étalonner un départ normal sur une carte de tutoriel.

| Définition Core | Fréquence relative | Cases demandées par amas | Rendement nominal par case |
|---|---:|---:|---:|
| Acier compacté | 1 | 30–40 | 40 acier |
| Machines compactées | 1 | 3–6 | 2 composants |
| Argent | 0,10 | 4–12 | 40 |
| Or | 0,07 | 2–8 | 40 |
| Uranium | 0,12 | 6–12 | 40 |
| Placier | 0,05 | 2–8 | 40 |
| Jade | 0,065 | 2–8 | 40 |

La somme des poids vaut 2,405 ; acier et machines ont donc chacun environ 41,58 % des **tirages nominaux**, avant restrictions. Ce ne sont pas des pourcentages de cellules, ni une garantie d'au moins un filon de chaque minerai. Le code arrondit la surface en unités de cellules par filon : les chiffres de la table de relief sont calculés par cette formule, non par un arrondi arbitraire. Rendement brut, minerai caché, minerai accessible et matière déjà transportable doivent rester quatre mesures distinctes.

## Végétation : densité, espèces et maturité

`TemperateForest.plantDensity=0,65` décrit la population végétale, **pas 65 % d'arbres**. Les poids Core sans extension sont : herbe 5, herbe haute 2, ronces 1, buisson 0,6, pissenlit 0,5, chêne 0,5, peuplier 0,5, baies 0,05 et médicinale sauvage 0,05. Les arbres représentent environ 9,8 % de la somme nominale de ces poids ; le résultat réel dépend des habitats et du mécanisme de saturation, pas d'une simple multiplication par la surface.

La génération parcourt les cellules dans un ordre aléatoire et s'appuie sur le même système de végétation sauvage : fertilité, densité du site, présence de couverture/édifice/plante, saturation régionale, plantes d'ordre inférieur à proximité, regroupements et proportions locales influent sur le choix. Sur terrain terrestre ordinaire, la formule désirée de cette version inclut la fertilité à deux endroits ; il serait incorrect d'aplatir ce comportement en un unique seuil uniforme. La source officielle présente aussi l'intention de zones boisées et de clairières alternées. [Alpha 17](https://ludeon.com/blog/2017/05/alpha-17-on-the-road-released/)

**Correction rétroactive importante :** la croissance initiale sauvage est tirée uniformément entre **0,15 et 1,5 puis bornée à 1**. Cela produit théoriquement environ 37 % de plants entièrement mûrs et 63 % à croissance ≥0,65, avant différences d'espèces, sélection et évolution. Notre tirage V80 uniforme 0,15–1 n'a pratiquement aucun plant entièrement mûr et seulement environ 41 % ≥0,65. Il s'agit d'un écart démontré, pas d'un souhait d'aider artificiellement le joueur. L'âge des plantes est également initialisé séparément dans Core.

Des arbres génériques ressemblant tous à des conifères ne représentent pas les chênes et peupliers d'une forêt tempérée. De même, une tuile de sol verte n'est pas une plante d'herbe susceptible de pousser, brûler ou être broutée. Ajouter les strates basses exige une décision de contenu/interaction ; elles ne doivent pas être compensées par davantage d'arbres.

## Deux cartes historiques examinées

Lecture seule des sauvegardes locales ; aucune partie lancée, modifiée ou régénérée par l'agent. Les objets XML ordinaires sont comptés directement. Les grilles compressées sont décompressées en entiers courts et rapprochées des noms de définitions par leur hash stable. Les terrains générés de pierre sont pris en compte. Les chiffres historiques ci-dessous utilisent un rapprochement exploratoire de la collision `Meat_Squirrel`/`MineableSteel` selon l'allocation actuelle. **Ce rapprochement ancien reste provisoire** : l'outil publié conserve le hash 27293 inconnu sur les anciennes versions, faute de leur allocation complète. Une correspondance plausible ne transforme pas une sauvegarde 1.4 en sortie du générateur 1.6.

| Mesure | Témoin A | Témoin B |
|---|---:|---:|
| Version enregistrée | 1.4.3641 rev639 | 1.6.4633 rev1261 |
| Situation | Atterrissage forcé, Core, tick 100 | Tutoriel, Core, tick 302 294, déjà joué cinq jours |
| Taille / biome | 250² / forêt tempérée | 250² / forêt tempérée |
| Relief | Petites collines | Plat |
| Toutes plantes présentes | 22 990 | 24 763, cultures comprises |
| Arbres | 2 635 | 2 982 |
| Part arborée de toute la carte | 4,216 % | 4,771 % |
| Arbres avec voisin à distance ≤√2 | 49,49 % | 40,21 % |
| Buissons de baies | 125 | 143 |
| Baies croissance ≥0,65 / entièrement mûres | 78 / 45 | 119 / 80 |
| Roche naturelle solide, sans minerais | 5 901 | 1 751 |
| Cellules de minerai restantes | 871 | 37, déjà affectées par partie/tutoriel |
| Fragments détachés présents | 1 058 | 1 572 |

Sur la carte initiale : 1 330 chênes et 1 305 peupliers ; 12 619 herbes, 3 896 herbes hautes, 1 355 buissons, 1 163 pissenlits, 1 073 ronces et 124 médicinales sauvages complètent le peuplement. Les minerais sont 737 cellules d'acier, 106 de machines, 16 d'uranium, 8 de jade et 4 d'argent ; pas d'or/placier dans cette carte. Le sol comporte notamment 36 578 terres ordinaires, 2 660 terres riches, 5 751 graviers, 1 611 boues, 1 402 eaux peu profondes et 837 profondes. Les sols naturels de pierre totalisent 13 031 cellules : **ce nombre n'est pas celui des cellules rocheuses bloquantes**. Le minéral caché est inclus dans les comptes ; rien n'affirme qu'il soit accessible depuis l'arrivée.

SHA-256 de l'observation initiale : `fec6cc275e22bba748c2a1e64edbfaec10d5ef5762206f4076bcf71ac05d2d2e`. Observation de cinq jours : `7c1d7c784f7edd9c550181a114dff341611e86230a9d6596a6692f1bd24c06c3`. Extraction exploratoire dans `tmp/map-calibration-reference` ; outil de lecture reproductible et agrégats du nouveau témoin ci-dessous. Les sauvegardes brutes restent hors dépôt.

**Limite décisive : deux cartes, dont une ancienne et une déjà jouée en tutoriel, ne définissent pas une distribution de génération actuelle.** Elles sont un contrôle de plausibilité, pas des quotas à recopier. Le manque de minerais de la seconde ne prouve pas que le générateur plat Core en demande seulement 37.

## Témoin actuel fourni par l'utilisateur

`Reference-Core-4871` a été créé par l'utilisateur le 20 septembre, sans tutoriel, et lu sans modification. SHA-256 : `cb5fcd3513ab2d0ee5f4c2c711121d9f832ab320da004edcce3b20dc2a723ef1`. L'en-tête porte **1.6.4871 rev591**, tandis que le fichier d'installation `Version.txt` indique toujours rev590 : même numéro de correctif, révision distincte consignée sans explication inventée. Core seul, Atterrissage forcé, Cassandra, difficulté `Medium` ; **tick 283**, soit 0,00472 jour écoulé et environ 4,72 secondes nominales à 1×. L'état est très proche du départ, sans être exactement le tick zéro.

Le monde sauvegardé confirme graine `Test`, couverture 30 %, pluie et température normales, **250×250**, biome `BorealForest` et relief `LargeHills`. Les captures montrent les grottes, latitude 39,71°N, longitude 13,47°E, altitude 574 m, température moyenne 5,3 °C, 655 mm/an et culture 30/60 jours. Ce milieu diffère du témoin tempéré/petites collines initialement proposé ; il est conservé tel quel, sans l'étiqueter « départ moyen ». Les cinq nouvelles vues relient paramètres du monde, site, candidats et arrivée.

| Mesure à l'enregistrement | Valeur |
|---|---:|
| Surface totale | 62 500 cellules |
| Roche solide hors minerais | 10 975 cellules : ardoise 5 262, marbre 4 250, grès 1 463 |
| Minerais, y compris cachés | 1 136 cellules : acier 920, machines 151, argent 44, uranium 10, or 7, jade 4 |
| Roche solide + minerais | 12 111 cellules, soit 19,38 % de la carte |
| Fragments détachés | 1 138 fragments de pierre + 3 scories d'acier |
| Plantes, toutes classes `Plant` directement présentes | 11 269, dont 3 287 arbres |
| Arbres | 2 014 pins, 701 bouleaux, 572 peupliers ; 5,26 % des cellules |
| Arbres ayant un voisin à distance ≤√2 | 56,53 % |
| Buissons de baies | 76, dont 49 à croissance ≥0,65 et 32 entièrement mûrs |
| Médicinales sauvages | 75 |
| Animaux directement présents | 30 sans faction, un cheval de la colonie, trois insectes distincts |

La végétation basse comprend 4 078 herbes, 1 811 mousses, 1 250 buissons, 677 ronces et quinze champignons de trois types. **Correction de méthode :** filtrer seulement les noms commençant par `Plant_` omettrait dix champignons (`Bryolux`/`Glowstool`). Le total retient la classe sérialisée ; les empreintes de chaque espèce restent disponibles dans les agrégats.

Terrains principaux : terre 17 843, sol moussu 15 166, marais 6 829, gravier 2 645, terre riche 903 et eau peu profonde 1 270 ; sols naturels de pierre 16 627. Le reste comprend 1 217 sols de structures et ruines. Aucun terrain d'eau courante n'est observé sur la carte ; cela ne constitue pas un décodage exhaustif du réseau fluvial mondial. Les **503 murs et onze portes** ordinaires ne sont pas une colonie construite en cinq secondes : les ruines et structures préexistantes doivent être distinguées des possessions du joueur. Ces nombres ne mesurent ni surface praticable, ni visibilité initiale des minerais, ni ressources obtenables immédiatement.

Le zoom sauvegardé `rootSize=55,3200035` représente environ **110,64 cellules verticales** avant UI et rapport d'aspect. La vue dézoomée et les densités donnent donc des mesures différentes de la taille totale 250². Le brouillard, les couronnes et la projection 3D restent à traiter dans une comparaison de lisibilité.

Le Def Core boréal explique pourquoi ce témoin ne doit pas étalonner une forêt tempérée : densité végétale **0,40** contre 0,65, mais poids des arbres **7,7 sur 26,02**, soit 29,59 % du poids végétal nominal contre environ 9,8 % en tempéré. Les regroupements, sols et conditions modifient encore la réalisation. Les valeurs boréales locales sont densité animale 2,8, repousse sauvage 25 jours, forageabilité 0,75 et intervalle de maladie 60 jours avant narrateur/difficulté ; ce ne sont ni des nombres fixes d'animaux, ni une promesse de nourriture à une date. Recoupement secondaire consulté le 20 septembre : [fiche boréale du wiki](https://rimworldwiki.com/wiki/Boreal_forest), concordante sur les paramètres de base ; les Defs locales restent la preuve de version.

**Conséquence :** ce témoin actuel ne démontre pas un excès global de roches ou d'arbres dans Lisière. Il renforce le besoin de paramètres explicites de relief/biome et d'une mesure des couches du paysage. Un seul monde ne fournit toujours ni moyenne, ni percentiles de génération. Il permet cependant d'avancer sur les écarts de règles déjà établis sans demander une nouvelle partie de remplacement à l'utilisateur.

### Reproduire la lecture

L'[outil d'audit](../../scripts/audit-reference-map.py) utilise Python standard et lit un chemin `.rws` explicite. `--defs-root` désigne les Defs Core locales ; `--output` doit être un nouveau JSON hors du dossier des sauvegardes. Sans sortie, les agrégats sont écrits sur stdout. Il ne lance pas RimWorld, ne modifie pas l'entrée et ne copie aucune source propriétaire. [Rapport du témoin](../../artifacts/reference-core-4871-map.json), [contrôles synthétiques](../../scripts/tests/test_audit_reference_map.py).

Les noms de grilles restent des **candidats de correspondance**, pas une réimplémentation de tout l'allocateur dynamique du jeu. Le cas acier/viande d'écureuil vérifié est limité au Core 1.6.4871 ; ambiguïtés et hashes inconnus restent dans le JSON. Le témoin courant n'en laisse aucun dans les trois grilles analysées. Les comptes d'animaux incluent sauvage/domestique/insectes ; la ventilation de faction du tableau a été vérifiée séparément sans publier les identités. Les grottes sont ici établies par la capture utilisateur, pas décodées par cet outil. La sortie exclut graine, noms personnels, texte libre de scénario, chemin source et identifiants de compte.

## Comparaison avec Lisière V80

Source : [mesure existante sur cinq graines 250²](../../artifacts/scenario-generation-v80.json), sans nouveau parcours ni nouvelle mesure de performance pendant cette recherche.

| Domaine | Lisière V80 mesurée | Écart / conséquence |
|---|---|---|
| Taille | 250² | Conforme au défaut constaté ; aucun argument pour agrandir maintenant. |
| Contexte | Un profil tempéré de vallée ; rivière toujours présente | Pas le choix aléatoire de tuile Core. La rivière coupe durablement le terrain faute d'eau traversable/ponts. |
| Relief | Bruit propre, seuil 0,64, plafond de roche 22 %, petits groupes retirés | Pas de correspondance définie aux quatre classes jouables de relief. 8 620–12 541 cellules rocheuses sur ces graines. |
| Sols | Herbe fertile 1 et terre fertile 0,7, eau/roche | Ni catalogue Core ni sens fidèle des sols : la terre ordinaire Core vaut 1 ; riche, gravier, boue et eau peu profonde manquent à la génération. |
| Géologie | 2–3 roches parmi les cinq | Bonne séparation de contenu ; bruit technique différent acceptable sous mesures. |
| Minerais | Acier/machines ; budget par espèce `floor(roche/500)` ; centres exposés obligatoires | Core demande un budget commun selon surface/relief, sept définitions et des filons potentiellement cachés. Tailles acier/machines déjà correctes. |
| Arbres | 2 249–2 652 ; voisin proche 34–40 % | Ordre de grandeur compatible avec les observations ; forme, espèces et distribution spatiale restent à affiner. |
| Baies | 193–216, dont 76–88 récoltables et zéro mûre dans la mesure | Davantage que l'exemple initial, mais maturité inférieure ; corriger le tirage documenté avant de modifier le nombre. |
| Fragments | 1 005–1 169 ressources de pierre initiales | Comptes plausibles mais représentation/rendement différents des vrais fragments transportables Core. |
| Espace accessible | Composante d'arrivée ≈51–53 % des terres | La grande moitié opposée n'est pas utilisable sans franchissement ; agrandir ne résout pas cette différence. |
| Faune | 12 lièvres au maximum sur 250² | Budget de contenu provisoire, pas la population ni le poids écologique d'un biome Core. |

Le nombre total ne suffit pas : un arbre 3D haut, une baie immature, un filon inaccessible ou de la terre stérile changent les décisions du joueur. Les couronnes visibles, la surface franchissable et la nourriture effectivement récoltable doivent être examinées séparément.

## Décisions recommandées et protocole suivant

### Application V83, recherche renouvelée le 20 septembre

L'assembly installé a été rehaché : même SHA-256 et `Version.txt` 1.6.4871 rev590. Les classes locales `GenStep_ElevationFertility`, `GenStep_RocksFromGrid`, `GenStep_ScatterLumpsMineable`, `GenStep_Scatterer`, `GenStep_RockChunks`, `GenStep_Plants`, `MapGenUtility` et `WildPlantSpawner`, ainsi que les Defs actuelles de biome, minerais et sols, ont été relues. Les annonces [Alpha 17](https://ludeon.com/blog/2017/05/alpha-17-on-the-road-released/), [cartes 1.6 et Odyssey](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/) et [montagnes historiques](https://ludeon.com/blog/2013/07/big-big-mountains/) ont été reconsultées : elles établissent intention et chronologie, sans devenir des tables de coefficients du correctif courant.

Décision : site local forêt tempérée, trois reliefs paramétrés, sans rivière ni mares ; terre riche/gravier/sol pierreux distincts ; budget de minerais commun pondéré ; fragments physiques groupés ; végétation projetée sur le catalogue effectivement disponible. L'[implémentation](../development/world-generation.md#site-local-v83) précise les différences et les paramètres. Cela corrige des écarts certains sans prétendre proposer un globe, un biome complet ou une moyenne du jeu original. Les autres menus et le catalogue naturel restent distincts.

**Diagnostic avant validation :** un premier bruit à gradients 2D non normalisés donnait trop de variance (quinze cartes initiales, grandes collines environ 24–30 % de roche). Une nouvelle inspection locale de `Verse.Noise.Utils` et `Verse.Noise.Perlin` confirme des directions unitaires tridimensionnelles, des octaves non normalisées, persistance 0,5, lacunarité 2 et facteur de gradient 2,12. Le noyau V83 utilise désormais des directions sphériques calculées indépendamment, projetées sur le plan horizontal ; aucune table propriétaire copiée. Ce changement vise la cause du défaut, sans inventer un quota de roche ni déplacer les seuils de la référence. Le hash, les directions et les déformations de Lisière restent propres au projet : l'identité statistique du générateur Core n'est toujours pas démontrée. Le premier relevé ne valide pas le correctif ; la campagne de trente graines par relief est consignée dans les [preuves V83](../history/validation-site-v83.md).

Les pièces de recherche nouvelles sont conservées sous `tmp/map-calibration-reference/*-v83-local.cs`, hors publication. Absence de minerais rares : leurs tirages sont consommés, pas redistribués à l'acier/machines. Absence de plantes basses : leur poids n'augmente ni le nombre d'arbres ni le nombre de baies. Pas de faux herbage fonctionnel. Les rendements d'arbres et la saturation végétale restent des simplifications annoncées.

### Suite des décisions de calibration

1. **Conserver le défaut 250² et expliciter le contexte.** Les menus du futur départ doivent distinguer ce qui fonctionne, ce qui est désactivé et le preset réellement généré. Ne pas proposer un choix de biome/relief dont le moteur ignore ensuite la valeur. Un monde incomplet ne justifie pas d'inventer une distribution « joueur moyen ».
2. **Corriger les écarts établis avant les quotas.** Croissance initiale bornée après tirage, classification des sols, présence d'eau gouvernée par le site et distinction peu profonde/profonde. Le passage d'une rivière affecte navigation, vitesse et construction : le traiter comme une boucle fonctionnelle, pas une couleur de terrain.
3. **Séparer les paramètres de relief et le budget de minerais.** Garder un algorithme procédural performant mais relier son résultat aux classes exposées. Ne pas garantir chaque minerai ni son accessibilité pour satisfaire un pilote. Le catalogue partiel doit rester annoncé jusqu'à implémentation des matériaux manquants.
4. **Enrichir le paysage en strates.** Arbres feuillus et végétation basse, avec contenu/conséquences identifiés, en conservant l'instancing et les mises à jour locales. Mesurer densité et occultation avant d'augmenter ou de réduire massivement les arbres.
5. **Calibrer par échantillons comparables.** Pour une future campagne, fixer version Core, scénario, difficulté, graine, tuile, biome, relief, rivières/côte, taille et temps depuis génération. Des captures 1.4 et des parties tutoriel à J5 restent des témoins distincts. Ne pas comparer leurs stocks restants à un état neuf.

Métriques utiles pour cette campagne : surface totale/franchissable/fertile ; composantes et bords accessibles ; solides naturels/sols pierreux/toits ; filons par espèce avec surface, taille, exposition et distance de contact ; fragments détachés ; plantes par espèce et classe de croissance ; fractions de végétation par zones 16², voisins immédiats et rayons autour du départ ; nourriture récoltable en nutrition et bois effectivement obtenable. Côté rendu, fixer caméra et zoom, puis mesurer couronnes occultantes, lots, triangles et percentiles d'image. **Aucun objectif FPS ni quota universel de ressource n'est déduit de cette recherche.**

Les garanties du scénario doivent porter sur une arrivée valide et des possessions fidèles, pas sur un nettoyage invisible de roches, une nourriture téléportée ou une forêt arrangée pour les tests. Les mesures guideront le réglage ; les règles élémentaires, les différences assumées et les limites du contenu restent visibles.
