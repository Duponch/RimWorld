# Croissance et semis sous température locale

Le contrat initial V39 relie la croissance à l'air réel des cellules. V74 inclut la canicule dans l'air extérieur et les échanges des pièces, donc dans ces facteurs ; coton V71, pommes de terre et maïs V84 utilisent aussi ce profil thermique. Pas de taux de chaleur indépendant des plantes et de la santé.

**V87 validée** ajoute le [climat annuel et la survie végétale](site-climate.md) : saisons du profil choisi, mortalité au gel, obscurité prolongée et vieillissement, ainsi que perte/régénération des feuilles des baies. Les [incendies](fires.md) utilisent les mêmes points de vie végétaux. Les [preuves V87](../history/validation-environment-v87.md) suivent la campagne commune ; cette extension ne remplace pas les preuves historiques V39.

[Recherche initiale](../research/plant-temperature-reference.md), [agriculture](farming.md), [air local](temperature.md), [preuves](validation.md). Le lot V39 complétait le riz et les buissons alors présents, sans nouveau biome ni appareil thermique.

## Règles présentes

Pour les quatre cultures et les buissons de baies, le facteur thermique est nul à 0 °C et en dessous, monte linéairement jusqu’à 100 % à 6 °C, reste plein jusqu’à 42 °C, puis décroît jusqu’à zéro à 58 °C. Il multiplie lumière, repos quotidien et fertilité. Une plante mûre encore vivante reste récoltable quand sa croissance est arrêtée. La température pertinente est celle de sa cellule, y compris une ouverture de toit dans une pièce retenant de l’air.

Les nouveaux semis exigent une température strictement comprise entre 0 et 58 °C. L’énumération des cultures n’émet pas de nouveau travail de préparation hors plage ; un ancien semis en attente non réservé est retiré avant la décision des colons. Une tâche déjà acceptée conserve ses règles d’interruption : changer de température seul ne supprime pas son travail. Une politique agricole modifiée ou une cible disparue continuent de l’interrompre. Les ordres directs utilisent les mêmes validations. La récolte mûre ne dépend pas de la permission de semer.

L’inspection distingue croissance totale, repos, manque de lumière et réduction thermique ; une cellule de champ explique la suspension des nouveaux semis. Le toit réellement construit coupe la lumière même lorsqu’il est masqué à l’écran. Un foyer de cuisine ne fournit pas la lumière agricole manquante ; il peut réchauffer l’air d’une pièce comportant quelques ouvertures de toit. La chaleur des appareils et des incendies modifie le même air, sans créer de croissance sous un toit opaque.

## Historique et coût

`Resource.growthThermalFactor` est le facteur de l’intervalle commencé à `growthTick`, pas une température. Absence signifie 1. Avant un changement, la progression sous l’ancien facteur est inscrite dans `growth`, puis l’ancre avance au tick courant. Revenir à 1 retire le champ sans effacer le retard acquis. Le facteur n’est jamais appliqué rétroactivement depuis la date du semis. Les requêtes de croissance et l’inspection sont pures.

`thermal-plants.ts` groupe les plantes par région thermique. L’index dérivé appartient au World et dépend du tableau de ressources et de la disposition thermique vérifiée. Les producteurs remplacent le tableau, les checkpoints peuvent modifier une plante en place. Un facteur inchangé ne parcourt pas les plantes de son groupe ; une forêt dans le profil tempéré conserve ses ancres et l’intégrale lumineuse O(1). Une température non optimale changeante visite les plantes du groupe concerné et augmente les deltas : ce coût est mesuré, pas déclaré nul.

Au début du traitement, les taux sont réconciliés. Chaque tick intègre l’ancien intervalle, puis adopte le nouveau milieu avant les décisions agricoles ; une modification de pièce/toit ou un nouveau plant réconcilie les groupes après les actions. Les toitures continuent de checkpointter leur ancien éclairage avant modification. Aucune intégration thermique dans les frames ni dépendance à la caméra. Les différences de cadence avec les ticks rares de RimWorld sont une adaptation assumée à notre horloge de 6 Hz depuis V82.

## Sauvegardes et protocoles

Historique V39 : V38 est strictement validée avant migration. Les anciens facteurs absents restent neutres : aucune histoire de froid n’est inventée et aucune croissance passée n’est recalculée selon la température actuelle. La première réconciliation conserve la progression ancienne avant d’appliquer le nouveau facteur. Le schéma V39 acceptait seulement un facteur fini entre 0 et 1 sur riz/baies avec checkpoint de croissance valide ; les versions suivantes ont étendu les plantes admissibles avec leur catalogue. Une ancienne version contenant un champ futur est refusée.

V87 valide V86 avant migration. Le profil historique conserve son cycle tant que le climat n'est pas adopté explicitement. L'adoption ancre la croissance déjà acquise et commence les observations vitales sans gel, obscurité ni âge passés inventés. Calendrier, origines et états vitaux sont persistés selon [site-climate](site-climate.md#migration-et-continuation).

Le codec de snapshots compare et transmet aussi le facteur, même si aucun autre attribut ne change. Les mondes déjà décodés restent immuables, un delta invalide ne remplace pas leur état.

## Limites courantes et périmètres historiques

Mortalité au gel, perte/régénération des feuilles, obscurité prolongée et vieillissement sont implémentés en V87. Maladies végétales, croissance biologique des arbres, cultures supplémentaires, épaisseur de neige, autres biomes et lampes agricoles restent absents. Les interactions de semis avec lumière/espèces adjacentes ne sont pas toutes livrées : notamment l’exclusion locale actuelle autour des arbres est cardinale, alors que le code consulté examine huit voisins. Cet écart est consigné pour le lot de règles de placement, pas déclaré conforme.

Le site quotidien 14–28 °C reste la règle historique sans climat adopté ; le plafond de 28 °C concerne les feux de camp, pas les incendies. Le refroidisseur passif V40, les appareils électriques et le réseau ont été livrés depuis cette première tranche. Le profil annuel V87 peut produire d'autres températures sans garantir un gel ou une catastrophe pendant chaque parcours. La validation distingue ces conditions naturelles des frontières contrôlées ; le calendrier de développement demeure uniquement dans ROADMAP.
