# Corrections visuelles et feuillage sonore — V185

Le [correctif V200](needs-grass-clouds-v200.md) augmente le trou central des nuages de 27 à 31 % du petit côté de l'écran, avec même raccord de 8 points. Les dimensions historiques ci-dessous sont remplacées sur ce seul point.

Le [correctif V196](visual-blood-v196.md) remplace les proxies animaux morts
par leurs vrais modèles, avec pose de sommeil, pelage et yeux en croix. Il
ajoute le pigment corporel et l'herbe tachée. Les mentions de silhouette de
cadavre distincte ci-dessous décrivent l'ancien état V185 ; ses mesures restent
historiques et ne valident pas le coût de V196.

## Retouches du 3 octobre 2026 — validation manuelle demandée

Les sections V185 ci-dessous décrivent la livraison historique `98b7480`. Les retouches suivantes la remplacent sur les points cités, sans modifier le schéma 173 ni les règles de simulation. À la demande de l'utilisateur, aucun test, build, benchmark ou parcours navigateur automatique n'a été exécuté pour ces retouches ; la preuve historique V185 ne les valide pas.

- Le feu retrouve le cône original de dix triangles, avec une carte peinte partagée, contraste renforcé et décalage des dessins entre instances. La fumée/vapeur devient ronde et plus petite ; sept bouffées par feu au sol remplacent cinq, toujours sur les 128 sources sélectionnées au maximum. La combustion reçoit plusieurs gris jusqu'au presque noir.
- Le trou central des nuages passe à 27 % du petit côté de l'écran, avec raccord jusqu'à 35 %. L'opacité devient exactement nulle à partir de 65° d'élévation, sans écriture de profondeur pendant les fondus. Quatre lobes disponibles permettent des assemblages de deux à quatre masses avec contours variés ; leur peinture est cuite une fois dans une carte partagée. Les attributs statiques et instanciés restent entrelacés.
- Les six espèces animales reçoivent trois cartes de pelage partagées, avec coordonnées métriques préparées avant animation. Les fragments gardent des échelles uniformes, une grosse masse et zéro, un ou deux satellites ; les enveloppes projetées servent à éviter les interpénétrations. Le maximum est de 68 triangles, mais un lot satellite peut ajouter un draw par chunk occupé. Leur texture reprend le dessin pastel antérieur avec contraste cuit renforcé, sans les nouvelles veines ramifiées.
- Champs, réserves et aire de survol d'éolienne emploient un voile discret à 0,055. Les contours de zones sont retirés, y compris à la sélection ; les coins des autres objets restent inchangés. La phase de chute de pluie passe à `tick × 1,15`, soit +15 %, avec bouclage conservé à 192 ; neige et direction de pluie restent inchangées.

Les textures restent dans les matériaux résidents et ne sont pas prélevées quand leur option est désactivée. Les peintures sont précalculées, pas superposées dans des draws de peinture séparés. Davantage de fumée, de données de forme et de prélèvements pour les nuages ont néanmoins un coût ; aucune mesure de ce lot ni garantie de coût nul n'est annoncée.

À la reprise des chantiers, les oracles concernés ont été actualisés en conservant leurs invariants. Les **39 contrôles ciblés et trois parcours Chromium natifs** passent sur les retouches committées `4a7beac`. La [preuve de consolidation du 3 octobre](../history/validation-visual-followup-20261003.md) décrit leur portée ; elle n'étend pas les anciennes mesures CPU/GPU à ces retouches.

## Livraison historique V185

V185 corrige sept éléments de présentation : animaux couchés, flammes, fumée, nuages, fragments de pierre, pluie et bruissement du feuillage. Le schéma reste **173**, sans migration, nouvelle mécanique ni modification des règles de météo, de feu ou de vie animale. La [recherche technique](../research/visual-audio-web-v185.md) distingue les garanties des API et les choix artistiques locaux ; les résultats d’exécution appartiennent à la [validation courante](validation.md).

Ce contrat actualise les points concernés des [surfaces animales V136](animal-surface-v136.md), des [nuages V137](visual-weather-v137.md), des [précipitations V166](weather-precipitation-v166.md) et du [son V175](audio-v175.md). Les autres obligations de ces domaines et la [préparation des ombres](shadow-preparation.md) restent applicables.

## Les sept corrections

### 1. Animaux vivants couchés

Dans `WildlifeLayer`, dormir sans déplacement et être à terre encodent la posture 1. Le corps tourne d’un quart de tour autour du tronc au lieu d’écraser son axe vertical. La largeur réelle du modèle fixe son contact avec le sol ; hauteur et rayon de sélection suivent cette pose. La rotation des membres, le retournement du corps et le cap tournent également les normales ; la silhouette reste volumique dans les deux caméras.

La posture 2 conserve la silhouette historique du cadavre, y compris son aplatissement vertical et sa normale corrigée. Cette retouche ne change ni les états animaux, ni les cadavres transportés. Les six lots d’espèces et leurs attributs résidents restent les mêmes.

### 2. Flammes en papier peint

`FireLayer` remplace le cône régulier par une forme fermée en haut, à épaules irrégulières et langues de hauteurs différentes. Les indices orientent les faces vers l’extérieur et le cap vers le haut ; le matériau conserve son côté avant unique. Le pigment orange, jaune et rouge provient de deux sinus, de transitions et de mélanges dans le shader, sans texture. Le feu au sol utilise `max(0,46 ; taille × 1,25)` comme échelle visuelle, afin qu’un petit foyer conserve une silhouette visible. Sa hauteur de référence vaut 1,6.

Le même modèle sert aux feux attachés aux acteurs et suit leurs attributs de mouvement existants. Aucun éclairage, objet de scène ou ombre n’est ajouté par foyer. La taille graphique minimale n’augmente pas la taille physique du feu.

Le count des feux attachés s’arrête au dernier indice brûlant plus un, et vaut zéro si aucun acteur ne brûle. Il ne compacte ni identités ni buffers : les emplacements non brûlants situés avant le dernier feu restent cachés par le shader. Le préchauffage restaure exactement les counts après avoir temporairement garanti au moins un slot dans les deux projections ; ce slot vide garde `aFire = 0`, sans flamme fantôme. La croissance des buffers humains conserve les attributs de trajectoire partagés entre corps, feu, cargaison et sélection.

### 3. Fumée au-dessus des flammes

`fire-paper.ts` partage les proportions entre flamme et fumée au sol. Pour une hauteur de flamme `h` et une échelle visuelle `s`, l’origine vaut `max(0,45 ; 0,84h)`, la montée `max(1,12 ; 1,18h)` et la largeur `max(0,53 ; 0,62s)`. Un feu de taille 1,75 donne ainsi une flamme de référence de 3,5, une origine à 2,94 et une montée de 4,13 unités.

Les cinq bouffées par foyer et la sélection des 128 feux proches au maximum restent bornées. La sphère de sélection englobe la variation de montée jusqu’à ×1,15, la dérive au vent maximal et les coins du billboard. Le rejet par frustum conserve donc une queue de fumée visible lorsque son origine sort du cadre. La fumée des structures garde son profil distinct.

### 4. Nuages lisibles, variés et réellement percés

Les quatre lobes existants restent joints. Six hash de présentation, dérivés de la graine, de l’instance et du lobe, donnent des étirements locaux de ±15 %, ±11 % et ±14 %, et des déplacements de ±0,08, ±0,05 et ±0,08 unité. L’uniforme de graine est explicitement de type `uint` : les 32 bits restent exacts, y compris au-delà de la précision entière d’un float32. Le delta local passe par les trois colonnes de la matrice existante : il tourne et rétrécit avec le nuage, même dans les emplacements réduits à 0,001. La borne inclut toutes les variations et les vertices de lavis ; l’empreinte complète reste dans la carte au recyclage, avec un vrai frustum actif.

Le masque s’applique à chaque fragment dans le viewport. Le centre est entièrement transparent jusqu’à 18 % du petit côté de l’image ; une transition douce rejoint l’opacité extérieure à 26 %. Les unités sont les pixels physiques du viewport, ce qui conserve un cercle avec le ratio d’écran et le DPR. `alphaTest = 0,001` élimine ces fragments avant leur écriture de profondeur, malgré `depthWrite = true` ailleurs.

Le graphe d’opacité matérialise `viewportSize` par `toConst()` dans `Fn` avant de lire ses deux composantes. Cette écriture évite le swizzle uniforme imbriqué `.zw.x` / `.zw.y` qui empêchait la compilation Tint dans le navigateur matériel exercé. Le calcul du masque reste identique ; la réparation a été contrôlée dans les deux projections avec le témoin de profondeur.

L’opacité angulaire vaut 1 jusqu’à 34° d’élévation puis rejoint 0,06 à 65°, pour les deux projections. Le zoom orthographique ajoute sa disparition entre 2,5 et 4,5. La météo agit sur la couverture et le pigment ; la nuit colore les lobes sans leur ajouter une baisse d’opacité générale. Le nombre de slots, les bandes d’altitude et la dérive de V137 restent conservés.

### 5. Fragments de pierre moins uniformes

`chunk-presentation.ts` varie les proportions, hauteurs, rotations et assemblages des deux masses d’un fragment. Le bruit dépend de la position et du type parmi granite, calcaire, marbre, grès, ardoise et fragment historique ; il ne consomme aucun PRNG de simulation. Les deux masses restent jointes et au-dessus du sol. Ces variations sont écrites dans les matrices lors de l’adoption du tas, avec les primitives, matériaux, normales et ombres de `BoxMesh` existants.

### 6. Pluie alignée sur sa trajectoire

L’axe de la trace est `normalize(-0,13 ventX ; 1 ; -0,13 ventZ)`, exactement parallèle à la dérive du centre pour un vent fixé. Le billboard adapte sa largeur à la caméra sans orienter la trace vers son axe vertical. Les vitesses de chute restent discrètes : 0,875, 1, 1,125 et 1,25 ; la phase de pluie avance désormais d’une unité par tick confirmé au lieu de 0,75. Le bouclage de phase à 192 reste continu dans le volume de hauteur 24.

Ce changement accélère la pluie visible et conserve pluie/neige dans un seul lot. Il ne modifie ni précipitation simulée, ni extinction, ni neige au sol. Le masque des toits et les éclaboussures restent absents.

### 7. Bruissement selon le feuillage voisin

`FoliageAmbience.adopt` recense les ressources **à chaque snapshot lorsque le son est activé**. Son coupé, l’adoption ne fait pas ce recensement. À la réactivation, `setSoundEnabled(true)` recense le snapshot courant avant de reconstruire les sources : le champ retrouve immédiatement l’état courant, y compris en pause, sans attendre un autre snapshot. Arbres feuillus : poids `croissance²` ; buissons à baies : `0,15 × croissance²` ; saguaro et plantes sans feuilles : poids nul. Une grille de pas 8 reçoit chaque poids dans quatre cellules par dépôt bilinéaire. Ce champ approximatif ne constitue pas une limite de distance exacte autour de chaque tronc.

Une requête au point d’écoute parcourt au plus 8 × 8 cellules, avec un rayon de pondération de 28 autour des points de grille. Le gain de canopée vaut `1 − exp(-canopée / 24)`. Il multiplie le vent borné par `vent / 2` et l’atténuation de hauteur de caméra existante, dont le plancher est 0,15. L’oreille de la caméra, notamment en perspective basse, fixe ce point ; le centre d’orbite ne le remplace pas.

Une seule boucle `weather.wind` existante reçoit ce gain. Elle partage le plafond de quatre sources continues avec pluie, machines et feux ; aucun son par arbre ni nouvel asset audio n’est créé. Les changements de gain utilisent le lissage Web Audio existant. Les sources sont reconstruites au snapshot ou après un mouvement significatif de l’oreille, pas par balayage des ressources à chaque image.

## Invariants et coûts

Le rendu et le son lisent le `World` sans le modifier. Horloges graphiques, phases et pauses suivent la présentation confirmée ; aucun tirage ou historique de simulation n’est ajouté. Les poses, identités et attributs restent résidents. `geometry.instanceCount` garde son rôle pour les lots personnalisés ; le nuage utilise le compte natif de son `InstancedMesh`. Textures désactivées : aucun prélèvement de pigment, y compris pour les nouvelles flammes.

| Domaine | Coût concret et borne |
| --- | --- |
| Flamme | 49 vertices et **84 triangles par instance**, contre 10 triangles pour le cône précédent. Un draw au sol ; lots attachés existants limités au dernier indice brûlant plus un, ou zéro en l’absence de feu. Les trous non brûlants du préfixe restent soumis puis cachés par le shader. Le pigment ajoute du calcul shader. |
| Nuages | 64 slots sur 250², 8 sur 32² ; 295 triangles par slot, géométrie inchangée. Le pivot de lobe ajoute 14 160 octets statiques. |
| Matrices des nuages | Trois attributs interleaved aliasent le tableau CPU existant ; un **miroir GPU de 4 KiB** s’ajoute, sans copie CPU. Sa version change seulement lors d’une réécriture des poses, avec celle des matrices ; orbitage ou pause seuls ne salissent pas ce miroir. |
| Shader des nuages | Six hash par vertex, transformation du delta et masque radial par fragment. Pas de second draw ni de texture ; cela ne rend pas leur coût GPU nul. |
| Fumée et pluie | Capacités et nombres de primitives conservés ; profils, bornes et orientation shader changent. À pleine intensité sur 250², la précipitation garde 12 813 quads, soit 25 626 triangles. |
| Fragments | Deux primitives par fragment, sans nouveau graphe ni upload de variation par image. |
| Feuillage sonore | Parcours de toutes les ressources et remise à zéro de la grille par snapshot son actif, et une fois à sa réactivation ; aucun recensement des snapshots son coupé. `plantGrowth` vérifie aussi le toit par recherche binaire pour chaque plante pondérée : O(R + P log(1 + H) + G), avec R ressources, P plantes pondérées, H cases de toit et G cellules de grille. Sur 250² : 33 × 33 floats, **4 356 octets CPU** ; requête locale bornée, une boucle existante. |

## Contrôles et limites de preuve

Les contrôles ciblés portent sur volume et sol des animaux couchés, stabilité des attributs et normales, formes et profils feu/fumée, orientation extérieure des deux bandes basses de flamme et du cap, assemblage des fragments, axe et bouclage de pluie, canopée locale et conservation de la sauvegarde. Le contrôle des budgets de feu attaché vérifie extinction/réactivation, restauration des counts de préchauffage, espèces séparées et croissance des buffers humains, avec indices et attributs partagés conservés. L’oracle nuage reconstruit indépendamment les hash GPU et les vertices déformés pour les graines exercées, dont `0x12345679` et `0xffffffff`, puis applique les vraies matrices ; il inclut recyclage, lavis, carte rectangulaire et taille minimale.

Le parcours graphique doit établir un draw effectif et des pixels modifiés hors du masque. Une fixture préparée qui force un nuage au centre est distincte du placement naturel : comparer nuage caché, masque actif et contrôle sans masque prouve que le centre aurait été couvert. Un témoin dessiné après le nuage, placé derrière et soumis au test de profondeur, vérifie aussi que le trou n’occulte pas les objets ultérieurs. `visible = true`, un trou déjà vide ou une erreur de compilation ne suffisent pas.

Le recensement audio se mesure séparément avec `scripts/foliage-audio-bench-v185.ts`. `scripts/visual-performance-v185.mjs` compare les modules de rendu dans une scène fixe par passages successifs A/B/B/A ; cette baseline garde le `main` et le son courants, donc elle ne mesure pas tout V185. Sources servies gelées, CPU adoption, CPU image, RAF et GPU restent des preuves séparées. Aucun coût GPU nul, cadence garantie ou gain général n’est déduit des budgets, d’un backend logiciel ou de la seule inspection du code. Une preuve PCM ne vaut pas une écoute humaine.
