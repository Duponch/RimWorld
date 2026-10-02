# Preuve bornée — orage sec localisé V184

2 octobre 2026, schéma **173**, depuis `1411a1d`. [Contrat](../development/flashstorm-v184.md), [recherche Core](../research/flashstorm-core-v184.md). L’édition utilisateur de l’herbe est explicitement incluse au prochain commit : largeur multipliée par 1,5, sans ajouter de sommets ni de draw call. Cela ne prouve pas un coût GPU inchangé.

## Périmètre

Ticket Misc 0,4 de l’enveloppe locale 16,9, dix-neuf autres incidents encore absents. Première condition optionnelle prospective, frappes physiques et filtres de pluie selon les frontières Core vérifiées. La fréquence contextuelle complète, les autres difficultés, le brouillard de guerre et un flash graphique d’éclair restent absents.

## Contrôles et limites

Contrôles successifs, code servi gelé : typage passé puis **54/54 tests ciblés dans onze fichiers**, en 10,28 s. La revue renforce ensuite les liens entre compteur météo et frappes locales, le majorant historique et le refus atomique au même tick. Les contrôles finaux passent **55/55 dans les mêmes onze fichiers**, en 13,41 s (`tmp/test-runs/flashstorm-v184-guards-release.log`). Calendrier privé, cooldown, rejets/toits, échéance stricte, migration neutre 172 et refus des champs futurs, delta invalide atomique, pluie sortante et filtre après fin, coexistence avec orage ordinaire, feu, bridge et catalogue sont exercés. Le test de coexistence utilise des callbacks observateurs ; les conséquences physiques ont leurs contrôles séparés.

Chromium natif WebGPU **1/1**, 24,7 s au total, viewport 1 440 × 1 000. Menu public, 36 colonies, chargement de la scène 250²/graine 12456/tick 26 399, activation réelle à 26 400 (premier snapshot arrêté observé à 26 401), lettre et reprise exacte. Frappe `(122,123)` au Core 264 001, cinq allumages physiques ; Foyer désigné et priorité Extinction réglée par les panneaux réels. Ada atteint `(123,123)`, phase `beat` vérifiée au contact du feu `(122,123)` à 26 411 ; ledger d’extinction **0→1** à 26 438. Monde strictement valide, aucune erreur navigateur. Captures relues : feux et colon au contact visibles, alerte lisible et FPS discret présents. Le parcours ne prétend pas avoir observé toute la fin de condition dans le navigateur.

Rapports et captures courants sous `tmp/test-runs/flashstorm-v184-*`. SHA-256 de la scène publique : `e5b8efcf61282546c0b8e8149a6d205dc6095a2c1563a76865f35b63fedf8da4`. Première passe de typage corrigée avant les suites : signature du garde compatible avec les snapshots dynamiques et narrowing du générateur ; diagnostic préparatoire de graine/cible distinct des contrôles livrés.

Second parcours natif sur les gardes finales et le libellé de priorité corrigé : **1/1 en 27,4 s**, aucune erreur. Activation observée au tick **26 400**, frappe observée à **26 406**, contact **26 413**, première extinction **26 445**. Les cinq allumages, le Core 264 001 et les positions de contact sont identiques. Rapport sous `tmp/test-runs/flashstorm-v184-native-final/`.

Deux reprises du nouveau témoin de fichier invalide ont été nécessaires : `serializeWorld` refuse déjà de produire une sauvegarde corrompue, puis un clone du World force un checkpoint au lieu du delta attendu. La préparation utilise maintenant un JSON brut pour tester le refus de chargement et conserve l'identité du monde de l'encodeur pour exercer un véritable delta. Aucune règle ni assertion métier détendue.

Présentation normale 250²/graine 42/trois colons, Chromium WebGPU natif, minage **10 620 images** puis abattage **10 621**, 45 s chacun avec alternance 1×/6×/3× : p95 RAF **4,3 ms** chacun, aucun saut brut ou retenu, occupation solide ou famine de tampon. Les 44 commandes de vitesse répondent en **45,8 ms au plus**, pleine cadence **49,1 ms au plus**, sous 100 ms. Cette passe précède seulement le resserrement des gardes de sauvegarde et la correction du nom de priorité dans la lettre ; aucune animation/horloge n'a changé depuis.

Première régression hors campagnes longues passée : **369/369 fichiers, 1 608 réussis et un ignoré**, 342,49 s (`tmp/test-runs/flashstorm-v184-regression.log`). Après resserrement des gardes et réparation de leur témoin, la régression finale passe **369/369 fichiers, 1 609 réussis et un ignoré**, **352,54 s** (`tmp/test-runs/flashstorm-v184-regression-final.log`). Build avec typage passé sur ces gardes finales, **632 modules**, Vite 2,12 s (`tmp/test-runs/flashstorm-v184-build.log`), avertissement préexistant des chunks dépassant 500 kB.

## CPU isolé 250²

[`flashstorm-bench-v184.ts`](../../scripts/flashstorm-bench-v184.ts), exécuté seul après les ciblés, avant le build/navigateur : Windows x64, Ryzen 5 3600/12 processeurs logiques, 17,13 Go mémoire physique, Node **24.11.1**. Même scène hashée, sources gelées/hashées, quatre chauffes puis trente échantillons par cas ; clones, préparation, hash et témoins exclus des intervalles. Deux répétitions déterministes comparent le World entier, mais ne sont pas un oracle algorithmique indépendant. La frappe physique allume et endommage une pile préparée **légalement à `(121,122)`** dans son rayon, compteur météo/Flashstorm et ignitions vérifiés. Le premier lancement refusait correctement une pile supplémentaire sur la case déjà occupée de l’impact ; seule la préparation du banc a changé.

| Cas | p50 CPU ms | p95 CPU ms |
| --- | ---: | ---: |
| Sans condition, lot de 1 000 appels | 0,0487 | 0,0635 |
| Attente avant échéance, 1 000 pas de dix Core, horloge remise hors mesure | 0,0758 | 0,1093 |
| Choix du centre sur terrain naturel | 0,7597 | 1,8776 |
| Choix, carte synthétique entièrement couverte, dix refus | 7,4388 | 12,3551 |
| Premier lot météo avec frappe et conséquences physiques | 1,5591 | 2,2993 |

Rapport `tmp/flashstorm-bench-v184.json`, log `tmp/test-runs/flashstorm-v184-cpu-final.log`. Les horloges de mesure peuvent dominer les petits lots d’absence/attente ; ne pas annoncer leur quotient comme coût exact d’un tick. Recherche de centre rare, hors image ; le cas couvert est synthétique. Aucun A/B de révisions, tick complet, publication/adoption, worker, CPU image ou temps GPU mesuré. Les feux existants peuvent gagner des instances ; aucune gratuité GPU n’est démontrée.

## Limites de livraison

La scène préparée ne vaut pas une campagne naturelle ; les preuves antérieures restent datées, sans reprendre leurs résultats comme une nouvelle suite complète. Campagnes longues et navigateur exhaustif non exercés. Narrateur contextuel, autres difficultés et incidents, brouillard de guerre, flash graphique et journal exhaustif de chaque éclair restent absents. Les deux flux de frappes sont servis par lots successifs dans un pas local, pas entrelacés à l’unité Core.

Contrôle documentaire passé : **635 documents / 6 052 liens locaux**, six en-têtes au schéma 173, 25 domaines/cinq familles conservés et trois originaux aux octets identiques (`tmp/test-runs/flashstorm-v184-docs-final.log`). Recherche/contrat, implémentation, correction produit des gardes, réparation des préparations et exécution successive des contrôles restent des étapes distinctes. Environ seize minutes d’exécution des contrôles après la préparation du lot, dont près de douze pour les deux régressions ; durées recherche/implémentation non instrumentées, aucun gain de temps ou de tokens revendiqué.
