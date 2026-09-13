# Génération des cartes — vallée tempérée

État livré le 13 septembre 2026. `src/sim/generation.ts` construit le monde initial ; `createWorld` reste le point d'entrée public. Cette version remplace le tirage indépendant de terrain par cellule, qui produisait des trous d'eau et des obstacles dispersés sans organisation spatiale.

## Contrat et sauvegarde

Les dimensions restent des entiers de 8 à 128 cellules par axe. Les cartes 32², 64² et 128² sont les tailles de jeu explorées ; les petites cartes et les rectangles extrêmes servent aussi de fixtures de simulation. Les coordonnées sont toujours des cellules x/z entières. Agrandir la carte ajoute des cellules ; cela ne change ni l'empreinte d'un personnage, ni la résolution du mouvement.

Même graine normalisée en entier non signé 32 bits, mêmes dimensions et même version de générateur donnent exactement les mêmes terrains, ressources, identifiants et colons. Le bruit repose sur un hash spatial entier avec `Math.imul`, puis une interpolation cubique de valeurs et trois longueurs d'onde. Les canaux relief, humidité, densité végétale, rivière et ressources sont distincts. Ajouter un échantillon dans un canal ne décale pas une séquence globale de tirages. Aucun `Math.random`, temps réel ou API de rendu n'intervient.

Les champs temporaires de génération disparaissent après la création. **Le schéma courant est 2** depuis la tranche matérielle ; la [migration V1](material-logistics.md) conserve tuiles et ressources sans régénération. Une ancienne sauvegarde garde donc son paysage. Créer une nouvelle carte avec une graine utilisée par l'ancien générateur donne en revanche un paysage différent ; la graine seule n'est pas un format d'archivage ou de replay interversions. L'état `rng` non nul reste sauvegardé pour la continuation et les futurs événements, mais cette génération spatiale ne le consomme plus.

## Construction du paysage

1. **Rivière.** Une courbe de bruit choisit orientation, rive et méandres. Le chenal rejoint deux bords opposés. Le raster remplit aussi les cellules entre deux centres successifs : une jonction diagonale ne suffit pas à établir une rivière continue dans une grille à quatre voisins. La largeur varie avec l'espace disponible, jusqu'à cinq cellules, avec éventuellement une cellule supplémentaire au raccord d'un virage. Les petites fixtures utilisent un chenal d'une cellule en périphérie. La rivière ne coupe jamais la clairière de départ.
2. **Relief et sol.** Des champs à plusieurs échelles donnent les tendances de relief, d'humidité et de végétation. Le relief produit des massifs ; l'humidité distingue terre nue et prairie. Les voisins directs du chenal deviennent des rives terreuses. Un affaissement local autour du camp fait une vallée ouverte. Les cellules de la clairière centrale restent de l'herbe.
3. **Massifs et accessibilité.** Dans ce preset de vallée, la roche infranchissable occupe au plus 22 % de la carte. Quand une graine relève trop le champ entier, seules les parties les plus élevées restent rocheuses. Les amas de moins de quatre cellules redeviennent du sol. Si des massifs isolent le camp de la principale zone de terres basses de sa propre rive, un parcours à coûts entiers ouvre un col en retirant le moins de cellules rocheuses possible ; ses bords sont élargis pour éviter une fente illisible d'une seule cellule. Cette réparation ne touche jamais l'eau. Elle ne relie pas les deux rives et ne rend pas chaque poche de terrain accessible.
4. **Ressources.** Les arbres suivent un champ de densité continu et sont moins fréquents sur terre nue. Les baies privilégient les boisements ouverts ; les pierres décoratives se concentrent surtout au pied des massifs. Un tirage spatial place chaque ressource admissible, sans superposition et uniquement sur terrain franchissable. Les quantités usuelles restent de 7 à 13 ; les cibles du tutoriel conservent leurs quantités fixes.
5. **Départ.** Trois colons apparaissent au centre, avec 12 bois et 18 nourritures en piles au sol près du camp, sans réserve prédéfinie. La clairière comprend les offsets ±3 sur chaque axe. Les deux arbres fixes restent en `(cx−2, cz−2)` et `(cx−3, cz+2)`, le buisson de baies en `(cx+2, cz−2)`. Ils ont une cellule de travail adjacente accessible. Ces garanties rendent les premières constructions possibles ; aucun travail n'est lancé automatiquement.

Le mélange d'échelles et les champs environnementaux séparés suivent des principes exposés par l'auteur de [Making maps with noise functions](https://www.redblobgames.com/maps/terrain-from-noise/). L'implémentation ci-dessus est propre à Lisière : elle utilise du bruit de valeurs, pas une reproduction de son code ou du générateur de RimWorld. Une approche de drainage explicite, telle que celle présentée dans [Mapgen2](https://www.redblobgames.com/maps/mapgen2/), constitue une référence pour une future hydrologie plus riche.

## Limites explicites

Le relief actuel choisit les obstacles et leur présentation. Il ne crée aucune altitude navigable, pente physique, étage, chute ou coût d'ascension. L'humidité est un paramètre de placement initial : ce n'est pas encore une simulation d'eau, de fertilité ou de croissance. Les rivières ont une continuité topologique garantie, mais ne sont pas issues d'un bassin versant, d'un calcul d'érosion ou d'une simulation hydraulique.

Ce premier preset couvre une vallée tempérée. Biomes, saisons, climat régional, réseau de drainage, gués, ponts, grottes, minerais exploitables, ruines et sélection du site sur une carte mondiale ne sont pas livrés. La clairière carrée et les cibles fixes sont des aides de prototype. Les remplacer par une sélection de site naturelle demandera de conserver un contrat de démarrage testable.

La génération est exécutée une fois dans le worker, avant la simulation. Son coût est principalement linéaire avec le nombre de cellules ; le plafonnement des massifs ajoute éventuellement un tri de candidats. Les champs et parcours utilisent une mémoire proportionnelle à la carte. Il n'y a aucun recalcul par frame. Aucun gain GPU n'est revendiqué pour cette phase : le changement actuel vise la cohérence et les garanties de jeu, pas une accélération mesurée. Une génération par chunks, un monde continu ou une très grande carte exigeront d'autres mesures et un contrat aux frontières des chunks.

## Validation et diagnostics

`tests/world-generation.test.ts` contient trois familles profondes :

- Reproduction intégrale par graine, normalisation 32 bits, rejet des dimensions invalides, fixtures rectangulaires jusqu'à 8×128/128×8 et sauvegarde de terrains modifiés sans régénération.
- Trente-six paysages sur 32²/64²/128² : rivière unique connectée entre bords opposés, taille minimale des massifs, limite de surface rocheuse, accès à la clairière et aux ressources de tutoriel, surface accessible significative, cohérence des taches comparée à un tirage indépendant avec les mêmes proportions, relations agrégées entre végétation/sol et pierres/massifs. Les seuils statistiques ne décrivent pas une obligation de ressemblance pour chaque graine.
- Neuf débuts de partie sur 8²/24²/64², avec collecte des trois ressources de tutoriel, construction d'un mur et d'un lit, conservation des stocks attendus, sauvegarde après 17 ticks puis égalité de continuation à 500 ticks.

Le développement a également exploré 480 paysages : 80 graines pour chacune des tailles 8², 16², 24², 32², 64² et 128². Ce balayage a révélé un départ enfermé dans une petite poche de terrain ; la réparation de col et le plafonnement du relief répondent à ce risque. C'est un contrôle exploratoire de distribution et d'accessibilité, pas une mesure de performance ni une preuve pour toutes les graines.

Vérification de cette livraison : `npm run test -- --run tests/world-generation.test.ts tests/simulation.test.ts` — 11 scénarios réussis, dont les 8 scénarios de simulation préexistants et leur soak de 60 000 ticks ; `npm run typecheck` réussi. La validation visuelle du paysage appartient à la livraison du rendu et doit être consignée séparément.

Pour une régression, conserver au minimum graine, dimensions, terrain ou ressource concernée, composante accessible et invariant violé. Ajouter le cas à la famille correspondante plutôt qu'un snapshot fragile de toute la carte. À l'introduction de relief navigable, hydrologie ou fertilité persistante, versionner le schéma et définir la migration avant de recalculer des états qui pourraient modifier la continuation d'une partie.
