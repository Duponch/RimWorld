# Sélection et retours d'action — V99

24 septembre 2026. [Référence Core locale et limites](../research/interaction-reference-v99.md). Ce lot rend les interactions existantes plus lisibles sans ajouter de règle de chasse, de combat ou de travail.

## Sélection et inspection

- Un clic sur un animal sauvage l'identifie même devant un objet au sol ; des clics répétés parcourent les cibles superposées. Son inspection présente **Informations** et **Santé**, ainsi que la commande de chasse existante. Social et Journal ne sont pas ajoutés : Lisière ne stocke pas les données qu'ils devraient afficher.
- Le double clic ajoute les êtres équivalents visibles à l'écran : même espèce et statut pour la faune, même type de personne pour les humains concernés. Maj avec un clic ajoute ou retire une sélection. Le rectangle choisit une catégorie prioritaire : colons, puis autres personnes, puis faune lorsque les précédentes sont absentes ; il ne mélange pas ces catégories par hasard. La sélection multiple générale d'objets reste partielle.
- L'inspection de groupe ne prétend pas attribuer des commandes individuelles à chaque objet sélectionné. Une commande qui exige un groupe de colons valide tous ses membres avant mutation et explique les refus.

## Mobilisation et ordres

Les boutons **Mobiliser/Démobiliser** restent dans des cellules distinctes, lisibles et activables sans chevauchement, y compris avec plusieurs colons sélectionnés. **R** bascule la mobilisation quand un colon admissible est sélectionné ; sans colon, le raccourci historique de récolte garde son rôle. Un refus médical ou de sélection ne mobilise pas partiellement un groupe.

Le clic droit d'un colon mobilisé donne ses ordres contextuels. Une cible hostile ou un animal sauvage attaquable propose explicitement **Tir** et/ou **Mêlée** selon les capacités et l'accès, avec une raison si le geste demandé est impossible ; un humain allié n'est pas une cible d'attaque dans ce menu. Les déplacements mobilisés et leur file restent ceux de [Mobilisation V53](drafting.md). La file d'attaques par Maj n'est pas livrée : son refus est explicite et ne modifie aucun ordre existant. Le tir automatique à volonté demeure distinct du choix d'une cible au clic droit.

## Retours dans la scène

Le colon joueur sélectionné montre en bleu son **chemin réellement calculé et encore à parcourir**. La ligne suit la pose et les nœuds restants, puis disparaît à l'arrivée, à la désélection ou quand aucun chemin confirmé n'existe. Une destination seule et les entrées futures de la file ne sont pas tracées comme si leur route était déjà connue. La couleur bleue est une adaptation de présentation demandée ; le matériau Core lu est teint blanc.

Une **barre dorée** suit la progression mesurée d'un travail en cours, au-dessus de l'acteur, à la distance rapprochée de la caméra. Elle n'est pas une animation à durée inventée ni un indicateur permanent d'occupation. L'ancrage sur l'acteur est une adaptation 3D demandée : Core place souvent sa barre sur la cible, telle qu'un poste ou une roche. Les barres ne changent ni les durées, ni les réservations, ni les résultats du travail.

Ce contrat est borné à la sélection, aux commandes déjà jouables et à leur retour visuel. La [liste des fonctions et limites](../gameplay/implementation-status.md) et le [guide joueur](../gameplay/player-guide.md) donnent les repères d'usage ; les preuves de validation sont consignées séparément après exécution.
