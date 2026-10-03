# Validation — dossiers et infobulles V199

Relevé du 3 octobre 2026, schéma **182 inchangé**, base `ca24c80`. [Contrat](../development/colonist-ui-v199.md) et [recherche](../research/colonist-ui-core-v199.md). Ce chantier change la présentation des données et commandes existantes ; il ne livre aucune nouvelle mécanique.

## Références et choix

Les quatorze images utilisateur de `references_UI/` ont été inspectées. Les collages ne permettent pas de certifier tous leurs pixels, versions ou extensions : la structure est confrontée au Core local **1.6.4871 rev590** et à la recherche Internet indiquée dans le relevé. Les dimensions et l’ordre des onglets viennent de cette comparaison ; la palette pastel est conservée à la demande explicite de l’utilisateur. Les captures sources utilisateur restent hors du commit ; aucun asset ou code propriétaire Core n’est distribué.

## Contrôles ciblés

**18 tests purs dans quatre fichiers passent** : `colonist-inspector`, `inspection-dossiers`, `ui-health-v199`, `ui-item-information-v199`. Ils vérifient l’ordre des fiches, l’état de navigation, les projections existantes, les PV/efficacités anatomiques, les facteurs médicaux, les propriétés d’instances d’objets, les recherches accent-insensitives et l’absence de mutation des sources. Journal final : `tmp/ui-v199/targeted-final.log` ; il ne s’agit pas de la suite exhaustive.

Typage et build passent ; le build comprend **687 modules**, journal `tmp/ui-v199/build-final.log`. L’avertissement historique sur la taille des bundles persiste. Aucun changement de simulation, bridge, renderer, schéma ou fixture historique versionnée. Vérification documentaire passée : **683 documents, 6 581 liens**, six en-têtes au schéma 182 et trois originaux identiques, journal `tmp/ui-v199/docs-final.log`. `git diff --check` passe.

## Navigateur natif et corrections

Les parcours utilisent Chromium matériel avec `channel: chromium`, `args: []`, **WebGPU**, un seul worker, mesures/compilations et navigateur exécutés successivement. Les scènes 32² sont explicitement préparées ; elles ne prouvent ni une campagne naturelle ni la charge d’une carte 250².

**Six parcours distincts dans cinq fichiers passent par composition de reprises**, sans compter les répétitions comme de nouvelles validations. V129 est conservé sous `v199-native-human-final`, compétences sous `v199-ui-guards`, équipement sous `v199-native-complete`, chirurgie sous `v199-surgery-native`, et les deux parcours UI finaux sous `v199-native-color`, tous dans `tmp/test-runs/`. Aucune de ces passes n’est présentée comme la suite exhaustive.

- Dossiers compacts historiques V129 : ordre, espaces entre pages/languettes/résumé, bornes du viewport, tableaux, filtres et boutons mobilisés. Son oracle géométrique est adapté aux dimensions V199 ; l’indépendance des filtres remplace l’ancien choix exclusif.
- UI V199 : onze compétences, jauges et humeur visible, partie anatomique `1 / 10` PV, survol et focus clavier, Échap, fiche d’objet et recherche, politiques médecine/alimentation/auto-soin réellement acquittées. Le journal exerce les filtres indépendants et Voir tout. Sauvegarde/reprise exacte au même tick ; possessions et dossier médical inchangés par l’inspection. Animaux : huit colonnes et identité domestique réelle. Recherche : prérequis et disposition gauche/droite, nœuds **142 × 66**.
- Fenêtres **1366 × 768**, **1440 × 1000**, **1522 × 1195** : dossiers contenus dans l’écran et au-dessus de la navigation. Captures et géométries conservées sous `tmp/test-runs/`.
- Compétences : priorité de construction via Travail, approche et construction physiques, XP réel, apprentissage consulté dans l’infobulle, arrêt et reprise exacte. Un ancien pilote avançait le World à 3000 sans ancrer son dossier médical généré à 0 ; ce checkpoint préparé conserve désormais l’affection et sa bonne horloge. Les assertions d’apprentissage/production restent présentes.
- Chirurgie V192 : sous-onglet Opérations, demande et annulation, lit/chevet et dose physiques, anesthésie, issue anatomique, soin postopératoire et reprises. Le volet droit reste visible pendant Opérations. Le contrôle passe **1/1** sous `tmp/test-runs/v199-surgery-native/`.
- Prisonnier/ennemi : sélection physique, sept/six languettes selon le statut, politiques réellement permises ou désactivées, absence d’ordres coloniaux pour l’ennemi, retour à Bio quand Prisonnier n’est plus applicable. Chaque dossier possède un seul propriétaire DOM. Cette vérification a révélé et corrigé la double création des dossiers communs par l’ancien composant Prisonnier. Les sélecteurs médicaux et de détention conservent un fond papier lisible ; les noms complets des politiques sont disponibles dans leurs infobulles.

La première inspection des captures a révélé deux défauts de produit malgré les premières assertions vertes : le détail Humeur était replié après déplacement dans la colonne droite, et la classe de styles Recherche était appliquée à son contenu au lieu du panneau. Les deux sont corrigés ; les assertions vérifient maintenant la **visibilité réelle** de l’humeur et la position/tailles du graphe. Ce sont des corrections de présentation, distinctes de la réparation de pilotes.

L’ancien contrôle d’équipement a rencontré une initialisation instrumentée bloquée, puis une instrumentation qui ne recueillait pas les images de la bonne instance de module. Le libellé de cargaison a également changé. La cause exacte du premier blocage n’est pas établie ; l’import dynamique séparé n’observait pas le prototype réellement chargé. Le probe est désormais ajouté au module Renderer demandé, avec sa véritable URL HMR et des gardes de préparation. La reprise finale conserve **1 967 images**, dont **1 152 d’approche**, **642 avec arme équipée** et **194 en dépôt** ; checkpoints 3000/3031, état final 3037, zéro erreur console/GPU. Les assertions de contact, propriétaire, attache, cargaison et dépôt sont conservées. Diagnostics avant assertions : `tmp/test-runs/v199-native-complete/artifacts/equipment-probe-v199.json`. Les échecs antérieurs ne sont ni effacés ni attribués à une mécanique nouvellement corrigée.

## Performance et portée

Les listes graphiques 3D, les shaders et la simulation ne changent pas. L’infobulle est un composant délégué unique : contenu préparé à la cadence de présentation, un timer transitoire, repositionnement à la demande du pointeur et aucune boucle RAF continue. Les dimensions sont lues à l’affichage, pas à chaque déplacement. Les listes/signatures bornent les reconstructions DOM et les onglets ne réécrivent pas leurs styles/états à chaque HUD si la sélection est identique. La fiche modale est réutilisée.

Ces faits ne prouvent **aucun coût CPU/GPU nul ni gain général de FPS**. Pas de microbanc de tick, mesure GPU générale ou campagne longue dans ce lot. `test:presentation` n’est pas requis pour cette présentation DOM : ni horloge, interpolation, bridge ni phase graphique de travail n’est modifiée. Les vrais parcours de construction, équipement et chirurgie restent les gardes métier des commandes touchées.

Histoires personnelles, incapacités de travail, Minage, famille/romance et provenance durable des coups ne sont pas ajoutés. Les journaux utilisent les événements bornés existants, identifiés par nom ; l’homonymie reste une limite. La fiche d’objet expose seulement les propriétés livrées. Les infobulles regroupées, les typographies et l’adaptation CSS du viewport sont des différences documentées : la preuve ne certifie pas une parité pixel à pixel exhaustive.
