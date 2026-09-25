# Qualité des pièces et usages — V103

V103 prolonge l'inspection V102 par richesse, espace et impression, puis par des souvenirs qui modifient réellement la cible d'humeur. Références : [formule et usages Core 1.6.4871](../research/room-impressiveness-reference-v103.md), [valeur des objets](../research/room-market-value-reference-v103.md). Ces statistiques ne sont pas la richesse globale servant aux raids.

## Boucle jouable

Un aménagement terminé, un sol, la qualité et l'état des meubles, la fleur vivante et les salissures influencent la pièce. Richesse et espace sont calculés depuis les objets physiques. Les piles libres ne sont pas de la richesse de pièce dans le worker Core vérifié ; elles peuvent toutefois l'enlaidir. Le facteur limitant compte fortement dans l'impression : empiler des meubles au détriment de l'espace ne garantit pas une bonne pièce.

À l'ingestion achevée, le colon garde un souvenir de la pièce où il a mangé si son niveau le permet, même sans table ; le malus « sans table » reste indépendant. La fin ou l'interruption après usage réel du jeu de fers à cheval peut créer le souvenir de loisirs ; le trajet et l'observation du ciel ne le font pas. Le nom du rôle n'est pas une condition artificielle de ces deux souvenirs.

Le repos physique observe la chambre après un premier délai aléatoire de 1–4 heures, sauvegardé, puis chaque jour et à la sortie si le premier relevé a eu lieu. Il exige un lit personnel civil ; un dortoir est distingué d'une chambre individuelle. Une brève visite au lit n'accorde rien. Chambre et dortoir sont exclusifs. Un souvenir par famille, remplacement de sa bande au nouvel usage, durée d'un jour : aucune addition sans limite. Une pièce trop pauvre pour créer un souvenir de repas/loisir n'efface pas immédiatement l'expérience précédente. Les souvenirs du repos sont réévalués explicitement.

Les effets concernent les colons libres actuels. Captifs, visiteurs, chambres d'hôpital, Ascète et autres traits spécialisés restent hors de cette tranche. Le vieillissement à échéance absolue et l'horloge locale sont des adaptations de cadence annoncées.

## Sauvegarde et coûts

Schéma **103** : V101 est validée strictement avant migration neutre. Aucun souvenir, meuble, ressource ou historique de sommeil n'est ajouté au chargement. Un repos déjà engagé commence sa première observation prospectivement. Les nouvelles formes de souvenirs et de délais sont interdites dans V101 et avant. La reprise conserve les échéances et le PRNG.

La simulation ne calcule ces statistiques qu'aux usages concernés ; aucune recherche de pièce par colon à chaque image. L'inspection compare les contributions pertinentes des instantanés puis parcourt uniquement l'enceinte demandée, au lieu d'allouer quatre grilles de beauté sur toute la carte. Une mutation sur place de la simulation exige une nouvelle capture ; le cache d'instantanés UI ne lui est jamais prêté. Les valeurs dérivées ne sont pas sauvegardées.

## Limites de couverture

La beauté reprend le périmètre physique V102 : sols, meubles, pots et fleurs, piles et salissures. La beauté propre des autres plantes, les propriétés complètes des régions Core et les édifices qui chevaucheraient plusieurs régions ne sont pas une parité exhaustive. Les sites actuels ne proposent pas de grands édifices chevauchant des murs. Les sculptures, artiste/atelier/ouvrage et leurs transactions sont [préparés](../research/art-reference-v103.md), pas livrés. Ce lot active de nouveaux usages des contenus existants et n'ajoute aucun objet de catalogue.

## Historique V102

L'inspection **Environnement** affiche maintenant la beauté dérivée de toute pièce fermée : valeur à deux décimales et bande française. Elle partage l'adaptateur `captureWorldBeauty` avec le besoin de beauté ; un meuble, sa matière/qualité, une hémérocalle vivante, un sol, une salissure, un corps ou une pile au sol ne peuvent donc pas avoir deux valeurs selon le lecteur.

La topologie reste l'autorité : les cellules intérieures et les objets de bord participent selon `RoomBeautyCapture`, tandis qu'un extérieur relié au bord, une paroi ou un seuil n'obtient aucun score artificiel. La capture est dérivée, non sauvegardée, et n'introduit ni migration ni tirage aléatoire. Les anciens mondes restent au schéma 101.

### Performance et portée historiques V102

En V102, `RoomBeautyInspection` évitait toute capture pour l'extérieur, les parois et les seuils. En intérieur, il réutilisait la capture tant que topologie, terrain/sol et contributions numériques n'avaient pas changé ; mouvements des colons, carburant et PV seuls ne déclenchaient pas la reconstruction. **V103 observe aussi la valeur selon les PV, l'espace occupé et la toiture.** Ce cache appartient uniquement aux snapshots UI : le décodeur remplace le tableau des tuiles à chaque delta de terrain/sol, y compris en pause. Les objets dynamiques sont comparés par valeur, pas seulement par identité de tableau. Le besoin conserve sa cadence historique de vingt ticks.

La revue locale corrige une omission héritée de V90 : l'ancien adaptateur passait la beauté de la fleur dans un champ ignoré pour les meubles. Le pot conserve désormais sa matière/qualité et la plante vivante contribue séparément (+18) ; sa mort retire seulement cette contribution. Le besoin personnel bénéficie aussi de cette correction, prospectivement, sans réécrire une valeur sauvegardée ni consommer d'aléa.

La tranche V102 fermait une lacune d'observation ; richesse, espace et souvenirs étaient alors hors périmètre. V103 les prolonge dans le périmètre décrit plus haut. [Référence V102](../research/room-quality-reference-v102.md).
