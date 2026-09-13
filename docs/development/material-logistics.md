# Contrat de la boucle matérielle G0

Depuis V9, le [dégagement des cultures](farming.md#dégagement-matériel-v9) ajoute une destination de dépôt local `aside`, sans réserve fictive. Source, quantité portée, capacité et type de pile restent réservés selon ce contrat. Le transport relève alors de Culture ; le dégagement des empreintes de construction reste absent.

Références : rapport utilisateur chapitres 2, 4, 5, 9 et 10 ; SYS-005/020..022/041..061 ; scénarios A et familles F1/F2/F3. La [liste des écarts](../gameplay/decisions.md) distingue les règles retenues des limites temporaires. Les résultats exécutés sont consignés dans [validation.md](validation.md).

Extension V5 : [objets alimentaires](food-items.md), identité `item`, quantités réservées et limites de pile par définition. Les détails historiques V2/V3 ci-dessous restent datés de leurs tranches.

## État autoritaire et vues

`World.piles` porte la matière disponible. Chaque pile possède ID, type, quantité entière positive et exactement un propriétaire : sol avec coordonnées, colon porteur, ou chantier identifié. Une référence sociale ou de réservation n'est pas un deuxième propriétaire.

`World.stock` est une vue reconstruite des piles au sol et portées ; les matériaux livrés aux chantiers en sont exclus. `job.escrow` devient lui aussi une vue des piles livrées à ce chantier. Ces champs gardent une lecture simple pour les snapshots et la migration, mais leur cohérence est validée. Il est interdit de les incrémenter pour créer de la matière.

Le petit catalogue immuable dans `definitions.ts` définit les types utiles, capacités, coûts, durées et empreintes. Les types sauvegardés sont des identifiants techniques, distincts des libellés. Les réglages 75 unités par pile et 10 par transport sont des choix du projet.

Un bilan bois indépendant additionne arbres, piles de tous propriétaires et coûts incorporés aux constructions. Un bilan nourriture ajoute buissons, piles et unités effectivement consommées (un repas peut contenir plusieurs baies). Les vues `stock`/`escrow` ne doivent jamais s'ajouter une deuxième fois à ces bilans.

## Réservations et transitions

Un colon a au plus un travail de production/construction ou une tâche de transport. La tâche de transport persistée contient pile source, quantité, destination, phase `pickup`/`deliver` et identifiant de cargaison après prise. Les réservations de source et de capacité sont dérivées de ces tâches ; elles sont vérifiées ensemble avant adoption.

1. Le planificateur choisit une source et une destination admissibles, puis réserve quantité et capacité.
2. À portée de prélèvement, la quantité quitte la pile au sol et devient une cargaison appartenant au colon. Une source vide est retirée.
3. La destination reste revalidée pendant le trajet. Le dépôt transfère la cargaison vers le sol de stockage ou le chantier, avec fusion compatible et respect de la capacité.
4. Une construction attend son coût entièrement livré. Un seul constructeur réserve le travail ; la progression déjà accomplie survit à l'interruption.
5. L'achèvement incorpore les matériaux dans le bâtiment et retire le travail. Annuler retire le plan, libère ses engagements et laisse les matériaux au sol.

Désactiver Transport, changer une politique ou perdre une destination libère les engagements futurs. Une cargaison interrompue est déposée à la position réelle du porteur ; elle n'est pas téléportée à la source. Les matériaux déjà livrés ne sont pas repris lorsque seul le constructeur s'interrompt. Les prochaines tâches pourront utiliser les piles restées au sol.

Une réserve est actuellement une cellule avec filtre, priorité et capacité totale. Le stockage de meilleure priorité attire les objets ; les réserves de même priorité ne provoquent pas de transport circulaire. Une capacité réduite sous le contenu actuel autorise l'évacuation de l'excédent vers une réserve admissible de priorité égale ou inférieure. Faute de destination, l'excédent reste au sol. Les objets déjà présents ne disparaissent pas lorsque leurs filtres changent. La capacité ne représente pas un second conteneur possédant des copies des piles.

Les [désignations rectangulaires](area-designations.md) créent ou retirent désormais plusieurs cases en une commande. Elles ne fusionnent pas les réserves en une entité commune. La création ignore les réserves déjà présentes ; le retrait invalide ensemble les livraisons qui les ciblaient. L'annulation rectangulaire d'un chantier sélectionne son identité une seule fois, même si plusieurs cellules de son empreinte sont touchées, puis laisse ses matériaux au sol. Le schéma de sauvegarde 2 reste inchangé.

## Empreintes, accès et interface

`footprintCells` fournit les cellules logiques communes au placement, aux conflits, aux destinations de travail, à l'inspection et au rendu. Pour les nouveaux lits, les orientations 0/1/2/3 étendent la seconde cellule vers +z/+x/−z/−x. Le pivot reste la cellule désignée. Les anciennes emprises 1×1 sont explicitement marquées, jamais déduites de la taille d'un mesh.

`canDesignate` est une requête pure commune au fantôme et à la commande. Une commande refusée ne modifie pas le monde. Les requêtes de diagnostic expliquent livraison, matériaux manquants et famille de travail désactivée ; elles restent moins détaillées qu'un diagnostic de route complet. Les interprétations 3D n'autorisent pas à prélever à travers un obstacle ou à infliger des conséquences depuis une animation.

Les piles et réserves utilisent des lots de rendu par chunk, actualisés selon le contenu. Les cargaisons partagent l'interpolation GPU des colons. Une absence de mesh hors caméra ne suspend jamais le transport logique.

## Persistance et compatibilité

Le schéma 3 conserve piles, propriétaires, stockages, orientation, phases de transport, routes et cadences, ainsi que les [besoins physiques](needs.md) ajoutés depuis V2. La sérialisation vérifie formes, quantités, références croisées, emprises et capacités réservées avant de produire du JSON. Un chargement invalide ne remplace pas le monde courant du worker.

La migration du schéma 1 valide d'abord l'ancien état. Son stock global devient des piles déterministes près du camp ; les anciens matériaux en escrow sont affectés aux chantiers correspondants. Les priorités déjà choisies sont conservées et Transport reçoit une valeur de départ. Les anciens lits et plans de lits conservent leur emprise `legacy-single`. Terrain, seed, tick et identités existantes restent présents ; aucune régénération du paysage n'est permise. La continuation après migration suit les nouvelles règles, sans prétendre rejouer exactement l'ancienne simulation à stock global.

Les clés navigateur `lisiere.save.v1` et `lisiere.previous.v1` sont conservées pour retrouver les données existantes ; le numéro de schéma se lit dans le JSON. La reprise exacte est exigée entre sauvegardes/restaurations du schéma 3. V2 est validé avant l'initialisation des tâches de besoins ; sa matière et ses travaux restent inchangés. Les bornes d'entrée et de migration doivent être contrôlées avant toute allocation proportionnelle à une quantité historique.

## Limites techniques à suivre

Le nombre de recherches de chemin est borné et les colons sont examinés dans un ordre tournant. La sélection examine au plus 32 768 paires logistiques par tick, avec indices locaux de quantités/capacités et une fenêtre tournante `logisticsCursor` sauvegardée. Elle ne matérialise pas le produit piles×destinations. Ce choix peut différer une cible meilleure hors fenêtre. Les benchmarks de collecte initiaux ne mesurent pas ce nouveau coût. Les index persistants et invalidations incrémentales restent à développer lorsque les mesures justifient leur complexité.

Le journal d'événements affiché est borné ; ce n'est pas encore un journal complet et rejouable des commandes. La réservation d'une case de travail n'est pas une réservation temporelle de tous les passages. Les impasses de plusieurs agents actifs demandent encore une politique de congestion plus complète. Aucune annonce de parité globale ou de performance à centaines de colons ne découle de cette seule tranche.

## Mise à jour spatiale V6

Le [contrat sol, mouvement et rendu distant](spatial-motion-storage.md) remplace les descriptions antérieures de piles multiples au sol et du BFS cardinal. La migration V5→V6 est explicite ; le comportement des buissons reste un chantier ouvert.
