# Validation courante — V40

15 septembre 2026. Refroidisseur passif, combustible partagé, contrôle du premier geste GPU. [Contrat](passive-cooling.md), [recherche](../research/passive-cooling-reference.md). Les preuves V39 sont conservées dans [l’archive plantes/présentation](../history/validation-v39-plants-playability.md).

## Simulation et continuité

Le lot regroupé de migrations, commandes et boucles affectées a validé **76 tests** ; le pilote a détecté l’attente de catalogue non actualisée (la nouvelle clé `passive-cooler: 0` manquait). Son bilan métier de cinq jours sur la première graine était cohérent. L’attente a été complétée, sans retirer l’exigence de ne pas construire un appareil inutile dans le camp ouvert. Le rejeu final des deux scénarios thermiques et du pilote passe : **3 tests, 137,43 s**, dont cinq à huit jours sur trois cartes naturelles. Les exigences de stocks, repas, repos, minage, taille, toiture et reprise restent satisfaites.

Deux scénarios thermiques couvrent les 50 bois livrés, plan/cadre/finition, réservoir initial, cinq jours de consommation, seuil/volume, extérieur, absence de réfrigération alimentaire, extinction, réapprovisionnement automatique et forcé, interruption conservatrice, reprise de chantier/service et déconstruction sans restitution. Anciennes versions, matériau, orientation, réservoir et factures invalides sont refusés. Le pilote partage les commandes et le bilan de chaque appareil. Les deux scénarios de bridge/snapshots passent également en 1,98 s.

Compilation TypeScript/Vite réussie : 200 modules, worker **233,29 kB**, bundle principal **1 079,86 kB / gzip 303,50 kB**. L’avertissement existant de taille demeure. Un lancement Vite restreint a échoué sur le lancement de processus Windows (`EPERM`) ; le lancement autorisé a réussi, sans changement de code pour contourner une erreur de compilation.

## Partie visible et GPU

Chromium natif WebGPU, AMD RDNA-1 / Ryzen 5 3600, 1440×1000. [Rapport thermique](../../artifacts/passive-cooler-ui-v40.json) : construction et livraison par UI dans une pièce initialement chaude, température affichée à 17 °C, âge du riz identique à une continuation sans refroidisseur, sauvegarde/rechargement exact. Une seconde fixture démarre vide pour tester l’ordre manuel, le travail de service visible et le retour à un réservoir alimenté ; aucune injection ne remplace les actions de ravitaillement. Captures inspectées ; compteur FPS visible. Le parcours final passe en **14,9 s** (16,4 s avec le runner), avec une rotation préalable puis un aperçu valide du bâtiment fixe.

Le premier contrôle a trouvé **deux pipelines synchrones** de curseur double face au tick initial, avant construction. Ils sont maintenant préparés au chargement. **Zéro pipeline nouveau** pendant la construction et zéro pendant la recharge dans le parcours final. Seize parties du bâtiment partagent le lot instancié existant ; aucune lampe ni matériau supplémentaire. Les percentiles du rapport UI comprennent les chargements explicites et ne constituent pas un audit de simulation à 100 colons.

[Contrôle temporel naturel](../../artifacts/harvest-sync-v40-validation.json) : deux zones de 45 secondes, trois colons sur 250², **44 changements de vitesse** ; délai **9,4–25,5 ms**, zéro saut, occupation de roche affichée, snapshot affamé après amorçage ou retrait anticipé détecté. Frames p95/p99 : **8,3/8,4 ms** ; maximum **20,9 ms** au minage et **29,2 ms** à l’abattage. 31 retraits miniers et 39 arbres observés. Ce contrôle teste les poses et conséquences affichées, pas seulement les états finaux.

## Audit CPU avec ravitaillement

[Rapport brut](../../artifacts/passive-cooling-cpu-v40.json), [script](../../scripts/passive-cooling-bench.ts). Node 24.11.1, Ryzen 5 3600, sans autre test lourd concurrent. Carte synthétique 250², autant de pièces couvertes de 16 cellules que de transporteurs ; appareils initialement vides, stocks physiques de bois, 600 ticks de prélèvement/trajet/service/besoins/température. Un watchdog interrompt chaque cas après 45 secondes. Aucun rendu ni forêt dans cette mesure.

| Transporteurs actifs au pic | Tick p95 | Tick maximum | Clonage p95 | Sources seules p95 |
|---|---:|---:|---:|---:|
| 3 | 0,811 ms | 27,008 ms | 0,727 ms | 0,0027 ms |
| 30 | 2,588 ms | 43,348 ms | 2,115 ms | 0,0092 ms |
| 100 | 26,592 ms | 43,232 ms | 6,116 ms | 0,0324 ms |

Tous les appareils sont ravitaillés, les pièces atteignent 17 °C, le bois reste conservé et la reprise est exacte. Les sources seules sont mesurées séparément sur une copie : ce coût marginal ne représente pas l’ensemble des échanges/planners. Le premier checkpoint peut atteindre **63,5 ms**. Le coût complet à 100 travailleurs dépasse le budget d’une simulation à 60 ticks/s ; ne pas présenter cet essai comme une garantie de vitesse 6×. Les coûts des décisions/navigation et de communication restent à optimiser avant généralisation des grandes colonies.

La partie UI de trois jours n’est pas rejouée dans ce lot : son inventaire attendu est entretenu, le pilote cœur complet et le nouveau parcours UI ciblé apportent des preuves distinctes. Santé/confort thermiques, réseau électrique, météo, saisons et appareils réfrigérants restent non exercés car non implémentés.

Contrôle documentaire final : **147 documents, 1 521 liens locaux**, références originales inchangées octet pour octet. `git diff --check` passe.
