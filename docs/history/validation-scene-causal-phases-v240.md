# Validation V240 — phases naturelles et mobilier

6 octobre 2026, ROOT seul, contrôles gelés séquentiels via `validate:logged`. [Contrat et décision](../development/scene-causal-phases-v240.md). Produit V233 et schéma 198 inchangés ; aucune optimisation promue dans ce diagnostic.

## Sources et transparence

Cinq dossiers privés sous `tmp/performance-orientation-v240` : Nature `CEC6CA5D`, signatures `1305089E`, oracles `CDC559F4`, GAME `EF89263B`, contrôleur `B239E44D` (préfixes des SHA256 de leurs manifestes GEL). Les trois substitutions canoniques prouvent leur inverse RAW entier ; le journal V233 et les autres imports restent canoniques. Les raccords qualifiés main/Core conservent leurs corps et horloges, avec wrappers de méthodes et huit callees ciblés par AST.

Typage `aulnes-v240-diagnostic-types-2026-10-06T17-46-19.961Z-12436` : PASS 4,160 s. Transparence `aulnes-v240-diagnostic-transparency-2026-10-06T17-46-34.144Z-22460` : PASS 8,970 s, quatre fichiers/treize cas. Comparaisons V233, changements/références/anciennes vues, traces Proxy/trous/getters/throws, forwarding de l'observateur et signatures passent. Le spy d'horloge reste limité aux fonctions factices de deux cas d'observateur ; aucun World ou contrôle natif n'emploie cette horloge. Ces états préparés ne sont pas une campagne jouée.

## Vrai jeu

`aulnes-v240-causal-game-2026-10-06T17-47-04.201Z-4076` : PASS 55,955 s. Rapport privé `game-nature-phases-next/captures/run-2026-10-06T17-47-04.786Z-VVZ05Z/report.json`, SHA256 `A31F80E51C224E70799CF5F4F201151B581EE5FA7485C9575A00D7FFA7FA6D11`. Les Aulnes corrigées, source tick6934, 250×250, Chromium/WebGPU matériel AMD, 1920×1080/DPR1, caméra129/122/zoom1 pendant toute la fenêtre ; vraie UI, audio/musique et qualités conservés. Chauffe3 s puis fenêtre naturelle8 s à6× demandé.

163 lectures Nature, toutes ID admises, 132 vues/31 noView, aucun rollback, repli, initialize ou seed dans la fenêtre. Durées inclusives moyennes : Nature.read3,327 ms ; agenda ID1,744 ms, dont préparation0,569 et prévisions1,012 ; matérialisation1,076 ms sur132 appels et formes0,421 sur163. Les compteurs sont des quantités de travail, pas des durées ; les phases avant arm sont absentes, pas gratuites. Les résidus instrumentés ne sont pas du self time V8.

Les trois changements de signature sont exclusivement `flowerQuarter`, un pot par lecture : IDs20009/20043/20077, ordinals100/134/168, serials12/80/142. Ce sont trois pots distincts. Aucun overflow. Trois appels Furniture sous les vrais buildStructures : moyenne15,733/max21,5 ms, résidu observé hors Box7,3 ms de descendants : moyenne8,433 ms. BuildStructures moyenne17,067/max23,7 ms. Ces valeurs se recouvrent et restent dépendantes de l'instrumentation.

845 callbacks RAF, 105,625/s et vitesse source réelle4,778× sont des résultats instrumentés de cette seule caméra. **Aucun gain FPS n'en est déduit**, aucune comparaison avec l'ABBA global104/89/zoom2. CPU frame moyen5,672/p9519,1/max45,1 ms ; applyWorld moyen12,763/max36,4 ms. Sauvegarde/reprise réelle et anciennes vues passent hors fenêtre ; la caméra104/89 finale appartient à la reprise, pas à la mesure.

Les sources, les62 payloads et leurs65 fichiers publics restent exacts avant/après. Erreurs vides, contexte et navigateur fermés, serveur possédé5234 fermé dans finally ; aucune session utilisateur touchée. Aucun profil V8 nouveau, GPU reset ou upload physique certifié. La suite vise le mobilier résident, puis les coûts continus mesurés ; aucun banc rejeté inchangé n'est rejoué.
