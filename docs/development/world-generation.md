# Génération des cartes — sites et profils tempérés

**Calibration relue le 20 septembre :** la [comparaison Core 1.6.4871](../research/map-calibration-reference.md) confirme 250², mais identifie les écarts de contexte de site, eau, sols, maturité sauvage et budget de minerais. Les règles ci-dessous décrivent le générateur livré, pas une génération Core déjà équivalente. Les anciennes cartes restent conservées.

Contrat V83, 20 septembre 2026. Le nouveau départ Atterrissage forcé utilise `generateSiteWorld` dans `src/sim/site-generation.ts`. Le point d'entrée applicatif `createScenarioWorld` dans `new-game.ts` sépare le paysage du scénario, du point d'arrivée et des possessions. `createWorld` et `generateWorld` conservent les profils historiques ; charger une colonie ne passe jamais par ces générateurs.

**V87 validée** relie les nouveaux départs naturels au [climat annuel du site](site-climate.md), à la [météo et au vent](wind-heater.md), à la vie végétale et aux [incendies](fires.md). Ces états se superposent au paysage existant : ils ne régénèrent ni terrain, ni minerai, ni dotation. Les anciennes colonies les adoptent explicitement, sans rejouer une histoire climatique. La [campagne V87](../history/validation-environment-v87.md) reste distincte des mesures de génération ci-dessous.

## Site local V83

Le site porte sa révision 1, le biome local `temperate-forest`, le relief choisi, l'absence de rivière et deux ou trois pierres distinctes parmi les cinq existantes. Le menu propose **Plat, Petites collines, Grandes collines** ; le profil proposé Petites collines est un choix de Lisière, pas le résultat du bouton de site aléatoire de Core. La graine reste une graine locale. Ce contrat ne génère pas un globe, ses coordonnées ou ses factions. Le climat V87 possède sa provenance séparée : profil tempéré observé de 16,2 °C et 900 mm, à 22,21° N et 18,23° O, fixé pour ce périmètre et documenté avec ses incertitudes. Il ne transforme pas le choix local en sélection mondiale ni en site moyen de RimWorld.

Les passes sont indépendantes du PRNG de simulation :

1. **Champs de terrain.** Un bruit de gradient sur le plan horizontal, des octaves, rotations et déformations produisent un champ d'élévation ; un second champ indépendant produit la fertilité. Les directions unitaires sont calculées par Lisière, sans copier la table du jeu original. La fréquence d'élévation est tirée entre 0,015 et 0,0225, avec trois octaves ; la fertilité utilise 0,021 et six octaves. Les champs ne sont pas sauvegardés. Leur algorithme et leur distribution restent une adaptation, sans garantie d'identité par graine avec Core.
2. **Relief et sols distincts.** Le relief multiplie le même champ par 0,8 / 0,9 / 1. Au-dessus de 0,7 apparaît un massif minable ; entre 0,61 et 0,7 demeure un sol de pierre praticable. Entre 0,55 et 0,61 apparaît du gravier. Le sol restant est ordinaire, ou riche si la fertilité du champ atteint 0,87. Aucun plafond de 22 % ni retrait de petits massifs ne s'applique. Les seuils proviennent de Core 1.6.4871 ; les mares, boues, eaux peu profondes, toits rocheux et grottes ne sont pas générés.
3. **Géologie et filons.** Les territoires de pierre utilisent la liste persistée du site. Le budget commun de filons vaut 4 / 8 / 11 demandes par 10 000 cellules selon le relief, soit 25 / 50 / 69 sur 250² après le calcul arrondi de référence. Chaque occasion tire parmi les sept minerais Core avec leurs poids : acier et machines 1 chacun, argent 0,10, or 0,07, uranium 0,12, plasteel 0,05, jade 0,065. Les cinq minerais absents consomment leur occasion sans être remplacés par de l'acier. Un centre doit être dans la roche naturelle, peut être enfoui et respecte cinq cellules d'espacement. Le filon compact peut déborder sur un ancien sol libre, comme le validateur périphérique de référence. Les frontières ou le manque de centres admissibles peuvent limiter le résultat ; aucun minerai ni accès n'est garanti. L'ordre fini de candidats, la forme des amas et l'interdiction d'écraser un filon précédent sont des adaptations explicites.
4. **Fragments physiques.** Les groupes sont des parcours locaux sur terrain admissible sous le seuil 0,55. Une probabilité de départ 0,006, modulée par un bruit, ne constitue pas une densité finale de fragments. Chaque groupe choisit une pierre du site et place des piles `*-chunk` d'une unité ; occupation, identités et règles existantes de transport/taille de pierre s'appliquent. Les anciennes ressources décoratives `rock` ne sont pas utilisées. Les gravats/salissures associés Core restent absents.
5. **Végétation partielle.** Sur terrain fertile, la population totale souhaitée `min(1, 0,65 × fertilité²)` est projetée sur les seuls arbres génériques et buissons de baies disponibles : poids respectifs 1 / 10,2 et 0,05 / 10,2. Un champ continu module les clairières ; il ne reproduit pas la saturation régionale ni la succession végétale de Core. Aucun poids absent ne devient arbre ou baie. La croissance initiale des baies vaut `min(1, U(0,15 ; 1,5))`, datée au tick zéro. Les arbres restent la ressource générique de 7–13 bois sans croissance biologique ; les essences fonctionnelles et les plantes basses ne sont pas livrées par cette passe.

Les nouvelles tuiles `rich-soil` et `gravel` ont des fertilités de 1,4 et 0,7 ; `grass` représente le sol ordinaire fertile 1. L'ancien `soil` reste à 0,7 pour conserver les cartes existantes. Semis, croissance, inspection et persistance partagent ces règles ; les couleurs ne remplacent pas les propriétés du terrain. La séparation massif/sol pierreux permet l'excavation sans inventer du terrain fertile.

Le point d'arrivée est choisi après le paysage. Ni les ressources ni les fragments ne sont supprimés pour faire de la place aux personnes ou à la dotation. Une impossibilité de placement échoue avant publication du monde. La migration V82 valide d'abord la sauvegarde historique puis conserve ses tuiles, piles, ressources et provenance ; elle ne lui attribue pas de site rétroactif.

Le banc `scripts/site-generation-bench.ts` prévoit trente graines × trois reliefs sur 250², avec temps de génération, surfaces par terrain, minerais exposés/cachés, fragments voisins et maturités. Les champs sont temporaires, les lots graphiques restent résidents ; les mesures de simulation/worker/rendu et le pilote de colonie sont des validations distinctes. Les tests regroupés de `tests/site-generation.test.ts` couvrent reproductibilité, différences de relief, budget partagé, minerais absents/enfouis, débordement périphérique et occupation physique. Le relevé initial à quinze cartes a révélé une variance de gradients incorrecte ; il ne certifie pas le générateur corrigé. Les preuves finales sont centralisées dans [validation](validation.md).

## Contrat commun et sauvegarde

Les dimensions autorisées sont des entiers de 8 à **250 cellules par axe**, centralisées dans `src/sim/map-config.ts`. Le défaut jouable reste **250×250** ; les petites cartes sont des essais, et chaque scénario impose sa propre borne minimale. Agrandir la carte ajoute des cellules sans changer l'échelle des personnages, les empreintes ou la résolution du mouvement. Le culling graphique ne suspend pas la simulation hors écran.

Même graine normalisée en entier non signé 32 bits, mêmes dimensions et même profil/version donnent les mêmes terrains, ressources et identifiants. Les profils historiques utilisent un hash spatial entier `Math.imul`, une interpolation cubique et trois longueurs d'onde pour leurs canaux de relief, humidité, végétation, rivière et ressources ; le site V83 emploie les passes de gradient détaillées plus haut. Échantillonner un canal ne décale pas le PRNG de travail. Aucun `Math.random`, temps réel ou rendu ne participe à la génération.

Les champs temporaires disparaissent après la création. Les tuiles, plantes et objets réellement sauvegardés font autorité : **charger une partie ne régénère jamais son paysage ni sa dotation**. La migration V79→V80 ne choisit aucun scénario rétroactivement. Le scénario des nouvelles parties porte une révision explicite ; ce n'est pas une invitation à reconstruire ses données au chargement. Une graine seule ne constitue pas un format d'archive interversions.

Le corpus chapitre 6 et 7, SYS/TEST-016 à 018, oriente la séparation entre contexte, étapes et contrôles de topologie. Les algorithmes internes restent propres à Lisière. SYS/TEST-019 (grottes et assemblages) demeure différé. Voir [adoption du corpus](../research/reference-adoption.md) et [recherche du départ](../research/scenario-start-reference.md).

## Étapes des profils historiques V80–V82

1. **Rivière.** Un chenal relie deux bords opposés. Le raster remplit aussi les cellules entre centres successifs pour conserver la continuité cardinale. Largeur jusqu'à cinq cellules, avec parfois une cellule de raccord supplémentaire ; les petites cartes ont un chenal plus étroit. Son emplacement dépend du profil.
2. **Relief et sols.** Des champs corrélés placent les massifs, prairies et terres nues. Les voisins directs de la rivière deviennent terreux. La roche infranchissable est plafonnée à 22 % dans ce preset de vallée ; les amas isolés de moins de quatre cellules deviennent du sol. Ce sont des choix de calibration du preset, pas des constantes de RimWorld.
3. **Géologie et minerais.** Deux ou trois des cinq roches Core identifient les massifs et pierres décoratives. Des flux indépendants placent ensuite l'[acier](steel.md) et les [machines compactées](components.md) dans la roche, sans utiliser le PRNG de travail. Les petites cartes peuvent manquer de massifs suffisants ; aucun gisement n'est inventé pour garantir une recette.
4. **Végétation et pierres.** Un tirage spatial choisit au plus une ressource par cellule franchissable. Les arbres suivent un champ de densité, moins favorable sur terre nue ; les baies favorisent les boisements ouverts. Les pierres décoratives se concentrent au pied des massifs. Les quantités de bois/pierre restent de 7 à 13, et un buisson a un potentiel de dix baies à pleine maturité.

Le bruit de valeurs et les champs séparés suivent des principes généraux présentés par [Red Blob Games](https://www.redblobgames.com/maps/terrain-from-noise/), sans reproduire son code ni le générateur de RimWorld. La rivière reste un chenal de bruit, sans bassin versant ou érosion simulée.

## Profil naturel `temperate-survivors-v1`

Ce profil produit **uniquement le paysage** : aucune personne, aucun objet de départ, aucune ressource de tutoriel n'est injecté dans le générateur. Le scénario Survivants sélectionne ensuite un site dans la plus grande composante réellement franchissable et place personnes et dotation dans ses cellules libres. Il ne déplace, ne coupe et ne remplace aucune ressource pour y parvenir.

- Aucun carré central forcé en herbe, affaissement de relief autour du camp ou col ouvert artificiellement. La rivière peut traverser la région centrale ; c'est le point d'arrivée qui s'adapte au terrain. Les deux rives ne sont pas reliées implicitement.
- La répartition des arbres/arbustes est calibrée dans `generation-profile.ts`. La densité végétale Core de 0,65 décrit une population de plantes comprenant herbes et arbustes ; ce n'est pas une probabilité de 65 % d'arbres. Nous ne revendiquons aucune équivalence numérique de densité tant que le catalogue végétal et ses poids manquent.
- Les baies commencent avec une croissance déterministe distribuée entre 0,15 et 1, ancrée au tick de génération. Une partie seulement est récoltable ; le rendement réel dépend de la croissance via les règles communes. Aucun buisson mûr n'est garanti à proximité du camp. Une future factory changeant l'heure initiale devra réancrer les dates de croissance si cette heure doit représenter le même état végétal initial.
- `enableWildlife(world, count, 'natural')` utilise un décalage déterministe dans les habitats disponibles et écarte les cellules occupées par personnes, piles au sol et meubles emballés. Il préfère au moins six cellules entre placements, avec repli sur toute case admissible si l'habitat est trop restreint. Le premier lièvre n'est plus placé près d'un buisson central garanti. Une population demandée est un maximum : l'absence d'habitat ne crée ni animal superposé ni nourriture.
- La factory demande le budget courant de 3 à 12 lièvres selon la surface. Cette espèce disponible et ce plafond ne représentent pas le poids écologique total d'une forêt tempérée Core. Des animaux peuvent se trouver sur l'autre rive, sans accès direct au camp. Ni leur mouvement ni leur comportement ne sont modifiés par cette distribution initiale.

La recherche, la dotation et les écarts au scénario Crashlanded sont décrits à leur emplacement canonique dans [la recherche du départ](../research/scenario-start-reference.md). Le profil n'impose pas de minerai, baies ou animaux à portée locale pour satisfaire des tests.

## Profil historique sans option

`generateWorld(seed, width, height)` conserve exactement le paysage et le camp antérieurs à V80, hors numéro de schéma. Il garde :

- la clairière centrale carrée 7×7, la vallée de relief abaissé et la rivière sur un côté de celle-ci ;
- l'ouverture d'un col si la roche isole le camp des principales terres de sa rive, sans traverser l'eau ;
- les deux arbres de tutoriel de douze bois et le buisson mûr aux trois positions fixes ; tous les buissons initialement mûrs ;
- les trois colons centraux, 12 bois, 18 repas de survie, 30 médicaments, un revolver, trois chemises et un gilet au sol ;
- l'ancien placement de faune quand `enableWildlife` est appelé sans distribution, y compris son premier habitat proche du centre.

Ce profil reste utile pour le laboratoire et les fixtures historiques. Ses garanties ne décrivent plus le départ Survivants. Les sauvegardes existantes n'ont pas besoin de ce générateur pour être reprises.

## Mesures et validation V80

[Audit comparatif versionné](../../artifacts/scenario-generation-v80.json), graines 42, 93, 2048, 81733 et 0 sur 250². Génération naturelle et factory Survivants validées et reproduites intégralement. Les sorties historiques `generateWorld` puis `enableWildlife` sont comparées par SHA-256 à l'état V79, schéma neutralisé : **cinq sur cinq identiques pour chacune des deux étapes**.

| Mesure sur les cinq graines | Camp historique | Profil naturel |
|---|---:|---:|
| Arbres | 7 083–8 197 | 2 249–2 652 |
| Buissons de baies | 3 158–3 366, tous mûrs | 193–216, dont 76–88 récoltables |
| Arbres par 100 cellules franchissables | 13,95–16,29 | 4,55–5,26 |
| Arbres avec un voisin à distance ≤√2 | 72,5–78,5 % | 34,4–40,4 % |

Ce dernier indicateur renseigne le chevauchement potentiel des couronnes, **pas les FPS ni la couverture de l'écran**. Dans le nouveau profil, la composante du départ représente environ 51–53 % des terres, notamment à cause de la rivière. Le rayon 20 autour du point d'arrivée offre 10–65 arbres sur ces exemples, mais peut ne contenir aucune baie récoltable. La dotation doit assurer la transition vers une production active ; ces mesures ne prouvent pas une difficulté équivalente au jeu de référence.

La génération seule a pris 27–45 ms et la factory complète 39–70 ms sur ce relevé unique ordonné (Ryzen 5 3600, Node 24.11.1, Windows). La factory inclut une nouvelle génération ; son temps ne s'additionne pas au premier. Un pilote de colonie indépendant était actif lors du dernier relevé court : ces durées sont diagnostiques, sans isolation de performance. Cinq échantillons ne justifient pas des percentiles robustes ; ils ne mesurent ni la simulation prolongée ni le rendu GPU.

`tests/generation-profile.test.ts` regroupe trois scénarios : paysages naturels reproductibles sur cinq graines avec contrats de rivière/roche/sol et maturité ; faune empêchée par personnes, piles, paquets et murs avec habitat saturé et reprise exacte ; dispersion reproductible et rejet des options invalides sans mutation. Les tests existants de génération couvrent le profil historique. Les tests de scénario vérifient séparément dotation, sélection de site et persistance. Toute régression conserve graine, dimensions, profil, cellule concernée et invariant violé.

## Limites maintenues

Le relief ne crée aucune altitude navigable, pente physique, étage ou coût d'ascension. Les champs guident le placement initial sans simulation d'eau. Les deux nouveaux sols V83 ne constituent pas une diversité complète de terrains ni une hydrologie régionale. Les arbres partagent encore une seule ressource de gameplay et n'ont pas de croissance biologique ; l'herbe de terrain n'est pas un pâturage fonctionnel. Les baies et le lièvre ne constituent pas des catalogues de biome complets.

Les profils historiques imposent leur rivière ; le site V83 n'en génère aucune. Sélection mondiale de site, autres biomes, diversité des climats régionaux, gués, ponts, grottes, ruines, autres minerais et faune diversifiée restent absents. Le cycle annuel et les huit météos de surface V87 du profil adopté ne constituent ni une hydrologie ni une simulation d'épaisseur de neige. Le plafonnement de roche reste une particularité historique ; la végétation et le budget de lièvres demeurent partiels. La sélection d'une grande composante n'assure ni l'accès à toute la carte ni un camp parfaitement plat et dégagé.

La génération s'exécute une fois dans le worker. Ses champs/parcours ont une mémoire proportionnelle à la surface ; le plafond rocheux et la sélection du site peuvent ajouter des tris. Aucun travail de génération par frame ni bénéfice GPU n'est revendiqué. La mesure de rendu et les parcours de survie sont des preuves distinctes.

## Preuves historiques

Les grandes familles de `tests/world-generation.test.ts` conservent la normalisation des graines, les rectangles extrêmes, la topologie et les débuts de camp historiques. L'exploration V1 portait sur 480 paysages de 8² à 128² ; elle avait motivé la réparation du col du profil historique. La preuve V2 du 13 septembre (14/14 scénarios, 19,14 s) et [la comparaison CPU d'extension de carte](../history/map-scale-v2.md#mesure-du-noyau-cpu) restent historiques : elles ne certifient pas le nouveau profil naturel. Les preuves courantes sont référencées dans [validation](validation.md).
