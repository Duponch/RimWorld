# Validation courante — V15, premiers loisirs

14 septembre 2026. G0 en consolidation, G1 partiel. Observation du ciel après déplacement, piquet de fers à cheval construit et utilisable par trois colons, satisfaction/lassitude persistantes, effet d’humeur et plages Loisirs. [Recherche et incertitudes](../research/recreation-reference.md), [contrat et migration](../development/recreation.md). CAT-050 reçoit un premier objet ; ni le catalogue ni SYS-080 ne sont clos. Les [preuves V14](../history/validation-v14-circulation.md) restent historiques.

## Contrats et parcours

Le [lot cœur, 39/39](../../artifacts/core-recreation-final.json), regroupe loisirs, espace/navigation, simulation, repas, cuisine, régimes, horaires, conservation, cultures, snapshots et pilote de colonie. Trois scénarios de loisirs approfondis contrôlent taux/seuils, plafonnement avant lassitude, mémoire entre seuils, sommeil, horaires, délai initial, construction avec dix bois réellement livrés, trois joueurs et places exclusives, absence de gain pendant le trajet, visibilité distincte du passage, interruptions, corruption et continuation exacte. La migration V14 valide l’ancien état avant d’initialiser chaque besoin à 55, sans changer les tâches, trajets, stocks, horaires ou RNG. Les fixtures anciennes omettent les champs futurs ; les clones d’acteurs copient profondément leurs besoins.

Le [lot UI ciblé, 7/7 en 59,5 s](../../artifacts/ui-recreation-controls.json), passe dans Chromium WebGPU natif avec le vrai worker : nouveau piquet construit, bois consommé, horaire peint, gain sur place, inspection, sauvegarde/reprise, horaires, cuisine/régimes et mouvement GPU. Le [parcours UI de trois jours, 1/1 en 341,3 s](../../artifacts/ui-recreation-journey.json), part d’une nouvelle carte 250² graine 42. Le pilote utilise les commandes du joueur et construit 3 lits, 1 table, 3 tabourets, 6 murs, 1 feu, 1 piquet et 15 cultures ; il réserve 19–21 h aux loisirs.

[Bilan de cette partie](../../artifacts/colony-recreation-three-days.json) : **21 repas cuisinés, 18 prises alimentaires, les trois colons observés dans leur lit et les deux activités pratiquées**. Stocks finaux : 45 bois et 21 unités alimentaires, dont 6 repas simples. Bois conservé et bilan alimentaire réconcilié avec récoltes, recettes et ingestions ; aucun chantier ordinaire restant. Satisfaction finale de loisirs : 95,66 à 98,44 ; aucune des deux familles lassante à ces checkpoints. Les rechargements quotidiens restituent exactement l’état. Les 19 checkpoints complets sont dans tmp, tailles/SHA-256/ticks conservés au rapport. Aucun message console/GPU en erreur.

Après le profilage et l’optimisation des seuls accès spatiaux, [4/4 scénarios ciblés](../../artifacts/core-recreation-optimized.json) repassent : trois loisirs et le pilote de cinq à huit jours sur trois graines. Le scénario spatial confronte l’index à la vérification directe avec mobilier et mur ; les audits avant/après gardent les mêmes empreintes finales et compteurs d’activités aux trois populations. Le long parcours UI précède cette optimisation ; il n’a pas été relancé. L’audit matériel ci-dessous utilise le code optimisé.

Compilation finale réussie : 106 modules, worker 116,59 ko, jeu 1 036,20 ko / 289,30 ko gzip. Avertissement connu de bundle supérieur à 500 ko. Tests, compilation et audits lourds exécutés successivement, sans modification de source pendant les tests navigateur. Ce lot n’exécute pas toutes les suites du dépôt et ne garantit pas une couverture exhaustive du jeu commercial.

## Audit CPU et correction

[Mesure avant](../../artifacts/recreation-bench-before.json), [mesure finale](../../artifacts/recreation-bench.json) : Ryzen 5 3600, Node 24.11.1, carte 250² graine 42. Deux passes de 600 ticks démarrant au tick 2000, sans préchauffage. Seul `stepWorld` est chronométré ; création, validation, comptage des activités et empreinte hors mesure. Besoins ordinaires actifs, camps synthétiques avec piquets partagés, tous les colons à faible satisfaction et horaire Loisirs. Les tâches de camp restent proposées, mais **aucun tick de travail n’est observé dans cette fenêtre** : ce relevé exerce essentiellement loisirs et déplacements. La progression diversifiée est testée par le pilote ; le précédent audit V14 porte sur cuisine/transport/construction/culture.

| Colons | Médiane ms | p95 ms | p99 ms | Maximum ms | Ticks-colons ciel / fers / trajet |
|---:|---:|---:|---:|---:|---|
| 3 | 0,199 | 0,313 | 0,653 | 8,579 | 1 924 / 1 452 / 104 |
| 30 | 0,576 | 1,786 | 3,791 | 13,331 | 14 704 / 18 826 / 1 186 |
| 100 | 1,288 | 3,212 | 13,937 | 24,069 | 44 566 / 63 466 / 6 810 |

Le profil V8 local a montré les vérifications répétées de mobilier/visibilité et la copie complète des ressources parmi les coûts dominants. L’index construit par décision réutilise les obstacles de tous ses candidats ; pour le ciel, seuls les obstacles présents sur les sites proposés sont retenus. Aucun cache persistant susceptible de masquer une construction achevée entre deux acteurs. Sur ce scénario à cent colons, p99 **54,09 → 13,94 ms**, maximum **114,04 → 24,07 ms**. Les empreintes finales et compteurs sont identiques. Les médianes de populations différentes ne sont pas une courbe de complexité pure : JIT, GC et fréquence des activités interviennent ; le p95 de trente colons augmente de 1,41 à 1,79 ms. Deux passes ne constituent pas une garantie de latence, et le maximum dépasse encore 16,67 ms, budget d’un tick à vitesse ×6.

## Rendu matériel

[Audit WebGPU natif](../../artifacts/recreation-render.json) : AMD RDNA1, Ryzen 5 3600, Chromium, 1440×1000, simulation worker à ×6. Chaque phase suit 60 images d’échauffement, puis au moins 300 images et cinq secondes ; les vues successives font avancer le monde. La durée RAF inclut l’ordonnancement ; la soumission CPU ne mesure pas le temps d’exécution GPU. Le champ worker est le dernier indicateur reçu, pas une distribution indépendante de tous les ticks. Aucun audit lourd concurrent.

| Colons | Vue | Image p95 ms | p99 ms | Max ms | CPU p95 ms | Appels médians | Actifs ciel / fers à la fin |
|---:|---|---:|---:|---:|---:|---:|---|
| 3 | Locale | 8.40 | 8.40 | 8.50 | 5.60 | 157 | 2 / 1 |
| 3 | Globale | 4.30 | 4.30 | 8.40 | 3.90 | 22 | 1 / 2 |
| 30 | Locale | 8.40 | 8.50 | 12.60 | 6.30 | 163 | 12 / 18 |
| 30 | Globale | 4.30 | 8.30 | 8.50 | 4.20 | 29 | 16 / 14 |
| 100 | Locale | 8.40 | 16.50 | 20.80 | 6.80 | 172 | 40 / 60 |
| 100 | Globale | 8.30 | 12.50 | 20.90 | 5.10 | 41 | 44 / 56 |

Les cent colons ont effectivement une activité aux deux relevés finaux ; la simulation avance d’environ 300 ticks par fenêtre de cinq secondes. Le p95 image reste proche de 8,4 ms, mais les maxima à cent colons atteignent 20,9 ms : aucune fluidité parfaite en toutes circonstances n’est revendiquée. Les modèles de piquet utilisent les lots de mobilier existants et les nouvelles poses les attributs GPU des colons. Les captures ont été inspectées : poses au sol/de lancer et orientation lisibles ; la barre de cent portraits déborde toujours de la largeur visible et reste un chantier UI. Ces mesures courtes de loisirs ne remplacent pas les futurs raids, incendies, animaux ou colonies riches.

## Limites et prochaine étape

Deux familles seulement, attentes extrêmement basses fixes, choix du site du ciel sur 24 candidats locaux, animation de lancer sans projectile visible. Le site ignore encore météo et toit ; l’humeur reste un agrégat provisoire. Le piquet n’apporte pas encore d’expérience de tir et n’existe qu’en bois. Ces limites sont dans le [bilan fonctionnel](../gameplay/implementation-status.md) et la [recherche](../research/recreation-reference.md). La prochaine étape consolide les plans/cadres de construction et le déplacement des objets gênants en G0 avant d’élargir le catalogue.
