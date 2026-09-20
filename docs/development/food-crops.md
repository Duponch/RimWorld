# Cultures alimentaires — V84

Tranche livrée, [validation centrale V84](../history/validation-food-v84.md). [Recherche et divergences](../research/food-crops-reference.md), [agriculture partagée](farming.md), [conservation](food-preservation.md), [régimes](food-policies.md).

La zone de culture propose riz, pommes de terre, maïs et coton. Le nouveau choix permet d’arbitrer première disponibilité, sol et volume de récolte. Il ne garantit aucune autonomie à partir d’une surface arbitraire, ni une récolte de maïs pendant la première semaine.

## Chaîne physique

- `crops.ts` centralise le catalogue cultivé et son admission par version ; `plants.ts` porte les coefficients. Pommes de terre : 5,8 jours biologiques, sensibilité 0,4, 11 unités mûres. Maïs : 11,3 jours, sensibilité 1, 22 unités. Fertilité minimum 0,7 ; semis/récolte neutres 17/20 ticks locaux. Lumière, nuit, toit et intervalles thermiques utilisent le moteur existant.
- L’outil de zone conserve le riz initial. La politique choisie est explicite et persistée. Un changement ne transforme ni les plants existants ni les piles ; il annule les travaux automatiques liés en déposant conservativement les cargaisons. Coupe désactivée préserve l’espèce antérieure. Une commande ancienne sans champ `plant` conserve le choix.
- Le plant devient réel à la fin du semis. La récolte automatique attend 100 % ; la manuelle exige plus de 65 % et produit moins. `gatherResource` résout un produit explicite (`potato`/`corn`), prévalide tout dépôt et ne consomme le PRNG qu’une fois la sortie possible. Sol saturé : ni perte de plant ni tirage consommé. La récolte détruit le plant ; le ressemis a une nouvelle identité.
- Les produits sont des piles `food` d’au plus 75 unités, chacune 0,05 nutrition. Récolte, transport, ingrédient, aliment porté et ingestion gardent cette identité. Aucun produit ne retombe sur le défaut historique baies/portion. Le stockage utilise le filtre Aliments partagé, indépendamment du régime et de la facture.
- Le repas simple accepte dix unités de légumes bruts compatibles, seules ou mélangées. La préférence et la pensée de repas cru sont les mêmes que pour le riz cru, lors de l’ingestion effective ou de l’alimentation assistée ; aucune jauge n’augmente au moment de réserver/prendre un aliment. Les lièvres utilisent le profil herbivore explicite, avec nutrition de plante 0,25 / 0,4 distincte du produit.
- Les pommes de terre commencent à pourrir après 30 jours à taux plein, le maïs après 60. Copie d’âge lors de séparation, fusion pondérée, taux local de froid et expiration avant actions restent communs. Les pertes sont ajoutées sous le bon ItemId et libèrent les réservations concernées.

## Présentation et coût

L’inspection de zone expose les quatre choix, leur intérêt et leur rendement mûr. L’inspection du plant indique croissance, contrainte lumineuse/thermique et effet du sol pour cette espèce. Les vrais stocks de pommes de terre, de maïs et de viande apparaissent à gauche lorsqu’ils existent. Les politiques et factures s’appuient sur les mêmes identifiants d’objet.

`CropLayer` possède quatre lots résidents, avec silhouettes basses feuillues pour les pommes de terre et tiges hautes pour le maïs ; riz/coton gardent leurs géométries. Tous sont préchauffés même vides. Semis, croissance et récolte ne reconstruisent ni forêt ni pipeline. Matrices et couleurs sont envoyées sur les mises à jour de présentation, avec `StaticDrawUsage` et plages explicites.

La borne actuelle réserve par forme 65 536 emplacements à 250², soit environ 4,75 Mio de matrices/couleurs par lot. Les quatre lots représentent **environ 19 Mio côté CPU et 19 Mio côté GPU**, hors géométries et autres allocations. C’est une empreinte calculée, pas une mesure de fluidité. Ce choix borné doit être réévalué avant multiplication du catalogue ; aucune capacité de buffer ne prouve un budget d’image ou de simulation respecté. La présentation distante ignore ces cultures comme auparavant ; leur hauteur ne crée pas de couvert balistique.

## Sauvegardes et limites

Schéma **84** : validation stricte de 83 avant migration. Aucun plant, objet, zone, récolte passée, horloge ou tirage n’est ajouté à une ancienne partie. Les régimes existants et filtres de factures sont conservés exactement ; les nouveaux produits ne sont pas autorisés implicitement. Le joueur peut les autoriser ensuite. Les nouvelles parties possèdent les listes du catalogue actuel.

Les compteurs `spoiled.potato` et `spoiled.corn` restent absents tant qu’aucune perte ne les nécessite. Les données de cultures, piles, croissance, zones, régimes, filtres et compteurs futures sont interdites sous 83, y compris zéro/false. Les migrations bien antérieures, notamment l’initialisation des régimes en 13, n’injectent pas les aliments ajoutés en 84.

Restent absents dans cette tranche : compétence Plantes complète et échecs de récolte, PV/mortalité/fléau des végétaux, incendies, saisons, hydroponie, détérioration des piles exposées et intoxications. Les paramètres de base suivent Core 1.6.4871 ; la latitude et le climat restent le profil fixe annoncé. Ces cultures complètent un choix alimentaire, pas le catalogue agricole entier.

## Vérification

`tests/food-crops.test.ts` regroupe quatre parcours de contrat : intégrale/sols/thermique/seuil/saturation ; commandes de semis/changement protégé/récolte-stockage/reprise ; recette/ingestion/âge et pertes ; refus de données futures et stabilité des quatre lots graphiques. Les maturités préparées dans les parcours courts sont des checkpoints explicites, pas une prétendue colonie menée pendant des semaines. Les anciens scénarios de riz, coton, conservation et régimes restent pertinents ; les longs pilotes, UI native et mesures successives sont intégrés à la validation centrale V84.
