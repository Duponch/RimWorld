# Validation de la canicule — V74, 19 septembre 2026

Résultat : première pression environnementale dans le camp, avec chaleur réelle, isolation portée, coup de chaleur et refuge/soins adaptés. [Contrat](../development/heatwave.md), [recherche datée et écarts](../research/heatwave-reference.md). Étape proche 5 engagée ; aucune saison ou chaîne du froid implicitement livrée.

## Scénarios et interface

- Passe globale **367/367**, 83 fichiers, **249,44 s** : contrats existants, migrations et parcours de colonie. Après optimisation du rendu et correction du cas sans manipulation, **25/25** contrôles ciblés sur cinq fichiers, **9,32 s**. Cette dernière passe comprend le nouveau scénario d’invalidation graphique ; pas de seconde passe globale annoncée.
- Six scénarios chaleur regroupés : frontières exactes des stades, intervalle neutre, qualité/PV/isolation, incapacité et mort, calendrier et PRNG indépendant, V73 strictement validée, continuation, local inaccessible/réchauffé, mobilisation pendant recherche de refuge, récupération et portage d’un patient vers un vrai lit refroidi. Une personne sans mains peut encore marcher au frais : la manipulation n’est pas une condition du refuge. Les soins ne créent pas de récupération thermique artificielle.
- [Expédition réellement jouée par commandes](../../artifacts/heatwave-colony-v74.json) : premier incident au tick **37 500**, fin **51 339**, suivi jusqu’à **51 939** (8,66 jours). Abri construit/toituré et refroidisseur approvisionné avant l’événement ; maximum **45 °C**, exposition maximale **24,288 %** ; repas et sommeil observés, récupération finale sans décès. Bilan exact des **450 bois initiaux**, dont construction et combustible brûlé/rechargé. Provisions de départ déclarées ; aucune injection pendant la simulation. Ce parcours n’atteint pas le stade grave : refuge autonome et secours ont leurs cas contrôlés distincts.
- Pilotes naturels conservés : [trois camps](../../artifacts/colony-v74-42.json), [raid et reprise](../../artifacts/raid-colony-v74.json), [coton](../../artifacts/cotton-colony-v74.json), [tenue tribale](../../artifacts/tailoring-colony-v74.json), [recherche puis chemise](../../artifacts/research-colony-v74.json). Le raid de ce parcours ne blesse pas de colon ; ce n’est pas une preuve de traitement après combat. Les fixtures de ces parcours n’activent pas automatiquement le calendrier climatique ajouté à l’application.
- UI native finale **1/1**, alerte, explication, santé, déplacement physique à **1× puis 6×**, sauvegarde/rechargement au refuge et récupération : [bilan](../../artifacts/heatwave-ui-v74.json), [checkpoint d’origine](../../artifacts/heatwave-checkpoint-v74.json). Aucun tick injecté dans le navigateur. Capture locale `heatwave-refuge-v74.png` examinée : température intérieure/extérieure distincte, colon au refuge, FPS visible. Ce parcours est une continuation de l’expédition, pas huit jours intégralement rejoués dans le navigateur.
- TypeScript et build réussis. Les échecs intermédiaires restent explicites : porte de fixture initialement sans matériau ; fixture inaccessible dont le champ `moving` n’avait pas été remis à `idle` après retrait manuel de son intention ; inférence TypeScript trop étroite du lit synthétique corrigée par annotation `Structure`. Aucun seuil métier ou assertion de conservation supprimé.

## Charge mixte et correction observée

Matériel : **AMD Ryzen 5 3600**, Windows **10.0.26200**, Node **24.11.1** ; navigateur Chromium natif, WebGPU **AMD RDNA-1**, viewport **1440×1000**. Carte naturelle **250²**, 3/30/100 acteurs ; recherche au poste, collecte/confection engagée et minage/abattage. Canicule au plateau +17 °C, moitié en chemise avec exposition initiale contrôlée de 34 %, moitié en tenue tribale. Un seul passage par effectif ; CPU puis navigateur exécutés successivement, sources gelées pendant les mesures. La fenêtre ne finit aucun vêtement : elle ne prouve pas le coût de toutes les sorties de production. Une fixture de charge ne prouve pas la survie à long terme.

[CPU](../../artifacts/heatwave-cpu-v74.json) : 650 ticks, échauffement séparé de 100 ticks, snapshot tous les cinq ticks.

| Personnes | Tick p50 / p95 / p99 / max, ms | Snapshot p95 / max, ms |
|---|---|---|
| 3 | 0,82 / 1,67 / 3,24 / 16,24 | 4,36 / 7,84 |
| 30 | 1,59 / 6,09 / 11,90 / 18,27 | 4,89 / 7,10 |
| 100 | 5,59 / 17,59 / 24,86 / 38,71 | 6,98 / 10,65 |

La première [mesure native](../../artifacts/heatwave-render-v74-before.json) a révélé une invalidation trop large : les ancres de croissance thermique déclenchaient les parcours complets de lots forestiers, même sans changement visuel. `NaturalResourcePresentation` capture désormais les scalaires visibles (identité, espèce, position, pierre, fructification), indépendamment des ancres, quantités et taux. Maturation temporelle, récolte, retrait/restauration, édition en place et changement de pierre restent détectés. Le test vérifie aussi les buffers résidents et la frontière stricte de récolte. Pas de changement des règles ou de la fréquence d’intégration de croissance.

[Mesure native après correction](../../artifacts/heatwave-render-v74.json), worker réel demandé à 6×, échauffement de 90 images, fenêtre de 650 ticks environ. Les percentiles worker sont ceux des moyennes de pas publiées par lot, pas des percentiles indépendants de tous les ticks.

| Personnes | Image p50 / p95 / p99 / max, ms | p95 avant, ms | CPU de frame p95, ms |
|---|---|---|---|
| 3 | 8,4 / 16,7 / 25,0 / 50,0 | 20,7 | 9,9 |
| 30 | 8,4 / 20,8 / 29,2 / 66,6 | 29,2 | 10,8 |
| 100 | 12,5 / 33,3 / 41,7 / 58,4 | 41,6 | 19,3 |

Zéro erreur navigateur, état invalide ou nouveau pipeline GPU ; géométrie des personnages stable. Gain sur les p95, mais pointes toujours présentes, dont celle à 30 acteurs plus élevée sur la seconde passe. Les différences ne prouvent pas un gain universel ni une cadence 6× garantie. Coûts résiduels de snapshots/scène et suivi de végétation à poursuivre lors des futurs audits ; aucune promesse de fluidité parfaite.

La correction finale d’admissibilité du refuge sans mains ne touche aucun acteur de ces charges ; leurs mesures ne sont pas artificiellement répétées. La garde visuelle minage/abattage est consignée ci-dessous.


## Garde de présentation finale

[Minage et abattage natifs](../../artifacts/harvest-sync-heatwave-v74.json) : deux fenêtres de 45 secondes, carte 250², trois colons, changements 1×/6×/1×/3× toutes les deux secondes. Garde réussie : zéro saut détecté, occupation solide incohérente, famine du tampon ou erreur navigateur. Les cinq observations de début par phase précèdent le premier segment au tick 2 001 ; elles ne sont pas une rupture en cours de déplacement. Image p95 **8,4 ms** pour les deux activités ; maxima **29,1 / 29,2 ms**. Réponse complète au changement de vitesse au plus **47.6 ms** dans cette capture. Ce scénario tempéré vérifie le contrat graphique partagé, distinct de l’audit de canicule à cent acteurs.

Documentation : **260 documents, 2 681 liens**, 25 identifiants de domaine et cinq familles de validation ; trois originaux préservés octet pour octet. Contrôle final relancé après ajout de cette preuve.
