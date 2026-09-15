# Production de blocs — V32

[Recherche précise](../research/stonecutting-reference.md), [objet atelier](stonecutter.md), [chaîne de cuisine](cooking.md), [logistique](material-logistics.md), [transferts de meubles](furniture-transfer.md).

## Chaîne jouable

Artisanat dans Travail est distinct de Cuisine. Une facture de la table de taille choisit un fragment admissible dans son rayon, sans exiger sa désignation au transport. Les cinq fragments typés produisent chacun vingt blocs du même type. Un fragment historique non typé est exclu ; aucune migration ne lui invente une roche. Les blocs forment des piles de 75 unités au plus, sans nutrition ni pourriture, traversables avec supplément 1,4 tick local (sans non-répétition), arrêt autorisé, filtrables sous **Blocs de pierre** et transportables normalement.

Le fournisseur réserve le poste, sa place devant le centre et le fragment. Le colon rejoint la source, porte réellement le fragment puis le pose à portée de sa place, préférentiellement sur le plateau. Un fragment ne peut occuper la cellule où l'artisan travaille. Après 200 ticks locaux de travail extérieur neutre, une transaction consomme le fragment, crée vingt blocs et décrémente une facture X fois une seule fois. Pas de rendement aléatoire ou d'XP. La cargaison rejoint physiquement sa réserve ; sinon elle est posée sur un sol accessible. Elle peut remplir plusieurs piles successives sans perdre son reliquat.

Filtres, rayon, ordre des factures, suspension, trois répétitions et destination passent par les mêmes commandes que la cuisine. « X fois » compte les opérations ; « jusqu'à X » compte les blocs stockés et les cargaisons de production. La facture générale compte tous les types de blocs, même si ses ingrédients sont restreints. Le clic droit et Maj+clic ajoutent priorité et file réservée ; désactiver le métier n'annule pas l'ordre déjà accepté. Les suivants obéissent au contrat de [priorité maintenue](player-orders.md).

## Responsabilités et persistance

`production-recipes.ts` centralise les deux recettes, métiers, ingrédients, quantités et produits. L'enveloppe sérialisée historique `pawn.cooking` et `orders.active='cook'` est conservée pour compatibilité ; elle porte désormais aussi une tâche explicitement `recipe='stone-blocks'`. Une absence de recette sur la tâche signifie toujours l'ancien repas. Aucun deuxième moteur parallèle de réservations ou de transport n'est ajouté.

`cooking-planner.ts` classe les postes d'abord par priorité du métier puis par distance. La proposition garde sa vraie priorité lorsqu'elle est comparée aux autres travaux. La sortie vérifie ses réserves par priorité puis distance, en calculant capacité et route seulement quand le candidat est examiné. Une réserve prioritaire inaccessible laisse passer la suivante ; une réserve proche de moindre priorité ne masque pas celle qui est accessible plus loin. `cooking.ts` rassemble et transforme. `production-output.ts` extrait livraison, fractionnement et dépôt : propriétaire au sol limité à type/x/z ; fusion uniquement du même ItemId ; ID porté conservé pour un reliquat, nouvel ID seulement si nécessaire pour sa fraction déposée. L'impossibilité d'allouer conserve le produit en main.

Une destination de production V32 retient `storageQuantity` : réserver sept places n'en réserve pas vingt ni une seule. Les autres livreurs voient cette capacité et son type. Un changement de réserve invalide la destination, pas la matière. L'absence de sol disponible attend puis réessaie ; aucun dépôt à distance. Avant conversion, une interruption remet le travail à zéro et dépose conservativement ; après conversion, elle ne recrée jamais le fragment. Les factures appartiennent au même bâtiment pendant désinstallation, paquet, portage et réinstallation ; leurs IDs restent uniques.

**Migration V31→V32** : valider V31 strictement avant ajout de la priorité Artisanat 2 et de factures vides aux ateliers installés/emballés. Préserver cartes, routes, progrès et recettes historiques. Bloc, nouvelle priorité, recette ou facture d'atelier introduits dans un ancien schéma sont refusés. Les tâches, ingrédients, places, sorties partielles et paquets sont validés par leurs contrats communs.

## Rendu et contrôle

`block-presentation.ts` produit au plus six boîtes par pile, dans les lots instanciés existants. Les cinq cargaisons partagent le programme GPU de pose ; une nouvelle pile n'ajoute pas un matériau par objet. Le corps, le chargement et l'anneau gardent les trajectoires et orientations communes. Compteur FPS toujours visible. Mesures réelles et machine figurent dans [validation](validation.md), sans promesse de coût nul.

Trois scénarios profonds couvrent les cinq transformations, reprises aux différentes phases, destinations partielles, ordres concurrents, réservations, arrêt du métier, filtres/rayon/seuil, transfert des factures, anciennes sauvegardes et saturation. Le pilote naturel construit l'atelier, obtient au moins un fragment par minage puis entretient vingt blocs en réserve. Les parcours UI exercent Artisanat et les factures réelles. Les bancs existants utilisent `--stonecutting=true` (CPU) et `STONECUTTING=1` (WebGPU), avec 3/30/100 artisans et trois recettes chacun.

## Reste ouvert

Les constructions en pierre, recettes individuelles de chaque roche, catalogue complet, recherche, compétences/capacités, éclairage fonctionnel, pièces/toits, climat, propreté et confort au travail ne sont pas livrés par cette tranche. La majoration extérieure est fixe tant que toutes les tables sont dehors ; les autres modificateurs sont neutres. Les anciennes pierres décoratives ne sont toujours pas des fragments utilisables.
