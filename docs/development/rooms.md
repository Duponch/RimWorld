# Pièces — première tranche d’habitat sous V34

15 septembre 2026. [Recherche et décisions](../research/rooms-reference.md), [validation](validation.md). Ce lot reconnaît les enceintes et les expose à l’inspection. La topologie introduite sous V34 reste dérivée. V35 ajoute la [couverture construite](roofing.md) et son inspection ; V36 ajoute les [rôles du mobilier présent et effets de production](work-environment.md), autres statistiques et échanges thermiques restent à développer.

## Connectivité et signification

`src/sim/room-topology.ts` regroupe les cellules d’espace par voisinage cardinal. Une roche naturelle ou un mur fini ferme la cellule. Une porte finie forme un seuil distinct, indépendamment de son ouverture, de son maintien et de son interdiction. Les côtés de ce seuil ne sont pas fusionnés par son ouverture ; ils peuvent appartenir au même espace s’il existe un autre passage.

Plans, cadres, personnes, piles, plantes et meubles présents ne ferment pas l’espace. L’eau ne ferme pas non plus une enceinte : son impossibilité de transit est une autre règle. Une diagonale seule ne relie pas deux espaces ; les coins manquants d’une enceinte rectangulaire ne constituent donc pas une brèche. Une composante atteignant le bord est marquée ouverte sur l’extérieur. Le nombre de cases inclut l’eau et le sol sous les meubles, exclut parois et seuils ; il ne prétend pas mesurer la statistique Core d’espace libre.

Les identifiants sont déterministes pour la même topologie, fondés sur la première cellule, mais peuvent changer après fusion/division. Ne jamais les enregistrer comme identité durable d’une chambre, propriétaire ou réserve d’énergie. Les éventuelles limites de rôle des très grands espaces restent à développer ; notre algorithme ne reproduit pas le découpage interne des régions Core.

## Cache explicite et coût

`RoomTopologyCache` appartient à son appelant. L’instance de l’inspecteur vérifie le masque des obstacles à chaque lecture utile : snapshot, changement de sélection ou réouverture du panneau. Elle ne se fie ni au tick ni à l’identité des tableaux ; elle détecte une mutation en place et un changement de dimensions, même à aire égale. Une modification de politique de porte ou de mobilier n’impose pas de recalcul des composantes.

Les deux masques et la file de parcours sont réutilisés. En cas de modification de barrière, un nouvel instantané de labels et d’informations est produit ; les précédents restent inchangés. Coût O(cases + bâtiments) pour la vérification et O(cases) pour le parcours. Le recalcul est actuellement global, mesuré sur 250² ; l’invalidation locale reste une optimisation future, pas une propriété annoncée. Aucune lecture par colon ni par image ; l’inspecteur masqué ou la sélection multiple ne déclenchent pas ce calcul.

Le contrat V34 était limité à l’inspection. V36 ajoute un consommateur de simulation pour la production. Le module est pur et ne modifie jamais le monde ; le cache de présentation n’a aucune autorité sur la continuation. Le consommateur V36 possède son cache, distinct de celui de l’UI, vérifié lors des lectures utiles et invalidé entre actions modifiant le milieu.

## Inspection et limites fonctionnelles

Le panneau existant en bas à gauche indique paroi, seuil, extérieur ou « Pièce non couverte · N cases ». L’inspection d’un colon utilise sa cellule logique. Le texte se met à jour après construction, déconstruction, extraction et chargement, y compris si l’inspecteur est rouvert en pause. Aucun rendu supplémentaire ni nouvel appel GPU.

La couverture construite V35 et les facteurs de production V36 sont jouables. Le [contrat des ateliers](work-environment.md) définit exactement les critères et rôles adoptés. Aucun bonus d’abri, de repos ou d’humeur n’est déduit de cette reconnaissance. Critères des autres loisirs, toits naturels, dégâts, température, beauté et propreté restent distincts.


## Contrôles

Deux scénarios profonds : oracle indépendant par union sur 80 cartes rectangulaires et transitions exécutées par les commandes existantes. Couvrir portes, coins, eau, meubles, plans/cadres, brèche, reconstruction, minage, reprise et conservation des anciens instantanés. Le court parcours navigateur utilise une enceinte synthétique, puis un vrai abattage à travers une porte et une vraie déconstruction ; il ne remplace pas le pilote naturel. V35 enrichit le pilote de colonie avec un auvent au-dessus du repas, par commande de zone ; ses résultats restent distincts de cet oracle topologique.
