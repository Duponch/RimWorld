# Validation courante — V52

17 septembre 2026. [Équipement physique](equipment.md), [recherche](../research/equipment-reference.md), [preuves V51 archivées](../history/validation-medicines-v51.md). Aucun résultat ne vaut couverture exhaustive ou fluidité universelle.

## Simulation et continuité

Le premier passage général couvre 56 fichiers et 200 scénarios en 149,57 s : 192 réussites et huit échecs. Sept attentes de schéma ancien sont actualisées ; les fixtures migrées retirent explicitement les nouvelles armes. Le huitième trouve une vraie régression : le dispatch d’équipement lisait une commande nulle avant la garde de validation. La garde reste en premier. Le passage ciblé des neuf fichiers touchés réussit ensuite, **47/47 en 156,51 s**, incluant le pilote de trois graines, cinq à huit jours, bilans et continuation. Cette combinaison de passages n’est pas présentée comme une seconde suite générale entièrement rejouée.

Les cinq scénarios d’équipement couvrent transfert au contact, échange atomique, réservations partagées avec Transport, file ordinaire suivante, délai de dépôt sauvegardé et annulable, permission, identité/qualité/PV, chute/lit/décès, sol saturé, récupération, pertes de cible/accès, migration stricte et deltas worker. Une relecture enrichit l’oracle : remplacer sa propre réservation de transport en file doit être accepté sans libérer celle d’un autre colon. Les contrats Équipement/Ordres/Médicaments passent ensemble **15/15** ; le scénario enrichi repasse ensuite dans son fichier **5/5**. Les derniers contrôles et commandes sont consignés dans le [bilan des exécutions](../../artifacts/equipment-validation-v52.json).

## Interface et chronologie visible

Chromium natif WebGPU, AMD RDNA 1, Ryzen 5 3600, Windows 11 10.0.26200, viewport 1440×1000. Le parcours court utilise sélection, clic droit, inspection, dépôt et sauvegarde/rechargement à l’approche puis arme équipée. La sonde lit l’attribut d’équipement GPU après rendu : pas d’attache avant prise au contact, propriété de scène cohérente, aucune confusion avec la cargaison, phases du dépôt observées. [Mesures de l’interface](../../artifacts/equipment-ui-v52.json). Capture inspectée, FPS visible. Le premier passage réussit en 12,1 s avec 1 356 images observées ; le fichier conserve le dernier passage.

Le premier parcours long est invalidé par une modification de module pendant son exécution : Vite recharge l’application, puis la sonde perd `window.__lisiere` au tick cible 7 035. L’[état interrompu](../../artifacts/equipment-colony-initial-v52.json) est conservé. Ce n’est ni un succès ni la preuve d’un blocage de simulation. Les sources restent figées pendant le parcours de remplacement ; seules les lectures et la rédaction documentaire sont permises en parallèle. Ne plus faire de retouche runtime, même mineure, pendant un parcours UI long.

Le [parcours de remplacement](../../artifacts/equipment-colony-v52.json) réussit en **6,7 minutes**, puis le parcours d’équipement en **18,2 s** : 1 276 images, 673 pendant l’approche, 420 équipée et 134 en dépôt ; première attache au tick 3 025, au contact (11,5) de l’arme (12,5). Aucun message d’erreur navigateur. Trois jours par vraie UI : 19 cuissons, trois dormeurs, une principale conservée à 100 PV, 30 doses rangées, 15 cellules minées, 35 blocs rangés, 50 acier au sol et 150 incorporé, trois lits, table/tabourets, atelier, porte, générateur/lampe et 28 cases couvertes. Bilan bois exact et nourriture réconciliée ; capture finale inspectée. Ce camp civil ne provoque pas les blessures testées séparément.

La dernière revue refuse aussi une arme appartenant à un chantier et limite le réessai de dépôt saturé à une seule voie par tick admissible. **20/20 scénarios** Équipement/Santé/Secours/Ordres passent en 5,80 s ; TypeScript et bundle Vite réussissent. Le scénario de sol saturé comprend sa reprise exacte puis une place libérée. Ces corrections ne changent pas le parcours long civil déjà validé.

## Charge CPU isolée

Node 24.11.1, Ryzen 5 3600, Windows 11 10.0.26200. `scripts/equipment-bench.ts`, 250² dégagé, 1 200 ticks, équipement réellement collecté puis minage, abattage, transport et auto-soins. Un passage 3/30/100 acteurs, sans autre banc simultané. [Mesures CPU](../../artifacts/equipment-cpu-v52.json).

| Acteurs | Tick p50 / p95 / p99 / max | Clone complet p95 |
|---|---|---|
| 3 | 0,070 / 0,478 / 1,861 / 11,033 ms | 48,733 ms |
| 30 | 0,730 / 4,340 / 10,529 / 83,559 ms | 48,654 ms |
| 100 | 3,103 / 12,281 / 18,502 / 26,714 ms | 51,160 ms |

Identités et bilans conservés, validation stricte et continuation exacte après charge. À cent acteurs : 100 phases d’équipement, 35 de soins, 208 d’abattage, 119 de minage et 135 de transport observées, toutes les cibles minières et végétales terminées. Les comptes sont des observations de phases, pas des nombres d’opérations médicales. Le clone complet n’est pas le delta worker et ces temps ne sont pas des FPS. La pointe à 83,6 ms reste visible ; aucune comparaison causale avec le banc médical V51, de contenu différent.

## Charge graphique native

Le [banc mixte natif](../../artifacts/equipment-native-v52.json) utilise 3 puis 100 colons, chacun équipé et porteur de vingt petites lésions ; vraie forêt 250² avec zone minière dégagée, quatre roches et un arbre par colon, worker 6×, 90 images d’échauffement. Les lésions sont une charge physiologique, pas une démonstration de soins simultanés. Les auto-soins sont exercés dans le banc CPU séparé.

| Acteurs | Intervalle image p50 / p95 / p99 / max | CPU image p95 / max | Application scène p95 / max | Réception p95 / max |
|---|---|---|---|---|
| 3 | 12,5 / 29,3 / 54,3 / 74,9 ms | 10,9 / 21,2 ms | 10,7 / 16,5 ms | 0,9 / 10,8 ms |
| 100 | 16,7 / 45,9 / 66,7 / 112,5 ms | 23,4 / 41,4 ms | 17,7 / 34,3 ms | 10,7 / 19,4 ms |

294/385 intervalles observés, 12/400 roches retirées, 3/100 armes toujours équipées. Identités des buffers roche/terrain conservées, **aucun nouveau pipeline**, aucune erreur navigateur ; maximum 165/188 draw calls pour toute la scène. Les trois volumes d’arme utilisent le lot corporel commun. Le travail supplémentaire de sommets existe : ce protocole ne constitue pas une comparaison avant/après de son seul coût.

Les pointes jusqu’à 112,5 ms restent un problème de charge à travailler ; le rendu cent acteurs n’est pas déclaré parfaitement fluide. L’application de scène et la réception contribuent aux coûts observés. Un profil séparé complète cet audit sans mélanger ses temps instrumentés aux percentiles ci-dessus.

## Relecture de la garde de présentation

Le [premier passage V52](../../artifacts/equipment-presentation-initial-v52.json) refuse le minage : deux images sans avance, 12,4 et 4,1 ms. Les 22 commandes restent entre 12,4 et 45,1 ms, aucun saut/pénétration/retrait anticipé. La trace montre une réserve qui se vide après des changements : le taux reçu entre deux frames s’appliquait rétroactivement à tout leur intervalle. À 44 600 ms, une frame de 45,9 ms reçoit le taux 6× juste à sa fin ; lui appliquer 6× depuis son début consomme un passé écoulé à 3×. Ce défaut de l’intégrateur peut contribuer aux attentes intermittentes V51 ; cette attribution rétroactive reste une hypothèse faute de trace identique V51.

Un témoin déterministe avec deux confirmations entre frames retardées échoue avant correction (**1 tick obtenu au lieu de 3,5**). L’intégrateur découpe maintenant uniquement le temps réel écoulé, aux horodatages de confirmation. Aucun agrandissement du tampon, ralentissement adaptatif, extrapolation ou assouplissement de seuil. Sept scénarios spatiaux/bridge passent, dont pause vidée/courte, timestamps RAF antérieurs aux callbacks et changements répétés. L’ancien oracle de cadence est corrigé : il intégrait lui aussi rétroactivement le nouveau taux sur l’intervalle précédent.

La [reprise complète après correction](../../artifacts/equipment-presentation-v52.json) valide le minage (4 663 intervalles, zéro attente), mais **la garde reste rouge pour l’abattage** : deux intervalles consécutifs de 8,2 et 4,2 ms sans avance parmi 4 769, alors qu’un nouvel état confirmé arrive après un intervalle de réception de 62,2 ms. Tous les 44 changements restent sous 66,4 ms, sans saut/pénétration/retrait anticipé ni erreur navigateur. p95 20,8 ms, p99 33,4 ms pour les deux phases ; maxima 75 / 66,6 ms. Corriger l’intégration rétroactive est nécessaire mais ne garantit pas de résister à tout retard de publication. Ce résultat ne sera pas maquillé en réussite par suppression de l’oracle ni par agrandissement opportuniste de réserve. La cause précise de cette attente résiduelle reste à isoler entre cadence du worker, IPC et disponibilité du thread principal.

Le [profil CDP séparé](../../artifacts/equipment-main-profile-v52.json) dure 10,48 s à cent acteurs. Temps propres échantillonnés : parcours Three `_projectObject` **1 255 ms**, `updateMatrixWorld` **963 ms**, callback worker **879 ms**, rendu direct **482 ms** et multiplication de matrices **376 ms**. L’application de scène cumule 1 562 ms inclusifs, dont environnement lumineux, ressources et roches. Ces coûts se recouvrent et ne s’additionnent pas comme des postes indépendants. Ils justifient une prochaine optimisation du graphe statique et de la réception, pas une attribution des pointes à la petite géométrie des revolvers. Aucune modification spéculative des matrices/ombres n’est incluse dans ce lot.

Le [diagnostic avec horodatage du worker](../../artifacts/harvest-sync-equipment-worker-v52.json) ne reproduit pas l’attente : zéro frame figée sur 5 279 intervalles. Livraison worker→thread principal p95 **10,5 ms**, p99 **17,8 ms**, max **43,6 ms**. Les écarts de publication regroupent 1×/3×/6× et ne permettent pas d’imputer leur maximum à la vitesse rapide. En revanche, l’ancien oracle attend une frame intégralement au nouveau taux et relève 108,7 ms sur une décélération ; il ne mesure pas la première portion d’image déjà ralentie.

L’observateur distingue maintenant **premier changement visible** et `fullRateDelay` (premier intervalle entier au nouveau taux). Le budget utilisateur de 100 ms reste appliqué au premier effet, avec refus des valeurs inchangées, nulles, hors intervalle ou non finies. Le contrôle ne confond pas une immobilité avec un ralentissement réussi. Le témoin historique de 416–424 ms reste refusé, ainsi que toute frame figée ; le seuil d’attente n’est pas relevé. Les deux mesures restent enregistrées pour rendre cette correction d’oracle vérifiable. **14/14 scénarios** Équipement/Spatial/Bridge/Métriques passent en 4,80 s ; compilation finale réussie avec le même avertissement de bundle.

Le [dernier contrôle complet](../../artifacts/equipment-presentation-acceptance-v52.json), avec ces deux mesures, confirme les 44 premiers effets entre **10,6 et 90,5 ms**. Minage sans attente, **mais trois intervalles d’abattage restent figés (8,3 + 8,4 + 4,1 ms)**. Le worker ne publie rien pendant **100,30 ms** entre les ticks 3 017 et 3 019 ; ces états arrivent ensuite en **3,5 et 7,1 ms**. Sur cet événement, la majeure partie du silence précède l’envoi : ce n’est donc pas principalement une file IPC ou un HUD bloqué. Il reste à départager calcul de simulation/encodage et retard de réveil du worker. La correction d’intégration est conservée, mais **`test:presentation` demeure en échec** et ce point devient le prochain chantier avant la mobilisation. Pas de répétition jusqu’à obtenir fortuitement du vert.

Le parcours d’équipement final repasse en **20,2 s** avec l’intégrateur corrigé. Les contrôles de gameplay, reprise, propriété et rendu de l’arme sont validés indépendamment de cette limite générale de cadence. Compilation finale, liens/identifiants documentaires, empreintes des trois originaux et `git diff --check` réussissent. La livraison est un incrément fonctionnel avec défaut de cadence connu, pas une clôture de toutes ses gardes.

## Gameplay et suite

Nouvelle principale physiquement collectée, échangée, déposée, transportée et récupérée après incapacité ; inspection, apparence GPU et sauvegarde strictes. Le camp reste jouable avec production/construction, minage, repas/repos/loisirs, premier habitat électrique et secours/soins. Mobilisation, combats et adversaires, autres armes/vêtements, inventaire personnel, social/narration, météo/biomes complets, monde/commerce/recherche et catalogue complet restent absents ou partiels. File d’équipement et priorité exacte de récupération Core ne sont pas livrées comme parité. G0 en consolidation, G1/G2 partiels, fondations de G3, G4/G5 absents.

## Étape suivante engagée : attribuer le coût worker

Après publication de V52, le [banc instrumenté par phases](../../artifacts/harvest-sync-worker-phases-v52.json) sépare le temps de réveil, `stepWorld`, encodeur et `postMessage` sans modifier le protocole de production. Sur 2 273 lots en abattage : réveil p95/p99 **31,6/32,5 ms**, simulation **3,3/6,9 ms**, encodage **7,5/11 ms**, envoi **0,6/1,1 ms**, lot entier **10,6/17,7 ms**. La première itération froide atteint 62 ms, dont 51,8 ms de simulation. Le coût régulier d’encodage dépasse celui de simulation dans cette charge.

Aucune frame figée cette fois, mais une commande 1×→3× a son premier effet à **113,2 ms**, donc l’oracle reste rouge. Ce passage instrumenté ne clôt ni la cause du silence de 100 ms du passage précédent ni les problèmes de réactivité. Le travail utile suivant est de comparer l’encodeur sur carte naturelle, mutations et ordre des ressources, puis de vérifier toute optimisation avec la même garde native. Le profileur du thread principal reste distinct de ces mesures worker ; aucun gain de FPS n’est revendiqué par l’ajout des sondes.
