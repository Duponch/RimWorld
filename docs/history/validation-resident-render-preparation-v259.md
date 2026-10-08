# Qualification et rejet de la préparation résidente V259

Le 8 octobre 2026, V259 compare un prototype privé au renderer historique du produit V242 `b92c2fb1`. [Contrat](../development/resident-render-preparation-v259.md), [recherche](../research/resident-render-preparation-v259.md). Aucun src, test produit, package ou fichier public changé ; schéma 198, 62 références et 65 fichiers exacts. ROOT seul exécute les contrôles gelés séquentiels via validate:logged, caches et sorties sur E:.

## Reprises et rouges conservés

La première génération échoue avant runtime sur une ancre LF/CRLF ; une reprise distincte construit cinq copies intégrées et leurs inverses. Le premier typage est rouge sur huit annotations/raccords privés. Les annotations corrigées s'effacent en JavaScript exactement égal, prouvé avec TypeScript 5.8.3 épinglé ; le typage réel utilise TypeScript 7.0.2. Aucun contrôle effacé ne vaut une modification runtime.

| Parcours historique | Résultat et frontière |
| --- | --- |
| Premier physique, 5,578 s | FAIL avant image : coordonnées fractionnaires de plantes, tile absente. Reprise place les mêmes nombres sur cellules entières ; changement de fixture déclaré. |
| Reprise de fixture, 4,932 s | FAIL A avant image sur texture native inconnue ; diagnostic distinct 4,664 s identifie DFG_LUT. |
| Physique LUT, 4,683 s | FAIL A avant image sur cameraViewMatrix non reconnue ; DFG désormais attribuée par racine canonique. |
| Physique caméra, 5,534 s | FAIL au premier draw d'ombre A : ReferenceNode map appartient au matériau source, pas à l'override ; 192 champs compilés reconnus. |
| Physique matériau, 161,423 s | Deux observations entières d'environ 292 Mo, quarante RGBA8 et empreintes after produites ; FAIL final Invalid string length lors de JSON.stringify du rapport dupliqué. Aucun verdict global reconstruit. |
| Audit limité distinct, 5,635 s | PASS de métadonnées et empreintes ; établit B révoqué unknown-update-node, huit builders, 1 390 FULL/0 SHARED dans le grand corpus. Ne compare pas les graphes CPU ni ne reconstruit le cleanup ACK absent du rapport final. |

Les dossiers privés initiaux, reprises et gels restent intacts. L'audit `material-evidence-next/captures/audit-iaSGFr/report.json` n'est pas un physique réussi. Le petit test Node avait seul exercé SHARED puis refusé un callback inconnu. Aucune mesure de coût de cet ancien kernel AF22 n'est admise.

## Reprise native qualifiée

Kernel `1C50D0DE09F16A98B43A192A8CC82C527FC71E4E49BF932F6555C0B8A9BF2178`, inverse entier vers la copie type-only BB7900, patch et ancêtre AF22 vérifiés avant chaque contrôle. Revue indépendante favorable. GEL ROOT `E431B8F1`, 3 366 fichiers ; freeze PASS 0,589 s, syntaxe PASS 1,067 s, typage PASS 3,466 s.

Le physique passe en **166,323 s** : vingt paires RGBA8 exactes et graphes consommés par les vrais dessins exacts, ordre/ranges/UBO/attributs/storage/textures CPU inclus. Vrai pass d'ombre PCF et effets visibles exigés pour vent, C, buffers, matrice, textures et capacité. Six lots Box/288 instances, quatre lots Crop/96 plantes, 64 meshes fusionnés et 255 ressources ; viewport 256²/DPR1, cible 192², matériel AMD rdna-1. Animation native possédée stoppée dans cette fixture, NodeFrame réellement avancé aux frontières explicites ; aucune cadence du jeu modifiée.

B reste actif après compilation et atteint 87 SHARED après quatre images, puis 341 avant le callback transitoire. Ce dernier révoque globalement. Le test Node séparé acquiert SHARED avant son UniformNode inconnu, révoque avant le callback et conserve la même mutation A/B. Throw conserve l'identité de l'exception et aucun ACK, active=false/pending=0 ; reset ne retire pas une révocation. Erreurs globales, console, HTTP et cleanup vides ; observateurs fermés, navigateurs et origines 5278/5279 possédés fermés. Sources et anciens artefacts exacts.

Rapport : `tmp/performance-orientation-v259/preparation-controls-native-next/captures/run-physical-2026-10-07T23-53-17.549Z-Szc8CU/report.json`, SHA256 `89BC85E15071D0A36DBC808FD4BA9D3D522790AB0736093841484AF2749C5EA1`. Deux gros sidecars natifs sont conservés avec SHA/octets ; seule la restitution finale est compactée après les assertions, y compris en faute. Aucun readback général des GPUBuffer, vrai Core ou perte GPUDevice n'est certifié.

## Coût complet et décision

ABBA sur les mêmes sources physiques, quatre renderers/navigateurs frais : **PASS 20,463 s**. Par cohorte, 32 rendus de chauffe puis 192 mesurés ; application C/Environment tous les quatre rendus, même caméra/soleil/vent, rendu natif et commit, sans observateur détaillé. Le circuit attend la vraie queue GPU et inclut le CPU ; les deux colonnes ne s'additionnent pas.

| Mesure | A, deux passes | B, deux passes | Moyenne A → B |
| --- | --- | --- | --- |
| CPU complet/rendu | 1,181 ; 0,951 ms | 1,355 ; 1,247 ms | 1,066→1,301 ms (+22,03 %) |
| Circuit avec queue completion | 4,653 ; 4,111 ms | 4,594 ; 4,267 ms | 4,382→4,431 ms (+1,12 %) |
| Préparation/compile déclarée | 623,8 ; 602,9 ms | 716,7 ; 741,7 ms | 613,35→729,20 ms |

Chaque B conserve 12 792 SHARED, 4 456 FULL, 4 312 synchronisations acquittées, zéro overflow/révocation. Ces comptes ne sont pas des durées. Erreurs/HTTP/cleanup vides, sources/public exacts, navigateurs et origines fermés. Rapport : `tmp/performance-orientation-v259/preparation-controls-native-next/captures/run-cost-2026-10-07T23-56-24.038Z-E2F0M8/report.json`, SHA256 `C96EFDC7C3581947539E87A714561B8335DFFD01245DE1E58FDE3328E2673449`.

**Critère préalable refusé : CPU B/A 1,2203 au lieu de ≤0,85**, circuit 1,0112≤1,05. Rejet sans raccord Core/ACES, GAME, build, promotion ou second banc lourd inchangé. Aucun FPS supplémentaire, vrai6×, moniteur240Hz ou toutes parties certifiés. Les copies privées Core/Colony n'ont pas été instanciées dans ce corpus et pointent encore vers l'ancien helper ; elles ne sont pas une intégration de 1C50.

La suite autorisée étudie une propriété construite des graphes de rendu et les writers réels pour supprimer des recensements chauds, avant un nouveau candidat. Les coûts individuels capture/equals/commit ne sont pas attribués par ce banc. Contrôle documentaire PASS 0,940 s. Sauvegardes, règles, qualité, horloges, sessions utilisateur et references_UI préservées ; relance automatique en pause, commit local sans push.
