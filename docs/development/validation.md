# Validation du prototype

## V10 — Cuisine physique et combustible (14 septembre 2026)

[Règles revérifiées](../research/cooking-reference.md), [contrat et migration](cooking.md). Cette tranche ne clôt ni G0 ni G1. Les lots ci-dessous se recouvrent : leurs nombres ne doivent pas être additionnés comme une couverture indépendante.

### Simulation et reprise

Les [trois scénarios de production](../../artifacts/core-cooking-second.json) contrôlent construction du feu, deux jours de combustion, recharge physique, recette mélangée, interruptions, sauvegarde au travail, concurrence de deux postes, facture impossible sautée et comptage des repas. Le premier essai a détecté la place du poste occupée par un constructeur inactif : il s’écarte désormais par un déplacement réel.

Le [lot de contrats](../../artifacts/core-cooking-regression.json) passe 23/24 ; son seul échec est une nouvelle réserve du pilote placée sur une case naturelle occupée. Le camp a été corrigé pour placer ses réserves dans la clairière prévue. Un [parcours trop long a été arrêté](../../artifacts/cooking-colony-aborted.json) avant de profiler la charge. Après les optimisations, [13/13 scénarios](../../artifacts/core-cooking-colony-retry.json) passent, dont les cinq à huit jours sur trois cartes, en 35 secondes pour le parcours long.

Le [dernier lot](../../artifacts/core-cooking-final.json) passe 13/13 : colonie, génération, rectangles et simulations de conservation/continuation. Le pilote prévoit maintenant les ingrédients de sa facture, même quand ses rations initiales couvrent encore la faim. La graine 42 décide toutes les quatre heures de jeu comme le pilote navigateur ; les deux autres toutes les heures. Le parcours long passe en 27,6 secondes. Les bilans distinguent bois brûlé et conversion de dix ingrédients en un repas.

L’[oracle de navigation et production](../../artifacts/core-cooking-traffic.json) passe 4/4 scénarios : chemins exacts de chaque groupe comparés à la recherche complète sur 120 cartes, avec cibles inaccessibles, coins, égalités et occupations temporaires. Cela ne constitue pas une preuve exhaustive de toute configuration possible.

### Navigateur et présentation

Le [parcours court de cuisine](../../artifacts/ui-cooking-first.json) passe en 12 secondes sur Chromium **WebGPU** : feu construit par commande, réglage/ordre/suppression de factures, préparation arrêtée au tick 147, sauvegarde/rechargement exact, deux repas rangés au tick 324, dix ingrédients restants sur trente, aucune erreur console/GPU observée. Captures `cooking-work.png` et `cooking-complete.png` inspectées : poste, colon face au feu, matières au sol, factures et FPS visibles. Les flammes sont encore une représentation procédurale simple.

Le [premier parcours de trois jours](../../artifacts/ui-cooking-colony.json) termine au tick 18 072 avec trois lits/table/trois tabourets/six murs/un feu, quinze plants, jauges positives, bilan matière correct et zéro erreur console. Il échoue sur **quatre repas cuisinés au lieu d’au moins six** : le pilote attendait la baisse du stock alimentaire global avant d’approvisionner la facture. Le seuil n’a pas été abaissé ; sa politique de collecte est corrigée. Une [deuxième passe](../../artifacts/ui-cooking-colony-retry.json) révèle un clic sur une ressource masquée par Architecte : le pilote cadre désormais ses cibles par de vrais mouvements de molette et vérifie leur visibilité avant de cliquer. Le [scénario court de cadrage](../../artifacts/ui-player-framing.json) passe.

Le [lot final navigateur](../../artifacts/ui-cooking-final.json) passe **2/2** : trois jours en 328,5 secondes et frontières commandes/sauvegardes en 30,5 secondes. Au [tick 18 079](../../artifacts/colony-cooking-three-days.json), le camp a trois lits, une table, trois tabourets, six murs, un feu et quinze plants ; **20 repas fabriqués, 18 ingestions, trois dormeurs observés**, cinq repas simples et quinze rations restants, aucun ordre en attente. Bois conservé et bilan alimentaire réconcilié, aucune erreur console. La capture finale a été inspectée. Ce pilote vérifie une progression cohérente ; il ne représente pas tous les styles de jeu.

Les checkpoints volumineux sont extraits dans `tmp/<rapport>-checkpoints` par `scripts/compact-ui-report.py`. Le JSON conservé dans Git garde tick, taille et SHA-256, ainsi que toutes les erreurs et assertions du rapport. Les preuves antérieures restent disponibles même après correction.

### Audit CPU ciblé

Ryzen 5 3600, Node 24.11.1, 250² graine 42 ; clairière synthétique avec 3/30/100 colons, cinq travailleurs par feu, champs, chantiers, stockage et besoins actifs. Une passe de 300 ticks par population, sans échauffement séparé : les affectations initiales sont incluses. Génération, validation et diagnostics métier sont hors mesure. Ce scénario court ne remplace pas la progression humaine.

Le [profil initial](../../artifacts/cooking-bench-before.json) utilisait le profileur V8 : exploration de carte et capacité de stockage dominaient. Le [cache de capacité par décision](../../artifacts/cooking-bench-capacity.json), les [groupes de cibles](../../artifacts/cooking-bench-filtered.json), puis le [diagnostic des recherches](../../artifacts/cooking-bench-search-profile.json) ont isolé des piles entourées de colons. Le contrôle local d’entrée évite de parcourir la carte pour une case dont les quatre accès sont fermés.

| Population | p50 ms/tick | p95 | p99 | maximum | Résultats à 300 ticks |
|---|---:|---:|---:|---:|---|
| 3 | 0,017 | 1,20 | 3,25 | 8,92 | 2 repas, 6 plants, 1 mur |
| 30 | 1,14 | 23,45 | 35,51 | 50,55 | 7 repas, 36 plants, 5 murs |
| 100 | 28,36 | 39,53 | 50,34 | 52,45 | 12 repas, 120 plants, 16 murs |

[Mesure après vérification locale](../../artifacts/cooking-bench-local-entry.json). Les empreintes et résultats métier sont identiques aux passes précédentes, pour chaque population. Les valeurs intermédiaires ne constituent pas un ratio de gain contrôlé : le premier profil était instrumenté, et un build a recouvert la population 100 d’une passe intermédiaire signalée dans son rapport. Les mesures ci-dessus sont isolées des autres suites.

**Risque restant :** à 30/100 acteurs, les groupes encore inaccessibles et les grands ensembles de destinations restent coûteux. La circulation entre agents actifs n’est pas résolue en général. Le nombre maximal de recherches ne borne pas encore leur coût en cellules ; ces timings CPU ne sont ni des FPS ni une garantie de fluidité parfaite. L’audit rend ce prochain travail G0 concret.

### Audit de rendu WebGPU

[Rapport natif](../../artifacts/cooking-render-bench.json), Ryzen 5 3600, adaptateur AMD RDNA 1, Chromium WebGPU en 1440×1000. Worker réel à vitesse ×6 ; 60 images d’échauffement puis au moins 300 images et cinq secondes par phase. Les vues locale puis générale avancent successivement le même monde : elles ne constituent pas un comparatif caméra à état identique. Aucune suite ni benchmark CPU en parallèle.

| Colons | Vue | Image p95 / max (ms) | Soumission CPU p95 (ms) | Draw calls médians | Progression mesurée |
|---|---|---:|---:|---:|---|
| 3 | locale / générale | 6,1 / 12,0 ; 6,1 / 6,2 | 3,9 / 3,4 | 130 / 22 | ticks 14→310 / 365→664 |
| 30 | locale / générale | 6,1 / 18,0 ; 6,1 / 12,1 | 5,2 / 4,0 | 136 / 28 | ticks 13→316 / 364→658 |
| 100 | locale / générale | 6,1 / 18,1 ; 6,1 / 17,9 | 6,4 / 5,1 | 143 / 46 | ticks 0→210 / 240→420 |

Aucune erreur console/GPU observée. Captures de 100 colons inspectées. Les intervalles RAF incluent l’ordonnancement navigateur ; la soumission CPU n’est pas une mesure GPU. Le compteur worker est une moyenne publiée par lot, répétée à l’écran : ses percentiles ne sont pas ceux de ticks indépendants. **La simulation à 100 colons avance moins vite malgré le rendu fluide** ; le coût de navigation reste à réduire. Cette fenêtre courte ne garantit pas l’absence de saccade en toute circonstance.

### Build

`npm run build` passe : vérification TypeScript, 82 modules Vite, worker 99,68 kB et jeu 1 018,88 kB (283,35 kB gzip). L’avertissement de bundle supérieur à 500 kB reste connu ; aucun changement de dépendance dans cette tranche.

## Documentation

Index unique, contrats courants, recherches, décisions et preuves historiques séparés. Le corpus original reste dans `reference/originals`, byte-identique. Contrats cuisine, alimentation, simulation, guide, catalogue et inventaire sont mis à jour ; les anciennes assertions « cuisine absente » sont corrigées dans les documents courants. Le vérificateur de liens et d’intégrité contrôle aussi les 25 domaines et cinq familles.

## Historique des preuves

- [V9 — alimentation et reclassement](../history/validation-v9-alimentation.md)
- [V8 — cultures](../history/validation-v8-cultures.md)
- [V6–V7 — présentation](../history/validation-v6-v7-presentation.md)
- [V3–V5 — besoins](../history/validation-v3-v5-besoins.md)
- [Fondations G0](../history/validation-g0-fondations.md)
