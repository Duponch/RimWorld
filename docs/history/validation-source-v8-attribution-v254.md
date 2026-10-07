# V254 — validation du profil CPU source

Diagnostic uniquement du produit V242, schéma 198 inchangé. Aucun code produit, test public, contenu ou payload modifié ; aucun FPS supplémentaire livré. [Contrat](../development/source-v8-attribution-v254.md), [recherche](../research/source-v8-attribution-v254.md).

ROOT seul a exécuté les préparations et contrôles séquentiels via `validate:logged`. Les agents ont rédigé et relu les textes sans runtime. GEL `17D79F63118A854579CBEF5838E9AAF8CD1D98F8AD578324F4AEAA5A83F016F1`, 3 125 fichiers, avec sources, tests, références et dépendances natives.

| Contrôle | Résultat | Durée |
|---|---|---:|
| Syntaxe des modules privés | PASS | 1,680 s |
| Typage des contrôles | PASS | 1,451 s |
| Six cas du transport CDP | PASS | 2,143 s |
| Cohorte GAME matérielle | FAIL final conservé | 39,291 s |
| Dérivation numérique hors ligne | PASS | 1,530 s |
| Audit hors ligne initial, pin du résumé | FAIL conservé | 1,260 s |
| Audit hors ligne, reprise distincte | PASS | 1,438 s |

Rouge intact : `tmp/performance-orientation-v254/source-game-next/captures/run-2026-10-07T17-51-48.331Z-hTDEBO/report.json`. La dernière assertion de `run.mjs:177` réclame des drapeaux d'instrumentation absents du loader RAW ; elle est l'unique erreur rapportée. Aucun contrôle natif inchangé n'a été relancé pour obtenir un vert.

Avant ce refus final : vraie cible Source DedicatedWorker, parent et contexte propres, URL Playwright unique, isolates MAIN/Source distincts, profil non vide, scripts compilés du même Worker, enclosure de fenêtre, domaines Profiler/Debugger arrêtés et sessions CDP fermées. Les HTTP et fautes natives sont vides ; seul le refus du banc figure dans errors. Sauvegarde et reload au tick 7383, 3 266 270 checks, persistedRoundtrip/recoveryApplied/heldStable vrais ; état final en pause sans incident.

Profil brut SHA256 `205EA950935F0C2B66B308E95E1FE623AC12E257B9DADE9E75EC8D42FF76B8B0`, 316 454 octets. 6 970 samples, 1 125 nœuds, durée 11 062,503 ms, somme des deltas 11 062,095 ms, aucun delta négatif. Le résumé vérifie références, parents uniques et ascendance bornée acyclique des samples ; il n'évalue pas les scripts capturés et ne modifie pas le profil.

La fenêtre GAME reste 8 s, source Les Aulnes 6934/250², caméra 129/122/zoom1, 1920×1080/DPR1, Chromium WebGPU matériel AMD rdna-1. UI, audio, musique et qualités actifs. 913 RAF, soit 114,125/s instrumentés, CPU frame moyen 5,125 ms/p95 17,3 ms. Dose livrée 228 ticks/7,9009 s, soit 4,810× ; ces chiffres ne sont pas un gain A/B ni une comparaison causale avec V253.

Le profil entier conserve ses bords ; ses poids ne sont pas des durées CPU exclusives. Aucune perte GPU, interaction avec inspector, campagne exhaustive des 62 parties, 240 Hz physique ou vrai 6× stable n'est certifié. Sources, 62 payloads/65 fichiers publics et archives restent exacts ; origine 5269 et navigateur possédés fermés, sessions utilisateur préservées.

## Qualification hors ligne distincte

Le premier audit échoue avant ses gardes sur un pin SHA recopié avec 63 caractères : un `e` manque au résumé. GEL `F3716E1D15DDF63F1A4E44248C4C4623198F474B5FB32564D1B27AE3ADAE2214`, 3 311 fichiers ; verdict rouge intact sous `native-red-audit-next/captures/audit-2026-10-07T18-11-38.662Z-6ffxbB/verdict.json` dans le dossier V254. Ce défaut ne signale aucune modification du résumé ou du profil.

La reprise physique distincte inverse intégralement vers le premier audit après seulement ajout de ce caractère et changement du répertoire de sortie. Revue indépendante de toutes ses familles d'assertions, puis GEL `54EA4B557CDC5BC7AC306D12AABFF92A1ACA5EA44FF2084995B164DED1574950`, 3 319 fichiers ; aucune feuille exécutée ou rouge antérieur retouché.

Verdict vert : `tmp/performance-orientation-v254/native-red-audit-reprise-next/captures/audit-2026-10-07T18-16-46.191Z-tkpA6j/verdict.json`, SHA256 `6A18F9922D07F169814A4AF52DF08B64105CE475E7B1C2483AAB18D0F192BABC`. Il qualifie l'admissibilité diagnostique, avec `originalGameStillFail:true`. Six familles vérifient identité native, stream/arbre V8 complet, horloges, 168 scripts compilés et leurs hashes, maps inline des trois sources RAW, scopes/APPLIED/qualité/audio/recovery/cleanup et 65 fichiers publics. Les gardes après l'ancienne assertion finale sont contrôlées explicitement.

Décision : utiliser le profil entier pour choisir une refonte spatiale, sans second GAME inchangé. Les publics RAW restent robustes ; la prochaine voie privée doit construire et maintenir sa propriété avant de réutiliser un masque. Aucun candidat ou gain FPS n'est livré par V254.
