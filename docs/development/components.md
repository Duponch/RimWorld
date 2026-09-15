# Composants industriels — V41

Contrat courant, [sources et écarts](../research/components-reference.md). Complète [le minage](mining.md) et [l'acier](steel.md), sans clore le catalogue de minerais.

## Extraction et génération

`Tile.ore='machinery'` désigne le gisement ; `ItemId='component'`, `MaterialKind='component'` désignent son produit. `ORE_DEFINITIONS` centralise identité, PV, rendement et teinte des deux gisements. Roche encaissante distincte et conservée sur le sol révélé.

2 000 PV, coups de 80 à cadence neutre dix ticks locaux, donc 25 coups ; la lumière module la préparation selon le contrat existant. Annulation conserve les dégâts. Le dernier coup prévalide dépôt/identifiants avant retrait et avancement du PRNG. Deux composants apparaissent au sol, sans fragment supplémentaire ni conversion en acier.

Générateur commun borné, paramètres par gisement. L'acier garde exactement son ancien flux ; les machines utilisent un sel indépendant et sont placées après lui. Groupes cardinaux de 3–6 cases, séparés des autres gisements. Topologie, sols, végétation, PRNG de simulation et identifiants inchangés par cette passe. Présence seulement dans les nouvelles parties ; les petits sites sans massif admissible peuvent en être dépourvus.

## Logistique et interface

Une pile par case, maximum 50 composants compatibles. Dépôt partiel, réservation de type et capacité, séparation et fusion suivent la chaîne commune. Transport automatique vers réserve autorisée ; pas de désignation de fragment requise. Filtre `component?`, absence = refus ; les nouvelles réserves créées par l'UI le proposent activé. Le composant n'alimente ni nourriture, ni bois, ni combustible et n'est pas un matériau substituable de construction.

Compteur à gauche, inspection du gisement, filtre dans Réserve et cargaison visible. Le modèle au sol et porté réutilise les lots existants : deux boîtes, aucun matériau ni appel de rendu supplémentaire par pile/colon. Les machines ont une teinte ocre dans le même maillage de roche. Code de masque propre pour détecter un changement d'identité ; aucune reconstruction par image, aucune influence sur les collisions.

## Persistance et contrôles

V40 est validée strictement avant passage à V41. Aucun gisement, filtre ou objet n'est inventé lors de la migration ; routes et tâches engagées conservées. Rejet des nouveaux types dans les anciennes versions, d'une pile >50, d'un minerai sur sol non rocheux ou de dégâts arrivés à 2 000. Le cinquième champ des deltas de terrain porte déjà le type de gisement ; le décodeur utilise sa validation versionnée.

Deux scénarios `components.test.ts` couvrent génération/indépendance, migration/refus, dernier coup différé, snapshots, transport à deux opérateurs au seuil 49→50, continuation exacte et conservation. Le pilote `components-player.ts` extrait six composants après son atelier par des commandes ordinaires ; V42 en incorpore deux dans son générateur et en garde quatre en réserve. Le parcours navigateur minier ajoute inspection, travail visible, retrait, portage, réserve et rechargement. L'audit minier natif accepte `MINING_COMPONENTS=1` et vérifie huit composants par mineur pour quatre cases, programmes et buffers conservés.

Fabrication, équipements, entretien, usure et compétences restent absents ; V42 ajoute le générateur consommant deux composants à sa construction. Le coût de passage et la capacité de portage sont provisoires, explicités dans la recherche. Le [socle électrique V42](power.md) utilise ces ressources réelles.
