# V253 — attribution des vrais ticks de simulation source

V253 est un diagnostic du produit V242, schéma 198, sans optimisation ni FPS supplémentaire livré. Il complète la [publication source V249](source-attribution-v249.md) et les [applications de scène V252](scene-apply-current-v252.md) : le coût du step source n'était pas encore attribué intérieurement. [Recherche](../research/source-step-attribution-v253.md), [preuves et reprise](../history/validation-source-step-attribution-v253.md).

## Frontières instrumentées

Le vrai `engine.stepWorld` est instrumenté à son ID canonique dans le Worker source existant. Snapshot, Worker et engine résolvent le même helper privé dans ce realm ; aucun moteur miroir, clone, lecteur ou Worker supplémentaire n'est créé. Les copies Node privées servent uniquement aux contrôles courts. Les transforms conservent des inverses RAW entiers, sans nouvelle lecture World/RNG ni changement de règle, condition, horloge ou cadence.

Les appels importés qui avancent ou réconcilient un système entier reçoivent des timers aux seuls sites historiques, avant/après les acteurs. Leur binding live est évalué avant leurs arguments RAW ; le helper appelle une fois le callee avec le receiver original et conserve retour/throw. L'évaluation des arguments et leur array diagnostique précèdent le timer bulk, mais restent payées par les clocks du step. Les fonctions différées et routines par pawn/machine/cellule ne reçoivent aucun timer individuel.

Un seul bloc `step.actors` entoure le if mécanique impair, le for pawn complet et le if mécanique pair, dans cet ordre. Les deux admissions mécaniques ont des sous-spans inclusifs ; les continues, rotation, budgets et for pawn restent RAW. Le catch marque puis relance la même exception ; le finally ferme le scope. Les deux timestamps originaux du Worker et le calcul de `stepMs` sont conservés : ce champ publié reste une moyenne du batch, pas une distribution individuelle ni le coût de toute la publication.

Le helper reprend V249 et ajoute un enum fermé de 80 phases et trois APIs libres. `source.step` demeure la mesure rétrospective des timestamps originaux ; bulk/actors sont des frères sous batch, mécaniques des enfants d'actors. Il n'existe aucun nouveau parent `step.world` ni partition exclusive du step. L'admission true **et false**, overhangs, horloges traduites, port/ACK, restauration, agrégats complets et préfixes bornés à 300 restent qualifiés. Les taxes d'observation sont incluses.

## Qualification et reprise

Le GEL initial 63775CB7 protège 3 075 fichiers : typage PASS 3,932 s et six cas PASS 10,146 s. Les contrôles couvrent forwarding/receiver/throw, parentage/admission/overhang, inverse TS et JavaScript compilé, for pawn littéral, deux vrais petits ticks A/B avec RNG/save/getters exacts et exception d'un vrai acteur après son write motion. Ils ne remplacent pas une campagne moteur exhaustive.

Le premier GAME échoue en 24,276 s sur le garde agrégé d'armement failed/late, avec cleanupError ; aucune fenêtre mesurée n'est acquise. Ce rouge et son GEL restent intacts. L'ACK brut manque dans ce rapport : un retard sous marge 300 ms est une hypothèse, pas une cause certifiée.

La reprise distincte GEL F761ECE6 protège 3 088 fichiers. Elle change la marge future diagnostique de 300 à 2 000 ms et l'attente hôte correspondante à 10 300 ms, avec origine/caches/captures propres. Fenêtre 8 s, chauffe 3 s, vrais clocks/ACK/gardes, kernel, qualité et règles restent identiques. L'état chaud au début diffère ; aucune comparaison avec l'échec initial n'est possible. Syntaxe PASS 1,607 s, puis GAME PASS 39,938 s ; les six cas inchangés ne sont pas rejoués.

## Observation du GAME

Les Aulnes corrigées 250², tick source 6934, restent la référence : Chromium matériel AMD, 1920×1080/DPR 1, caméra 129/122/zoom 1, vitesse 6× demandée. GAME/UI/audio/music et qualité canoniques sont actifs ; aucun inspector sélectionné n'est exercé. La fenêtre admet 26 batches, 232 steps et 178 publications/encodes/envois snapshot, dont 168 publications de phase discrète et dix de fin de batch. Aucun checkpoint n'entre dans cette fenêtre.

| Phase source | Appels admis | Total, ms | Moyenne par appel, ms | Total / 232 steps, ms |
|---|---:|---:|---:|---:|
| Step, timestamps originaux | 232 | 5 291,50 | 22,808 | 22,808 |
| Actors, mécaniques incluses | 232 | 2 342,80 | 10,098 | 10,098 |
| advanceSurfaceTemperature | 232 | 535,10 | 2,306 | 2,306 |
| reconcilePrisoners | 464 | 475,70 | 1,025 | 2,050 |
| reconcilePlantLighting | 464 | 300,70 | 0,648 | 1,296 |
| scheduleGrowing | 232 | 241,20 | 1,040 | 1,040 |
| advancePower | 232 | 236,90 | 1,021 | 1,021 |
| reconcileTemperature | 261 | 233,00 | 0,893 | 1,004 |
| advanceWildlife | 232 | 180,00 | 0,776 | 0,776 |

La dernière colonne normalise une dose ; elle n'est pas un chronomètre supplémentaire ou un budget exclusif. Les appels répétés entry/tail et les contextes lazy restent à leurs emplacements historiques. Actors ne distingue pas encore navigation, décisions, needs ou health ; le coût mécanique seul est faible dans cette cohorte, pas dans toutes les parties. SurfaceTemperature comprend ses propres sous-systèmes. Aucune suppression de reconcile répétée n'est justifiée par le seul nombre d'appels.

Publication moyenne 12,961 ms inclut encode 11,469 ms et l'appel émetteur postMessage 1,458 ms. La partition d'encode héritée V249 reste exacte, différence maximale nulle ; ces parents ne s'additionnent pas. Prisoners et PlantLighting ont chacun 464 segments, 300 samples conservés/164 dropped, mais des totaux complets. Les 232 steps admis et leurs overhangs ne sont pas les 231 ticks livrés entre snapshots MAIN : ces derniers donnent 4,855× sur 7,9297 s. Le délai endpoint après end vaut 664,5 ms et n'étend pas la fenêtre.

MAIN compte 924 RAF sur 8 s, soit 115,5 RAF/s instrumentés. Aucun ABBA ou gain FPS n'est établi contre V249/V252 ou une autre vue. Sauvegarde/rechargement réels au tick7446, anciennes vues et 3 266 270 checks passent. Faute source/MAIN/HTTP nulle, ACK/restauration propre ; sources, 62 payloads/65 fichiers publics et archives exacts, navigateur et port5268 fermés.

La priorité devient une étude concrète des acteurs/navigation et de la réconciliation prison, sans modifier cadence, qualité ou règles. Le diagnostic ne promeut aucun candidat ; il ne certifie ni 240 FPS, ni un vrai 6× stable, ni toutes les parties, ni du CPU V8 exclusif ou une durée GPU.
