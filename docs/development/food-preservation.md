# Conservation des aliments — contrat V11

Voir la [recherche fraîcheur](../research/food-preservation-reference.md) pour provenance, confiance et écarts. Cette responsabilité est séparée de la [nutrition](food-items.md), des [recettes](cooking.md) et des futurs dégâts d’exposition.

## État et transitions

`food-preservation.ts` définit les durées : baies 14 jours, riz 40 jours, repas simple 4 jours. `pile.rot = { progress, atTick }` conserve l’âge thermique au dernier point d’ancrage. Le site actuel est partout à 21 °C ; chaque tick écoulé ajoute un tick d’âge. Les rations de survie, portions historiques et bois n’ont pas ce champ. Le calcul est indépendant de la lumière rendue, de la vitesse choisie et des FPS.

Une récolte démarre fraîche. Séparer une pile copie son âge ; changer de propriétaire le conserve. Fusionner additionne les âges pondérés par les quantités réellement transférées avant de modifier la quantité cible. Cuire consomme les ingrédients vivants et crée un nouveau repas frais. Aucun transport, annulation, dépôt ou rechargement ne réinitialise une denrée existante.

`food-expiration.ts` supprime les piles au seuil avant toute action de ce tick. Les engagements affectés sont libérés, sans nutrition ni produit fantôme. Une facture interrompue avant transformation ne décrémente pas sa quantité ; un produit déjà fabriqué peut ensuite pourrir sans annuler sa fabrication passée. Les pertes sont cumulées dans `world.spoiled`, par identifiant d’aliment, et le journal regroupe les pertes par type/tick.

Si une autre matière reste dans les mains du chef et que le sol proche est saturé, la tâche passe à `interrupted` : une seule entrée tenue valide, progression zéro, aucune source disparue, aucun produit/réserve de sortie. Le poste reste réservé jusqu’au dépôt. La tâche tente ensuite une libération physique ; elle peut être sauvée/reprise dans cet état. Elle ne peut plus finir la recette amputée.

Le choix alimentaire adulte ajoute 12 au score d’un aliment qui pourrira dans moins d’une demi-journée. La distance et la préférence restent actives. Le profil historique conserve son classement par coût de trajet. L’inspection au sol expose la durée restante ; elle ne modifie pas l’état autoritaire.

## Persistance et migration

**V10→V11** valide d’abord l’ancien état, ajoute le compteur de pertes nul et initialise les périssables frais au tick chargé. Leurs âges anciens sont inconnus : aucune perte rétroactive n’est inventée. Identités, quantités, propriétaires, réservations, progression de cuisine et trajets restent conservés. V1–V9 passent par leurs migrations existantes.

`food-preservation-save.ts` refuse âge manquant, futur, négatif, non fini, déjà expiré, champs incohérents sur un non-périssable et compteur de pertes invalide. Une ancienne version ne peut pas masquer ces nouveaux champs. Une sauvegarde refusée ne remplace pas le monde courant.

Les snapshots transmettent le compteur et les piles avec le reste de l’état dynamique. Le calcul d’âge ne réécrit pas les piles entre transitions ; les signatures de géométrie ne dépendent pas de leur fraîcheur. Une future température variable devra intégrer les périodes thermiques et ancrer l’âge avant chaque changement de taux. Changer simplement la constante actuelle invaliderait cette hypothèse de continuation.

## Contrôles et suites

Trois scénarios profonds regroupent transports/fusions/ingestion au seuil, interruptions de cuisine y compris sol saturé, puis durées de 4/14/40 jours, migration, corruption et reconstruction de snapshots. Le pilote de colonie rapproche `présent + pourri + ingéré + 9 × repas cuisinés = départ + récoltes` ; la prise en main ne compte pas comme consommation. Les résultats exécutés et mesures vont dans [validation](validation.md).

Le passage normal est linéaire dans les piles, sans allocation d’âge par tick. Les réconciliations n’arrivent qu’aux expirations. Mesurer aussi une expiration groupée avant de remplacer cette boucle par une file d’échéances : les fusions, suppressions et températures futures imposeraient des invalidations supplémentaires.

Température constante et absence de toits/dégâts restent des limites explicites. Le feu ne chauffe pas les denrées ; ni froid, ni météo, ni intoxication ne sont déduits de ce module.
