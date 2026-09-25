# Qualité des pièces — V102

L'inspection **Environnement** affiche maintenant la beauté dérivée de toute pièce fermée : valeur à deux décimales et bande française. Elle partage l'adaptateur `captureWorldBeauty` avec le besoin de beauté ; un meuble, sa matière/qualité, une hémérocalle vivante, un sol, une salissure, un corps ou une pile au sol ne peuvent donc pas avoir deux valeurs selon le lecteur.

La topologie reste l'autorité : les cellules intérieures et les objets de bord participent selon `RoomBeautyCapture`, tandis qu'un extérieur relié au bord, une paroi ou un seuil n'obtient aucun score artificiel. La capture est dérivée, non sauvegardée, et n'introduit ni migration ni tirage aléatoire. Les anciens mondes restent au schéma 101.

## Performance et portée

`RoomInspection` possède son cache, mais l'invalide à chaque véritable actualisation d'inspection parce que certains snapshots conservent les identités de tableaux. Ce travail n'est exécuté ni par colon à chaque tick, ni à chaque image. Le besoin conserve son cache et sa cadence historique de vingt ticks ; l'extraction partagée ne change ni valeur, ni PRNG, ni humeur.

Cette tranche ferme une lacune d'observation, pas le système complet d'impression Core. Richesse, espace, sculptures, souvenirs de chambre/réfectoire/salle de loisirs et conséquences d'humeur restent hors périmètre. [Référence et décision](../research/room-quality-reference-v102.md).
