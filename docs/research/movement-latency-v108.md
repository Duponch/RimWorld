# Réactivité des déplacements — V108

26 septembre 2026. Reprise des chapitres 2/3/5/10/21/29/32 et SYS-005/020..022/051..061/113..117/172..177 de la [référence de présentation](presentation-timing-reference.md). Aucun nouveau mécanisme RimWorld : correction d'une latence propre au transport worker et au rendu de Lisière.

## Références et diagnostic

[MDN, Worker.postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage) et [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), relus ce jour : livraison asynchrone, timestamp de frame distinct de l'heure de réception, aucune garantie de délai maximal d'ordonnancement. Ces API ne justifient pas quatre ticks d'attente ; la réserve se choisit par mesure. Le miroir RimWorld daté cité dans la référence historique ne prouve aucune latence de la version commerciale actuelle. Aucune parité en millisecondes n'est annoncée.

Le clic tactique au sol appelle directement `SimulationClient.command`, sans requête préalable d'options. Le worker calcule le chemin dans `applyCommand`, publie l'état puis accuse la commande. Le prochain tick admissible appelle `startTravel`. Le pas local vaut 1/6 seconde à ×1 : cette attente logique est distincte du retard de dessin. Une arête engagée, une porte ou une récupération de combat restent des attentes physiques légitimes.

Les déplacements autonomes partagent le même curseur de rendu. Un travail trouvé peut partir dans le tick de planification ; une désignation réveille le planificateur. Sans tâche disponible, le contrôle différé de 20 ticks et le budget de recherche restent des règles du planificateur, indépendantes du tampon graphique. Aucun retour du rendu vers la simulation ne cumule sa latence dans les tâches. Cette vérification ciblée ne certifie pas l'absence de tout défaut dans toutes les boucles du jeu.

## Décision et limites

**Adapter** : deux ticks confirmés au lieu de quatre, sans modifier le débit, les phases métier, l'ordre des décisions, les PRNG, la navigation ou les sauvegardes. **Conserver** : curseur partagé corps/cargaison/animaux/scène, transitions discrètes, arrêt à la frontière confirmée, vitesses horodatées, pause et reprise. **Rejeter** : un seul tick, qui produit des images sans progression dans les simulations de livraison irrégulière et des images à progression bridée dans le navigateur réel.

Le réveil worker de 20 ms produit des messages seulement après un tick ; à ×6 les intervalles ordinaires peuvent atteindre 40 ms. Quarante replays déterministes combinent phases de réveil, livraison irrégulière de 0/20 ms et changements de vitesse. Le test historique qui publiait toutes les 50 ms pendant les changements de vitesse épuisait deux ticks dans une configuration ; son producteur a été aligné sur les 20 ms réels, en conservant l'oracle de vitesse. Les tests séparés de livraisons clairsemées, de transitions scène/chargement et d'absence d'extrapolation restent actifs. Une surcharge supérieure à la réserve peut toujours figer brièvement la présentation : aucun rattrapage accéléré ou mouvement inventé ne le masque.

[Contrat](../development/presentation-timing.md), [mesures et limites](../history/validation-latency-v108.md).
