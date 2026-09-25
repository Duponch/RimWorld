# Filtres de réserve par objet — V101

Une réserve filtre désormais les objets individuels en plus des catégories historiques. Le contrat est fondé sur les [chapitres 10/11 du corpus et les sources Core datées](../research/storage-filters-reference-v101.md) et prolonge [le sol, les trajets et la logistique](spatial-motion-storage.md).

## Autorisation et capacité

`storageAccepts(zone,item)` exige toujours que la catégorie de l'objet soit autorisée. Si `items` est absent, la catégorie seule décide, comme dans les sauvegardes antérieures. Si `items` existe, il forme une liste blanche : seul `items[item] === true` autorise l'objet ; une clé absente ou `false` le refuse. Une case éditée n'ouvre pas implicitement les nouveaux objets. L'interface applique la même liste aux commandes de case et de rectangle ; un ordre invalide est refusé atomiquement.

Le filtre ne crée ni pile ni capacité. Le dépôt requiert encore une case accessible, une pile compatible, la capacité de la réserve, la limite propre à l'objet et l'absence de réservation concurrente. Production, transport automatique/forcé, chasse, habillement et inhumation vérifient le même prédicat au moment utile. Un changement de filtre pendant un trajet ne permet pas une livraison interdite. Les meubles emballés restent gouvernés par la catégorie `furniture` : ils n'ont pas d'identifiant `ItemId` matériel dans cette liste.

Une pile devenue interdite sur sa case reste présente. Sa priorité de **source pour cet objet** vaut alors zéro, ce qui permet de la déplacer vers une réserve admissible même si la priorité numérique de destination est inférieure à celle de l'ancienne case. Une pile toujours admise ne quitte sa réserve que pour une priorité meilleure ou le traitement de débordement existant. Les sorties hors réserve, notamment un dépôt d'interruption, conservent leurs propres règles physiques.

## Sauvegarde et frontières

La migration n'ajoute pas `items` aux anciennes réserves : l'absence préserve leur comportement. Une liste présente en V101 ne peut contenir que des identifiants d'objets connus et des booléens ; elle est refusée dans les schémas antérieurs. Catégorie, liste et quantité doivent rester cohérentes dans les commandes, désignations, tâches et sauvegardes. Un refus ne supprime pas l'objet ni la réservation d'une tâche encore valide.

Cette tranche ne fournit ni étagères, ni filtres de qualité, de PV, de fraîcheur ou de contamination, ni priorité par objet dans une même case. Les catégories continuent de regrouper les familles ; la liste blanche choisit les identités actuellement disponibles dans Lisière.
