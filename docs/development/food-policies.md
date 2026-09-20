# Régimes alimentaires — V13

V65 : exception explicite pendant l’errance triste, les régimes ne limitent pas la recherche alimentaire. Ce n’est pas une exception générale de famine ; l’ingestion reste physique. [Contrat et sources](mental-break.md).

14 septembre 2026. [Recherche et limites de fidélité](../research/food-policies-reference.md), corpus chap. 8/9/14, SYS-077 et TEST-077. Cette tranche de G1 concerne les autorisations alimentaires ; inventaire personnel, vêtements et autres politiques ne sont pas implicitement livrés.

## Comportement

Dans **Affectations (F3)**, chaque colon utilise un régime partagé. Le joueur crée, nomme, duplique et modifie les régimes ; un régime encore affecté ne peut pas être supprimé. Une duplication copie les autorisations sans lien mutable avec son origine. Les noms sont affichés comme texte, jamais comme HTML.

Les autorisations portent sur les types alimentaires effectivement présents, dont baies, riz, pommes de terre, maïs, viande de lièvre, repas simple, repas de survie et portion historique. Quatre préréglages locaux couvrent ce catalogue : Sans restriction, Repas uniquement, Sans rations et Rien. Le deuxième autorise aussi les rations et portions historiques ; le troisième exclut seulement les rations. Ce ne sont pas les listes complètes des préréglages de RimWorld.

Le choix d'une nouvelle portion filtre les piles au sol et la cargaison alimentaire de la personne **avant** les préférences, la fraîcheur, la distance et l'accès. Un aliment autorisé inaccessible n'empêche pas de choisir un autre aliment autorisé atteignable. La faim critique ne contourne jamais le régime : Rien peut empêcher tout repas. Le diagnostic indique le régime bloquant lorsqu'il exclut toutes les piles alimentaires au sol ou tenues par ce colon ; il ne prétend pas connaître l'accessibilité de chaque pile et ne lance aucun pathfinding depuis l'interface.

La politique alimentaire ne filtre ni le transport, ni le stockage, ni les ingrédients d'une facture de cuisine. Un colon peut préparer ou transporter un aliment qu'il ne mange pas. La cargaison de tâche reste distincte du futur inventaire personnel.

V86 ajoute une exception explicite : un captif mobile peut manger de façon autonome dans sa propre prison sans appliquer son régime. Les aliments que le personnel lui apporte le respectent. Les colons libres ne choisissent pas les stocks privés d'une prison pour leur propre repas ; un fournisseur d'alimentation assistée ne prend que des aliments publics ou ceux de la pièce de son patient. [Captivité et références](prisoners.md).

**Un repas déjà engagé se termine selon son engagement initial**, même si la politique change pendant le prélèvement, le portage ou l'ingestion. Les réservations et quantités ne sont pas annulées par cette commande. Pourriture, obstacles et interruption de besoin restent traités par leurs propres contrats. Les nouveaux choix prennent le régime modifié, avec remise à zéro du délai de réévaluation ; cela ne téléporte pas le colon et n'interrompt pas une arête en cours.

## Données, commandes et frontière

`food-policy.ts` définit les données et commandes ; `food-policy-save.ts` valide et migre. World porte `foodPolicies` et `nextFoodPolicyId`, chaque Pawn son `foodPolicyId`. Les IDs de politiques ont un espace séparé de `nextId` des entités. La limite locale est 32 politiques, nom de 1 à 60 caractères hors nom vide ; types inconnus, doublons, listes creuses et affectations invalides sont refusés sans mutation. La dernière politique doit être conservée. Ces bornes techniques ne sont pas des règles numériques revendiquées de RimWorld.

V12→V13 valide d'abord l'ancienne partie, ajoute les quatre préréglages et affecte Sans restriction à tous. Aucun changement de tick, jauge, âge, tâche, chemin, RNG, ID d'entité, horaire ou profil alimentaire/de repos. V1–V11 suivent leurs migrations existantes. Les champs V13 dans une sauvegarde se déclarant ancienne sont refusés. Les reprises V13 conservent toutes les politiques et vérifient chaque référence avant adoption par le worker.

Les autorisations sont un petit tableau partagé, consulté pendant une décision alimentaire ; aucune passe par image sur toute la carte. La liste et les sélecteurs UI gardent leurs éléments DOM entre snapshots. Aucun changement des buffers GPU ou des modèles.

L'audit à cent personnes a révélé une interaction avec la cuisine : sans aliment permis, un cuisinier conservait sa tâche de rangement mais pouvait être marqué affamé pendant une attente de budget de navigation. Le diagnostic de faim ne doit pas écraser l'état d'une tâche active. Ce cas est corrigé et intégré au scénario transport/cuisine, avec sauvegarde pendant l'attente et conservation du produit.

## Limites et validation

Absents : provenance carnée des repas, filtres spéciaux, profils complets, choix du régime par défaut des futurs arrivants, repas personnel de secours, ordre forcé d'ingestion et nourrissage animal assisté. L’alimentation assistée adulte au lit est livrée en [V48](feeding.md), étendue aux captifs en V86 : régime du patient, fournisseur indépendant, portion engagée conservée lors d’un changement ultérieur. La [malnutrition V84](malnutrition.md) peut désormais entraîner incapacité et décès. Six traits et l’errance triste existent dans leurs périmètres propres. Le score neutre, les interruptions de travail et les autres calibrations documentées ne deviennent pas une parité exhaustive par ces ajouts.

Quatre scénarios de domaine traversent autorisations, copies/partage, refus atomiques, seuils, accès, faim, tâches physiques, cuisine, matières et reprise. Le pilote de colonie modifie ses affectations par commandes selon le stock préparé, via les mêmes gestes dans le parcours UI. [Validation courante](validation.md) pour les résultats et mesures réellement exécutés.
