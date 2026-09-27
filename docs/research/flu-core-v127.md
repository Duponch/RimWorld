# Grippe et incidents de maladie — relevé Core 1.6.4871

Le relevé porte sur l'installation locale `E:/Steam/steamapps/common/RimWorld/Data/Core` (version 1.6.4871), sans extension ni mod. Il distingue les définitions observées de l'interprétation retenue pour Lisière. Une maladie trouvée dans les définitions ne suffit pas à prouver que toutes les conditions de son déclenchement sont reproduites.

## Déclenchement

`Defs/Storyteller/Storytellers.xml` inscrit la catégorie `DiseaseHuman` chez Cassandra après **9 jours révolus**. `Defs/Storyteller/Incidents_Map_Disease.xml` donne à l'incident humain une fraction de victimes comprise entre **20 et 50 %**. L'événement choisit des personnes admissibles ; la grippe n'est pas une contamination de voisin à voisin. Le jour 9 est la première admissibilité et non une date de maladie garantie.

`Defs/BiomeDefs/Biomes_Temperate.xml` donne un délai moyen de **50 jours à la catégorie entière** en forêt tempérée, puis un poids **100 sur 470** à `Disease_Flu` parmi les maladies humaines de ce biome. La forêt boréale donne 60 jours et un poids 100 sur 370 ; la broussaille aride 65 jours et 100 sur 390. La difficulté `Medium`/« Récit d'aventure » multiplie l'intervalle de maladie par **1,5** : respectivement **75, 90 et 97,5 jours** pour cette catégorie. Appliquer le délai de la catégorie à chaque maladie séparément surestimerait fortement la fréquence.

## Évolution et réponse

`Defs/HediffDefs/Hediffs_Local_Infections.xml`, `Flu` : gravité initiale **0,001**, seuil mortel **1**, progression **+0,2488 par jour** tant que l'immunité est incomplète, gain d'immunité nominal **+0,2388 par jour malade**, puis décroissance **−0,4947 par jour** une fois immunisé. Un traitement dure **12 heures** et retranche jusqu'à **0,0773 de gravité par jour**, selon sa qualité. La vitesse d'immunisation dépend aussi de l'état physique et du repos ; le dossier d'infection des plaies ne doit pas partager arbitrairement l'immunité de la grippe.

Les stades de gravité à **0**, **0,666** et **0,833** réduisent conscience, manipulation et respiration. Les stades élevés peuvent provoquer des vomissements. `Defs/ThoughtDefs/Thoughts_Situation_General.xml` donne à `Sick` un effet d'humeur de **−5** durant la maladie. La prise en charge passe par un médecin, un médicament autorisé par la politique du patient et le repos réel ; la simple existence d'un lit ne constitue pas un soin.

## Frontière Lisière V127

Le jour Lisière dure **6 000 ticks**, contre **60 000 ticks Core**. Les vitesses quotidiennes sont converties, sans simuler dix occasions par tick local. La grippe dispose de sa propre gravité, immunité et échéance de traitement, séparées de l'infection de plaie et de l'intoxication alimentaire. Une occasion de la catégorie « autre maladie » peut être consommée sans créer un substitut grippe. Un tirage d'incident persistant et distinct du PRNG métier évite de décaler les décisions de production, combat et déplacements à chaque jour sain. Les anciennes colonies ne reçoivent ni malade, ni traitement ou médicament rétroactif à la migration.

Ce premier parcours ne constitue pas la bibliothèque complète de maladies, ni la parité de l'algorithme narratif Core. Les autres affections et leurs traitements spécifiques restent à développer. La présentation des probabilités et les preuves de reprise doivent rester séparées d'une promesse de date fixe ou d'équilibre d'une campagne longue.
