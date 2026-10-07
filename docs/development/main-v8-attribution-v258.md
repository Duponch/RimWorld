# V258 — attribution V8 du MAIN réel

**Diagnostic uniquement : aucun changement produit ni FPS ajouté.** Produit V242, schéma 198 et 62 références/65 fichiers publics conservés. [Recherche](../research/main-v8-attribution-v258.md), [preuves](../history/validation-main-v8-attribution-v258.md).

V258 capture l’isolate de la Page MAIN dans une vraie partie Les Aulnes corrigées sur 250×250 à 6×. Source, SnapshotDecoder, moteur, SceneRenderCore et Three restent canoniques. Aucun Worker n’est attaché au profiler, aucun lecteur ou clone supplémentaire n’est ajouté. Le MAIN servi reçoit seulement un témoin primitif après chaque callback snapshot réussi et un RAF indépendant ; aucune méthode métier ou prototype n’est enveloppé.

## Capture et protection des résultats

La préparation dérive le runner privé avec ancres uniques et inverse entier. Le chargement Vite vérifie les sources canoniques sans retourner de module substitué. ROOT gèle sources, archives, outil et dépendances de mapping, puis exécute syntaxe, typage, huit mocks et un unique GAME matériel séquentiellement.

Le profiler vérifie Page, origine, isolate et timeOrigin du document. Il enregistre l’intention avant start/stop et persiste le profil brut avant toute validation ultérieure. Après stop et pause/drain, Debugger capture les scripts encore disponibles avec leurs bytes, SHA, ranges et source maps ; CDP est fermé avant la vraie sauvegarde/reprise. Les scripts indisponibles, erreurs et dépassements restent explicites.

Bornes : 8 192 métadonnées, 1 024 scripts, 32 MiB par script/256 MiB cumulés, commandes 60 s et 10 000 témoins par type. Stop/disable/detach sont tentés en faute sans réécrire le brut. Aucun code capturé n’est évalué par les analyses offline.

## Attribution et limites

Le profil conserve ses bords autour de la fenêtre de 8 s. Les brackets de commandes donnent seulement des offsets compatibles entre horloges ; aucun découpage exact de ces 8 s ou origine commune V8/performance n’est supposé. Samples, poids des deltas adjacents et ancêtres inclusifs sont statistiques : un sample n’est pas un appel, une ancre mappée n’est pas un chrono par instruction et les parents ne s’additionnent pas.

Le premier résumé vérifie les maps contre les sources gelées, mais son regex de classes Three `src` manque les vrais chemins `build`. Sa catégorie Three-other comprend aussi des descendants de l’application de scène. Le raffinement AST distinct réassocie les 946 nœuds complets aux fonctions/classes du build exact, puis sépare les phases par ascendance avant leurs sous-familles. Une reprise de cette seule sous-famille arrête la remontée au premier JS vérifié nonThree : une fonction locale ne devient pas Animation.start parce qu’elle est appelée sous RAF. Les premiers artefacts restent intacts.

Les phases mettent en évidence le rendu hors application, l’application C, la réception stricte et un résidu du handler MAIN. Les bindings et les vrais writeBuffer sont visibles dans le build ; leurs temps inclusifs se recouvrent. La désérialisation native reste une hypothèse pour une partie du résidu handler, sans attribution à une instruction établie.

Les 929 RAF/8 s sont des occasions d’animation instrumentées, pas des dessins physiques ni un gain. La source atteint 5,069× sur sa dose confirmée pour 6× demandés. L’instrumentation a une taxe non soustraite ; ce diagnostic ne mesure ni Worker, GPU, compositor ou threads WebAudio, ni toutes les vues/parties.

La piste structurelle motivée est une préparation résidente des données de rendu par objet/passe, préservant calculs CPU/F32, versions, textures, attributs, ordre, culling, ombres et restauration. Les familles responsables ne sont pas encore identifiées ; aucun candidat ni gain futur n’est acquis. Les matrices seules, le groupe FRAME V244 et les prototypes rejetés ne sont pas relancés à l’identique.
