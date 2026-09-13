# Relecture : semis, riz et lumière

Recherche du 13 septembre 2026, base RimWorld d'abord. Corpus : chapitre 12, **SYS-070** semis, **SYS-071** croissance, **SYS-072** récolte, **SYS-075** fertilité, **UI-021** zone de culture. Décision : adopter la boucle, adapter la représentation 3D et le temps interne ; différer les autres espèces et les dépendances non livrées. Les statuts du corpus ne sont pas des preuves locales.

## Sources recoupées

1. [Growing zone](https://rimworldwiki.com/wiki/Growing_zone) : automatisation, semis/coupe séparés, récolte manuelle anticipée ; article mentionnant notamment 1.6.4850.
2. [Rice plant](https://rimworldwiki.com/wiki/Rice_plant) : 3 jours de croissance, fertilité minimum 70 %, sensibilité 100 %, lumière minimum 51 %, rendement 6, travail de semis 170 et récolte 200 ticks de référence. L'estimation 5,54 jours calendrier suppose un éclairage favorable pendant toute la fenêtre hors repos ; ce n'est pas une date universelle de récolte.
3. [Plants](https://rimworldwiki.com/wiki/Plants) et [Rice](https://rimworldwiki.com/wiki/Rice) : pas de consommation de graines pour la culture standard ; riz cru, nutrition et risque d'intoxication. [Food](https://rimworldwiki.com/wiki/Food) confirme le malus ordinaire −7 du repas cru. Les intoxications ne sont pas implémentées ici.
4. Contrats du code de référence, miroir communautaire décompilé, commit figé [2d508035082e7cb0c8e29e230d26bda6e546928f](https://github.com/Chillu1/RimWorldDecompiled/tree/2d508035082e7cb0c8e29e230d26bda6e546928f), daté du 20 mai 2026 : `WorkGiver_GrowerSow`, `WorkGiver_GrowerHarvest`, `JobDriver_PlantSow`, `PlantUtility`, `Plant` et `GenCelestial` dans RimWorld. Ce miroir donne des éléments primaires d'implémentation, mais n'est pas une distribution certifiée du build actuellement vendu. Pas de copie de fichiers source dans le moteur.

## Subtilités retenues

La récolte automatique exige le stade mûr ; un ordre manuel peut intervenir plus tôt. Désactiver la coupe des plantes indésirables ne bloque pas la récolte de la plante désirée. Un semis interrompu ne laisse pas un jeune plant continuer à grandir : l'entité provisoire est détruite dans le code de référence. Lisière ne crée son entité qu'en fin de semis et remet le travail partiel à zéro.

La fertilité est pondérée par la sensibilité de l'espèce. Le riz est plus affecté que notre buisson à 50 % de sensibilité. Les « trois jours » désignent un intégral de travail biologique à 100 %, pas trois jours avec nuits. La lumière de `GenCelestial` tient compte de la latitude, de la saison et d'une correction d'horizon ; le preset 45° N/équinoxe réduit cette correction à 23,25°. La croissance applique ensuite une rampe entre 51 et 100 % de lumière, en plus du repos. Notre intégrale donne environ 2 572 ticks équivalents de croissance par jour de 6 000 ticks. La maturité de riz dépend de son heure de départ ; le rendement de notre scénario arrive vers la fin du septième jour, sans accélération cachée.

Le code original sait aussi déplacer les objets bloquant une plantation. Lisière dépend encore du transport vers les réserves pour ce cas ; [écart explicite et contrat technique](../development/farming.md). Les vitesses neutres 17/20 ticks suivent notre normalisation temporelle ÷10, sans prétendre reproduire des compétences absentes. Les coûts de traversée de végétation ne sont pas encore appliqués.

Confiance élevée sur la boucle, les réglages et les valeurs de base recoupées. Confiance moyenne sur la calibration calendaire avec ce preset : pas de comparaison côte à côte sur un site identique dans un exécutable certifié. Météo, latitude choisie et saisons devront faire l'objet de nouvelles recherches lors de leur intégration. Aucun engagement de conformité à 100 %.
