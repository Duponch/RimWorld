# Validation V79 — chasse et filière alimentaire animale

Campagne des 19–20 septembre 2026, sur main après V78 b7ab0b8. Périmètre : chasse civile réelle, dépouille persistante, boucherie transactionnelle, viande/cuisson/ingestion, compétence Cuisine et présentation GPU.

## État des preuves

- Passe élargie initiale : **402/405**, 91 fichiers, 356,41 s. Deux erreurs de chasse pendant son intégration et une assertion historique de combat animal ont ensuite été corrigées ; ce n'est pas une passe monolithique entièrement verte.
- Reprise anatomie animale/corps : **11/11**, puis extension du cas de récupération sur sol occupé : **7/7** corps.
- Campagne finale de filière au point de gel : **38/38**, huit fichiers (`hunting`, `hunting-interruptions`, `corpses`, `butchery`, `priority-work`, `automatic-combat`, `combat-world`, `combat-query`), 7,47 s, après la correction de chute et le bornage des captures. Tir réel, achèvement à 18 ticks, interruption/queue, manipulation nulle, conservation, températures, migration et continuation exacte.
- Contrats civils : **17/17** chasse/boucherie/loisirs/tir automatique. Réaction Fuir/Attaquer/Ignorer, besoins et exclusivité des activités.
- Typage et build réussis ; avertissement connu du bundle >500 ko conservé. Build initial empêché par `spawn EPERM` du sous-processus Windows de Vite, puis réussi avec permission d'exécution adaptée.
- Documentation finale : 278 documents, 2835 liens vérifiés ; trois originaux préservés octet pour octet.

Les dix rapports `artifacts/*v79-pre-huntpolicy*.json` viennent des pilotes élargis ayant chargé la politique antérieure : leurs anciennes assertions et bilans restent utiles au socle, mais ils ne prouvent pas le nouveau parcours de chasse. Les artefacts V74/V75 initialement réécrits par ces anciens tests ont été restaurés depuis HEAD après copie distincte. UI, nouveau pilote et audits sont consignés après leur fin ci-dessous.

## Incidents de validation conservés

- Premiers tests de corps : quatre fixtures héritaient d'un tick initial 3000 tout en utilisant des échéances absolues à zéro ; leurs horloges ont été corrigées, sans retirer les contrôles de fraîcheur, conservation ou migration.
- Premier test boucherie : fixture imposant un âge supérieur au temps écoulé rejetée à juste titre ; temps et âge avancés ensemble.
- Première intégration chasse : un décès pendant la récupération de l'arme permettait un transport trop tôt. La récupération est maintenant préservée et achevée avant le transport ; le test garde l'invariant d'exclusion des activités.
- Le rangement final de chasse conserve sa provenance : il peut fonctionner sans Transport, mais arrêter Chasse le libère. Une cible déjà rangée ne crée pas de transport sur sa propre case.

- Revue croisée : exclusion des loisirs, réaction à une menace humaine, arrêt si Manipulation devient nulle et file d'ordres du chasseur vérifiés. Les gardes d'activité dispersées constituent une zone de vigilance pour chaque nouveau métier.
- UI, premier essai : sauvegarde injectée trop tard dans le harnais ; le bouton Charger restait désactivé. Timeout global 240 s sans aucune commande de gameplay exécutée. Préchargement avant ouverture corrigé, actions bornées 10 s ; capture/trace d'échec conservées. Ce timeout ne signifie pas un blocage de simulation.

- File maintenue : un ordre Transport ajouté avec Maj conserve son intention sans interrompre la chasse ; il reprend après annulation. Pendant la récupération de l’arme, un nouvel ordre direct est refusé atomiquement, puis devient admissible après la récupération. Ces contrôles complètent les interruptions et la continuation exacte.
- UI, deuxième essai : chaîne entière 1× accomplie jusqu’à l’ingestion, mais deux créations de pipelines GPU au rechargement ont fait échouer le contrôle graphique. Descripteurs et ticks ont identifié le plan transparent du curseur, et non la dépouille ou l’animation. L’échec reste une preuve diagnostique, pas une validation graphique réussie.

- Arête de chute : **3/3** contrôles d’interruption après ajout d’une traversée diagonale lente. Aucun progrès de finition pendant la chute, sauvegarde/reprise exacte, état `finish` falsifié refusé, puis dix-huit ticks réels au contact.
- Diagnostic graphique 6× : chaîne complète et zéro compilation après `forceSinglePass` sur les curseurs plans. Une erreur réseau transitoire `ERR_NO_BUFFER_SPACE` fait néanmoins échouer ce run ; JSON et trace distincts conservés. La campagne finale reste indépendante de ce diagnostic.

## Interface réelle finale

Campagne native WebGPU **1× et 6× réussie**, 1 min 30 s : désignation via Faune, corps porté avec même identité, sauvegarde/rechargement exact, rangement, boucherie, cuisson de dix viandes puis ingestion réelle du repas. Chaque passage produit 18 viandes et 10 cuirs ; ces résultats sont ceux de la fixture, pas une quantité universelle par lièvre. 8 268/2 087 images et 15 322/3 060 intervalles de déplacement contrôlés ; aucune nouvelle compilation GPU ni erreur console, page ou requête. Compteur FPS et compétence Cuisine visibles ; captures inspectées. [Rapport](../../artifacts/hunting-ui-v79.json). Les échecs [pipelines](../../artifacts/hunting-ui-pipeline-failure-v79.json) et [réseau du diagnostic](../../artifacts/hunting-ui-network-failure-v79.json) restent conservés séparément.

## Audit et diagnostic de charge

Avant optimisation : Ryzen 5 3600, Node 24.11.1, carte naturelle 250², 3/30/100 colons et autant de lièvres, un mineur sur six devient chasseur ; recherche, confection et minage des autres acteurs conservés. 650 ticks, échauffement séparé 100, snapshots tous les cinq ticks. [CPU initial](../../artifacts/hunting-cpu-v79-before-optimization.json) : p95 6,80 /25,60 /66,72ms, pics31,16 /53,51 /164,85ms. Les 1/10/33 vêtements attendus sont terminés ; 1/3/12 chasses et un colon blessé à cent acteurs. Cette charge de tirs durables diffère des duels V78 : aucune régression chiffrée déduite directement de la comparaison entre scénarios.

[Rendu initial](../../artifacts/hunting-render-v79-before-optimization.json), Chromium WebGPU AMD RDNA1, 1440×1000, 90 images de préparation, vitesse demandée6× : p95 image8,40 /12,60 /25,00ms ; pics29,20 /37,40 /62,50ms. Aucun pipeline tardif, géométrie des personnages conservée, erreurs et validations vides. À cent acteurs, 664 ticks en 21,70 s : le moteur ne tient pas le débit6× demandé.

[Profil CPU](../../artifacts/hunting-cpu-hotpaths-v79.json) dédié 100 : chasse24,22 % inclusif du temps de stepWorld, dont recherche de position14,72 % et préparation d’accès7,16 %. La capture de projectiles suspectée initialement représente 4,72 % inclusif ; GC 1,34 % du total. Priorité donnée au bornage des captures de tir, sans changer budget ni ordonnancement.

La correction borne la capture à la zone de tir avec marge tactique et la partage uniquement dans la décision synchrone. Aucun budget, tri, chemin ou ordre d’acteurs n’est modifié. **15/15** contrôles chasse/captures, avec oracle carte entière sur portée, obstacles, lean et bords. Le [profil comparatif](../../artifacts/hunting-cpu-optimization-v79.json) conserve un état final strictement identique (hash SHA-256), 12 chasses et 33 vêtements : échantillonnage inclusif des captures 1 438→663ms, recherche de position3 227→2 011ms ; p95 global63,94→61,35ms. Un passage instrumenté par variante ; gain local démontré, pas un facteur de vitesse universel. La préparation de navigation demeure un coût identifié, sans refonte du budget dans ce lot.

## Mesures finales après bornage

Les [mesures CPU finales](../../artifacts/hunting-cpu-v79.json) et [natives finales](../../artifacts/hunting-render-v79.json) sont successives, sources figées et même protocole que ci-dessus. Le worker publie des moyennes de pas par lot : ses percentiles ne sont pas des percentiles indépendants de ticks.

| Colons + animaux | CPU tick p95 / p99 / pic (ms) | Image native p95 / p99 / pic (ms) | Snapshots CPU p95 (ms) |
|---|---|---|---|
| 3 + 3 | 9,64 /17,46 /26,14 | 8,40 /8,50 /29,20 | 5,61 |
| 30 + 30 | 25,56 /39,15 /45,96 | 12,60 /20,90 /37,50 | 6,66 |
| 100 + 100 | 62,29 /78,16 /94,11 | 29,00 /37,50 /50,10 | 7,97 |

Les trois charges conservent les ateliers attendus, un monde valide et zéro compilation GPU tardive. Au maximum : 190 appels de dessin au p95 ; 664 ticks en21,94s, donc toujours moins que le débit6× demandé. Le correctif réduit le coût précis des captures, mais ne permet pas d’annoncer un gain global de rendu : sa variabilité et les pointes restent visibles. Ni cent tireurs simultanés, ni cent boucheries ne sont prétendus couverts par cette charge mixte. La navigation et les tirs continus restent des postes à suivre lors des prochains audits.

La campagne UI 1×/6× précède uniquement le bornage spatial final : commandes, présentation et règles restent identiques ; l’oracle spatial et la comparaison exacte100 acteurs couvrent cette optimisation, et le banc natif est rejoué ensuite.

## Pilote de colonie avec la nouvelle politique

Le [pilote naturel graine93](../../artifacts/colony-v79-93.json) passe sur cinq jours (tick30020), **1/1 en122,96s**, les deux autres graines volontairement non rejouées. Une seule chasse, achevée avec sa boucherie avant le deuxième jour :14 viandes,9 cuirs conservés physiquement,11 lièvres vivants et1 dépecé, aucune dépouille ni désignation restante. Camp final :3 lits,6 repas prêts,43 bois,25 aliments et aucun travail en attente.

Les minimums aux bilans quotidiens sont39,28/100 pour la faim et36,30/100 pour le repos ; ce ne sont pas les minimums de chaque tick. Les contrôles toutes les cinquante itérations exigent besoins positifs, aucune blessure/perte et conservation du bois/de la nourriture. Les sauvegardes quotidiennes sont reprises sur250ticks puis comparées exactement. Ces preuves incluent la nouvelle politique de chasse, contrairement aux rapports initiaux suffixés `pre-huntpolicy`. Un hook d’échec garde aussi le World brut, même invalide ; aucun échec ne l’a déclenché dans ce run.

## Continuation de l’ancienne colonie par l’interface

[Reprise UI réussie](../../artifacts/colony-continuation-v79.json) en1,8min : véritable checkpoint V76, tick13042→18071 sous V79, quatre colons et douze lièvres. Dix-neuf décisions du pilote, emplacement de boucherie préparé, huit repas cuisinés, huit unités ingérées et cent unités récoltées pendant cette continuation. Bilans nourriture/bois exacts, sauvegarde finale identique, aucune erreur navigateur ; entretien achevé, cinquante aciers, trente-cinq blocs et le fragment restant rangés.

Aucune chasse n’a eu lieu dans ce checkpoint : les critères prudents du joueur n’ont pas trouvé de proie admissible pendant cet intervalle. Cette preuve valide la migration et la reprise des boucles communes ; la chasse effective relève du pilote93 et des deux parcours UI dédiés ci-dessus. Ce n’est ni une nouvelle passe UI de trois jours depuis zéro, ni une correction rétroactive de l’échec historique V63.

## Cadence observée

Recherche et intégration réparties entre trois agents sur des responsabilités distinctes ; revues croisées ensuite. Les mesures et parcours longs ont été exécutés successivement. Repères mesurés : passe élargie356,41s ; campagne ciblée finale7,47s ; UI dédiée1,5min ; pilote5jours122,96s ; reprise UI1,8min. Les reprises de harnais et le profil de charge ont ajouté du temps utile mais réel. Recherche/implémentation n’ont pas été chronométrées séparément de façon fiable ; aucune réduction chiffrée de durée ou de tokens n’est annoncée. La livraison regroupe plusieurs sous-étapes et garde les limites explicites.

## Limites

Une espèce et un revolver, poste gratuit à 70% de rendement, cuir stockable sans recette, pas de corps humains ni élevage/renouvellement. Le scénario initial équilibré est préparé séparément, sans nouvelle promesse de difficulté. Les tests ne constituent ni couverture exhaustive ni garantie de 6× avec cent acteurs.
