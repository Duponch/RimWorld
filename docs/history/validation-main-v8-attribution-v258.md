# V258 — validation de l’attribution V8 MAIN

**Diagnostic PASS, sans optimisation produit ni FPS ajouté.** Produit V242, schéma 198 et 62 références/65 fichiers publics exacts. [Contrat](../development/main-v8-attribution-v258.md), [recherche](../research/main-v8-attribution-v258.md).

## Contrôles et artefacts

GEL principal `3CD7E723…`, préparation à inverse entier. ROOT seul exécute les contrôles séquentiels ; aucun candidat moteur, décodeur ou rendu n’est substitué.

| Contrôle | Verdict |
|---|---|
| [Syntaxe](../../tmp/performance-orientation-v258/root-captures/run-syntax-2026-10-07T22-14-12.926Z-tl17qk/report.json), [typage](../../tmp/performance-orientation-v258/root-captures/run-types-2026-10-07T22-14-15.983Z-v3J5td/report.json) et [huit mocks CDP](../../tmp/performance-orientation-v258/root-captures/run-tests-2026-10-07T22-14-19.899Z-e5lkHq/report.json) | PASS |
| [Unique GAME matériel](../../tmp/performance-orientation-v258/root-captures/run-game-2026-10-07T22-14-30.845Z-oRX8O5/report.json) | PASS, 36,317 s |
| [Premier résumé offline](../../tmp/performance-orientation-v258/root-captures/run-analyze-2026-10-07T22-15-47.815Z-XUhjRl/report.json) | PASS, 1,505 s |
| [Premier raffinement AST](../../tmp/performance-orientation-v258/root-captures/refinement-run-n91OMI/report.json) | PASS, 2,412 s ; défaut de sous-famille conservé |
| [Raffinement repris](../../tmp/performance-orientation-v258/root-captures/refinement-reprise-0cMuir/report.json) | PASS, 2,385 s ; phases et entrées exactes, sous-famille corrigée |

Les mocks couvrent identité Page, durabilité du brut avant faute, samples/deltas invalides, start/ACK incertain, stop/disable/detach et inverse MAIN. Ils ne simulent pas une performance ou un GPU. Le GAME conserve erreurs navigateur/GPU/HTTP sans filtre et valide les charges canoniques Source/engine/Decoder/Core.

[Rapport GAME](../../tmp/performance-orientation-v258/main-v8-profile-next/captures/run-2026-10-07T22-14-31.030Z-Y2MJdR/report.json), SHA `B04CE19D…` ; profil brut voisin `main.cpuprofile`, SHA `6E01116E…`, 297 133 octets. Le [premier résumé](../../tmp/performance-orientation-v258/main-v8-profile-next/captures/run-2026-10-07T22-14-31.030Z-Y2MJdR/main-profile-summary.json) et ses maps/sources restent intacts. Le calcul offline vérifie les scripts capturés et leurs sourcesContent contre les sources gelées, sans les exécuter.

Le premier raffinement conserve des phases exactes, mais sa sous-famille pouvait hériter d’un ancêtre Three distant à travers du JS local et nommer applyWorld « Animation.start ». Ce libellé n’est pas un coût d’Animation. La reprise distincte du seul observateur arrête cette remontée au premier JS vérifié nonThree ; son inverse retrouve le script initial entier. Le [résultat repris](../../tmp/performance-orientation-v258/class-refinement-reprise-next/captures/refine-UcVlwG/refinement.json), SHA `8E3BF2DF…`, GEL `C34C3CE2…`/3 387 fichiers, conserve les phases et les 6 791 samples sans nouveau profil ou runtime. Les 1 485 feuilles locales d’applyWorld restent sans classe Three attribuée ; leurs descendants Three directs restent reconnus.

## Dose réelle et attribution par phase

Les Aulnes corrigées, départ 6934, 250×250 ; caméra orthographique 129/122/zoom1, 1920×1080/DPR1, WebGPU matériel AMD. Trois secondes de chauffe à 6×, armement futur +2000 ms, fenêtre de 8 s ; réglages historiques UI/audio/music/qualité conservés. Absence d’inspecteur/sélection et autres vues non exercées restent des limites.

La fenêtre compte 929 occasions RAF, soit 116,125/s, et 181 callbacks snapshot réussis. Les confirmations 7101→7341 progressent de 240 ticks en 7,8912 s : source 5,069× pour 6× demandés. Ces comptes ne sont pas des dessins soumis ou FPS moniteur ; aucune comparaison A/B ni taxe soustraite.

Le profil entier contient 6 791 samples/946 nœuds et dure 11 239,282 ms avec bords ; somme des deltas 11 238,895 ms. Une plage d’offset compatible existe, sans offset exact ni clipping de 8 s. Les phases ci-dessous sont des buckets exclusifs par sample sur ce **profil entier**, non des temps CPU exacts par fonction/frame.

| Phase raffinée | Samples | Poids approximatif |
|---|---:|---:|
| Rendu Renderer hors application |1 941|3 098,370 ms|
| SceneRenderCore.applyWorld, descendants inclus |1 650|2 558,596 ms|
| SnapshotDecoder.adopt |637|927,967 ms|
| Résidu SimulationClient.onmessage |668|1 043,041 ms|
| Audio MAIN |261|401,729 ms|
| UI MAIN |78|116,473 ms|

Autres JS vérifiés, program, idle, GC et audit restent présents dans les artefacts. Il est incorrect de diviser ces poids par les 181 callbacks ou 929 RAF de la fenêtre, ou de sommer les parents inclusifs des fonctions sous-jacentes.

L’ancien Three-other, 2 488 samples/3 955,510 ms, manque la distinction src/build et comprend des descendants d’applyWorld : il ne prouve ni bindings nuls ni renderer exclusif. Les ancres du build capturé montrent `_renderObjectDirect` 2 573,162 ms inclusifs, `Bindings._update` 859,181 et `UniformsGroup.update` 258,364. Les 245 samples writeBuffer, 394,061 ms, se répartissent par piles en UBO 285,335 et attributs/storage 108,726 ; ces postes se recouvrent avec leurs parents. Aucun temps GPU, nombre d’uploads ou cause native précise n’en est déduit.

La partition reprise de la phase renderer affecte exclusivement 207,853 ms à la classe Bindings, 227,994 à UniformsGroup, 131,912 à NodeManager et 315,180 à WebGPUBindingUtils, feuilles natives héritées comprises. Ces sous-familles diffèrent des parents inclusifs ci-dessus. Le receiver dynamique et la famille de meshes ne sont pas établis par le propriétaire lexical AST.

## Reprise et conservation

Après stop/pause/drain et fermeture CDP, vraie sauvegarde/relecture au tick 7373 : 3 266 270 checks, roundtrip persistant, application de récupération et ancien World retenu stables. La scène termine au tick 7373 sans queue ni erreur fatale. Ces contrôles et capture écran sont hors profil/fenêtre.

Profiler/Debugger désactivés, session Page détachée, pending/faults/cleanupErrors 0, aucun Worker attaché au profiler ; navigateur possédé et origine 5282 fermés. Sources, archives, 62 références/65 fichiers publics, sauvegardes, sessions et references_UI préservés. Aucun build/adoption, cadence/règle/qualité réduite, push ou 240 FPS certifié.

Décision : le profil motive une étude structurelle de préparation des records d’objet/passe et garde une question causale ouverte sur le résidu handler. Il ne qualifie pas encore une famille optimisable ou un gain matériel ; aucune nouvelle campagne ou piste rejetée inchangée n’est lancée par cette clôture.

Documentation canonique et liens : PASS 0,843 s, journal `v258-docs-2026-10-07T22-31-50.083Z-9288`. Cette validation ne rejoue pas le GAME.
