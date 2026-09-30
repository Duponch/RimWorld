# Continuité alimentaire du pilote V174

Consolidation de validation au schéma 166, sans nouvelle mécanique. La recette simple par quatre reste celle du [contrat V160](simple-meal-bulk-v160.md), fondé sur la [recherche Core](../research/bulk-meals-core-v160.md). La [preuve V153](../history/validation-colony-pilot-v153.md) du pilote historique demeure datée. La [preuve V174](../history/validation-colony-food-v174.md) décrit uniquement les contrôles réellement exécutés.

## Décision du joueur

Le pilote commun peut choisir explicitement `playerDecisions(world, { bulkMeals: true })`. Cette option ajoute une facture simple par quatre prioritaire et conserve une facture unitaire de secours. Les deux visent environ deux portions stockées par colon. Les factures se parcourent dans leur ordre réel : si quarante ingrédients ne sont pas accessibles, admissibles, frais et disponibles avec les réservations du monde, la proposition unitaire reste possible. Le choix revient au planner existant ; le pilote ne transforme ni matières, besoins, réservations ni PRNG. Le défaut conserve la politique historique des autres campagnes.

Une facture x4 peut dépasser la cible de réserve de trois portions au plus. Le compteur « Jusqu'à X » porte sur les portions et non sur les opérations. Sur une ancienne reprise, le pilote peut réordonner les factures par `bill-move`, sans annuler l'ouvrage. Il diffère tout `bill-update` tant que la facture concernée est active ou en file, puisque cette commande annule le travail en cours selon le contrat existant.

## Bilan indépendant

Le carnet de test distingue opérations unitaires, opérations x4, portions produites et ingrédients transformés. Une cuisson unitaire confirmée transforme dix ingrédients en une portion, une cuisson x4 quarante en quatre ; l'écart de quantités physiques vaut neuf par portion. Le bilan alimentaire conserve les ingestions autonomes/assistées, récoltes, pertes alimentaires existantes et consommation animale déjà contrôlées par le pilote V153.

Les événements `job` confirmés sont reconnus strictement par leurs messages existants. Les fenêtres `World.events` recouvrantes ne doivent créditer une transformation qu'une fois, tout en conservant deux occurrences identiques. Un carnet amorcé depuis une sauvegarde n'accorde aucun crédit aux événements antérieurs ; son état sérialisable peut accompagner le checkpoint de diagnostic, hors du `World`. Ce n'est pas un nouveau journal persistant du jeu. Un intervalle d'observation perdant des événements de la fenêtre bornée reste une limite du pilote et ne doit pas être compensé par une perte inventée.

## Contrôles et limites

Avant les campagnes, vérifier les commandes nouvelles du pilote avec le même driver UI : ajout, réglage et déplacement de facture, puis ordre de cuisine. Les petites scènes préparées doivent exercer quarante ingrédients vers quatre portions et le secours dix vers une, avec collecte physique, sauvegarde/reprise du travail et livraison.

La campagne commune 250×250 conserve les graines 42, 93 et 2048, les assertions de construction, santé, sommeil, matériaux, nourriture et continuation exacte. Elle exige des portions réellement produites et au moins une opération x4. Le parcours UI ordinaire de trois jours conserve son départ naturel et ses commandes visibles. Les sorties et checkpoints vont sous `tmp/`. Sources servies gelées ; contrôles courts, campagnes et navigateur successifs. Aucune durée de campagne ne vaut mesure CPU, GPU ou FPS, aucune passe bornée ne clôt G0 et les plats raffinés/gastronomiques gardent leurs preuves préparées distinctes.
