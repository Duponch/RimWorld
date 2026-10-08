# Qualification privée de préparation graphique V260

Le 8 octobre 2026, ROOT qualifie une fixture construite et fermée après V259. [Contrat](../development/owned-render-preparation-v260.md), [recherche](../research/owned-render-preparation-v260.md). Produit V242 `b92c2fb1`, schéma 198, 62 références/65 fichiers exacts ; aucun src, test produit, package ou contenu public changé. Contrôles gelés séquentiels via validate:logged, caches/sorties privés sur E:.

## Façade : preuves et reprises distinctes

Helper `C621EE16`, douze cas privés sur port simulé. Deux typages rouges restent intacts : 6,212 s sur onAudioFrame optional/required, puis 6,014 s sur compatibilityWarning. La reprise finale corrige aussi préventivement fatalError ; aucune faute indépendante fatalError n'est prétendue. Cinq annotations Core au total, dont les deux de placement minimal : inverse entier et émission JS exactement égale par TypeScript 5.8.3 épinglé `DD174287`, typage réel TypeScript 7.0.2.

GEL readouts `C3D0C3A8`, 1 929 fichiers : syntaxe PASS 1,008 s, types PASS 3,814 s, **12/12 cas PASS 1,304 s**. Receivers/copies/retours/errors et réentrance synchrone sont contrôlés sur fake-port ; aucun owner natif, Core, GPU ou FPS qualifié. La façade n'est pas chargée dans le physique ci-dessous. Anciennes reprises, sorties rouges et gels conservés.

## Fixture native fermée

Fragment `465CE7E7`, corps sans imports `38CB45F5`, quatorze edits/inverse entier exact vers V259 `1C50D0DE`. ROOT fixture `90817544`, quinze edits et inverse entier exact ; mapper `06A985A5` restreint aux trois Layers historiques. Deux scopes privés const au vrai site new/init, aucun créateur ou graph exposé. Contre-revues indépendantes favorables, notifications avant writers et limites conservées.

GEL `FB8B7F27AE91186E4EBC9120F10D1273C6EBD1D952882AA43AFD2363CBBC148B`, 3 432 fichiers. Freeze PASS 0,522 s, syntaxe PASS 1,227 s, types PASS 3,003 s. **Physique PASS 167,050 s**, vingt paires de RGBA8 et graphes consommés exactes. Corpus V259 inchangé : 64 meshes fusionnés, six lots Box/288 instances, quatre lots Crop/96 plantes, 255 ressources, PCF256², viewport256²/DPR1/cible192², matériel AMD. Animation native de fixture stoppée, vrais NodeFrame avancés aux frontières explicites ; aucune cadence du jeu changée.

B acquiert 231 SHARED après quatre images et 462 avant custom, 694 FULL/ACK. Le test Node séparé a d'abord six SHARED, puis le callback inconnu révoque avant invocation ; mutation croisée et ordre A/B exacts. Throw conserve l'identité, commits694→694, active=false/pending=0. Effets visibles requis, vrai pass d'ombre, texture disposal à version égale, capacité et nouvelle cible contrôlés. Cette cible n'est pas une perte GPU et les bytes CPU ne sont pas un readback général des GPUBuffer.

Rapport physique : `tmp/performance-orientation-v260/owned-fixture-next/captures/run-physical-2026-10-08T00-32-39.794Z-u8JA3q/report.json`, SHA256 `CBE25157F185C9CD9931141A0BD9FC76952F82EC1DD0D05CC80C3D1ACC3A8BC3`. Deux gros sidecars natifs entiers conservés ; restitution compactée seulement après assertions.

## Coût complet et décision conditionnelle

**ABBA PASS 19,976 s**, mêmes sources physiques, quatre navigateurs/renderers frais. Chaque cohorte : 32 rendus chauffe puis 192 mesurés, 48 applications C, caméra/soleil/vent natifs, sans observateur détaillé. CPU inclut inputs+Environment C/invalidation+begin+rendu+commit ; circuit parent ajoute l'attente de la vraie queue GPU. Ces deux mesures ne s'additionnent pas et ne sont pas des FPS.

| Mesure | A, deux passes | B, deux passes | Moyenne A → B |
| --- | --- | --- | --- |
| CPU/rendu | 1,940 ; 1,133 ms | 0,986 ; 1,090 ms | 1,536→1,038 ms (−32,42 %) |
| Circuit inclusif | 5,577 ; 4,363 ms | 4,127 ; 4,399 ms | 4,970→4,263 ms (−14,22 %) |
| Préparation/compile | 644,3 ; 635,6 ms | 693,6 ; 733,6 ms | 639,95→713,60 ms |
| CPU froid | 21,2 ; 22,3 ms | 103,1 ; 109,5 ms | 21,75→106,30 ms |
| Circuit froid | 98,3 ; 98,4 ms | 107,0 ; 113,7 ms | 98,35→110,35 ms |

Chaque B reste actif : 12 936 SHARED, 4 312 FULL/ACK, 58 invalidations sur chauffe et mesure, aucun overflow/révocation. Les comptes ne sont pas des durées. **Critère préalable moyen franchi : CPU B/A0,6758≤0,85 ; circuit0,8578≤1,05.** Forte variation des A et deuxième B proche du dernier A conservées : aucun gain stable ou FPS certifié. Froid et compile défavorables demeurent dans la décision ; ce n'est pas une promotion produit.

Rapport coût : `tmp/performance-orientation-v260/owned-fixture-next/captures/run-cost-2026-10-08T00-35-45.896Z-gv2xyM/report.json`, SHA256 `2A68BFFD3A675972CF9206F7FB1BE3323C77CC0677D4097E49336EB3763A68D0`. Sources, anciens artefacts et public exacts avant/après ; erreurs globales/HTTP/cleanup vides, navigateurs et origines5283/5284 fermés.

Admission limitée à un **nouveau raccord réel Core/MAIN** sous fermeture et writers qualifiés, sans rejouer ce banc inchangé. Aucun contrôle Core/GAME/build, adoption produit, perte GPU du jeu, vrai6× ou moniteur240Hz acquis. Étude suivante : périmètre statique ou tickets locaux, ACES/exposure, graphes/compilations post-await, interactions/réentrance et vraie reprise GPU, puis coûts et GAME avant promotion. Vérification documentaire PASS 0,828 s. Relance automatique en pause ; commits locaux sans push.
