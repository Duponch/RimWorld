# Validation courante — reconnaissance des pièces sous V34

15 septembre 2026. [Contrat](rooms.md), [recherche renouvelée](../research/rooms-reference.md). Schéma 34 inchangé ; G0 en consolidation, G1 partiel, première topologie d’habitat G2 livrée. Les preuves précédentes restent dans l’[audit CPU](../history/validation-v34-spatial-queries.md) et la [livraison des portes](../history/validation-v34-doors.md).

## Gameplay contrôlé

**Trois tests ciblés passants**, [rapport](../../artifacts/rooms-core.json) : deux scénarios de pièces et le scénario de snapshots. L’oracle indépendant par union compare chaque cellule de 80 cartes rectangulaires ; portes, eau, roches, meubles, changements en place, dimensions et anciens instantanés sont exercés. Le second scénario exécute déconstruction, reconstruction avec plan/cadre, reprise à progression égale et minage d’une brèche. Deux pièces de 36 cases fusionnent en 73, puis se séparent ; une extraction ouvre l’une sur le bord sans modifier l’autre.

**Parcours UI natif passé**, 11,9 secondes (13,3 secondes avec lancement) : enceinte synthétique, inspection cellule/colon, vrai abattage imposant le passage de porte, maintien ouvert sans fusion, mur déconstruit par le colon, sauvegarde/rechargement. L’inspection rouverte en pause lit bien la topologie actuelle. Chromium `channel: chromium`, `args: []`, viewport 1440×1000, backend **WebGPU** exigé, aucune erreur capturée. Captures locales `artifacts/rooms-ui-enclosed.png` et `rooms-ui-breach.png` inspectées : texte lisible dans le panneau existant et brèche visible. Le FPS reste présent ; le nombre ponctuel de la capture n’est pas un benchmark.

La première compilation a signalé une union TypeScript insuffisamment discriminée et deux champs manquants de la fixture ; corrigés avant les résultats finaux. Le lancement initial de Vitest dans le bac à sable a échoué sur `spawn EPERM`, puis a réussi avec autorisation des processus. Une extension du parcours UI utilisait Échap, qui efface volontairement la sélection ; le geste est corrigé en fermeture de l’onglet Travail, sans modifier ce comportement du jeu. Aucun échec final ni test ignoré.

Le pilote naturel et la longue UI ne sont pas rejoués : commandes, persistance, simulation et boucles de colonie inchangées. Leurs dernières preuves restent historiques au lot précédent. La tranche des toits devra enrichir leur construction et leurs bilans ; les trois tests actuels ne prétendent pas remplacer ces parcours ni couvrir toutes les anomalies.

## Petit audit CPU

[Mesure brute](../../artifacts/rooms-cpu.json), [script reproductible](../../scripts/room-topology-bench.ts), Ryzen 5 3600, Node 24.11.1. Une exécution sur 250×250, 4 000 murs, 100 enceintes et 100 colons synthétiques ; génération exclue, 100 vérifications d’échauffement. Puis 1 000 lectures sans changement et 300 ouvertures/fermetures de brèche alternées. Aucune suite lourde lancée simultanément par l’agent.

| Opération | p50 | p95 | p99 | maximum |
|---|---:|---:|---:|---:|
| Vérifier les obstacles, topologie inchangée | 0,162 ms | 0,265 ms | 0,325 ms | 0,434 ms |
| Vérifier et recalculer après modification | 0,885 ms | 1,392 ms | 3,287 ms | 6,936 ms |

Le nombre d’acteurs n’est pas une charge de travailleurs ici : aucun tick n’est mesuré, seulement la requête pure de topologie. Une lecture utile de l’inspecteur partage le résultat ; aucun calcul par acteur ni par frame. Le recalcul reste global, avec des pointes jusqu’à 6,94 ms dans cette exécution. Pas de promesse de coût nul, de FPS garantis ni d’invalidation locale déjà livrée. Rendu et buffers GPU inchangés.

## Compilation, documentation et portée

Build/typecheck final réussis : 177 modules, worker inchangé à 207,64 kB ; entrée graphique 1 069,83 kB, 300,18 kB gzip. Avertissement historique de bundle supérieur à 500 kB conservé. Liens locaux et intégrité des trois originaux contrôlés ; guide, inventaire, recherche, contrat, architecture et ROADMAP actualisés. Aucun objet ni matériau ajouté au catalogue.

La pièce est **reconnue et inspectable**, encore sans toit ni effets d’abri. Couverture/supports, thermique, rôles/statistiques, effets du lieu sur les ateliers et loisirs restent à développer. Le reste des manques est maintenu dans l’[inventaire fonctionnel](../gameplay/implementation-status.md) ; ce lot ne clôture pas G2.
