# Navigation prédatoire progressive V191 — contrat

Statut : livré dans le périmètre de la [preuve ciblée](../history/validation-prey-navigation-v191.md), sans nouvelle mécanique ni migration ; schéma 178. Le [contrat de prédation V190](predation-v190.md) conserve régime, classement biologique, contact et budgets. V191 remplace uniquement son exploration exhaustive lorsqu'une proie accessible peut être reconnue plus tôt. La [recherche technique](../research/prey-navigation-web-v191.md) distingue principe et preuve locale ; la preuve V190 reste historique.

## Équivalence exigée

Une consultation conserve une unique `WeightedSearch` et une capture synchrone de traversabilité/coûts. La recherche alimentaire reste identique : tout aliment accessible précède les proies, même lointain. Sans aliment accessible, interroger les cinq contacts de chaque proie dans l'ordre biologique reçu ; conserver leur ordre centre, gauche, droite, haut, bas et leurs égalités de coût. La première proie accessible conserve exactement cible, contact, coût et suite de cellules du champ exhaustif V190.

`advance` finalise la couche entière de coût égal, avec les mêmes parents et le même ordre de file. Lire seulement les cellules finalisées du champ partiel ; les cellules simplement découvertes ne prouvent aucun accès. Retourner le trajet directement depuis ce champ privé, sans nettoyage des sentinelles de toute la carte. Une proie inaccessible peut épuiser la composante ; reprendre alors la même recherche pour les suivantes. Si aucune proie ne convient, finaliser uniquement pour le repli demandé vers une bordure et conserver son ordre historique. Pas de cache entre décisions, acteurs, ticks ou mutations ; aucun état World/PRNG modifié.

## Validation et mesure

Comparer la requête optimisée à une référence exhaustive capturée depuis V190 : résultat complet et trajet exacts. Un oracle indépendant de distances pondérées contrôle les petites topologies, obstacles, coins et surcoûts dirigés. Couvrir aliment prioritaire, proie proche/lointaine, première inaccessible, contacts égaux, contact à l'origine, bordure et absence de résultat. Contrôler une seule identité de recherche, continuité de la vraie chasse et reprise sauvegardée.

Mesurer successivement A/B/B/A sur les mêmes scènes 250², sources gelées, préparation et oracles hors chronométrage. Distinguer le cas sans aliment avec proie proche des cas déjà exhaustifs par échec alimentaire ou proie inaccessible. Aucun gain général de tick, GPU ou FPS déduit de cette consultation. Contrôles ciblés de navigation/faune et build ; les preuves graphiques V190 ne changent que si une équivalence de trajet échoue ou si un contrat de présentation est modifié.
