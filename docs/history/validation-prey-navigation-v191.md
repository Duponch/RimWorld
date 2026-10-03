# Validation V191 — navigation prédatoire progressive

3 octobre 2026. Base V190 `c4d69e5`, schéma178 inchangé. [Contrat](../development/prey-navigation-v191.md), [recherche technique](../research/prey-navigation-web-v191.md). Optimisation interne livrée dans le périmètre ciblé ci-dessous, sans nouvelle mécanique.

## Périmètre

Optimisation d'une consultation synchrone, sans nouvelle mécanique. Nourriture prioritaire, classement biologique, contact et trajet doivent rester identiques au code exhaustif V190. La reprise du champ par proie évite d'explorer les cellules inutiles lorsque la première proie accessible est proche. Aucun changement des phases, de la persistance, du bridge ou du rendu.

## Contrôles ciblés

**64 ciblés uniques dans douze fichiers passent**, dont six nouveaux scénarios avec32 comparaisons16². Référence exhaustive V190 et Dijkstra indépendant O(N²) reconstruisant traversabilité, coins, coûts dirigés et ordre des égalités : même cible/contact/coût et chaque cellule du trajet. Une seule identité de recherche, aucun `finish` au succès de prédation ; contact et parents finalisés, témoin découvert non finalisé refusé. Requêtes après éditions au même tick, World/PRNG intacts, reprise exacte. Les scénarios existants rejouent nourriture, chasse, mêlée, ingestion, réservations, sortie animale et circulation civile.

La première passe a58 ciblés historiques et six nouveaux :63 réussis, une fixture civile V13 invalide. Sa construction depuis le monde courant conservait des permissions alimentaires futures. Réparation **du seul pilote** par une liste explicite des cinq aliments historiques, appliquée aussi à l'attente de migration et aux deux témoins d'interdiction de chevauchement ; positions, tâches et assertions conservées, aucun validateur détendu. Reprise des cinq contrôles spatiaux passée. Journaux `tmp/prey-navigation-v191-targeted.log` et `tmp/prey-navigation-v191-spatial.log`. Régression exhaustive et campagnes longues non exercées.

## CPU isolé

`scripts/benchmark-predation-v191.ts`, exécuté seul après ciblés/build : A/B/B/A, mêmes scènes250², vingt échantillons de cinq consultations par créneau après cinq échauffements. A provient du blob V190 `e5973f60b8ee08ab81d60dacfb60cf3c02d881e8`, imports seulement rebasés sous `tmp/` ; dépendances partagées vérifiées inchangées. B est la production gelée, SHA‑256 des662 sources `7ffc039e0b34e18aa39d9de0cc219a318d17063abcbc36239220a7c4e97b22b4`, script `239d06ee43b8cb4c66ff02fd11a2cc1a2ea5fec9009c50074b71506569a75a48`. Ryzen5 3600, douze processeurs logiques, Node24.11.1/Windows10.0.26300. Rapport `tmp/predation-benchmark-v191.json`.

| Consultation préparée | V190 p50 ms | V191 p50 ms | Cellules finalisées V190→V191 |
| --- | --- | --- | --- |
| Sans aliment, proie proche |12,026–13,344|1,637–1,808|62 500→13|
| Sans aliment, première proie classée éloignée |10,832–13,445|1,536–1,741|62 500→1 633|
| Première proie inaccessible, suivante accessible |10,248–10,268|11,072–11,178|62 475→62 475|
| Aliment inaccessible puis proie |10,720–11,042|10,681–10,782|62 491→62 491|
| Aliment accessible prioritaire |8,899–8,992|8,910–8,992|50 207→50 207|
| Aucune proie, repli bordure |10,624–11,956|10,601–10,704|62 500→62 500|

Chaque résultat complet, cible, contact, coût et trajet A=B ; oracle octile/contacts indépendant sur ce terrain uniforme, classement biologique réel préparé hors temps, une recherche par consultation, empreintes World/PRNG intactes. Clonage, classement, captures, validation, empreintes et oracles hors temps ; construction du masque paresseux et consultation incluses également. GC normal inclus, sans GC forcé.

Le gain est établi pour une proie accessible avant exploration complète. Une première proie inaccessible conserve le flood et coûte ici **0,80–0,93ms de plus** ; la recherche avec buts teste leur appartenance pendant l'exploration, travail absent du flood sans buts V190. Cette lecture suggère une source de coût, sans profiler ni cause isolée attestée ; aucune amélioration universelle annoncée. L'échec alimentaire, déjà pondéré par ses buts dans V190, reste comparable. Cartes sans mobilier avec au plus trois animaux, pas charge de colonie : aucun gain du tick complet, worker, GPU ou FPS déduit.

## Réutilisation des preuves

La [preuve graphique V190](validation-predation-v190.md) reste datée : parcours natif préparé, ingestion et reprises, présentation250² et stabilité des pipelines. V191 ne la présente pas comme une nouvelle exécution. L'équivalence complète des trajets autorise la réutilisation pour les contrats inchangés ; un échec de cette équivalence exige une correction puis réévaluation des contrôles concernés.

Build/typage passés, **653 modules**, `tmp/prey-navigation-v191-build.log`. La réparation ultérieure de fixture est contrôlée séparément par le typage final. Aucun nouvel asset ou contenu de sauvegarde : les41 scènes publiques et les originaux restent inchangés. Les commandes/UI, renderer et interpolation ne sont pas modifiés. Recherche, optimisation, réparation du pilote et contrôles sont distingués ; durées globales de travail non chronométrées.
