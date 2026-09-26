# Apparence humaine — référence V109

Référence observée le 26 septembre 2026 : installation locale **RimWorld Core 1.6.4871 rev590**, sans DLC ni mods, `E:/Steam/steamapps/common/RimWorld`. Les règles ci-dessous viennent des définitions XML et de `Assembly-CSharp.dll` de cette installation. Elles décrivent la génération d'un humain Core, pas une promesse de parité graphique : RimWorld assemble des dessins 2D prédéfinis, tandis que Lisière possède des acteurs voxel 3D. Les extractions de travail sont dans `tmp/appearance-reference/` ; aucun asset propriétaire n'est reproduit.

Corpus utilisateur : **CAT-084** (profils procéduraux), **STAT-007/009/010** (stade de vie et biographies) restent partiels ou absents. Le profil visuel ne clôt aucun de ces domaines ; les exports du classeur renvoient à un miroir non daté que la lecture locale ci-dessous remplace pour ces règles précises.

## Choix de forme et identité

`BodyTypes.xml` définit les cinq corps adultes `Male`, `Female`, `Thin`, `Hulk`, `Fat`, avec `bodyGraphicScale` respectivement `(1, .9)`, `(1, 1)`, `(.6, 1)`, `(1, 1.25)`, `(1.5, 1)`. `PawnGenerator.GetBodyTypeFor` applique d'abord un corps imposé, puis, hors Biotech, le corps de l'histoire adulte lorsqu'elle existe. Si elle manque, il choisit `Thin` avec probabilité 1/2, ou `Male`/`Female` selon le sexe avec probabilité 1/2. **Il n'existe donc pas de tirage uniforme entre les cinq corps**. Les corps `Baby` et `Child` sont une branche Biotech exclue ici.

`HeadTypeDefs.xml` contient douze têtes générables : `Male_` et `Female_`, chacune déclinée en `AverageNormal`, `AveragePointy`, `AverageWide`, `NarrowNormal`, `NarrowPointy`, `NarrowWide`. Les deux autres définitions, `Skull` et `Stump`, ont poids zéro et `randomChosen=false`. `Pawn_StoryTracker.TryGetRandomHeadFromSet` filtre par sexe et tire selon `selectionWeight`, qui vaut 1 par défaut pour les douze ; le tirage est amorcé par `pawn.thingIDNumber`. Les dimensions et décalages de cheveux/barbe dépendent aussi du type de tête. La tête constitue une identité enregistrée, pas une déformation aléatoire d'une texture.

Pour le sous-ensemble **Astropolitan** de Core sans Ideology, `Cultures.xml` donne `Urban` poids 1. Les 26 coiffures de `HairsGeneral.xml` portant ce tag sont : `Lackland`, `Revolt`, `Pigtails`, `Afro`, `Burgundy`, `Troubadour`, `GreasySwoop`, `Cute`, `Decent`, `FancyBun`, `Senorita`, `Flowy`, `Long`, `Mop`, `Wavy`, `Messy`, `Curly`, `Fringe`, `Frozen`, `Ponytails`, `Bowlcut`, `Bravo`, `Rockstar`, `Snazzy`, `Shaved`, `Mohawk`. `Bald` est un repli sans dessin, pas une coiffure Urban normale. Dans `PawnStyleItemChooser`, le poids de culture et d'éventuels tags imposés par le type de pawn déterminent l'ensemble admissible. Lorsque `pawn.Ideo == null`, `FrequencyFromGender` renvoie **100 pour toute coiffure** : les étiquettes XML `Male`, `Female`, `Usually` ne filtrent ni ne pondèrent ces 26 styles dans ce cas sans DLC. Cela diffère de la tête, strictement filtrée par sexe.

`BeardDefs.xml` fournit 31 définitions. Pour Astropolitan, les tags `NoBeard` poids 10, `BeardRural` .1 et `BeardUrban` .2 rendent admissibles `NoBeard` et 18 barbes : `Boxed`, `Circle`, `Curtain`, `BushyStyled`, `Ducktail`, `French`, `Full`, `Goatee`, `Classy`, `Lincoln`, `LongDutch`, `Moustache`, `MuttonChops`, `OldDutch`, `SideWhiskers`, `Stubble`, `VanDyke`, `Wizard`. Un style possédant deux tags additionne leurs poids. `Pawn_StyleTracker.CanWantBeard` exige un adulte et, sans gène particulier de Biotech, impose `NoBeard` aux femmes. Les autres cultures et les tags de pawn peuvent produire d'autres catalogues : la liste Urban n'est pas le catalogue général de Core.

## Teintes et vieillissement

`PawnSkinColors.RandomSkinColorGene` tire une mélanine dans `FactionDef.melaninRange` pour une faction ; sa valeur Core par défaut est `[0,1]`. Les neuf paliers de `GeneDefs_Endogenes.xml` sont des **définitions Core même si leur système porte le nom de gène** :

| ID | Mélanine minimale | RGB de base | Part si mélanine uniforme |
| --- | ---: | --- | ---: |
| `Skin_Melanin1` | 0 | `#F2EDE0` | 10 % |
| `Skin_Melanin2` | .10 | `#FFEFD5` | 15 % |
| `Skin_Melanin3` | .25 | `#FFEFC9` | 20 % |
| `Skin_Melanin4` | .45 | `#FFEFBD` | 13 % |
| `Skin_Melanin5` | .58 | `#F9DBA5` | 5 % |
| `Skin_Melanin6` | .63 | `#F2C78C` | 12 % |
| `Skin_Melanin7` | .75 | `#E49E5A` | 8 % |
| `Skin_Melanin8` | .83 | `#825B30` | 7 % |
| `Skin_Melanin9` | .90 | `#634624` | 10 % |

La part indiquée découle des intervalles et ne vaut que pour une faction conservant `[0,1]`, sans parenté ni couleur imposée. `IsDarkSkin` compare la somme des canaux RGB à `GetSkinColor(.5)` avec tolérance `.01` : les paliers 4 à 9 sont classés foncés pour le tirage des cheveux. Une altération de santé peut teinter la peau affichée sans changer sa base.

`PawnHairColors.RandomHairColorGeneFor` tire les 18 couleurs ci-dessous avec leur `selectionWeight`, multiplié par `selectionWeightFactorDarkSkin` pour les peaux foncées. Les valeurs omises dans le XML valent 1 (`GeneDef`). Ce sont les **RGB de base**, avant la variation de luminosité.

| ID `Hair_…` | Base | Poids | Facteur peau foncée |
| --- | --- | ---: | ---: |
| `SnowWhite` | `#FAFAFA` | .05 | 1 |
| `InkBlack` | `#191919` | .05 | 1 |
| `Gray` | `#A6A6A6` | .02 | 1 |
| `DarkBlack` | `#333333` | 1.5 | 1 |
| `MidBlack` | `#4F4742` | 1.5 | 1 |
| `DarkReddish` | `#403326` | 1.5 | 1 |
| `DarkSaturatedReddish` | `#382412` | 1.5 | 1 |
| `DarkBrown` | `#5A3A20` | 1 | 1 |
| `ReddishBrown` | `#84532F` | 1 | 1 |
| `SandyBlonde` | `#C19255` | 1 | **0** |
| `Blonde` | `#EDCA9C` | 1 | **0** |
| `Pink` | `#BF5695` | .05 | 1 |
| `LightPurple` | `#E373FF` | .05 | 1 |
| `LightBlue` | `#223FE3` | .05 | 1 |
| `LightTeal` | `#34BFB6` | .05 | 1 |
| `LightGreen` | `#48C928` | .05 | 1 |
| `LightOrange` | `#BD8531` | .05 | 1 |
| `BrightRed` | `#BF5656` | .05 | 1 |

`GeneHairColorBase` donne `randomBrightnessFactor=.12`, sauf `SnowWhite` et `InkBlack` qui le fixent à 0. `Pawn_GeneTracker` multiplie la couleur par `1 + Rand.Range(-.12,.12)`, puis `GenColor.ClampToValueRange` borne la valeur HSV entre `.1` et `.98`. Un type de pawn peut imposer une autre couleur. `PawnHairColors.HasGreyHair` ne s'applique pas à 40 ans ou moins ; au-delà, sa probabilité suit `GenMath.SmootherStep(40,75,âge)`, et la génération peut remplacer la couleur par un gris uniforme entre `.65` et `.85`. Ce choix est lié à l'âge biologique de Core ; il ne faut pas prétendre que Lisière, qui ne modélise pas l'âge biologique ou le sexe du pawn dans ses règles V109, simule ce vieillissement.

## Dessin, sauvegarde et adaptation V109

Le `PawnRenderTreeDef Humanlike` ordonne corps/peau, vêtements du corps (couche 20), tête (50), barbe (60), cheveux (62), blessures (65), vêtements de tête (70) et effets. Les nœuds tatouage sont conditionnés par Ideology, l'emmaillotage par Biotech. `PawnRenderTree` met en cache les demandes de dessin et les invalide lorsque l'apparence change ; les portraits et la carte consomment l'identité visuelle du même pawn. `Pawn_StoryTracker.ExposeData` enregistre `bodyType`, `headType`, `hairDef`, `hairColor`, et un éventuel `skinColorOverride` ; la base de peau est récupérée par le gène mélanine, tandis que `Pawn_StyleTracker` enregistre `beardDef`. Cela justifie une identité d'apparence **persistée une fois**, indépendante du PRNG de simulation, puis projetée de façon cohérente dans le monde, les portraits et les archives.

La transposition V109 de Lisière retient les cinq corps, douze têtes, 26 coiffures Urban, 18 bases de cheveux, neuf peaux et barbes admissibles comme **références de sélection**, avec un sexe purement visuel. Ses grandes têtes et corps simples sont des volumes voxel originaux ; les coiffures Core retenues sont interprétées en **13 familles 3D dessinées pour Lisière**, et non en sprites, textures, meshes ou animations copiés de RimWorld. Les coiffures distinctes peuvent partager une famille volumique : ce regroupement est un écart de représentation, pas une affirmation que Core n'a que treize dessins. La couleur capillaire V109 reprend la variation ±12 % et la borne de valeur, avec tirage privé déterministe et quantification RGB8 : elle n'est pas une reproduction du flux aléatoire de Core. Aucun système d'âge, de croissance, de changement de style Ideology, de gènes Biotech, de mutation Anomaly, ni une parité des coiffures de toutes les cultures n'est impliqué. Les anciennes sauvegardes doivent recevoir une apparence facultative et prospectivement déterminée sans réécrire leur trajectoire métier.

## Traçabilité et limites

Fichiers locaux consultés : `Version.txt`; `Data/Core/Defs/Misc/BodyTypeDefs/BodyTypes.xml` (SHA-256 `B90CFB10CCFCB91357CDB27CE18D0EC4CEAD2F6FD9EFCB63E0B872A49A230AF0`), `HeadTypeDefs/HeadTypeDefs.xml` (`76A308189EDF1A6B459A9D1BDCA602437FAE65AE122A535F08B85ACABC126C7B`), `Misc/HairDefs/HairsGeneral.xml` (`7FDF7DDDB94B5E7B0975C6D3478534610B44DCAA0471AF7B9A6EC45915D7F90B`), `BeardDefs/BeardDefs.xml` (`B0F05E30272177E09E5B4B45C816A3F1A00DCA722AC4F3C42673F04A9075E800`), `CultureDefs/Cultures.xml` (`8AD1CA89871E6BC7612276AEFDD35381F25C57626D697E3A2F384D8BD12E4EAB`), `GeneDefs/GeneDefs_Endogenes.xml` (`783012A9D8BC5F24C171FD9744A9579ABD2F3B51C7457A370AC07D857ABED07F`), `PawnRenderTreeDefs/PawnRenderTreeDefs.xml` (`7D0ABBECC5E92B37124FF729F31A9387F047D436F26B97F6A31FD4DAA550CFDE`). Assemblage `Assembly-CSharp.dll` SHA-256 `5CF1B5BE399D5B1C9C56CA72C9D35B4ECF307FEACF5859D04AC5A1AA5926356A`, classes décompilées `PawnGenerator`, `Pawn_StoryTracker`, `Pawn_StyleTracker`, `PawnStyleItemChooser`, `PawnSkinColors`, `PawnHairColors`, `Pawn_GeneTracker`, `PawnRenderTree` et `GeneDef`. Les TSV de travail listent les définitions effectivement trouvées.

Sources publiques primaires, **historiques et non substituts de la version 1.6** : Ludeon, [« Light and dark », 24 juillet 2013](https://ludeon.com/blog/2013/07/light-and-dark/) décrit la tête séparée et le corps lié à l'histoire ; Ludeon, [« Alpha 1 released », 27 janvier 2014](https://ludeon.com/blog/2014/01/alpha-1-released/) décrit la composition corps/peau/tête, l'habillement superposé et les coiffures aléatoires. Ces billets corroborent l'intention visuelle seulement ; les IDs, pondérations, nuances et règles V109 reposent sur les fichiers locaux datés ci-dessus. L'extraction n'a pas établi une distribution universelle des corps ni une correspondance géométrique 3D exacte pour chaque coiffure, car elles n'existent pas sous cette forme dans Core.
