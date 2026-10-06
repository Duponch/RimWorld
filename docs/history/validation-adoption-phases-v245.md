# Attribution de l'adoption V245

Le 6 octobre 2026, un unique diagnostic GAME du produit V242 mesure les phases de réception. [Contrat](../development/adoption-phases-v245.md). Aucun `src`, test produit, package ou fichier public modifié ; schéma 198 et 62 payloads/métadonnées conservés.

Source snapshots `A35F6D5D`, corps instrumenté `C6D0A58A`, helper `CEFB6638`, corpus de treize cas `9E108D07`. ROOT prépare les copies, vérifie les inverses RAW, gèle et exécute séquentiellement via `validate:logged`. Les autres agents relisent sans lancer de runtime. Les caches et sorties restent sous E:.

| Contrôle | Résultat |
| --- | --- |
| Typage initial, GEL `7A070C91` | FAIL, 2,135 s ; deux import-types dynamiques non relocalisés dans la copie de typage |
| Reprise de typage, GEL `EEE84E39` | PASS, 2,073 s |
| Treize cas synthétiques du helper original | PASS, 1,961 s |
| Unique GAME matériel et sauvegarde/reprise | PASS, 36,867 s |

Le rouge initial reste intact, avant tout test ou GAME. La reprise corrige uniquement les deux chemins de types motion/audio et l'import du helper dans une copie déplacée (`39D2FCC7`). Son inverse entier retrouve la copie initiale. Le nouveau tsconfig exclut celle-ci ; le contrôleur protège tout l'ancien GEL et son rapport rouge. Helper, transform et GAME exécutés sont les corps originaux, sans nouvelle variante de mesure.

Protocole : Les Aulnes corrigées250², source6934, caméra129/122/zoom1,1920×1080/DPR1, chauffe3s/fenêtre8s, vitesse demandée6×, UI/audio/musique et qualité complets. Un seul SnapshotDecoder canonique est instrumenté ; aucune copie typecheck, alternative de rendu ou nouveau mandat raw n'est chargé. La fenêtre exacte du probe grossier est réutilisée.

Sur 170 scopes admis et fermés : profondeur maximale1, tous faults/pending/troncatures/segments invalides à zéro. Les dix-huit phases ont chacune 170 segments ; toutes les adoptions atteignent leur publication. 128/170 samples sont conservés par phase, 42 non retenus déclarés ; les agrégats incluent les 170, aucun p95 de phase annoncé.

| Bloc observé | Moyenne | Total dans la fenêtre | Maximum |
| --- | --- | --- | --- |
| Parent strictAdopt | 5,491 ms | 933,5 ms | 13,3 ms |
| Tableau owners | 0,381 ms | 64,8 ms | 2,4 ms |
| Registre IDs et ajouts hors carte/archives | 1,466 ms | 249,3 ms | 3,4 ms |
| Contrôle végétal final | 1,248 ms | 212,2 ms | 3,1 ms |
| Reconstruction Resource | 0,467 ms | 79,4 ms | 3,3 ms |
| Index et commit local | 0,442 ms | 75,1 ms | 4,6 ms |

Le registre avec son tableau représente 33,65 % du parent observé ; avec le contrôle végétal, 56,38 %. Ce sont des coûts instrumentés, incluant les transitions et la collecte, pas des budgets purs ou des gains disponibles. Le namespace comprend d'autres propriétaires ; toutes ses durées ne disparaîtraient pas en retirant le seul segment Resource. Somme des phases931,2ms contre parent933,5ms ; les frontières et le coût externe du helper expliquent cette différence, sans reconstruction d'un percentile.

Le GAME produit 845 frames/105,625 RAF/s instrumentés et une source réelle4,6916× (225ticks/7,993s), avec 163 applications de scène à11,871ms en moyenne. Ces valeurs ne comparent pas un candidat et ne constituent aucun gain. Sauvegarde/reprise réelle, anciennes vues et égalités du pilote passent ; erreurs vides, sources/62payloads/65fichiers exacts, navigateur et origine possédée5249 fermés. Aucun GPUDevice loss nouveau, campagne ou moniteur240Hz certifié.

Rapport brut `7FB5E3756E2BB50EBF3B5D4D4ED058D0A054DA0EA271C766FA70918B2C42897E` : `tmp/performance-orientation-v245/adoption-game-next/captures/run-2026-10-06T20-59-33.242Z-Ay6Ip5/report.json`. Le readout brut voisin est préservé avant verdict ; `tmp/performance-orientation-v245/adoption-summary.json` est une restitution dérivée distincte.

**Décision : poursuivre une refonte combinée de la réception native et du segment Resource du registre**, avec domaine constructif, non-échappement, premiers refus et coût complet établis avant adoption. La fermeture/certification végétale seule V234 et les ports à deux lecteurs rejetés ne sont pas rejoués inchangés. Produit V242 conservé, aucun FPS ajouté par ce diagnostic ; cible proche240FPS au vrai6× ouverte.
