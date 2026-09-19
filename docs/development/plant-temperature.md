# Croissance et semis sous température locale — V39

V74 inclut la canicule dans l’air extérieur et les échanges des pièces, donc dans ces facteurs ; le coton V71 utilise le même profil thermique. Pas de taux de chaleur indépendant des plantes et de la santé. La mortalité au gel reste absente.

[Recherche renouvelée](../research/plant-temperature-reference.md), [agriculture](farming.md), [air local](temperature.md), [preuves](validation.md). Ce lot complète le riz et les buissons déjà présents, sans nouveau biome ni appareil thermique.

## Règles présentes

Pour ces deux plantes, le facteur thermique est nul à 0 °C et en dessous, monte linéairement jusqu’à 100 % à 6 °C, reste plein jusqu’à 42 °C, puis décroît jusqu’à zéro à 58 °C. Il multiplie lumière, repos quotidien et fertilité. Une plante mûre reste récoltable quand sa croissance est arrêtée. La température pertinente est celle de sa cellule, y compris une ouverture de toit dans une pièce retenant de l’air.

Les nouveaux semis exigent une température strictement comprise entre 0 et 58 °C. L’énumération des cultures n’émet pas de nouveau travail de préparation hors plage ; un ancien semis en attente non réservé est retiré avant la décision des colons. Une tâche déjà acceptée conserve ses règles d’interruption : changer de température seul ne supprime pas son travail. Une politique agricole modifiée ou une cible disparue continuent de l’interrompre. Les ordres directs utilisent les mêmes validations. La récolte mûre ne dépend pas de la permission de semer.

L’inspection distingue croissance totale, repos, manque de lumière et réduction thermique ; une cellule de champ explique la suspension des nouveaux semis. Le toit réellement construit coupe la lumière même lorsqu’il est masqué à l’écran. Le feu ne fournit pas la lumière agricole manquante ; il peut réchauffer l’air d’une pièce comportant quelques ouvertures de toit.

## Historique et coût

`Resource.growthThermalFactor` est le facteur de l’intervalle commencé à `growthTick`, pas une température. Absence signifie 1. Avant un changement, la progression sous l’ancien facteur est inscrite dans `growth`, puis l’ancre avance au tick courant. Revenir à 1 retire le champ sans effacer le retard acquis. Le facteur n’est jamais appliqué rétroactivement depuis la date du semis. Les requêtes de croissance et l’inspection sont pures.

`thermal-plants.ts` groupe les plantes par région thermique. L’index dérivé appartient au World et dépend du tableau de ressources et de la disposition thermique vérifiée. Les producteurs remplacent le tableau, les checkpoints peuvent modifier une plante en place. Un facteur inchangé ne parcourt pas les plantes de son groupe ; une forêt dans le profil tempéré conserve ses ancres et l’intégrale lumineuse O(1). Une température non optimale changeante visite les plantes du groupe concerné et augmente les deltas : ce coût est mesuré, pas déclaré nul.

Au début du traitement, les taux sont réconciliés. Chaque tick intègre l’ancien intervalle, puis adopte le nouveau milieu avant les décisions agricoles ; une modification de pièce/toit ou un nouveau plant réconcilie les groupes après les actions. Les toitures continuent de checkpointter leur ancien éclairage avant modification. Aucune intégration thermique dans les frames ni dépendance à la caméra. Les différences de cadence avec les ticks rares de RimWorld sont une adaptation assumée à notre horloge de 10 Hz.

## Sauvegardes et protocoles

V38 est strictement validée avant migration vers V39. Les anciens facteurs absents restent neutres : aucune histoire de froid n’est inventée et aucune croissance passée n’est recalculée selon la température actuelle. La première réconciliation conserve la progression ancienne avant d’appliquer le nouveau facteur. Le schéma accepte seulement un facteur fini entre 0 et 1 sur riz/baies avec checkpoint de croissance valide. Une ancienne version contenant ce champ est refusée.

Le codec de snapshots compare et transmet aussi le facteur, même si aucun autre attribut ne change. Les mondes déjà décodés restent immuables, un delta invalide ne remplace pas leur état.

## Limites et prochaines dépendances

Mortalité au gel, perte/régénération des feuilles, obscurité prolongée, vieillissement et maladies ne sont pas implémentés. Les arbres n’ont toujours pas leur cycle de croissance. Autres espèces, saisons, météo, neige, biomes et lampes agricoles restent absents. Les interactions de semis avec lumière/espèces adjacentes ne sont pas toutes livrées : notamment l’exclusion locale actuelle autour des arbres est cardinale, alors que le code consulté examine huit voisins. Cet écart est consigné pour le lot de règles de placement, pas déclaré conforme.

Le site actuel reste à 14–28 °C et le feu est plafonné à 28 °C : une partie ordinaire ne crée pas encore les extrêmes des fixtures. Avant d’ajouter gel saisonnier ou biomes froids, livrer la survie des plantes au froid. Le prochain lot est le refroidissement passif ; les appareils électriques et leur réseau suivent ensuite.
