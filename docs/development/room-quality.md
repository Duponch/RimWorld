# Qualité des pièces — V102

L'inspection **Environnement** affiche maintenant la beauté dérivée de toute pièce fermée : valeur à deux décimales et bande française. Elle partage l'adaptateur `captureWorldBeauty` avec le besoin de beauté ; un meuble, sa matière/qualité, une hémérocalle vivante, un sol, une salissure, un corps ou une pile au sol ne peuvent donc pas avoir deux valeurs selon le lecteur.

La topologie reste l'autorité : les cellules intérieures et les objets de bord participent selon `RoomBeautyCapture`, tandis qu'un extérieur relié au bord, une paroi ou un seuil n'obtient aucun score artificiel. La capture est dérivée, non sauvegardée, et n'introduit ni migration ni tirage aléatoire. Les anciens mondes restent au schéma 101.

## Performance et portée

`RoomBeautyInspection` évite toute capture pour l'extérieur, les parois et les seuils. En intérieur, il réutilise la capture tant que topologie, terrain/sol et contributions numériques n'ont pas changé ; mouvements des colons, carburant et PV seuls ne déclenchent pas la reconstruction. Ce cache appartient uniquement aux snapshots UI : le décodeur remplace le tableau des tuiles à chaque delta de terrain/sol, y compris en pause. Les objets dynamiques sont comparés par valeur, pas seulement par identité de tableau. Le besoin conserve sa cadence historique de vingt ticks.

La revue locale corrige une omission héritée de V90 : l'ancien adaptateur passait la beauté de la fleur dans un champ ignoré pour les meubles. Le pot conserve désormais sa matière/qualité et la plante vivante contribue séparément (+18) ; sa mort retire seulement cette contribution. Le besoin personnel bénéficie aussi de cette correction, prospectivement, sans réécrire une valeur sauvegardée ni consommer d'aléa.

Cette tranche ferme une lacune d'observation, pas le système complet d'impression Core. Richesse, espace, sculptures, souvenirs de chambre/réfectoire/salle de loisirs et conséquences d'humeur restent hors périmètre. [Référence et décision](../research/room-quality-reference-v102.md).
