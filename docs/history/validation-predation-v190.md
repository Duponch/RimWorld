# Validation — Prédation animale V190

3 octobre 2026 ; schéma **178**. [Contrat](../development/predation-v190.md), [recherche Core](../research/predation-core-v190.md). Référence locale Core1.6.4871 rev590 ; miroirs publics corroborants sans attestation de révision. La première boucle du renard sauvage relie choix, poursuite, combat anatomique, chute et ingestion fraîche au contact. Elle ne clôt aucun jalon ni la faune Core.

## Contrôles ciblés et corrections

**135 tests ciblés uniques dans 27 fichiers** ont réussi. Passe finale principale : 129 réussis et une attente historique de registre vestimentaire incorrecte, puis reprise des neuf fichiers historiques **53/53** ; le seul échec est corrigé. Gardes finales graphiques/faune **16/16 dans quatre fichiers**, dont cinq tests supplémentaires uniques. Journaux sous `tmp/predation-v190-final-targeted.log`, `tmp/predation-v190-historical-final.log` et `tmp/predation-v190-render-guards.log`. Aucun résultat de suite complète ou de campagne longue revendiqué.

Les scénarios vérifient régime fermé, nourriture éloignée prioritaire, choix biologique et santé, proie mobile, surprise/Stun/Scratch, interruptions, contacts, chute/identité, dépouille restante, pourriture, dépeçage, reprises et migration neutre. Un cas terminal préparé depuis un vrai décès conserve les racines externes restantes et une récupération humaine : retrait et nutrition refusés pendant la récupération, puis crédit et retrait uniques après sa fin. C'est une frontière préparée, pas un parcours naturel d'épuisement de tout le corps.

Le parcours fourrure prépare trois dépouilles fraîches avec leurs dossiers complets, sans matière ni travail accordés. Collecte, staging et dépeçage réels fournissent la fourrure ; une facture ordinaire transforme **60 fourrures** en une tenue tribale, avec ouvrage, qualité, portages, dépôt, bilan et reprise exacts. Les cinq familles admettent la matière ; une seule est exercée par ce parcours. Aucun décès naturel de trois renards ni nouveau prix de vêtement démontré.

Deux corrections produit sont distinctes de l'entretien des tests : le cache de réservations du planificateur ignorait les repas de piles animaux ; il inclut désormais leur quantité exacte. Deux phases de réservation du corps refusent le transport automatique, puis la dépouille restante est portée après libération ; un autre scénario transporte seulement le surplus d'une pile de nourriture, sans double compte. L'initialisation historique des politiques alimentaires possédait le paramètre d'exclusion V190 mais n'appliquait pas son filtre ; la migration12→13 conserve désormais son catalogue historique avant validation stricte.

Les fixtures historiques fabriquées à partir des définitions présentes excluent explicitement les produits et permissions futurs. Les refus futurs, assertions de propriétaire/contact et validateurs stricts sont conservés. Les quarante sauvegardes publiques antérieures et les archives immuables ne sont pas réécrites. Une erreur de typage de la fixture écologique91 est corrigée par un type de préparation explicite ; aucune règle de production modifiée à cette occasion.

## Navigateur et projection résidente

Chromium **natif WebGPU 1/1**, AMD RDNA‑1, Chromium153.0.8010.12, Node24.11.1, Windows11. Scène publique préparée **32²**, 41e fiche **« Renard et prédation · 3 colons »**, graine190/tick2000 ; renard et lièvre domestique sains, faim initiale préparée, sans aliment, blessure, chasse, trajet ou décès accordé. Rapport `tmp/test-runs/predation-v190-native-single-pass/artifacts/predation-v190-browser.json` : poursuite2002, décès2140, ingestion2155 puis première consommation2204 ; **0,19552 nutrition** créditée, corps restant quantité1, racine `neck` consommée. Reprises UI exactes en poursuite, ingestion et après consommation ; iso et perspective exercées, captures relues. Aucun message d'erreur navigateur capturé.

Sonde résidente **5 306 images** : déplacement du renard continu selon le tick présenté et position conservée au rechargement. Anatomie restante au sol et portée utilise un masque exact23bits et les lots existants ; aucune scène ou squelette individuel. **78→78 pipelines** sur toutes les étapes, zéro compilation supplémentaire pendant le parcours final.

Les premiers parcours échouaient sur80→82 au rechargement, avant la mort. WGSL vertex/fragment identiques aux programmes existants : projection plane de l'effet de bagarre, matériau transparent DoubleSide. `forceSinglePass` retire l'alternance de faces inutile ; la garde reste inchangée et passe. Le premier pilote lisait aussi une table Faune fermée ; il ouvre désormais le panneau réel avant de vérifier l'activité. Ces reprises ne sont ni une nouvelle mécanique ni une preuve de coût GPU nul. Avertissements TSL inline au chargement et taille des bundles restent observés ; pas de temps GPU isolé mesuré.

## CPU borné

`scripts/benchmark-predation-v190.ts` exécuté seul, avant build/natif, sur sources gelées : SHA‑256 `3263a6a66250bf643ebec0cbf9d0be767566672c5545b46afedf3407b0ee50d3`, 662 fichiers ; rapport `tmp/predation-benchmark-v190.json`. Ryzen5 3600, 12 processeurs logiques, environ16Gio, Node24.11.1/Windows10.0.26300. Deux scènes préparées **250²**, 1 024 plantes et 100 animaux ; les acteurs diffèrent entre les scènes. Vingt échantillons après échauffement, préparation/clonage, validation, empreintes et oracles hors chronométrage. Correction graphique ultérieure sans changement des modules simulation mesurés.

| Consultation de navigation | Capture reconstruite p50 ms | Capture réutilisée p50 ms |
| --- | --- | --- |
| Aliment accessible prioritaire | 1,6145–1,6248 | 1,1606–1,1636 |
| Aliment inaccessible puis proie | 10,8976–11,1658 | 10,4271–10,4890 |
| Aliment inaccessible puis bordure | 11,3831–12,5504 | 11,5127–11,6458 |

Une seule identité de recherche par consultation, y compris le repli ; 2 461 cellules finalisées pour l'aliment accessible, **62 491** pour les échecs. Oracle octile indépendant de trajet/contact/coût sur ce terrain uniforme ; aucun effet World/PRNG. La réutilisation conserve uniquement la capture de traversabilité, jamais le champ de recherche. Elle ne démontre pas un gain sur tous les chemins.

Choix biologique des dix renards : p50 **0,3032ms**, p95 **0,3948ms**. Coût absolu d'un appel de **100 ticks locaux réels** : herbivores p50 **356,23–369,41ms**, p95 **396,59–404,62ms** ; 90herbivores+10renards p50 **449,22–466,72ms**, p95 **513,41–537,10ms**. Ces deux mondes et transitions diffèrent : aucun pourcentage de régression causale entre moteurs ni gain général annoncé. La fenêtre finit avec dix poursuites, sans décès, renouvellement ni ingestion de corps ; la chronologie de chasse/ingestion est établie séparément dans les ciblés et le natif. Empreintes finales/PRNG/reprises exactes et conservation des100identités contrôlées.

Le flood sans aliment reste un coût mesuré à réduire si un chemin partiel conserve cible et parents exacts. Mesures absentes : adoption snapshot, CPU image isolé, worker lourd de colonie, GPU et FPS généraux. Aucun240FPS ou débit×6 promis.

## Présentation et limites de livraison

Build/typage finaux passés, **653 modules**, `tmp/predation-v190-build-final.log`. Présentation250² passée successivement après le natif, `tmp/predation-v190-presentation.log` : minage **7 817 images**, p95 RAF **6,1ms** ; abattage **7 720 images**, p95 **6,2ms**. Aucun saut brut/corrigé, excès de trajet continu ni occupation solide dans ces deux fenêtres. Ces valeurs ne garantissent pas une cadence générale. Recherche, implémentation, corrections produit, réparation des pilotes et validation sont distinguées ; durées exactes par phase non chronométrées.

Autres prédateurs, chasse des humains, domestication/reproduction du renard, alerte dédiée de prédation, nouvelles voix et écologie annuelle restent absents. Les facteurs médicaux des stades jeunes conservent leur limite locale documentée. La filière alimentaire et vestimentaire utilise les règles existantes ; ses scènes préparées ne prouvent pas une colonie autonome ni une campagne naturelle longue.

Contrôle documentaire : six têtes au schéma178, liens locaux résolus et trois originaux de référence inchangés. Les **41 sauvegardes publiques** passent leurs empreintes sur payloads décompressés, validation/migration strictes et roundtrip exact, sans réécrire les quarante fichiers historiques (`tmp/predation-v190-public-saves.json`). Les journaux et captures courants restent sous `tmp/`, la preuve résume leur périmètre.
