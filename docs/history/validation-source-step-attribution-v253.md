# V253 — validation de l'attribution du moteur source

Diagnostic uniquement du produit V242, schéma 198 inchangé. Aucun code produit, test public, contenu ou sauvegarde modifié ; aucun FPS supplémentaire livré. [Contrat et résultats](../development/source-step-attribution-v253.md), [recherche](../research/source-step-attribution-v253.md).

## Contrôles et reprise

ROOT seul a exécuté les préparations puis contrôles séquentiels via `validate:logged`, sur sources et dépendances gelées. Les agents ont rédigé et relu les textes sans runtime.

| Contrôle | Résultat | Durée |
|---|---|---:|
| Typage initial | PASS | 3,932 s |
| Deux fichiers, six cas | PASS | 10,146 s |
| GAME initial, armement | FAIL avant fenêtre | 24,276 s |
| Syntaxe et inverse du MAIN servi, reprise | PASS | 1,607 s |
| GAME matériel, reprise | PASS | 39,938 s |

GEL initial `63775CB7A7859D87EB4BD0C479E484078AAAC47A6B6CFA152FDE97E2ECB65122`, 3 075 fichiers. Rouge intact : `tmp/performance-orientation-v253/source-game-next/captures/run-2026-10-07T17-19-40.203Z-ZLE3g4/report.json`. Garde agrégé `Source diagnostic arm failed/late` et cleanupError agrégé : ACK brut absent, cause précise non établie. Aucun temps de performance tiré de ce rouge ; navigateur et origine 5267 fermés.

La reprise garde kernel/helper, six cas, protocole/horloges/gardes, chauffe 3 s et fenêtre 8 s. Seule la marge future du diagnostic passe de 300 à 2 000 ms, avec attente hôte 10 300 ms. Vitesse, publication et règles inchangées. Le début de fenêtre rencontre un autre état chaud ; aucune comparaison A/B avec l'initial.

GEL reprise `F761ECE60A762D89248E282D3C24A5CD7108304CFE7A0F5BC8081A781B919210`, 3 088 fichiers, incluant le rouge et son MAIN servi. Rapport vert : `tmp/performance-orientation-v253/source-game-arm-reprise-next/captures/run-2026-10-07T17-25-02.149Z-VlO30O/report.json`, SHA256 `7D0C1CC27D6E3FF9B54E14E5C5996035BAA08B6936EB2104E11D590B5D358CA1`.

## Preuves et limites

Vrai GAME Chromium/WebGPU matériel AMD rdna-1 ; Les Aulnes 250², source 6934, caméra 129/122/zoom1, 1920×1080/DPR1. UI, son, musique et qualités canoniques actifs ; aucun inspector sélectionné. Trois IDs source canoniques instrumentés réversiblement : Snapshot, Worker et engine. Aucun second moteur/lecteur/Worker, timer par entité, nouvelle lecture World ou clock gameplay.

Les six cas couvrent forwarding/receiver/live binding/retour/throw, parentage réel, admission rejetée et surplomb, inverse TS/JS, boucle littérale, deux vrais petits ticks avec RNG/serialization/getters exacts, et exception d'acteur avec état partiel. Ils ne constituent pas une campagne exhaustive du moteur.

La fenêtre admet 26 batches, 232 steps et 178 publications/encodes/envois snapshot. Les phases d'encode partitionnent exactement leur parent ; fautes, throws inattendus, troncatures et scopes pendants nuls. Préfixes de 300 samples et drops explicites, agrégats complets ; aucun p95 exhaustif reconstruit depuis les préfixes.

Step moyen 22,808 ms ; actors 10,098 ms, soit 44,27 % du parent. Mécaniques incluses dans actors, peu coûteuses dans cette cohorte. Prisoners normalisé 2,050 ms par step pour 464 appels ; SurfaceTemperature 2,306 et PlantLighting 1,296 ms. Temps taxés/inclusifs, pas budgets V8 exclusifs ; arguments, callbacks et résidu ne forment pas une partition exhaustive.

MAIN observe 924 RAF/115,5 par seconde instrumentés. Snapshots confirmés 7068→7299 : 231 ticks/7,9297 s, soit 4,855× réel pour 6× demandé. Ce dénominateur diffère des 232 scopes admis. Endpoint source 664,5 ms après fin, surplombs déclarés : aucune extension de fenêtre ni cause de préemption prouvée. Aucun gain FPS, moniteur 240 Hz ou vrai 6× stable certifié.

Pause/drain puis sauvegarde/rechargement réels au tick 7446 : 3 266 270 checks, persistance, APPLIED et ancienne vue exacts. ACK/restauration propre et fautes nulles ; sources, archives, 62 payloads/65 fichiers publics exacts. Contexte/navigateur et origine 5268 fermés ; sessions utilisateur et references_UI préservées. Pas de perte GPU ou parcours exhaustif des 62 parties promis.

## Décision

V253 est clos sans modification produit. Attribuer les piles réellement exécutées dans actors et étudier le coût spatial de la réconciliation prison. Préserver lectures publiques, replis et premiers refus ; une phase répétée n'est pas automatiquement supprimable. Aucun deuxième banc V253 inchangé ni candidat prison engagé. Commits locaux sans push, autonomie autorisée, relance automatique toujours en pause.
