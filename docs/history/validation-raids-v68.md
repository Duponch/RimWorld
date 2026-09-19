# Validation V68 — premier raid dans le camp

19 septembre 2026. Première boucle de menace ordinaire, migration V67 neutre. [Contrat](../development/raids.md), [sources confrontées](../research/raid-reference.md). Composition/cadence provisoires ; ni narrateur complet ni capture/sépulture. G0 consolidation, G1/G2/G3 partiels, G4 élargi par le raid, G5 absent ; aucun jalon clos.

## Simulation et parcours

Passe globale **335/335**, 77 fichiers, 219,75 s. Après revue des sorties et optimisation spatiale, **37/37 ciblés** (raid, mêlée, poursuite, rencontre, ouvrages), 8,59 s. Pas de nouvelle passe globale annoncée. Les huit scénarios de raid regroupent les branches d’entrée impossible, allocation atomique, migration, déplacement lointain, sleeper derrière plusieurs couches de murs, retraite enfermée, pertes cumulées, défaite coloniale, export d’objets et références de récupération vers une cible sortie. Arêtes engagées, PRNG et reprise JSON sont confrontés pendant les transitions.

Premier contrôle : refus d’un trajet de retraite par l’ancienne garde « acteur sans activité » ; le mandat V68 est désormais explicite dans la validation. La revue a aussi ajouté l’attente du sommeil/étourdissement avant sortie et la libération des anciennes poursuites lors d’un départ. Deux erreurs de fixtures corrigées sans affaiblir de règle : unités médicales exprimées en HP_UNIT, état à terre synthétique retiré avant une reprise médicale qui exigerait un dossier. Les tests comptables de pertes cumulées restent distingués des blessures produites par de vrais combats.

Pilote de cinq jours, graine 42, carte naturelle 250² : commandes de joueur pour construire, se nourrir, accueillir un quatrième colon et préparer le camp. Raid **naturellement programmé** au tick 22 600, issue au tick 23 080 ; un adversaire à terre, aucun colon blessé sur ce parcours. L’ennemi finit par mourir de ses lésions, il n’est pas effacé. Reprise des repas et travaux, quatre lits, nourriture disponible, conservation du bois avec pertes constructives, sauvegarde valide. [Rapport complet](../../artifacts/raid-colony-v68.json). Cette graine ne prouve donc pas des soins après raid : les parcours de rencontre rejoués imposent vrais impacts, secours et médicaments, avec une journée de récupération.

## Interface et présentation

Première tentative native interrompue après diagnostic : le test avait inséré la sauvegarde après l’ouverture du menu sans initialiser le bouton Recharger. Le navigateur rendait encore normalement, le clic attendait un bouton désactivé. Préparation corrigée par une première sauvegarde UI.

Passe suivante réussie en **54,8 s** : reprise du camp réellement construit au tick 22 858, lettre et bouton caméra, mobilisation des quatre personnes, bataille à 1× et 6×, sauvegarde/rechargement en combat puis démobilisation et reprise. Issue identique au tick 23 080 aux deux vitesses. Aucun message d’erreur navigateur. [Rapport](../../artifacts/raid-ui-v68.json), captures locales `artifacts/raid-v68-1x.png` et `raid-v68-6x.png`. Ce parcours reprend un checkpoint produit par le pilote cœur ; ce n’est pas une nouvelle passe monolithique de cinq jours UI.

## Audit de charge

Ryzen 5 3600, Windows 11 10.0.26200, Node 24.11.1. Carte 250², base 3/30/100 acteurs ; apparition réelle d’un raider pendant la capture, donc **4/31/101** acteurs ensuite. Les groupes de travail détruisent des barrières de fixture affaiblies, réparent d’autres ouvrages et minent. 240 ticks, aucun reset pendant mesure. Le raid est encore en approche dans cette fenêtre ; ce n’est pas cent assaillants ni un combat humain permanent. CPU puis natif successifs, sources gelées pendant le natif.

Première mesure à 101 acteurs : tick complet p95 21,07 / p99 42,40 / max 146,19 ms. Revue : `raidRoute` préparait les places de contact de tous les colons avant de tester leur accès, répétant les captures physiques. Capture partagée seulement pendant une décision et énumération progressive : ordre/candidats conservés. Après cette modification : p95 22,00 / p99 37,25 / max 66,77 ms ([mesure intermédiaire](../../artifacts/shooting-cpu-v68-contact.json)). Après consolidation de l’admission multi-source : p95 22,48 / p99 39,76 / max 58,66 ms. Le pic baisse dans ces deux observations, pas le p95 ; JIT/GC et variations de machine interdisent d’en faire une garantie. [Avant](../../artifacts/shooting-cpu-v68-before-route.json), [CPU final](../../artifacts/shooting-cpu-v68.json).

| Population après apparition | Tick CPU complet p95 / p99 / max (ms) | Encodage p95 (ms) |
|---|---|---|
| 4 | 3,44 / 23,95 / 30,91 | 3,91 |
| 31 | 8,26 / 27,33 / 35,32 | 3,83 |
| 101 | 22,48 / 39,76 / 58,66 | 3,53 |

Cent colons restent au-delà du budget de tick 16,67 ms à 6× ; aucune promesse de fluidité parfaite. Les trois cas extraient 1/10/34 cellules minières ; aucun arbre terminé dans cette courte fenêtre. La garde minage/abattage distincte doit être lue pour les suppressions graphiques.

Revue des frontières : admission depuis toutes les composantes coloniales valides, et objectifs de sortie hypothétiques incluant une bordure murée. Ces deux cas sont intégrés aux scénarios existants. **23/23** ensuite, y compris le pilote de cinq jours rejoué, 36,88 s ; pas de ressource ou déplacement forcé ajouté au pilote.

Une exécution native combinée a rencontré `net::ERR_NO_BUFFER_SPACE` en chargeant un module Vite, avant toute action du jeu : page sans contrôles, attente jusqu’au timeout. [Diagnostic conservé](../../artifacts/raid-ui-network-failure-v68.json). Les tests suivants de retraite (5,7 s) et charge native (44,5 s) ont réussi. Attente explicite d’un contrôle visible et plafond d’action de 15 s ajoutés au test pour diagnostiquer ce défaut de chargement plus vite ; aucune assertion de gameplay supprimée.

## Passe native finale

**3/3 réussis en 1,8 minute**, successivement : défense 1×/6× (55,7 s), retraite (7,0 s), charge mixte (46,0 s). La retraite recharge une arête en cours, puis sort réellement au tick 71 par la cellule (0,20) ; l’objet porté garde son ID/propriétaire dans le registre. Corps, cargaison et sélection passent ensemble de quatre à trois instances, sans résidu graphique ni erreur. [Preuve de retraite](../../artifacts/raid-retreat-ui-v68.json).

WebGPU natif AMD RDNA1, fenêtre 1440×1000, accélération 6×. [Mesure finale](../../artifacts/shooting-native-v68.json) ; [première mesure native](../../artifacts/shooting-native-v68-before-boundary.json) conservée séparément.

| Population après apparition | Image p95 / p99 / max (ms) | Adoption de scène p95 (ms) | Callback snapshot p95 (ms) |
|---|---|---|---|
| 4 | 12,50 / 12,70 / 25,00 | 7,40 | 1,90 |
| 31 | 16,60 / 24,90 / 29,10 | 7,10 | 4,60 |
| 101 | 29,20 / 50,00 / 83,30 | 15,20 | 14,30 |

Aucun nouveau pipeline ni erreur navigateur. Les temps de scène font partie des images et les callbacks excluent le décodage IPC ; ne pas additionner ces colonnes. Le p95 des images et les pics à forte population restent à améliorer. Ni le rendu ni le CPU ne justifient une promesse de 6× stable à cent colons.

Build TypeScript/Vite réussi, avertissement connu de bundle supérieur à 500 kB. Le contrôle documentaire vérifie les liens et les trois originaux byte-identiques.

Garde native minage/abattage finale : 45 secondes par action avec alternances de vitesse, 9 154 puis 9 879 images observées, zéro saut ni occupation graphique d’un solide détectés. Image p95 8,40 / max 16,80 ms au minage, p95 8,30 / max 29,30 ms à l’abattage. Oracles de phases, suppression de ressource et réponses aux vitesses réussis. Le blocage artificiel optionnel HARVEST_RECOVERY n’a pas été rejoué dans cette passe. [Rapport complet](../../artifacts/harvest-sync-v68.json). Il s’agit de trois colons dans la garde de régression ; ne pas extrapoler ces chiffres à la charge de 101 acteurs.

Livraison de la première boucle de l’étape 2, sans fermer tous ses systèmes : prochaine priorité de ROADMAP, différences de caractère et premières interactions observables. Corps transportables/capture, catalogue de raids, narrateur complet, recherche, climat et autres grands domaines restent explicitement ouverts.
