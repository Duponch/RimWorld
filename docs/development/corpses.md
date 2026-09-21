# Dépouilles animales — V79

**Extension V91 :** les dépouilles de cerf, mufalo, gazelle et dromadaire sont obtenables et conservent leur corps, viande et cuir propres; celle du lièvre des neiges est préparée pour la toundra non sélectionnable. Les sections centrées sur le lièvre gardent le contrat historique V79. Voir [faune diversifiée](fauna-diversity.md).

Le lièvre mort devient un objet entier de type `corpse`, `hare-corpse`, quantité un. La pile reprend son identifiant ; `corpse` garde espèce, sexe et dossier anatomique, dont l'instant et la cause du décès. Il n'existe jamais simultanément comme acteur et comme pile. Une dépouille ne constitue pas de la viande ingérable : la boucherie produit les aliments séparément.

## Chute et logistique

La conversion attend la fin de l'arête physique capturée lors de la chute. Elle se fait sur cette même cellule uniquement si un emplacement de sol est disponible. Si la cellule contient déjà une pile, si un meuble refuse les objets au sol, ou si le plafond de piles est atteint, le corps reste l'animal mort visible, avec son identité et son âge thermique conservés. Il ne saute pas vers une case libre et n'est pas supprimé. Libérer la cellule permet sa conversion au prochain passage. C'est une adaptation explicite à notre règle d'une pile au sol ; des corps superposés, sacs mortuaires ou cellules contenant plusieurs piles ne sont pas livrés.

Le chasseur peut aussi récupérer ce corps retenu sans le poser d'abord au sol : après la chute, il rejoint une place de contact logistique ordinaire (même case ou voisine cardinale), puis convertit atomiquement l'acteur en dépouille portée. Identité, anatomie, orientation et âge restent identiques. Le stockage accessible, le portage libre, les réservations et le plafond de piles sont prévalidés ; aucune deuxième pile n'apparaît sur la cellule occupée. La poursuite du trajet reste sauvegardable. Faute de stockage admissible, la chasse se termine comme après un décès sur sol libre ; le corps reste en place. Le fournisseur Transport général ne sait pas encore récupérer un acteur mort retenu : après abandon du chasseur ou décès hors chasse, il faut dégager la cellule ou retirer le meuble pour rendre la dépouille transportable. Une porte accepte les objets au sol et ne nécessite pas ce repli à elle seule.

Transport, stockage filtré `corpse`, dégagement des chantiers et interruption emploient les engagements existants. Le portage conserve la pile entière et son identifiant, comme un équipement. La réservation du chasseur protège le corps avant sa récupération ; une seconde personne ne peut le réserver simultanément. Il ne peut devenir un matériau incorporé à un bâtiment ni un équipement. Le producteur générique `addMaterial` refuse d'inventer un corps.

## Température et décomposition

`RotState` reste ancré et partagé avec la conservation existante : chaque changement de température ou de propriétaire conserve l'âge acquis avant d'adopter le nouveau taux. Le froid de 0 à 10 °C ralentit ; zéro et moins arrêtent la progression. Une dépouille devient pourrie à 2,5 jours thermiques, desséchée à cinq jours. Ces seuils changent son état et sa disponibilité pour la boucherie, jamais son existence. L'expiration alimentaire ne retire pas les dépouilles ; la viande de lièvre expire après deux jours thermiques et entre dans son propre compteur de pertes.

Un animal mort attendant une cellule conserve `corpseRot`. Les sauvegardes V78 ne contenaient aucun historique thermique de corps : leur validation précède la migration neutre ; le premier passage V79 ouvre un âge nul à l'heure courante, sans reconstituer une température passée. Cette compatibilité est distincte des nouveaux décès dont l'âge démarre immédiatement.

## Rendement

`corpseYield` est une projection pure, avant efficacité du boucher, facteur du poste et arrondi aléatoire. Elle additionne la couverture exclusive des parties naturelles restantes, sans compter deux fois les descendants amputés. Une blessure non permanente autre que `execution-cut` applique une seule pénalité ×0,66 ; une cicatrice seule ne l'applique pas.

Le lièvre adulte emploie une taille 0,2 : base viande `140 × taille`, cuir `40 × taille`, puis couverture, pénalité et courbe `(0,0) → (5,14) → (40,40)` (identité au-delà). Sans blessure ni partie manquante : 31,085714 viande et 16,228571 cuir avant efficacité/arrondi. Avec une blessure ordinaire et couverture intacte : 24,013714 et 14,208. L'achèvement propre ne fait pas disparaître la pénalité des blessures par balle précédentes. Voir la recherche chasse/boucherie du lot et ses limites de version.

La viande crue donne la pensée négative de nourriture crue, également lors de l'alimentation assistée, et sa préférence humaine est `−82 − distance`, comme le riz : aucun bonus implicite de repas. Les régimes des nouvelles parties l'admettent selon leur catégorie ; les régimes sauvegardés restent inchangés à la migration. Une politique ancienne contenant cet aliment V79 est refusée avant migration. La liste alimentaire des lièvres est explicite et exclut viande crue et dépouilles ; les repas préparés restent accessibles selon leur règle antérieure. L'intoxication alimentaire demeure absente.

## Validation et limites

`corpse-save` refuse les identités divergentes, corps vivants, anatomie humaine substituée, propriétaire incompatible, horloges impossibles et données V79 dans les schémas antérieurs. L'âge d'un corps pourri reste valide après ses seuils, contrairement à un aliment expiré. Les scénarios dédiés couvrent chute/sol occupé, récupération par le chasseur sur lit/feu/pile avec sauvegarde pendant l'approche et perte de capacité, transfert entier et continuation exacte, températures successives, décomposition persistante, couverture/rendement et corruption.

Les dépouilles humaines, ingestion directe par carnivores, équarrissage, tombes, crémation, détérioration extérieure et disparition physique des corps ne sont pas livrés. Les corps pourris peuvent être transportés et stockés mais pas transformés par la recette fraîche.
