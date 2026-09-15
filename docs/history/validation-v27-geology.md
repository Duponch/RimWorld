# Validation courante — V27, identités géologiques

15 septembre 2026. G0 en consolidation, G1 partiel ; préparation du minage G2. [Contrat](../development/geology.md), [recherche](../research/geology-reference.md), [preuves V26 archivées](../history/validation-v26-furniture-logistics.md).

## Contrats et parcours

Le [lot de simulation](../../artifacts/geology-simulation.json) passe **90/90 tests en 68 secondes**, dont les colonies de huit jours (graine 42) et cinq jours (93/2048), les migrations, transports, besoins et continuations. Génération, surface rocheuse et snapshots ont été enrichis dans leurs scénarios existants. Le [dernier contrôle régional](../../artifacts/geology-regions-final.json) passe également et exclut une simple couleur constante par carte. Les décisions du pilote ne changent pas : aucune commande de minage n'est encore livrée.

Le [parcours UI natif](../../artifacts/geology-ui-rerun.json) passe en 23,7 secondes : les cinq types sont inspectables, les pierres décoratives n'annoncent plus un rendement exploitable, sauvegarde/rechargement conservent leurs identités, V26 retrouve son type historique indéfini. Captures du fixture et du massif 250² inspectées. La compilation finale passe : 152 modules, worker 183,75 kB, bundle jeu 1 053,04 kB / 294,91 kB gzip ; avertissement préexistant de bundle supérieur à 500 kB. Aucune dépendance ajoutée.

Les essais diagnostiqués restent conservés : [lot ciblé initial](../../artifacts/geology-targeted.json), 5/6, attendait encore l'identité du tableau antérieur à une modification volontaire ; le scénario a été corrigé puis inclus dans le lot complet. Le [premier parcours UI](../../artifacts/geology-ui.json) laissait tourner l'horloge pendant sa comparaison exacte de sauvegarde ; la pause explicite corrige cette fixture. Aucun échec masqué comme un succès.

## Génération et communication

[Mesure Node](../../artifacts/geology-cpu.json), Windows, Ryzen 5 3600, Node 24.11.1. Comparaison alternée au générateur V26 `870ddec`, deux échauffements et douze échantillons par taille/version. Neuf mondes (32/128/250² × graines 42/93/2048) sont exactement identiques une fois retirés uniquement numéro de schéma et nouveau champ `stone` : topologie, positions, plantes, quantités, IDs, état initial et PRNG conservés.

En 250² : génération médiane V26 **23,90 ms**, V27 **30,53 ms** ; p95 respectifs 164,36 et 48,72 ms. Douze échantillons restent peu nombreux ; le p95 inclut le maximum et l'anomalie du témoin interdit de conclure à une optimisation des pointes. L'ajout de types a un coût initial mesurable. JSON initial : 1 898 376 → 2 072 976 octets. Aucun supplément de géologie dans les deltas immobiles ; encodage p95 1,57 ms sur cinquante échantillons après cinq échauffements. Ce n'est ni le transport IPC ni le temps d'adoption navigateur.

## Rendu WebGPU et retraits locaux

[Types V27](../../artifacts/geology-render-typed.json) et [couleurs historiques](../../artifacts/geology-render-legacy.json) : même topologie 250²/graine 42, fenêtre 1440×1000, cadrage rapproché, GPU AMD RDNA1 (modèle exact non fourni par l'adaptateur), 90 images d'échauffement puis douze retraits diagnostiques espacés d'au moins 300 ms. Les deux exécutions sont successives ; elles ne mesurent pas une colonie active.

| Mesure | Types V27 | Témoin historique |
|---|---:|---:|
| Intervalles observés | 691 | 719 |
| p95 entre images | 8,40 ms | 8,40 ms |
| Maximum | 20,90 ms | 25,00 ms |
| Appels par image aux points d'édition | 165 | 165 |
| Temps CPU maximal d'adoption d'une édition | 7,40 ms | 6,60 ms |
| Buffers rocheux comptés | 13 262 688 octets | 13 262 688 octets |

Les triangles sont identiques à chaque point correspondant ; caméra et buffers restent stables. Chaque retrait retouche cinq à neuf cellules. Zéro erreur navigateur/WebGPU observée. Cela établit l'absence de lots graphiques supplémentaires pour les types dans ce scénario, **pas une garantie de zéro surcoût ni de fluidité parfaite**. Ces suppressions sont des injections de présentation ; elles ne prouvent aucun minage, produit, navigation ou support de toit.

Le [premier relevé graphique](../../artifacts/geology-render-initial-counter.json) utilisait `render.calls` cumulatif pour sa colonne d'appels : cette colonne est invalide. Le banc a été corrigé pour lire les véritables appels par image déjà calculés par le renderer ; seules les deux mesures corrigées sont utilisées ci-dessus.

## Continuité du travail

Le mode nuit est réactivé dans cette conversation avec reprise automatique, étapes validées puis commit/push sur main. Le prochain lot reste le minage physique, la séparation du sol révélé et les produits, puis la taille de pierre ; toits, minerais, compétences et catalogue complet restent explicitement ouverts. L'audit à cent acteurs V26 demeure une preuve historique, non une nouvelle mesure de minage. Reprendre une charge de mineurs actifs lorsque cette boucle existe.
