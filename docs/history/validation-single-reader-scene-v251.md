# V251 — un seul lecteur dans le Worker de scène, candidat écarté

Produit V242, schéma 198 et 62 références/65 fichiers publics conservés. Le [banc privé](../development/single-reader-scene-v251.md) ne gagne pas de débit : déplacer ensemble réception stricte et Core vers un Worker produit moins d'images et une simulation plus lente. Aucun code produit intégré, FPS ajouté, portage GAME ou second banc inchangé. [Recherche et portée](../research/single-reader-scene-v251.md).

ROOT seul exécute les contrôles séquentiels via `validate:logged`. Les variantes utilisent le Core canonique V242, les lecteurs historiques et le vrai Worker source, sans le candidat V250. Un seul encode et un seul post par paquet snapshot, delta ou checkpoint, alimentent une destination et un lecteur strict ; MAIN B reçoit headers/replies/faults et chaînes de sauvegarde, pas un World. Les autres messages et leur coût restent présents. Aucune horloge, règle, cadence, qualité ou population n'est réduite.

## Contrôles et reprises distincts

Les preuves privées sont sous `tmp/performance-orientation-v251/`. Les gels et rouges restent intacts ; les reprises ci-dessous ne changent jamais rétrospectivement leurs résultats.

| Contrôle ROOT | Résultat | Durée |
|---|---|---:|
| Typage initial, GEL38908BAF/2991 fichiers | FAIL : fixture négative NaN vers type littéral198, avant runtime | 5,509 s |
| Typage reprise, GELEADAFAC4/3014 fichiers | PASS ; seul cast de fixture et namespace relocalisé | 4,964 s |
| Composants broker/destination/routage | 2 fichiers, 17 cas PASS | 13,124 s |
| Premier navigateur dans le sandbox | FAIL réseau localhost avant chargement | 8,516 s |
| Oracles natifs avec accès local | Reprises A/B exactes, FAIL sur oracle ResourceTiming inadapté | 52,934 s |
| Reprise observateur de contexte, GELCF95E21E | Deux paires achevées exactes ; FAIL final sur compteur de chargements Vite | 53,198 s |
| Audit borné des deux paires achevées, GELBBC8D455/3028 fichiers | PASS, ancien FAIL conservé, aucun runtime rejoué | 1,404 s |
| Syntaxe du contrôleur corrigé | PASS | 1,445 s |
| Core matériel A/B/B/A, même runtime | Quatre fenêtres et reprises PASS | 141,437 s |

Les composants couvrent corrélation checkpoint, générations, waiting15s sans annulation, refus/unknown, arrêt et pending bornés, FIFO/progress64, post qui jette sans consommer une séquence, vraies adoptions et deux vrais ticks16². Le runtime graphique de ces unités est un stub déclaré ; la qualification Worker/Offscreen/GPU est native et séparée.

ResourceTiming décrit les fetches du graphe Worker, pas le contexte de parsing. Son assertion initiale échoue sur B alors que ses reprises passent. L'observateur distinct audite les scripts connus/non collectés du target Page après la fenêtre et la reprise : trois modules MAIN témoins positifs, Core/décodeur présents en A et absents en B. Cette preuve ne reconstruit pas une histoire exhaustive des scripts transitoires ; elle complète les routes de modules et le seul constructeur de lecteur de la destination vivante. Aucun debugger n'est actif pendant chauffe ou mesure.

Le second rouge est uniquement le garde final `mapping.records.length>=order.length`. Une origine Vite conserve un module transformé pour son URL canonique : un chargement `worker_file` est partagé par les contextes frais. L'audit corrigé exige au moins un mapping, l'inverse RAW entier et les hashes servis exacts ; il vérifie les deux paires, leur ordre, les reprises, contextes, ACK, sources et nettoyages. Il ne transforme pas l'ancien rapport FAIL en PASS. Aucun fichier runtime n'est changé par cette reprise de métadonnées.

Dans ces deux paires, A s'arrête à6979, B à6978 ; elles passent respectivement23 413 119 et23 413 239 checks d'anciennes vues et refus sans commit, puis vrais save/load/resync. Source sent=ACK=Destination/progress41/40 avant recovery ; strict lecteur vivant unique, erreur globale/HTTP vide et aucun Worker restant. Rapport natif conservé : `realm-controls-next/captures/run-oracles-2026-10-07T16-29-56.457Z-F4CpgB/report.json`, SHA256 `B74CA9F303ADB0619ACE25AAD27C846C5B18437A8C5017CBBB4BCC6E2D925097`.

## Débit réellement dessiné

Le banc final conserve Les Aulnes corrigées250² depuis6934, caméra129/122/zoom1,1920×1080/DPR1, WebGPU matériel AMD, chauffe3s/fenêtre8s et6× demandé. Il compte une image après un vrai rendu principal retourné, passe native terminée et drawCalls positifs. Les images soumises ne sont ni les RAF MAIN B ni des scan-outs d'un moniteur240Hz. HUD, labels, interactions, audio et musique sont des noops symétriques : aucune performance GAME n'est certifiée.

| Ordre | Images soumises/s | Vitesse source réelle | Ticks observés | Publications/adoptions | Applications | CPU frame p95, ms | Démarrage, ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| A1 MAIN | 151,125 | 5,050× | 241 | 186 | 181 | 16,605 | 12 802 |
| B1 Worker | 127,500 | 4,299× | 205 | 151 | 144 | 18,270 | 13 181 |
| B2 Worker | 134,875 | 4,841× | 231 | 177 | 170 | 17,090 | 12 907 |
| A2 MAIN | 142,375 | 4,745× | 226 | 173 | 167 | 18,210 | 13 077 |

Moyennes A→B :146,750→131,1875 images/s (−10,60 %), vitesse4,8972→4,5698× (−6,69 %), CPU frame4,850→5,275ms et p95 moyen17,4075→17,680ms. Parent application12,001→12,289ms ; adoption stricte5,534→5,547ms. Ces durées sont inclusives/instrumentées et ne s'additionnent pas en budgets exclusifs. Le démarrage inclut préparation des pipelines et audits froids, pas un encode isolé. Le maximum frame B1 atteint56,390ms, contre28,560 et29,935ms dans A.

Les doses et états de chauffe diffèrent et restent visibles ; aucune normalisation ne masque la vitesse source défavorable. Ni A ni B n'atteint le vrai6× dans cette campagne. Les nombres de dessins/triangles restent rapportés dans les bruts, sans prétendre une comparaison pixel exacte entre ticks différents. Le résultat ne se compare pas causalement aux anciens FPS GAME ou au Core V235, de périmètres différents.

Chaque cohorte passe sauvegarde exacte, reload réel en nouvelle epoch, resync, mauvais load refusé sans altération de la base, ancienne vue stable et plus de23,4millions de checks. Ticks sauvés7288/7248/7273/7267 ; Source World/RNG concordent avec la chaîne réellement sauvegardée et le World admis. Les modules de lecteur/Core sont présents dans le contexte MAIN de A, absents du contexte MAIN connu de B ; un seul mapping RAW source canonique exact est servi aux quatre contextes. Erreurs globales/HTTP vides, aucun contrôle en attente ou Worker restant, navigateur et origines possédées5264/5265 fermés. Les sessions utilisateur restent intactes.

Rapport final : `cache-controls-next/captures/run-throughput-2026-10-07T16-33-31.315Z-pYPHvk/report.json`, SHA256 `67B7023A258B0D7BF08B8EB618FEE8B62340E7DECA90C9D0B84D555235ADE5DC`. GEL final `BBC8D45517B64055806431AE277C71B683CB38F57A89CF909B95CB99B7364879` ; sources, archives surveillées et références publiques exactes avant/après. Les62 sauvegardes ne sont pas toutes rejouées ici.

Décision : écarter ce montage sans portage des interfaces, promotion, build produit ou campagne supplémentaire inchangée. Aucune perte GPU, mort complète du Worker scène, parité des interactions ou de tous les refus tardifs n'est certifiée. La suite autorisée attribue les phases réellement coûteuses de l'application actuelle pour retirer du travail ou refondre les données ; aucun nouveau déplacement de thread ou gain de langage n'est présumé. Cible proche240FPS au vrai6× toujours ouverte.
