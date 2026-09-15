# Vérification de la présentation des déplacements

15 septembre 2026. Régression de rendu sous V38 ; les règles de minage, d’abattage et leurs quantités ne changent pas. Corpus : chapitres 2/3/5/10/21/29/32, SYS-005/020..022/051..061/113..117/172..177, familles F1/F2/F3. **Adopter** les phases physiques, les trajets et l’observation cohérente ; **adapter** le transport navigateur et la chronologie de présentation. [Contrat local](../development/presentation-timing.md).

## Sources relues

- [Pawn_DrawTracker, miroir de code à révision fixée](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/Pawn_DrawTracker.cs) : position de dessin issue du tweener, avec décalages de travail et de mouvement. Cela confirme la séparation entre position logique et présentation dans ce miroir, pas notre stratégie de buffer ni une parité avec chaque version commerciale. Aucune implémentation copiée. Incertitude de provenance/version du miroir conservée.
- [MDN — requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) : timestamp commun aux callbacks d’une image, différent de l’heure au moment où un callback s’exécute ; cadence liée à l’écran et suspension habituelle dans un onglet masqué. Utiliser ce temps de frame pour une vitesse indépendante des FPS.
- [MDN — Worker.postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage) : messages asynchrones et clonage structuré. Réception d’un état et instant où il doit devenir visible restent deux responsabilités distinctes.

Les deux documents MDN décrivent les API utilisées, pas RimWorld. Le miroir apporte un indice technique spécifique à la référence ; il ne démontre pas le comportement visuel par une partie filmée. Les durées de minage et règles végétales restent dans leurs [recherches](mining-reference.md) [respectives](plant-growth.md). Aucun nouveau coefficient de gameplay n’est déduit de cet audit.

## Preuve locale et décision

Le banc natif sur carte naturelle 250² reproduit 23 sauts en 45 secondes après changements 1×/3×/6× toutes les deux secondes, avec un retard atteignant 268,49 ticks et un FPS pourtant élevé. Après correction de l’horloge seule, le contrôle a révélé des images où le colon entrait dans la roche encore affichée : les publications périodiques manquaient une transition. L’observation des phases à chaque tick et l’application différée du monde résolvent les deux causes dans les scénarios mesurés. Les [rapports courants](../development/validation.md) distinguent ces preuves des objectifs généraux.

## Réactivité des vitesses — recontrôle du 15 septembre

Le [TickManager à la même révision](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/TickManager.cs) affecte directement la vitesse courante après vérification du contrôle du joueur ; le multiplicateur de ticks lit cette valeur. Le miroir ne justifie aucun délai fixe d’une seconde au changement normal/rapide. Cela ne prouve pas une latence mesurée de RimWorld commercial : limites de charge et ralentissements forcés restent distincts. Le contrat RAF de MDN a aussi été relu.

Décision : **adapter** la présentation navigateur pour appliquer la vitesse confirmée à la frame suivante, conserver le curseur et les phases de scène, remplir une réserve de quatre ticks seulement à l’amorçage. Publier les fins de lots actifs de 20 ms en plus des transitions ; conserver le temps partiel du worker. Le taux demandé change immédiatement, mais une simulation trop coûteuse peut toujours fournir moins de ticks par seconde. Le démarrage/reprise après vidage est un cas distinct, explicitement documenté.
