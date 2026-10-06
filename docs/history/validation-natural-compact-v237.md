# Qualification V237 — sortie compacte Nature et observation des uploads

6 octobre 2026, ROOT seul pour contrôles et mesures séquentiels journalisés. **Expérience privée écartée ; produit V233/schéma 198 inchangés.** [Contrat](../development/natural-compact-v237.md), [recherche primaire](../research/natural-compact-v237.md). Aucun gain FPS livré, aucun GAME candidat exécuté, aucune campagne générale ou perte GPU recertifiée. Les 62 références et leurs 65 fichiers publics restent exacts.

## Corps candidats et montage

Nature compacte : `tmp/performance-orientation-v237/natural-compact-next`, GEL `32DB93C9…1488C3A68`, corps `72EFD122…32EAAF`. Raccord Core : `natural-compact-core-next`, GEL `14AEBEFD…BBDC487`, corps `691ADA53…F176E9`. Les 13 substitutions Nature et les 83 segments d'import Core s'inversent exactement ; la seule modification de méthode Core est `updateResources`. Les autres modules restent canoniques, avec un journal unique. Typage du raccord PASS 2,681 s, `aulnes-v237-natural-core-type-2026-10-06T09-55-56.351Z-18600`.

Le banc appelle les vrais corps RAW A/B de cette méthode sur les vraies couches. A garde la Nature publique complète, B utilise le résultat compact. `EnvironmentLighting`, Room, agenda, PlantCluster, calculs de croissance et wire sont identiques ; aucun candidat V236 n'est chargé. Les copies/freeze K, guards et `close()` font partie du pipeline mesuré. Le script ne matérialise pas de vue diagnostique supplémentaire entre samples.

## Rouge initial et diagnostic distinct

Contrôles initiaux `natural-compact-controls-next`, GEL `D1E7932D…B917AB5` : typage PASS 3,418 s ; `aulnes-v237-natural-controls-cpu-2026-10-06T10-18-16.712Z-7400` **FAIL 82,152 s avant toute mesure**. L'égalité complète A/B précède l'assertion historique A `changed attribute word outside upload ranges`. Rapport dans `captures/run-2026-10-06T10-18-17.208Z-8mYTnS/report.json`, sources/public exacts et workers/serveur fermés. Aucun oracle terminé ou gain n'est crédité rétroactivement à ce rouge.

Diagnostic séparé `natural-compact-controls-diagnostic-next`, GEL `476AD4F3…62246`. Avant gel, une fermeture superflue du driver est corrigée statiquement ; aucune exécution de cette copie syntaxiquement incorrecte. Un premier launcher sandbox EPERM n'exécute pas le typage ; reprise autorisée journalisée : types PASS 3,561 s, `aulnes-v237-natural-diagnostic-type-2026-10-06T10-39-23.816Z-25664`.

`aulnes-v237-natural-diagnostic-prepared-2026-10-06T10-39-37.474Z-5920` **FAIL attendu 9,324 s** sur les seules publications préparées, sans ABBA ni timings. Rapport SHA256 `CA1F2B05C2BEF1932EA48152987A8EFC49E15A90F970D244DFD807CF5BE85062`. Localisation : Nature préparée, application 10, tick 2, epoch 1, revision 11, branche A ; Crop `instanceMatrix`, word 16/byte 64, Storage/Static/itemSize16/capacité1024. Count 2→1, version 10→11, ranges `[0,32)`→`[0,16)`. Le mot modifié est dans la queue non dessinée. La condition historique reste inchangée dans ce diagnostic ; il confirme un défaut de portée de l'observateur, sans nécessiter de correction produit. Sources, graphes A/B avant refus et public exacts ; fermeture avec zéro worker restant.

## Reprise de l'observateur

Helper privé `upload-shadow-next`, GEL `9D45851B1A87A845198244D5347592F32BE66CDE02A2F762414CA48059544D0B`, corps `8202678C…55BD06`. Shadow individuel par pipeline, domaine de lecture nominal agrégé, résidence conservée pendant inactivité. Les 16 groupes synthétiques passent : `aulnes-v237-upload-shadow-synthetic-2026-10-06T10-51-18.602Z-4048`, **PASS 0,378 s**. Ils refusent notamment réactivation sans mark, mauvais range, trou actif omis, parent partagé plus grand, remplacement d'array sans mark et layout incohérent. Visibilité héritée, priorité geometry count, DynamicDrawUsage et matrices ordinaires conservatrices sont exercés.

La comparaison complète CPU/F32 des queues n'est pas retirée. Ce modèle observe les déclarations, sans GPU réel, effacement de ranges source ou simulation de padding/attributs dérivés. Les textures gardent leur assertion historique ; leur résidence dormante n'est pas prouvée. Le shadow n'avance pas lors d'une simple préparation de compilation CPU et ses maps sont vidées explicitement avant les mesures.

Reprise `controls-shadow-reprise-next`, GEL `AB87311D085F33ED081FD3C5CC4DCFC05F191E1E47354EBB9E87B920FDE8ECE7`. Treize feuilles et le corps `measure()` entier restent RAW identiques à D1 ; seules les observations hors chrono évoluent. Revues indépendantes Core, contrôles, helper et reprise consignées séparément sous `tmp/performance-orientation-v237`. Typage : `aulnes-v237-natural-shadow-type-2026-10-06T10-53-03.754Z-18056`, **PASS 3,406 s**.

## Oracles et coûts exécutés

`aulnes-v237-natural-shadow-cpu-2026-10-06T10-53-25.844Z-22804` **PASS 234,644 s**. Rapport `controls-shadow-reprise-next/captures/run-2026-10-06T10-53-27.683Z-SEvzxF/report.json`, SHA256 `AF3C024313BAF7199F58BD4DC41FBBC5F7B163E18B96E1BC988E04C2AEFECD9D`. Sources et 62 références/65 fichiers avant/après exacts ; erreurs vides, workers zéro, navigateur et serveur5227 fermés.

Les deux références contiennent65publications/64vrais ticks/54applications : Aulnes6934→6998 et mixed2000→2064. World/RNG, paquets, alias bidirectionnels et anciens graphes restent exacts. Les publications préparées exercent C avant D déjà décodé, naissance/retrait/réintroduction, classification, feuilles5999/6000/6001, ordre explicite, checkpoint/epoch/éviction, refus NaN précoce et stale. La récupération sauvegardée exerce un vrai tick ultérieur sur les deux charges ; aucun nouveau refus tardif ou reset GPU n'est prétendu.

Géométrie, tous les buffers CPU/F32, ordre/slots/free/counts, scratch, bounds, labels/espaces, lumière RGBA et versions de textures sont comparés. Les assertions déclarées comptent962attributs nécessaires/deux textures sur Aulnes,38/20 sur mixed et36/six sur Nature préparée. Les scopes passent22voies compactes/sept historiques sur29applications ; vues publiques anciennes, K fixe/références C, wrongWorld, close, lecture suivante/publique interposée, frame réellement absente, compilation avec adoption interposée et révocation entre consommateurs sont exercés. Les getters/throws et reprise sous false restent exacts. Aucune expiration automatique par await n'est revendiquée.

Deux ABBA par charge, workers neufs successifs, huit ticks de chauffe puis 56 publications mesurées, dont 47 applications, même saut d'application modulo6=2. Encodage, préparation/livraison initiale du corpus, oracles et save finale sont hors chrono. Le total direct comprend clone natif + adoption stricte + pipeline concerné ; pipeline et Nature/couches sont inclusifs, pas additionnables. Le timer Nature/couches inclut aussi les cultures. Les attentes et résidences d'oracle sont libérées avant ABBA, sans GC forcé ou overhead soustrait.

| Charge/cycle | Total moyen A→B, ms | Écart total | Pipeline appliqué A→B, ms | Nature/couches A→B, ms |
| --- | --- | --- | --- | --- |
| Aulnes1 |11,106→11,133|+0,24%|4,497→4,215|2,723→2,435|
| Aulnes2 |11,222→11,548|+2,90%|4,603→4,389|2,830→2,537|
| mixed1 |9,899→9,829|−0,71%|3,263→3,160|1,406→1,383|
| mixed2 |9,925→9,779|−1,47%|3,254→3,131|1,403→1,366|

Le total construction+froid+chauffe+ordinaire est également défavorable dans les quatre cellules : Aulnes1178,70→1189,85 puis1189,80→1194,55ms ; mixed1285,85→1293,80 puis1277,45→1287,75ms. Froid seul Aulnes1 :434,55→451,45ms ; Aulnes2 :440,30→430,85ms. Les clones/adoptions varient dans ces replays neufs ; ce résultat ne démontre pas que le prototype modifie leur algorithme. Le faible gain local de scène n'établit cependant pas un gain utile de coût complet sur la charge de référence.

## Décision ROOT

Pas de promotion, pas de GAME conditionnel `ordinary-game-natural-next` GEL `CF0DD18A…7538FA2EA`, pas de seconde mesure lourde inchangée. Le produit reste V233 et les preuves des anciennes pistes rejetées ne changent pas. Les240FPS, toutes vues/parties et performance physique du moniteur restent ouverts ; le [gain nocturne global](autonomous-performance-2026-10-06.md) est distinct de cette expérience.

Le comptage causal privé `nature-causal-counts-next` GEL `A04842F0…6675DBE` et son adaptateur sont une préparation non exécutée à la clôture V237. Prochain diagnostic hors timings : distinguer P/E, captures, échéances, forecasts conservés/recalculés, queries et K avant une nouvelle refonte. Aucun nouveau gain de FPS ou économie de forecast n'en est encore déduit.

Clôture documentaire : premier contrôle `aulnes-v237-documentation-2026-10-06T11-02-18.430Z-22316` FAIL11,290s sur le libellé `schéma198` de l'index, non reconnu par le garde de version. Espacement corrigé, puis `aulnes-v237-documentation-reprise-2026-10-06T11-04-25.839Z-19380` PASS0,865s :799documents/7859liens,25IDs et cinq familles préservés. Relecture indépendante des trois documents et de AF3C0243 sans écart matériel. Les modifications de clôture concernent uniquement la documentation ; sources du jeu, tests, package et références restent inchangés.
