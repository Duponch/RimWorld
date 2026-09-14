# Validation courante — accès et coût de navigation

14 septembre 2026. Consolidation G0 après les régimes V13 ; **schéma 13 inchangé**, G1 partiel. [Contrat, recherche récente et écart de circulation](../development/spatial-motion-storage.md). Ce lot allège les calculs de planification ; il ne livre pas encore le passage temporaire entre colons. Aucun contenu ou contrôle joueur ajouté.

## Identité des résultats et scénarios

Le [relevé avant](../../artifacts/navigation-access-record.json) provient du moteur `3ee5d8f`. La [comparaison finale](../../artifacts/navigation-access-compare.json) vérifie exactement les octets des trente sauvegardes complètes, pas seulement leurs empreintes : 3/30/100 personnes, ticks 1/100/150/300/450, cuisine ordinaire et faim/régimes. Le second scénario injecte une faim simultanée au tick 101 et affecte trois politiques existantes ; il ne représente pas un joueur ordinaire. Les mondes sont conservés dans `tmp/navigation-access-baseline`, les SHA-256 et tailles dans les rapports. Les trajets, besoins, stocks, réservations, travaux et état aléatoire sont identiques à ces checkpoints ; aucune preuve générale de tous les scénarios possibles n'est revendiquée.

Le [lot final cœur, 27/27](../../artifacts/core-navigation-access-final.json), regroupe navigation, espace, cuisine, régimes, fraîcheur, horaires, snapshots, simulation et pilote. Le même scénario de navigation a été enrichi sur 120 cartes : oracle de distances O(V²) indépendant, destinations enfermées, occupations temporaires, coins, ordre inverse des demandes et reprise de la file, emprises tournées, buffers de l'appelant modifiés après capture. Il vérifie aussi qu'aucune cellule n'est finalisée deux fois et que l'accès seul ne déclenche pas de recherche pondérée. Le pilote développe le camp pendant cinq à huit jours sur trois graines, avec bilans et sauvegardes quotidiennes.

Le [lot UI, 3/3 en 28,1 s](../../artifacts/ui-navigation-access.json) utilise Chromium WebGPU natif et le vrai worker : feu construit, facture, collecte des ingrédients, cuisine et produit rangé ; régimes partagés, faim et autorisation ; conservation, migration et sauvegarde corrompue refusée. Aucun échec console/GPU signalé. L'UI de trois jours déjà validée sous V13 n'a pas été rejouée : pas de changement de commande ou de persistance, égalité complète avant/après, pilote cœur et vraie UI ciblée rejoués.

Compilation finale réussie : 97 modules, worker 110,30 ko, jeu 1 032,66 ko / 287,98 ko gzip. L'avertissement connu de bundle supérieur à 500 ko reste présent. Les suites, compilations et audits ont été exécutés successivement. Le premier lancement direct Node avait refusé une propriété de paramètre de constructeur non prise en charge en mode strip-only ; remplacée par des champs explicites avant les preuves finales, sans changer les règles de jeu.

## Comparaison CPU à charge identique

Ryzen 5 3600, Node 24.11.1 ; carte 250² graine 42, camps synthétiques avec feu partagé par cinq colons, cuisine/transport/construction/culture, besoins actifs. Deux répétitions de 300 ticks, aucun préchauffage, setup/validation/bilans hors mesure, collecte des compteurs dans le tick. Les percentiles agrègent 600 ticks par population ; les résultats métier et compteurs décrivent la dernière répétition. Aucun autre test lourd concomitant. Il s'agit de simulation seule, pas de FPS.

L'[ancien moteur](../../artifacts/navigation-access-before.json), extrait de `3ee5d8f` dans tmp, et le [moteur final](../../artifacts/navigation-access-after.json) sont mesurés dans la même session.

| Colons | Médiane avant → après ms | p95 avant → après ms | p99 avant → après ms | Maximum avant → après ms |
|---:|---:|---:|---:|---:|
| 3 | 0,0219 → 0,0201 | 1,341 → 1,191 | 3,931 → 3,392 | 10,343 → 7,253 |
| 30 | 1,220 → 1,478 | 17,672 → 9,725 | 27,232 → 16,576 | 32,096 → 19,978 |
| 100 | 24,239 → 15,785 | 33,931 → 21,589 | 37,384 → 27,641 | 40,753 → 33,108 |

À cent personnes, le p95 diminue de **36,4 %** et la médiane de **34,9 %**. À trente, les queues diminuent mais la médiane augmente : l'accès additionnel n'est pas gratuit et tous les ticks ne gagnent pas. Deux passes ne constituent pas une étude statistique du matériel ; petits écarts et maxima restent sensibles à l'environnement/JIT/GC.

Les états finaux et bilans sont identiques : respectivement **2/7/12 repas**, **6/36/120 cultures**, **1/5/16 murs**, **90/590/2 080 ingrédients restants** pour 3/30/100 colons. Les cellules pondérées finalisées passent de 3 801/2 393 286/8 749 647 à 1 037/183 810/731 934. L'accès développe séparément 1 598/4 967 260/25 176 402 cellules : son coût existe, il ne faut pas annoncer une réduction de 92 % du temps depuis le seul compteur pondéré.

Le [premier essai](../../artifacts/navigation-access-eager-component.json) construisait toute la composante dès le départ : p95 à cent 22,64 ms, mais parcours de plus de 40 000 cellules même pour une tâche proche. L'accès final est progressif ; à trois colons, ses expansions passent de 1 410 343 à 1 598 par passe. Les cibles libres mais déconnectées imposent encore des parcours complets. Les recherches ciblées d'un besoin inaccessible et la congestion entre agents actifs restent coûteuses ; le p95 à cent personnes demeure supérieur au budget de 16,67 ms permettant 60 ticks/seconde à ×6. Aucune promesse de fluidité parfaite ou de temps réel à cette charge.

## Rendu réel

L'[audit matériel](../../artifacts/navigation-access-render.json) utilise Chromium natif WebGPU, AMD RDNA1 et Ryzen 5 3600, viewport 1440×1000, carte naturelle 250², camps synthétiques et vitesse ×6. Chaque vue suit 60 images d'échauffement, puis au moins 300 images et cinq secondes. Les mêmes colons cuisinent, transportent, cultivent et construisent ; la charge décroît lorsque les tâches se terminent.

| Colons | Vue | Image p95 ms | Soumission CPU p95 ms | Appels médians | Ticks observés |
|---:|---|---:|---:|---:|---|
| 3 | Locale | 8,40 | 5,70 | 130 | 14 → 306 |
| 3 | Carte entière | 4,30 | 3,30 | 22 | 350 → 653 |
| 30 | Locale | 8,40 | 6,70 | 136 | 12 → 312 |
| 30 | Carte entière | 4,30 | 3,60 | 28 | 354 → 657 |
| 100 | Locale | 12,50 | 8,90 | 144 | 0 → 282 |
| 100 | Carte entière | 4,30 | 4,70 | 42 | 340 → 665 |

Aucune erreur console/GPU ; les états à la fin des phases passent le validateur. À cent colons en vue locale, p99 image 20,8 ms et maximum 29,2 ms : quelques longues images restent présentes. Captures à cent personnes locale/générale inspectées : camp, objets portés, géométrie distante et FPS visibles. Les portraits se prolongent au-delà de la zone visible à cette population synthétique ; la gestion riche des grands groupes reste ouverte. La phase générale arrive après les travaux initiaux, avec zéro tâche active à sa fin pour cent personnes : ne pas attribuer tout son meilleur temps à la caméra ou annoncer un avant/après graphique, puisqu'aucun rendu précédent à état identique n'a été mesuré dans ce lot. Les intervalles RAF comprennent l'ordonnancement ; le CPU ne mesure pas l'exécution GPU ; les moyennes worker publiées peuvent être répétées sur plusieurs images. Le compteur FPS ne certifie pas une progression ×6 sans retard.

## Documentation et précédentes livraisons

Contrat spatial, adoption du corpus, guide, inventaire, ROADMAP, tests, architecture et ADR-029 actualisés. Vérification documentaire : 60 documents, 611 liens locaux, 25 domaines et cinq familles ; les trois originaux sont byte-identiques. Aucun objet ajouté au catalogue. Les preuves historiques restent datées :

- [V13 — régimes, partie UI de trois jours et audits](../history/validation-v13-regimes.md)
- [V12 — horaires et sommeil](../history/validation-v12-horaires.md)
- [V11 — conservation](../history/validation-v11-conservation.md)
- [V10 — cuisine et navigation](../history/validation-v10-cuisine.md)
- [V9 — alimentation et reclassement](../history/validation-v9-alimentation.md)
- [V8 — cultures](../history/validation-v8-cultures.md)
- [V6–V7 — présentation](../history/validation-v6-v7-presentation.md)
- [V3–V5 — besoins](../history/validation-v3-v5-besoins.md)
