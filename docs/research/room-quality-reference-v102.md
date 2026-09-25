# Qualité lisible des pièces — relecture V102

Relecture du 25 septembre 2026, périmètre Core sans extension. Cette tranche ne crée ni sculpture, ni richesse, ni souvenir d'impression : elle rend d'abord visible la beauté de pièce déjà simulée afin que les prochains ajouts d'art aient un oracle joueur réel.

## Sources et limites de la relecture

La référence primaire demeure l'installation locale **RimWorld 1.6.4871 rev590** inspectée pour V90 (`RoomStatWorker_Beauty`, `RoomStatWorker_Impressiveness`, Defs de sols, salissures et meubles). La [recherche V90](habitat-comfort-reference-v90.md) en consigne les valeurs, l'empreinte SHA-256 et les recoupements publics. Une nouvelle consultation Internet a été tentée le 25 septembre sur le miroir public [RimWorldDecompiled](https://github.com/Chillu1/RimWorldDecompiled) et le [wiki des statistiques de pièce](https://rimworldwiki.com/wiki/Room_stats), mais le tunnel HTTP de l'environnement a répondu **403** ; aucune valeur nouvelle n'est donc attribuée à cette tentative. Les nombres livrés restent ceux de la build locale datée, pas une déduction depuis un résumé inaccessible.

## Décision

Revue locale du 25 septembre : le [miroir du calcul de beauté](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/RoomStatWorker_Beauty.cs) est cette fois accessible et confirme la courbe de taille. Il reste un recoupement de code daté, sans certifier le dernier correctif installé. Aucun coefficient nouveau n'est introduit ; la correction du pot restaure les contributions matérielles et +18 de la fleur déjà documentées en V90.

Core expose séparément propreté, beauté, espace, richesse et impression. Lisière possède déjà la beauté physique V90 : terrain intérieur, sol, mobilier et qualité, fleur vivante, salissure et pile visible ; le score de pièce divise la somme par `20 + taille / 2` sous quarante cases, sinon par la taille. Les bandes restent `< −3,5`, `< 0`, `< 2,4`, `< 5`, `< 15`, `< 50`, `< 100`, puis la dernière bande.

V102 affiche **valeur et bande de beauté** à côté de la propreté, en réutilisant exactement la capture du besoin personnel. Extérieur, mur et seuil annoncent qu'il n'existe pas de score de pièce. L'inspection ne mémorise aucun résultat métier et ne tourne pas à chaque image : elle reconstruit à la réception/au changement de sélection seulement.

Richesse, espace, impression et souvenirs restent différés ensemble. Présenter une « impression » calculée avec la seule beauté surévaluerait le mobilier et contredirait la combinaison Core documentée en V90. La prochaine tranche d'art devra ajouter acquisition, matière, qualité, valeur, travail, sauvegarde et usage avant de modifier cette décision.
