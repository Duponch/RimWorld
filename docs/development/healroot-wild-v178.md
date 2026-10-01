# Racine médicinale sauvage — V178

Lot borné au schéma **167**, fondé sur la [recherche Core](../research/healroot-core-v178.md), les [milieux vivants](biomes-flora.md), la [vie végétale](rocks-and-plants.md), les [médicaments](medicines.md) et les [contrôles de jouabilité](playability-validation.md). La [preuve de livraison](../history/validation-healroot-v178.md) distingue acquisition générée, préparation médicale, continuation et coûts mesurés.

## Boucle et référence

Une `healroot-wild` réelle, de famille `wild-plant`, peut apparaître dans les nouvelles forêts tempérées et boréales et dans leur renouvellement prospectif. Ses poids Core respectifs 0,05 et 0,16 complètent les poids déjà livrés sans redistribuer les espèces absentes ni changer le poids total Core. Aucune apparition aride et aucune racine garantie sur toute graine ou à proximité du camp.

Le joueur sélectionne le pied puis **Récolter**. Croissance strictement supérieure à 65 %, contact, accès, réservation et travail sont requis. Récolte neutre de 40 ticks locaux, adaptée des 400 ticks Core selon l'échelle locale existante ; aucun changement des durées historiques des autres plantes. Un pied mûr intact donne une dose physique `herbal-medicine` et disparaît. Croissance et PV réduisent le rendement avant arrondi déterministe, éventuellement à zéro ; ce résultat détruit aussi le pied. Couper pour dégager le terrain détruit la plante sans dose. Un dépôt impossible refuse atomiquement le résultat sans modifier plante, piles, identités ou PRNG.

La dose utilise les transports, le filtre Médicaments, la pile de 25, la péremption de 150 jours à taux normal et les soins existants : puissance 0,6, plafond 70 %, consommation au soin seulement. Le médicament est non alimentaire ; la nutrition 0,2 de la plante vivante reste disponible au pâturage existant.

Croissance biologique de dix jours, fertilité minimale 0,7 et sensibilité 1, 60 PV, dépouillement au froid sans mort immédiate et durée biologique maximale nominale 80 jours suivent les définitions Core recoupées. Lumière, climat, toit, dommages et contrôles végétaux communs gouvernent leur effet local. Ni dix jours ni rendement ne garantissent une récolte à date fixe.

## Adaptations et exclusions

La compétence Plantes, sa vitesse et son échec humain de récolte Core, ainsi que les facteurs de difficulté de rendement, restent absents. Ce lot assume des facteurs neutres de travail et de rendement pour ces dimensions ; il ne prétend pas reproduire toutes les chances Core. Le rendement lié aux PV s'applique uniquement à la nouvelle espèce afin de préserver les récoltes historiques. Cultiver le healroot reste différé : le seuil Core Plantes 8 ne doit pas devenir un bouton permettant une culture gratuite sans compétence.

Pas de recette de transformation de la racine en médicament, de nouvelle dose industrielle/avancée, de nouvelle maladie ou de chirurgie. Les soins ne guérissent pas instantanément des PV. Le parcours médical préparé ne prouve pas une campagne naturelle médicale exhaustive.

## Persistance et présentation

Valider strictement le schéma 166 avant migration neutre 167 ; une racine future cachée dans un ancien document ou paquet est refusée. Migration : seul le numéro change, aucune plante, dose, croissance passée, histoire ou tirage ajouté. Les sites avec flore existante peuvent ensuite renouveler la nouvelle espèce, par leur cadence et PRNG privés ; les sites historiques sans flore restent inchangés.

Le modèle bas à cinq parties réutilise le lot résident de buissons et les pigments existants. Aucune capacité globale par espèce, scène individuelle ou mise à jour par pied et par image ; reconstruction seulement lors des changements de chunk. Cinq instances demandent cependant géométrie et travail GPU : l'absence de nouveau lot n'est pas une preuve de coût nul. La récolte et l'objet au sol suivent les phases confirmées, la simulation demeure seule propriétaire de la matière.
