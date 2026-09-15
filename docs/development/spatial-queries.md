# Requêtes spatiales — optimisation sous schéma V34

15 septembre 2026. [Recherche rétroactive](../research/spatial-query-reference.md), [mesures et contrôles](../history/validation-v34-spatial-queries.md). Aucun nouveau champ persistant, aucune migration ; les règles de circulation, priorités et réservations restent celles de V34.

## Écarter les candidats dominés

Le planner compare priorité, rang, distance et identifiant avant de demander capacité détaillée et accès. Une proposition qui ne peut battre le meilleur candidat admissible ne nécessite pas ces lectures pures. Une proposition mieux classée mais inaccessible est rejetée ; le meilleur choix accessible précédent reste disponible. Les égalités conservent l'ordre d'énumération.

Les sources/destinations, le nombre de couples consommés, le curseur logistique et les huit recherches par tick restent identiques. Seules les expansions inutiles diminuent. La capacité reste calculée avant engagement, avec les mêmes réservations. Un refus d'accès est mémorisé pour la destination pendant cette décision seulement. Les buffers cardinaux et pondérés restent propres à un colon et une décision ; aucune réutilisation entre ticks, acteurs ou commandes.

## Interroger les empreintes sans rescanner le monde

Le repli `leaveTransitCell` doit énumérer une frontière de meubles après interruption. `captureStandability` indexe les cellules sans arrêt une fois, après toute libération de tâche, avant cette énumération. Auparavant chaque cellule testée rescannait toutes les structures. Les limites, terrain, empreintes tournées, cadres et fragments sont conservés. Les buts restent insérés dans le même ordre, puis la recherche pondérée choisit le trajet.

Cette fonction est une requête de groupe pendant une lecture synchrone, pas un index global. Ne pas conserver sa fermeture après mutation du monde ; refaire la capture pour la décision suivante. Le test ponctuel `canStandAt` reste utilisé hors de cette opération. Les vérifications actives de loisirs utilisent `footprintContains`, sans fabriquer des tableaux de cellules par bâtiment.

## Correction associée des loisirs

La relecture a identifié un défaut antérieur : l'index des candidats de loisirs ignorait les fragments au sol, tandis que la vérification directe les refusait. Une place pouvait être sélectionnée puis abandonnée à l'arrivée. Les deux chemins écartent désormais le fragment dès la sélection ; l'enlever rend la place admissible à la décision suivante. Aucun gain de besoin à distance, changement de lassitude ni téléportation.

Les empreintes des parties de charge sont comparées intégralement avant/après. Cette égalité mesurée ne promet pas une continuation identique dans un cas affecté par la correction de sélection des loisirs. Le schéma reste V34 car ni état sauvegardé ni contrat de validité ne changent.

## Limites

Il reste des scans et des pointes CPU à forte charge. Les résultats concernent une carte synthétique, pas toutes les colonies. Ne pas en déduire des FPS ni une cadence 6× garantie. Pièces/toits et leurs révisions topologiques feront l'objet d'un contrat propre ; pas d'index persistant implicite ajouté pour anticiper ce chantier.

## Réduction des allocations sous V43

L’audit de cent bâtisseurs avec toiture a encore trouvé des recherches d’emprise coûteuses. `footprintContains` rejette les cellules distantes avant lecture des enveloppes ; toutes ses branches actuelles restent dans le voisinage immédiat de l’ancre. Toute future extension d’empreinte doit étendre cette borne, contrôlée contre `footprintCells` pour tout le catalogue et ses rotations. `frameAt` emploie la requête ponctuelle, les sorties de mobilier partagent leurs quatre directions constantes. Aucun ordre d’énumération, coût, budget ou cache persistant nouveau. [Comparaison mesurée](validation.md#charge-cpu-et-copie-des-états).
