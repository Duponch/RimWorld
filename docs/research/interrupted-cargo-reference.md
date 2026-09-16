# Fatigue, interruption et objets portés — vérification V44

Relecture du 16 septembre 2026, RimWorld Core. Corpus : chapitres 8/9/14 (SYS/TEST-044/079, ordres 031..034/047..050, stockage 051..054) et chapitre 15, SYS/TEST-096 pour la future incapacité. **Adopter** l'interruption physique et la propriété unique ; **adapter** le dépôt et la cadence ; **différer** blessure, état médical à terre, secours et équipement. La fatigue ne constitue pas une blessure.

## Sources croisées

- [Rest](https://rimworldwiki.com/wiki/Rest) décrit l'épuisement à repos nul et le sommeil sur place ; une faible jauge ne constitue pas directement un multiplicateur de travail/combat. Nous ne modifions pas les taux V12 dans ce correctif.
- [Downed](https://rimworldwiki.com/wiki/Downed) distingue l'incapacité médicale et ses conséquences sur l'équipement/cargaison. Cette page ne suffit pas à définir le comportement du sommeil forcé : ne pas fusionner les deux états.
- Le miroir identifié par `2d508035082e7cb0c8e29e230d26bda6e546928f` permet de suivre la chaîne : [Need_Rest](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/Need_Rest.cs) démarre un sommeil involontaire avec interruption forcée ; [Pawn_JobTracker](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse.AI/Pawn_JobTracker.cs) tente un dépôt proche pendant la fin de tâche, sans conditionner son nettoyage à la réussite ; [Pawn_CarryTracker](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/Pawn_CarryTracker.cs) signale l'échec d'un dépôt sans transformer l'objet en ressources abstraites.

Confiance élevée sur la séparation interruption/échec de dépôt dans cette chaîne identifiée ; moyenne sur la parité avec la version commerciale actuelle, le miroir n'étant pas une distribution officielle certifiée. Wiki et miroir n'établissent pas ensemble tous les détails du placement dans une colonie saturée. Aucun fichier Core n'est intégré à notre code.

## Audit rétroactif et décision

Notre ancien `processNeeds` abandonnait l'effondrement si `releaseWork` ne pouvait déposer. Un transporteur à zéro de repos, une file réservée et toutes les cases locales occupées reproduisent le défaut : état « moving » au lieu de sommeil. Le scénario échouait avant le correctif. C'est un défaut de contrat, pas un manque de FPS.

V44 libère engagements et file même lorsque le dépôt échoue, conserve la cargaison avec un marqueur autoritaire et permet sommeil/réveil. Le dépôt actuel exige une case vide connectée dans un rayon local de douze, sans fusion afin de garder l'identité ; sa recherche déphasée et l'attente avec cargaison sont des **adaptations**, pas une règle Core prétendument vérifiée. La reprise directe d'une cargaison, le secours et le transfert d'un objet porté par un patient restent ouverts.

L'arête déjà commencée se termine avant l'effondrement : adaptation de notre continuité physique, distincte de la future interruption médicale instantanée. Les soins ne pourront pas se contenter d'appeler ce chemin en plein déplacement sans définir la pose d'arrêt et la nouvelle propriété du corps.

Voir le [contrat livré](../development/interrupted-cargo.md) et la [préparation médicale](health-preparation.md). Le parcours normal de plusieurs jours ne provoque pas nécessairement la saturation : la fixture extrême et l'essai UI dédié complètent le pilote, ils ne prouvent pas une couverture exhaustive.

Cas relu : `CanInvoluntarilySleep` exclut aussi l’adulte déjà engagé dans `LayDown`, même sur le trajet. Notre exclusion de `need.kind=sleep` ne doit donc pas être retirée au motif qu’un trajet n’accorde pas encore de repos ; les deux questions sont distinctes.
