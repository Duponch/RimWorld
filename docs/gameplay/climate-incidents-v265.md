# V265 — Vague de froid et éclipse

Deux crises mettent à l’épreuve les installations existantes et leur entretien. Elles peuvent survenir dans les parties Cassandra à partir de la prochaine occasion ordinaire ; aucune crise passée n’est ajoutée au chargement d’une ancienne sauvegarde.

## Effets jouables

- **Vague de froid :** jusqu’à −20 °C à l’extérieur, avec arrivée et départ progressifs sur 1 200 ticks locaux. Les pièces échangent leur chaleur normalement ; vêtements, refuge fermé, chauffage et combustible servent à protéger les habitants. L’hypothermie et les facteurs thermiques agricoles existants restent actifs. Un toit ou une lampe ne garantit pas une température suffisante.
- **Éclipse :** la lumière naturelle tombe à zéro puis revient, avec transitions de 20 ticks locaux. Le ciel et le soleil s’assombrissent, les panneaux solaires cessent de produire et les cultures privées de lumière cessent de pousser. Batteries et générateurs continuent leur fonctionnement ordinaire ; les lampes horticoles alimentées conservent leurs horaires et leur lumière. L’horloge civile ne change pas.
- Deux alertes distinctes indiquent l’état, le temps restant et les moyens de protection. L’inspection d’un panneau distingue l’éclipse de la nuit. Les conditions simultanées gardent leurs deux alertes ; froid et canicule ne se superposent pas.

## Règles de référence et adaptations

Référence principale : Core local **1.6.4871 rev590**, définitions `Incidents_Map_Misc.xml`, `Incidents_World_Conditions.xml` et `GameConditions_Misc.xml`, puis classes `IncidentWorker_ColdSnap`, `GameCondition_ColdSnap` et `GameCondition_NoSunlight`. Le [miroir décompilé](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/GameCondition_NoSunlight.cs) explicite l’interpolation lumineuse ; la copie locale versionnée reste la référence.

Le froid dure **1,5 à 3,5 jours**, exige une température saisonnière strictement entre **0 et 15 °C**, a un poids de **1** et un délai de **30 jours** entre départs. L’éclipse dure **0,75 à 1,25 jour**, poids **1,5**, délai de **15 jours**. Conversion existante : un tick local représente dix ticks Core.

Adaptation : les deux tickets utilisent l’enveloppe fixe du narrateur local déjà en place, sans changer ses anciens intervalles ni transformer un ticket inéligible en une autre crise. Core cible le monde pour l’éclipse ; Lisière applique pour l’instant la condition à sa carte active. Les filtres et poids contextuels complets du narrateur, ainsi que les effets sur plusieurs cartes, restent absents. L’éclairage artistique conserve son plancher ambiant de lisibilité.

## Continuité et contrôles

Schéma **200** : validation du schéma 199 avant migration neutre, adoption de l’enveloppe météo au premier pas réellement joué. Les 62 sauvegardes publiques et leurs métadonnées restent inchangées. Sauvegardes et Decoder partagent la validation des durées, compteurs, horloges et chevauchements.

La croissance déjà acquise est conservée aux frontières de l’éclipse. Une petite intégrale dérivée limitée à cette crise garde les requêtes de croissance en O(1), sans historique climatique permanent dans la sauvegarde. Les prévisions de présentation observent le changement d’intervalle ; aucune cadence ou qualité n’est diminuée.

Validation regroupée : **96 cas uniques dans 15 fichiers** passent par reprises ciblées. Ils couvrent les conséquences thermiques et la protection par chauffage, lumière naturelle et artificielle, intégrales de croissance, prévisions végétales, solaire, sélection naturelle, migration et refus atomiques du Decoder. Les 62 sauvegardes publiques ont été décompressées, migrées et validées. Les premières erreurs concernaient des fixtures synthétiques sans provenance complète et un binding thermique laissé inchangé après déplacement ; les cas concernés ont été corrigés puis repris. Le raccord des prévisions végétales a été ajouté et vérifié avant livraison.

Typage et build passent. Le parcours Chromium **WebGPU** contrôle les deux alertes et dialogues, une sauvegarde/reprise exacte puis la continuation à 6× et la fin d’éclipse ; aucune erreur navigateur relevée. Un complément diurne vérifie l’assombrissement du soleil au-dessus de l’horizon et son retour. Ces scènes sont préparées : elles ne constituent ni une fréquence naturelle mesurée, ni une campagne longue, ni un gain FPS. Journaux privés sous `tmp/validation-runs`.
