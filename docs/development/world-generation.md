# Génération des cartes — profils tempérés

**Calibration relue le 20 septembre :** la [comparaison Core 1.6.4871](../research/map-calibration-reference.md) confirme 250², mais identifie les écarts de contexte de site, eau, sols, maturité sauvage et budget de minerais. Les règles ci-dessous décrivent le générateur livré, pas une génération Core déjà équivalente. Les anciennes cartes restent conservées.

Contrat courant V80, relu le 20 septembre 2026. Le paysage est généré dans `src/sim/generation.ts`. Le point d'entrée de l'application est désormais `createScenarioWorld` dans `new-game.ts` : il sépare le paysage du choix de scénario, du site d'arrivée et des possessions. `createWorld` et `generateWorld` sans profil conservent le camp historique pour les anciennes fixtures et le scénario de laboratoire.

## Contrat commun et sauvegarde

Les dimensions autorisées sont des entiers de 8 à **250 cellules par axe**, centralisées dans `src/sim/map-config.ts`. Le défaut jouable reste **250×250** ; les petites cartes sont des essais, et chaque scénario impose sa propre borne minimale. Agrandir la carte ajoute des cellules sans changer l'échelle des personnages, les empreintes ou la résolution du mouvement. Le culling graphique ne suspend pas la simulation hors écran.

Même graine normalisée en entier non signé 32 bits, mêmes dimensions et même profil/version donnent les mêmes terrains, ressources et identifiants. Un hash spatial entier `Math.imul`, une interpolation cubique et trois longueurs d'onde produisent des canaux distincts de relief, humidité, densité végétale, rivière et ressources. Échantillonner un canal ne décale pas le PRNG de travail. Aucun `Math.random`, temps réel ou rendu ne participe à la génération.

Les champs temporaires disparaissent après la création. Les tuiles, plantes et objets réellement sauvegardés font autorité : **charger une partie ne régénère jamais son paysage ni sa dotation**. La migration V79→V80 ne choisit aucun scénario rétroactivement. Le scénario des nouvelles parties porte une révision explicite ; ce n'est pas une invitation à reconstruire ses données au chargement. Une graine seule ne constitue pas un format d'archive interversions.

Le corpus chapitre 6 et 7, SYS/TEST-016 à 018, oriente la séparation entre contexte, étapes et contrôles de topologie. Les algorithmes internes restent propres à Lisière. SYS/TEST-019 (grottes et assemblages) demeure différé. Voir [adoption du corpus](../research/reference-adoption.md) et [recherche du départ](../research/scenario-start-reference.md).

## Étapes communes du paysage

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

Le relief ne crée aucune altitude navigable, pente physique, étage ou coût d'ascension. L'humidité guide le placement initial, sans simulation d'eau. Fertilité de prairie 1 et de terre 0,7 : ni diversité complète de sols ni hydrologie régionale. Les arbres partagent encore une seule ressource de gameplay et n'ont pas de croissance biologique ; l'herbe de terrain n'est pas un pâturage fonctionnel. Les baies et le lièvre ne constituent pas des catalogues de biome complets.

Le profil impose encore une rivière par carte. Sélection mondiale de site, autres biomes, saisons régionales, gués, ponts, grottes, ruines, autres minerais et faune diversifiée restent absents. Le plafonnement de roche, la distribution végétale et le budget de lièvres sont provisoires et doivent être réévalués avec les futures espèces et les parcours joués. La sélection d'une grande composante n'assure ni l'accès à toute la carte ni un camp parfaitement plat et dégagé.

La génération s'exécute une fois dans le worker. Ses champs/parcours ont une mémoire proportionnelle à la surface ; le plafond rocheux et la sélection du site peuvent ajouter des tris. Aucun travail de génération par frame ni bénéfice GPU n'est revendiqué. La mesure de rendu et les parcours de survie sont des preuves distinctes.

## Preuves historiques

Les grandes familles de `tests/world-generation.test.ts` conservent la normalisation des graines, les rectangles extrêmes, la topologie et les débuts de camp historiques. L'exploration V1 portait sur 480 paysages de 8² à 128² ; elle avait motivé la réparation du col du profil historique. La preuve V2 du 13 septembre (14/14 scénarios, 19,14 s) et [la comparaison CPU d'extension de carte](../history/map-scale-v2.md#mesure-du-noyau-cpu) restent historiques : elles ne certifient pas le nouveau profil naturel. Les preuves courantes sont référencées dans [validation](validation.md).
