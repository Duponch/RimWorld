# Validation courante — V50

17 septembre 2026. [Décisions urgentes](../development/urgent-care.md), [sources et correction de portée](../research/urgent-care-reference.md). [V49 archivée](../history/validation-self-tending-v49.md). Les preuves ne garantissent ni tous les cas limites ni une fluidité parfaite.

## Simulation et partie

Le premier lot médical passe **31/32** scénarios : [rapport](../../artifacts/urgent-care-initial-v50.json). Le cas de sortie du lit attendait une arête encore dans la file, alors que le même tick avait déjà engagé le mouvement. Le contrôle vérifie maintenant l'arête réelle, son origine dans le lit, son temps restant et l'absence d'XP, sans remplacer l'exigence de sortie physique. Les [cinq scénarios urgents](../../artifacts/urgent-care-targeted-v50.json) passent ensuite.

Ils croisent seuil strict, meilleure catégorie activée même sans tâche prête, Patient/Médecin à égalité, besoins/horaire, une plaie puis ingestion physique, revue au lit, budget épuisé, réservations communes, absence de préemption universelle, ordre direct conservé, politiques, incapacité/épuisement, snapshots, migration V49 stricte et cent acteurs. La [suite générale](../../artifacts/core-urgent-care-v50.json) passe **190/190 scénarios, 57 suites, 117,5 s**, dont le pilote de trois cartes 250² sur cinq jours, puis huit jours pour la graine 42, en 116,3 s. La clinique de cinq jours reste vérifiée. Le résumé du pilote enregistre déjà la tâche médicale entière et donc son nouveau marqueur ; le camp civil n'injecte pas de blessures pour forcer artificiellement cette branche.

## Interface et présentation

Chromium natif WebGPU, AMD RDNA 1, Ryzen 5 3600, Windows 11 10.0.26200, viewport 1440×1000. Le nouveau parcours utilise Santé et Travail : Patient prioritaire maintient l'attente, Médecin prioritaire permet le départ physique et l'auto-soin automatique, sauvegarde/rechargement pendant le geste, puis un vrai repas après la première plaie. Il observe les attributs GPU après rendu et ne déduit pas le geste du seul état final.

Le premier essai atteint les assertions métier mais échoue sur les erreurs de sa sonde : elle lisait `health.injuries` sur la carte saine affichée avant le chargement. [Contexte conservé](../../artifacts/urgent-care-ui-initial-v50.md). La sonde ignore désormais les acteurs sans dossier médical ; aucun filtre d'erreur d'application n'est ajouté. Le parcours corrigé passe en **11,0 s** : [preuve](../../artifacts/urgent-care-ui-v50.json), 1 081 images, 319 observations de travail urgent et 203 d'ingestion. XP 0 pendant la première plaie, 87,5 pendant le repas ; dix rations deviennent neuf. Capture inspectée, FPS visible, aucune erreur.

La [partie UI de trois jours](../../artifacts/urgent-care-colony-v50.json) passe sans reprise en **363,0 s**, 156 décisions par les commandes du joueur. Son [bilan métier](../../artifacts/urgent-care-colony-gameplay-v50.json) conserve vingt repas cuisinés, dix-huit ingérés, trois couchages utilisés, camp équipé, générateur et lampe opérationnels, réserves entretenues, bois conservé et nourriture réconciliée, aucune erreur. Les dix-neuf checkpoints complets sont extraits dans `tmp` avec leurs empreintes conservées dans le rapport. Le parcours civil n'injecte pas de blessure ; les arbitrages urgents restent exercés par leur scénario dédié.

Le [contrôle natif minage/abattage/vitesses](../../artifacts/urgent-care-presentation-v50.json) passe : deux phases de 45 s sur carte naturelle 250², trois colons, vitesses 1/6/3 alternées. Sur **14 991 images**, zéro saut, occupation solide, manque de snapshots ou erreur ; retraits de ressources synchronisés. Intervalle d'image p95 **6,1 ms**, maxima **12,1/24 ms** ; réponse maximale au changement de vitesse **21,6 ms**. L'application de scène atteint ponctuellement **19,4 ms** pendant l'abattage : piste de profilage conservée, sans prétendre à une fluidité parfaite. La suite d'intégration entière n'est pas annoncée rejouée.

## Charge CPU isolée

Node 24.11.1, même Ryzen/Windows, `scripts/rescue-bench.ts --urgent`, carte dégagée 250², 800 ticks. Chaque adulte traite une coupure urgente puis une contusion ordinaire. Résultats, validité et continuation contrôlés hors chronométrage ; aucun autre banc simultané. [Rapport CPU](../../artifacts/urgent-care-cpu-v50.json).

| Acteurs tous traités | Tick p50 / p95 / p99 / max | Clone intégral p95 |
|---|---|---|
| 2 | 0,039 / 0,169 / 0,348 / 14,437 ms | 47,07 ms |
| 30 | 0,383 / 1,524 / 4,030 / 19,551 ms | 42,66 ms |
| 100 | 1,453 / 5,252 / 7,325 / 13,217 ms | 37,11 ms |

Un passage par combinaison ; clone complet distinct des deltas du worker. Pas de comparaison causale avec V49 : lésions et décisions diffèrent. Les clés historiques `rescued`/`carryTicks` désignent ici adultes traités/observations actives, explicitées dans le rapport.

## Charge graphique isolée

`URGENT_LOAD=1 npx playwright test tests/integration/rescue-load.spec.ts`, même machine/GPU, vrai worker 6×, carte dégagée 250², 90 images d'échauffement. Le scénario passe en **30,5 s** ; [rapport natif](../../artifacts/urgent-care-native-v50.json).

| Adultes traités | Intervalle image p50 / p95 / p99 / max | CPU image p95 | Scène p95 / max | Réception p95 / max |
|---|---|---|---|---|
| 2 | 6 / 6,1 / 6,1 / 12,1 ms | 5 ms | 3,2 / 3,2 ms | 0,1 / 3,2 ms |
| 30 | 6 / 6,1 / 12 / 12,1 ms | 4,2 ms | 1,1 / 2 ms | 0,4 / 3,3 ms |
| 100 | 6 / 12 / 23,9 / 30 ms | 5,3 ms | 1,1 / 2,6 ms | 0,5 / 8,4 ms |

Géométrie conservée, zéro nouveau pipeline, au plus 120 draw calls et aucune pose invalide ; 41 878 observations de soin à cent acteurs. Le coût scène est inclus dans le CPU d'image, pas additionnel. Réception mesure le callback et la programmation/mise à jour HUD, pas tout le décodage/IPC. Un maximum de 30 ms subsiste à cent acteurs ; les maxima non corrélés ne prouvent pas sa cause. Ce cas d'auto-soins n'est ni le même que la clinique V48 ni une charge mixte en forêt : leurs pointes restent ouvertes. Les mesures n'établissent pas une optimisation de rendu ni une fluidité universelle.

## Portée

Compilation TypeScript/Vite réussie, avertissement habituel de taille du chunk graphique. Le premier lancement du lot ciblé et celui de Vite ont rencontré `spawn EPERM` dans le bac à sable Windows ; relance autorisée hors de cette restriction, sans changement de configuration du projet. Aucun médicament ou autre objet ajouté. La recherche a corrigé la cible : urgence n'implique pas annulation universelle du travail en cours. Les expirations et réactions aux dégâts des autres tâches restent à étudier avec les comportements et combats. Médicaments, maladies/chirurgie, équipement/combat, social et monde restent incomplets ou absents. G0 en consolidation, G1/G2 partiels, fondations humaines de G3 en cours ; aucun jalon déclaré terminé.
