# Qualification et rejet de l'éclairage partagé V244

Le 6 octobre 2026, V244 compare le produit V242 `b92c2fb1` à un groupe FRAME privé pour deux uniformes d'éclairage. [Contrat et sources](../development/environment-uniforms-v244.md). Aucun `src`, test produit, package ou fichier public n'est changé. Le schéma reste 198.

ROOT exécute seul les contrôles séquentiels gelés via `validate:logged`, caches et sorties privées sur E:. Le candidat Environment `360F785D` et Colony `DC522EEE` ont des inverses RAW complets ; Core `E6613B5F` demeure canonique. Les anciennes sources, le journal et les lecteurs restent uniques.

| Contrôle ROOT | Résultat |
| --- | --- |
| Typage candidat, GEL `DD307AAD` | PASS, 5,121 s |
| Typage des contrôles initiaux, GEL `B2C30777` | PASS, 3,841 s |
| Huit cas CPU natifs | PASS, 7,315 s |
| Premier parcours physique | FAIL global, 12,388 s ; les dix paires GPU passent, puis une console HTTP 404 fait refuser le runner |
| Reprise physique distincte, GEL `ADDDF831` | PASS, 14,520 s ; dix paires exactes, erreurs et réponses HTTP ≥400 vides |
| GAME A/B/B/A, GEL `D420BD2B` | PASS, 142,845 s ; quatre cohortes complètes, sauvegarde/reprise réelle et empreintes exactes |

Le rouge initial `B1B70F08` reste intact sous `tmp/performance-orientation-v244/environment-frame-controls-next/captures/run-2026-10-06T20-28-31.912Z-j8u31r/report.json`. Il ne capturait pas l'URL de la 404 : l'attribuer rétrospectivement au favicon serait une supposition. La reprise ajoute le favicon canonique et le journal URL/status, conserve toutes les erreurs comme refus et change seulement la page, son origine/cache et son namespace. Les corps physique, CPU et tsconfig sont byte-exacts ; les huit cas CPU ne sont pas rejoués. Rapport de reprise : `environment-frame-controls-reprise-next/captures/run-2026-10-06T20-40-04.078Z-V0D7KI/report.json` sous le même dossier V244.

La fixture physique utilise un seul renderer WebGPU AMD/rdna-1, ses vrais shaders, bindings et readbacks RGBA8 de 128×128. Les dix paires ont zéro différence ; les deux changements d'éclairage same-frame modifient effectivement l'image dans les deux variantes. Animation native stoppée seulement dans cette fixture contrôlée, NodeFrame réel avancé aux frontières explicites : aucun FPS n'en est déduit. Le nouveau RenderTarget conserve le même RenderContext Three ; restauration de GPU et nouveau contexte distinct ne sont pas exercés.

Le GAME conserve Les Aulnes corrigées250² au tick6934, caméra129/122/zoom1,1920×1080/DPR1, réglages complets, vitesse demandée6×, chauffe3s et mesure8s. A est V242 littéral ; B remplace uniquement Environment et Colony. Même instrumentation grossière qualifiée, pas de compteurs par binding. Les deux événements structurels de chaque cohorte sont conservés, sans filtrage de fenêtre.

| Mesure | A, deux passes | B, deux passes | Moyenne A → B |
| --- | --- | --- | --- |
| Images RAF/s | 109,25 ; 111,375 | 112,50 ; 105,50 | 110,3125 → 109,00 (−1,19 %) |
| Vitesse réelle | 4,6085 ; 4,7540× | 4,6309 ; 4,7949× | 4,6813 → 4,7129× (+0,68 %) |
| CPU moyen par frame | 5,521 ; 5,386 ms | 5,388 ; 5,545 ms | 5,453 → 5,467 ms |
| p95 CPU par frame | 18,10 ; 17,30 ms | 18,10 ; 17,40 ms | 17,70 → 17,75 ms |
| applyWorld moyen | 11,860 ; 11,398 ms | 11,735 ; 11,427 ms | 11,629 → 11,581 ms |
| p95 d'adoption stricte | 9,80 ; 10,00 ms | 10,90 ; 9,50 ms | 9,90 → 10,20 ms |

Rapport ABBA `D6A37B2CDA1F78EEA0EAB623A77043877A352450AC9CB7004C0095A0050BC5F4` : `tmp/performance-orientation-v244/environment-frame-game-next/captures/abba-2026-10-06T20-40-30.782Z-1UsCEx/abba-report.json`. Le contrôleur protège sources, harnesses et dépendances avant/après ; quatre reprises réelles passent, erreurs vides, navigateurs et origines5246/5247 fermés. La reprise physique ferme5248 ; l'origine initiale5245 est aussi fermée. Sessions utilisateur et references_UI préservées.

**Décision : candidat écarté.** Aucun gain utile de FPS, aucun nouveau code produit, aucun second banc lourd inchangé ni nouveau contrôle de perte GPU. Les résultats sont locaux, headless, instrumentés et ne certifient ni moniteur240Hz, toutes les parties ou vues, ni vrai6×. Les 62 payloads et leurs métadonnées/65 fichiers publics restent exacts. Prochaine priorité : supprimer du travail répété dans l'adoption et l'application du World, sans relâcher les gardes ou changer la cadence.
