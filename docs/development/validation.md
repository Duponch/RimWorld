# Validation courante — températures et conservation V38

15 septembre 2026. [Contrat thermique](temperature.md), [sources et adaptations](../research/temperature-reference.md), [inventaire fonctionnel](../gameplay/implementation-status.md). Les [preuves V37](../history/validation-v37-light-work.md) et l’[audit graphique V36](../history/validation-v36-environment-lighting.md) restent datés ; aucun nouveau shader ou pipeline dans ce lot.

## Simulation et continuation

La première suite groupée a exercé **121 tests dans 41 fichiers en 216,64 s** : 119 succès, deux échecs. La migration synthétique V35 conservait un champ thermique V38 : correction de la fixture, sans assouplir le validateur. Le pilote de colonie a dépassé sa limite de 180 s ; le calcul thermique parcourait la carte entière à chaque appel de simulation. Il utilise maintenant une preuve spatiale bornée, avec recontrôle des cellules utilisées. La limite du test n’a pas été augmentée.

Après ces corrections, le lot température/milieu/pilote a passé **cinq tests dans trois fichiers en 118,81 s**, comprenant les parties cœur de cinq à huit jours sur trois graines. Le scénario alimentaire a ensuite été enrichi d’un vrai transport sortant d’une pièce froide et d’une reprise à mi-trajet ; un matériau de porte manquant dans cette nouvelle fixture a été corrigé. La dernière relecture a ajouté les parois d’une porte sans pièce ordinaire adjacente. Les **deux scénarios thermiques finaux passent en 1,62 s**. Tous les échecs observés sont résolus ; la suite complète n’a pas été relancée après les corrections ciblées.

Les deux scénarios couvrent : seuil exact de 25 % sans toit, fuite partielle, chauffage/extinction, porte ouverte/fermée, portes adjacentes et porte isolée, division/fusion par volume, sauvegarde et delta worker, températures et taux invalides, validation stricte V37, gel/dégel, taux partiel, mélange des âges, expiration avant action, transport physique froid→chaud avec quantité et continuation conservées. L’oracle spatial compare la recherche bornée au graphe global indépendant sur 60 cartes ; huit mutations de terrain en place par carte conservent clé/horloge/identité des tableaux. Il contrôle aussi les dimensions à aire identique et l’immuabilité des anciens résultats. Ce corpus ne prétend pas couvrir tous les bugs possibles.

## Partie jouée et interface

Chromium natif WebGPU, AMD RDNA-1, viewport 1440×1000. L’atelier couvert passe en **11,3 s** : départ froid synthétique à 5 °C, feu construit par le colon avec ressources physiques, réchauffement au-dessus de 15 °C sans dépasser 28 °C, production de 20 blocs et sauvegarde/reprise exacte. La capture a été inspectée : température locale et extérieure lisibles, FPS toujours visible. Le froid initial est une fixture, pas un appareil disponible dans le jeu.

Le [pilote UI de trois jours](../../artifacts/colony-temperature-three-days.json) passe en **6,4 minutes**, carte naturelle 250² graine 42. Il construit et entretient son camp par l’interface, sans ressources injectées : **21 repas cuisinés, 18 prises alimentaires, trois dormeurs observés**, cultures renouvelées, 28 cases couvertes, atelier de taille, porte et constructions en bois/pierre. À la fin : 50 acier rangés, 30 incorporés à l’atelier, 15 blocs rangés puis nouvelle extraction commandée. Bilans bois/nourriture réconciliés, rechargements quotidiens exacts, aucune erreur navigateur. Les diagnostics thermiques restent dans le domaine tempéré attendu. Le camp de ce pilote n’est pas une enceinte chauffée complète ; la validation du réchauffement appartient à l’atelier ci-dessus. [Capture finale inspectée](../../artifacts/colony-three-days.png).

## Audit CPU reproductible

[Banc](../../scripts/temperature-bench.ts), [données](../../artifacts/temperature-cpu.json). Windows, Ryzen 5 3600, Node 24.11.1. Carte synthétique 250² ; 3/30/100 pièces couvertes distinctes de 16 cases, un artisan, trois fragments et un feu par pièce. Fabrication et rangement réels ; contrôle du bilan et continuation sauvegardée. Pas de rendu ni autre charge lourde concurrente de cet agent. Watchdog de 90 s par cas ; initialisation, validation et clonage hors durée des ticks.

| Artisans actifs | Blocs produits | Tick p95 / p99 / max (ms) | Lecture thermique inchangée p95 (ms) | Initialisation (ms) |
|---:|---:|---:|---:|---:|
| 3 | 180 | 0,68 / 4,18 / 24,70 | 0,07 | 1,55 |
| 30 | 1 800 | 7,90 / 17,35 / 25,91 | 0,24 | 2,56 |
| 100 | 6 000 | 22,47 / 28,21 / 36,94 | 0,87 | 5,05 |

Les états thermiques finaux représentent 388 / 3 763 / 12 513 caractères JSON. Clonage des snapshots : p95 0,52 / 4,22 / 11,35 ms ; maxima 37,02 / 41,17 / 40,39 ms incluant le premier checkpoint complet. Le maximum de taille inclut aussi ce checkpoint ; il ne mesure pas le trafic régulier seul.

À cent artisans, le p95 CPU dépasse encore les 16,67 ms nécessaires pour tenir 6× à dix ticks locaux/s. Des pointes demeurent ; cet audit ne mesure ni FPS ni temps GPU. Le chemin thermique évite le balayage global des 62 500 cellules pour un petit camp, mais l’augmentation des pièces et des consommateurs devra être remesurée. La correction finale des portes ne change pas cette fixture sans portes.

## Compilation et documents

TypeScript/Vite compilent : 192 modules, worker 229,29 kB, bundle jeu 1 075,55 kB (302,06 kB gzip) après la correction finale des portes. Le contrôle documentaire vérifie 136 documents, 1 429 liens locaux, 25 domaines et cinq familles de validation ; les trois originaux restent identiques octet par octet. Aucune dépendance ajoutée ; avertissement préexistant de chunk supérieur à 500 kB conservé.

G0 reste en consolidation, G1 partiel et G2 en cours. Les contrats, guide, catalogue, inventaire, matrice et adoption du corpus distinguent V38 et ses limites : pas encore d’appareil de froid, saisons/météo, santé/confort thermique ou croissance sous température extrême. Prochain lot : consommateurs végétaux de la température, puis refroidissement passif et chaîne du froid équipée.
