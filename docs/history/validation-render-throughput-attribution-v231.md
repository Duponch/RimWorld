# Validation V231 — attribution matérielle et essais écartés

Preuve du 6 octobre 2026 sur V230 `628ad25cc8e57f682fc9c60ebb4b481a896e9780`, schéma 198 inchangé. [Contrat](../development/render-throughput-attribution-v231.md), [recherche](../research/render-throughput-attribution-v231.md). **Diagnostic seulement : produit V230 conservé, aucune amélioration FPS V231 annoncée.** ROOT exécute seul les contrôles successifs via `validate:logged`, avec sorties privées distinctes.

La référence est `public/test-saves/v224/les-aulnes-sieges.json`, 250×250 au tick 6934 : 18 224 ressources, dont 955 cultures résidentes, 2 226 structures et 15 humains. SHA256 stocké `97DAAB540E9527C3A1020AA064737ACA4EA7345E868A2E97D761F9B7AC2E0E32`. Les rapports conservent sources RAW, catalogue de 62 références, métadonnées et tous fichiers publics exacts. Aucun World, règle, cadence, qualité, phase ou PRNG produit n'est modifié.

## GPU : passes fraîches et couverture réelle

`aulnes-v231-gpu-attribution-type-2026-10-06T04-25-02.168Z-1604` passe en 3,479 s. `aulnes-v231-gpu-pass-abta-2026-10-06T04-25-15.047Z-16880` passe en 126,412 s ; « abta » est le label du journal, l'ordre effectivement joué est **A/T/T/A**. Rapport sous `tmp/performance-orientation-v231/gpu-pass-attribution-next/captures/run-2026-10-06T04-25-15.400Z-gyMGDZ/report.json`. Manifeste GEL SHA256 `EF71EB253AD4F43B61F32C711937F9976D6286645B6031940B9CDE31F0B709E4`, sampler `1613214741BC59FD01CC6598336118A70EDCBE937D6B2B3E4B6716FCDE439B70`.

Vrai Core local et client/worker canoniques, Three 186/WebGPU AMD RDNA-1 réellement configuré, 1920×1080/DPR1, focus 129/122 et zoom1. Toutes couches et qualité restent actives ; UI/labels/input/audio sont les ports isolés identiques, donc ce banc ne mesure pas le GAME entier. Chaque page fraîche chauffe 3 s à 6× puis mesure 8 s ; pause réellement acquittée/drainée et fenêtre de 8 s séparée. T active les timestamps avant init, A les garde désactivés : ses résultats GPU sont absents, jamais des zéros.

La couverture des passes chronométrées de T vaut 1 dans les quatre fenêtres, sans UID dupliqué, saturation ou erreur. Résolutions non bloquantes, un seul readback en vol, au plus 46/52 queries en attente puis zéro après flush. Compute et bundles valent zéro ; le nombre de dessins soumis n'est pas établi. Les délais de résolution et les bords restent bruts dans le rapport.

| Moyenne par vraie frame T | 6× T1 / T2 | Pause T1 / T2 |
|---|---:|---:|
| Somme des passes connues | 3,4836 / 3,5156 ms | 3,4111 / 3,4086 ms |
| Main | 3,0364 / 3,0680 ms | 3,2672 / 3,2659 ms |
| Shadow | 0,3149 / 0,3175 ms | aucune passe shadow |
| Other | 0,1323 / 0,1302 ms | 0,1439 / 0,1426 ms |

En jeu, p95 de la somme GPU 4,0632/4,1288 ms, maxima 5,6361/5,3084 ms. Le readback prend environ 38,5/40,6 ms en moyenne : ce n'est pas la durée GPU. Uploads, utilitaires non chronométrés et compositor restent hors cette somme.

RAF A 136,5/134 et T 138/132,5 : les deux moyennes valent 135,25/s. Pause A 166,75/166,625 et T 166,5/166,75 ; intervalle natif médian proche de 6 ms. Ce plateau headless ne certifie pas le plafond de l'écran utilisateur, ni un coût nul du sampler. CPU frame A moyen 4,1674 ms contre T 4,2204 ms, p95 13–14 ms, maximum jusqu'à 49,5 ms. `applyWorld` moyen environ 10 ms et p95 environ 24 ms. Débit source T 6,12/6,04× dans ces seules fenêtres. Sauvegarde, récupération et anciens graphes passent hors chrono.

## GAME complet : interface et audio conservés

Le premier banc `dom-host-attribution-next` passe le typage en 3,238 s, puis reste rouge en 91,481 s, avant chargement ou mesure : TypeScript 7.0.2 expose seulement sa version à la racine, pas l'ancienne API AST `ScriptTarget.Latest`. Rapport initial conservé sous `captures/run-2026-10-06T04-36-55.636Z-uNBBHa`, sources stables ; aucun FPS ne lui est crédité.

La reprise distincte emploie le vrai `parseAst` Rolldown 1.2.8 installé. Elle garde l'unicité des ancrages, les neuf spans HUD et leur inversion byte exacte, les wrappers originaux et toutes les assertions. Manifeste `0EF249E7553A70B1F59C27521D89C1C04E73C262AB9DCD1B5C998374E8CF258C`. `aulnes-v231-game-host-reprise-type-2026-10-06T04-42-47.668Z-14644` passe en 3,049 s ; `aulnes-v231-game-host-reprise-2026-10-06T04-42-58.808Z-5316` passe en 26,496 s. Rapport `tmp/performance-orientation-v231/dom-host-attribution-reprise-next/captures/run-2026-10-06T04-42-58.880Z-s4pGzi/report.json`, sources stables, aucune erreur.

Même référence, cadrage, qualité et clocks naturelles ; vrai GameSession, HUD, audio et musique. Un vrai geste Shift déverrouille l'AudioContext ; 133 assets sont chargés et la musique « aube » est active. Chauffe 3 s à 6×, fenêtre de 8 s. Aucun panneau ou humain sélectionné : les inspections, gestes et labels rapprochés ne sont pas certifiés.

| Poste réellement engagé | Appels | Moyenne inclusive | p95 | Maximum |
|---|---:|---:|---:|---:|
| Core.frame | 897 | 4,724 ms | 14,1 ms | 45,7 ms |
| Core.applyWorld | 208 | 9,895 ms | 23,1 ms | 37,2 ms |
| SnapshotDecoder.adopt | 268 | 3,458 ms | 5,3 ms | 7,2 ms |
| main.onSnapshot | 268 | 1,472 ms | 2,6 ms | 11,9 ms |
| FoliageAmbience.adopt | 268 | 1,084 ms | 1,4 ms | 1,6 ms |
| syncAudioSources | 268 | 0,138 ms | 0,2 ms | 0,4 ms |
| renderState | 39 | 1,536 ms | 3,3 ms | 3,5 ms |

Les inclusifs se recouvrent : foliage et une partie du HUD appartiennent au callback de publication ; applyWorld appartient principalement à frame. Le wrapper render observe 1 794 appels, dont 897 imbriqués dans un autre render : ce sont 897 images, pas deux fois plus. Les « self observés » ne sont pas du self V8 et aucun overhead de sonde n'est soustrait.

897 frames donnent 112,125 RAF/s diagnostiques ; aucune comparaison avec un Core isolé ou un autre jour n'est faite. Débit source 6,139× sur la fenêtre, endpoint retardé de 20,2 ms. Après pause/drain, save/reload du dépôt réel conserve exactement le tick 7371 et le payload persisté ; 3 266 270 comparaisons de graphes conservent l'ancien World. Capture finale et clôture sont hors chrono.

## Sous-postes du Core : végétation et pointes réelles

Le premier GEL Core `30F3A86A43196B58433AE60A8EBE82D5FBB75276C2280666153408F11291A5D9` n'est pas exécuté : la lecture statique ROOT repère sa dépendance au premier montage AST non qualifié. La reprise distincte importe le GAME passé et le vrai parseur Rolldown ; sept appels lexicaux sont ancrés dans `applyWorld`, leurs spans sont inversés byte exactement. Les autres méthodes sont instrumentées sur les vraies instances, sans wrapper par plante, substitution de règle ou sortie anticipée. Arbre des parents réels, ledger borné et descendants inclusifs restent dans le rapport.

Manifeste `586ABF427002B7C3086F4A8194740258F4DCD4B9929F9CF8C9F0FA9251F38A7F`. Typage `aulnes-v231-core-stages-type-2026-10-06T04-54-40.792Z-6992` PASS 0,150 s ; matériel `aulnes-v231-core-stages-2026-10-06T04-54-50.421Z-27568` PASS 27,689 s. Rapport `tmp/performance-orientation-v231/core-stage-attribution-reprise-next/captures/run-2026-10-06T04-54-50.496Z-DW2Zsw/report.json`, sources stables, erreurs absentes, vrais GAME/audio/UI/save/recovery conservés.

| Poste inclusif | Appels | Moyenne | p95 | Maximum |
|---|---:|---:|---:|---:|
| Core.frame | 880 | 4,815 ms | 14,4 ms | 50,4 ms |
| Core.applyWorld | 208 | 10,273 ms | 24,2 ms | 44,6 ms |
| Core.resources | 208 | 3,729 ms | 14,7 ms | 18,6 ms |
| Nature.read | 208 | 3,039 ms | 13,8 ms | 17,1 ms |
| Nature.eventsInitialize | 34 | 7,618 ms | 10,5 ms | 10,7 ms |
| Nature.eventsRead | 208 | 0,735 ms | 2,2 ms | 4,1 ms |
| Crops.update | 208 | 1,007 ms | 1,7 ms | 3,5 ms |
| Feedback.update | 208 | 0,494 ms | 0,8 ms | 15,9 ms |

Nature.read est enfant de Core.resources ; initialize/read sont enfants de Nature.read. Leurs totaux ne s'ajoutent pas. Le pic `applyWorld` de 44,6 ms contient directement resources 17,2 ms, feedback 15,9 ms, index 2,6 ms et cultures 2,2 ms ; les pointes suivantes de 32,8/32 ms contiennent resources 14,5/14,4 ms et reconstruction de structures 8,1/7,7 ms. Une reconstruction n'est pas engagée à chaque publication. Ces arbres établissent les chemins présents, pas la cause V8 interne du pic feedback. Terrain/build/patch non engagés restent absents plutôt que gratuits. Aucun FPS A/B ou overhead soustrait n'est annoncé.

## Profil CPU MAIN du jeu complet

Le lanceur initial refuse de démarrer le typage en sandbox (`EPERM`, 05:00:30), sans exécution du compilateur. Reprise du même GEL par le lanceur autorisé : `aulnes-v231-decoder-profile-type-retry-2026-10-06T05-00-44.007Z-26128` PASS 3,058 s ; `aulnes-v231-decoder-profile-2026-10-06T05-00-58.141Z-22308` PASS 28,251 s. Manifeste `843703DC5C9C9043F3945C62FBB9411C9DD67C599D873B1AA0E68A9A9E168564`. Sorties privées `tmp/performance-orientation-v231/decoder-profile-next/captures/run-2026-10-06T05-00-58.214Z-EbspcJ` : vrai GAME/audio/UI, sources stables, sauvegarde/reprise et anciens graphes conservés.

`main.cpuprofile` brut SHA256 `25305d351f14d92cdaeb2a8f88d4f6c2c2f51effa4d09525840bd51b6706b76d` conserve 828 nodes et 5 667 samples, intervalle demandé 1 000 µs, durée brute 9,002018 s et aucun delta négatif. La fenêtre de jeu est de 8 s, mais le profil couvre aussi ses bords : 349–962,1 ms avant et 32,3–66,9 ms après selon les brackets. L'offset constant compatible reste un intervalle de 26,982 ms, pas une origine exacte inventée. Les sources JS compilées réellement représentées sont capturées après la mesure, sans breakpoint. Aucun timer par ressource n'est ajouté et aucun coût nul n'est déduit d'un guard absent ou inliné. L'analyse des samples et une optimisation du décodeur restent à produire ; ce profil instrumenté n'est pas un A/B FPS.

## Offscreen naturel : montage rejeté

Typage `aulnes-v231-offscreen-natural-type-2026-10-06T04-10-23.415Z-21156` PASS 3,451 s ; matériel `aulnes-v231-offscreen-natural-abba-2026-10-06T04-10-36.023Z-19200` PASS 101,364 s. Rapport sous `tmp/performance-orientation-v230/offscreen-throughput-next/captures/run-2026-10-06T04-10-36.397Z-ljqyQK/report.json`, manifeste `5570BDD218C919FF3D25C7EB29FACE00616828D1409FE0D773813309EC057CF6`.

A/B/B/A compare le Core local aux vrais dessins du Core worker : horloges naturelles avec seulement alignement d'origine, aucune override, même CameraRig isolé et qualité. Le lecteur main d'origine accepte les packets ; B reçoit le packet original par second clone natif et le relit strictement, y compris les publications ensuite sautées par la scène. UI/audio/input/labels sont exclus symétriquement.

A 137,875/133,5 RAF/s, B 117,625/117,5 ; moyennes 135,6875 → 117,5625, **−13,36 %**. CPU frame 4,1447 → 4,3116 ms ; B envoi natif environ 1,61 ms, second lecteur environ 3,07 ms, hop confirmation→réception environ 10,4 ms. La latence latest−timeline reste environ 8–11 ticks, sans correction. Les anciennes roots/packets/aliases, stale/refus, pixels visibles, sauvegarde et reprise passent. **Montage écarté ; cette exactitude ne vaut pas amélioration de débit.** La conclusion ajoutée après contrôle est distincte du GEL initial.

## Cultures anticipées : exactes, sans gain naturel

Le premier GEL `06B9911B40E1C6FD3E250279A3D2999BDEF5ED46E7388A5962FEAD0388CFC9AC` échoue au typage en 2,685 s : double rebasing d'imports Core et garde d'observateur TypeScript. Reprise distincte `65F3BCFD1485F145A85A8FCEB269D776069FAEE2CE52D79432A9E67B922561E5` : typage PASS 2,920 s, oracles FAIL 2,784 s. La pollution volontaire d'une tuile de fixture atteint également le packet initial empruntant ce leaf. Le rouge est conservé ; aucune écriture de couche n'est effacée rétroactivement.

Reprise2 `AD8B96B7F4F0B13537AA3563913966AC8EE43FAF9606BC4E8F7829562B865D65` délimite cette seule pollution : tous les graphes sont contrôlés avant, les racines effectivement atteintes sont déclarées et leurs copies renouvelées avant l'appel des couches, puis tous packets/anciens Worlds sont de nouveau contrôlés autour de chaque update. Aucun rebaseline après layer. Noyau, candidat, owner, ACK, Core et horloges restent exacts. Le noyau qualifié V230 conserve SHA256 `169FF7A82EA9E5B243C872C0CB73A1974F57AC6BFE8D92918391BFF96395D5C8`.

| Contrôle ROOT de reprise2 | Verdict |
|---|---|
| `aulnes-v231-crop-prefetch-reprise2-type-2026-10-06T04-44-50.835Z-16036` | PASS 2,814 s |
| `aulnes-v231-crop-prefetch-reprise2-oracles-2026-10-06T04-45-00.763Z-19044` | PASS 3,188 s |
| `aulnes-v231-crop-prefetch-total-abba-2026-10-06T04-45-11.385Z-16144` | PASS 101,109 s |
| `aulnes-v231-crop-prefetch-natural-abba-2026-10-06T04-48-01.849Z-18648` | PASS 84,683 s |

Rapports sous `tmp/performance-orientation-v231/crop-prefetch-reprise2-next/captures/run-2026-10-06T04-45-11.746Z-N9W9Y0` et `captures-natural/run-2026-10-06T04-48-02.202Z-LVESNu`. Sources publiques/privées stables, aucune erreur. Le vrai worker ne reçoit pas un World ; seed compact et ACK réels établissent son ledger. Toutes quatre décisions précèdent les écritures ; old buffers, scratch double, F32, ranges, versions, bounds, pollution, compile/reset/checkpoint, B sauté, worker perdu et replis canoniques passent.

Le CPU isolé joue 32 ticks ordinaires/charge, huit de chauffe et 24 observés, deux cycles alternés. Il conserve sa fenêtre diagnostique de deux publications et un délai déclaré, sans la présenter comme le playhead naturel. Sur Aulnes, due+appel de préchargement semble favorable de 10,34/20,67 %, mais cet appel coalesce souvent seulement la cible. La vraie capture se joue aussi dans les handlers : pour une passe B, capture cumulée 8,1→39,9 ms et handler 6,2→39,2 ms. Ce bilan n'établit donc pas un gain main total. Sur mixed, due+appel se dégrade d'environ 115/81,16 %. Les compteurs worker, clones et bords cumulatifs restent séparés et ne sont pas redistribués artificiellement.

Le vrai raccord naturel lit seulement `pending[0]` après push/application, sans take, avance de phase ou attente à due. A 132,125/134,75, B 131,625/130,75 RAF/s : **133,4375 → 131,1875, −1,69 % ; aucun gain établi.** CPU frame A 4,328/4,122 et B 4,169/4,212 ms ; apply A 10,462/9,988 contre B 10,099/9,882 ms, maximum B 52,9 ms. Débit source reste autour de 6×, sauvegarde/reprise exactes.

Les brackets de compteurs englobent les 300 ms d'armement et le drainage, pas seulement les 8 s de frames. Ils donnent B 225/226 préparations supplémentaires, 169/174 applications et 56/53 miss ; capture 346,7/345,2 ms et handlers 355,4/353,3 ms, avec recouvrement. Ces valeurs ne sont ni des temps exclusifs, ni un taux de hit mesuré exactement dans la fenêtre. **Tranche non promue.**

## Plans synchrones et clôture

Les cultures synchrones sont déjà écartées dans la preuve V230 : deux cycles Aulnes +28,80/+21,16 % et mixed +79,17/+54,28 %, malgré les sorties exactes. Les piles passent leur banc complet en 58,749 s (`aulnes-v231-pile-total-abba-2026-10-06T03-53-04.416Z-21848`) : Aulnes +15,88/+0,77 %, mixed +14,11/+12,56 %. Rapport `tmp/performance-orientation-v230/resource-plans-abba-next/captures/run-2026-10-06T03-53-04.605Z-OLXCRH`. Préparation, vrai clone, application résidente et cargo exacts sont inclus ; aucune promotion.

Le lot ne nécessite pas de nouvelle régression métier ou build produit : aucune source moteur/rendu, test ou payload public n'est changé. `aulnes-v231-docs-2026-10-06T05-02-50.655Z-11272` passe en 1,005 s ; `git diff --check` passe et le diff produit/source/public est vide. L'interprétation du profil V8, les causes internes des pics, les optimisations directes privées, les vues/picking/inspections, campagnes longues et le budget de l'affichage utilisateur restent à qualifier. L'autonomie et les refontes continuent selon l'autorisation du 6 octobre, avec commits locaux sans push ; toute nouvelle pause prime.
