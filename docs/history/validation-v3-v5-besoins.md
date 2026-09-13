# Validation historique — v3-v5-besoins

Résultats des versions indiquées, pas une validation du code actuel. Voir [les preuves courantes](../development/validation.md).

## Historique : catalogue alimentaire et propriété — 13 septembre 2026

Le [contrat alimentaire V5](../development/food-items.md) livre baies/rations distinctes, limites de pile, quantités d'ingestion, nutrition adulte et profils historiques. Le [catalogue](../gameplay/content-catalogue.md) précise pourquoi les 95 familles du corpus ne constituent pas une liste exhaustive ; le [contrat équipement/portraits](../development/character-presentation.md) reste prévu.

**Noyau : 24 scénarios / 11 fichiers passent**, dernier passage après correction de la réservation propre du transporteur : 35,60 s. Les deux scénarios alimentaires combinent types, limites, transport, compétition, interruption, faim et migration V4/V5. Un cas ajouté pendant la revue échouait avec six baies au lieu de seize, puis passe après exclusion de la réservation de transport du colon lors du remplacement atomique de sa tâche. Les réservations d'autrui restent contraignantes. Le pilote naturel exerce 90 000 ticks sur trois cartes et cinq jours, avec conservation par unités consommées et restauration quotidienne exacte.

**Premier passage UI : sept parcours réussis**, sans échec ni relance automatique, 435,05 s au total. Le parcours de trois jours a utilisé WebGPU matériel en 331,31 s : 49 décisions, 18 repas, trois dormeurs en lits observés, trois lits/table/trois tabourets/six murs, 41 bois et 79 baies à la fin ; bilan des stocks réconcilié, aucune erreur navigateur. Ce passage précède la dernière correction de réservation propre ; les résultats de sa revalidation longue sont ajoutés ci-dessous. Le fallback reste couvert par le parcours de frontières, sans lui attribuer les performances du GPU matériel.

**Build après correction : réussi**, TypeScript strict et Vite ; bundle jeu 986,28 kB (273,19 kB gzip), worker 57,40 kB. L'avertissement de bundle supérieur à 500 kB persiste ; il concerne le chargement, pas une preuve de lenteur de frame.

**Revalidation après correction : partie UI de trois jours réussie en 330,28 s**, sans erreur ni nouvelle tentative, WebGPU matériel. Elle vérifie aussi les piles initiales de dix et huit rations, leur affichage et l’absence de portions historiques dans une nouvelle colonie. Bilan final : 18 repas, 47 décisions, trois colons ayant utilisé leurs lits, camp complet et conservation vérifiée. [Résultats structurés et décisions du pilote](../../artifacts/food-validation.json).

### Audit graphique de la nouvelle tranche

Rapport [dining-render-food-items.json](../../artifacts/dining-render-food-items.json), 13 septembre 2026 à 17:38:56 UTC. Ryzen 5 3600, GPU AMD/RDNA-1, Chromium headless normal, WebGPU, viewport 1440×1000, carte naturelle 250² avec emplacements individuels dégagés. Cent acteurs, cinquante portions de seize baies et cinquante rations, tables/tabourets et lits attribués ; 60 frames de chauffe puis huit secondes minimum par phase. Aucun autre parcours GPU lancé simultanément. La sérialisation du monde reste hors des frames mesurées.

| Mesure, vitesse 6× | p95 | Maximum |
|---|---:|---:|
| Intervalle entre images, 1 855 intervalles | 4,3 ms | 16,7 ms |
| CPU de la frame, 1 856 échantillons | 4,3 ms | 6,6 ms |
| Adoption snapshot, 34 échantillons | 2,2 ms | 2,9 ms |
| Mise à jour UI, 34 échantillons | 4,9 ms | 4,9 ms |

Aucune tâche longue ni frame au-dessus de 32 ms enregistrée, aucune erreur GPU/navigateur. Au tick 492, les cent repas sont consommés, cent colons dorment dans leur lit et aucun souvenir sans table n'est apparu. En pause, p95 des intervalles 8,3 ms et maximum 12,5 ms. Ces chiffres ne garantissent pas une fluidité parfaite partout : scénario sans congestion et sans les futurs systèmes. Le nouveau mélange alimentaire diffère du contrôle V4 ; aucun facteur d'accélération n'est déduit de leurs états différents. Les anciens rapports de correction des freezes restent intacts.

## Historique : abattage fluide et partie de plusieurs jours — 13 septembre 2026

[Cycle de vie graphique](../development/render-lifecycle.md), [relecture de la collecte et du pilote](../research/colony-progression.md), [inventaire du gameplay](../gameplay/implementation-status.md). La simulation et le schéma 4 restent inchangés : cette tranche corrige les reconstructions graphiques répétées et ajoute une vérification de développement de colonie.

**Deux nouveaux scénarios approfondis passent.** Le pilote fait cinq jours sur chacune des trois cartes naturelles 250² (graines 42, 93, 2048), soit 90 000 ticks : matériaux conservés, besoins non épuisés, trois lits/table/trois sièges construits dès la première journée, six murs au terme de la partie, au moins dix repas et 4 000 ticks de sommeil en lit par colon, restauration quotidienne exacte. Passage final : 31,07 s. Le contrôle de conservation/libération des buffers et faces graphiques passe séparément en 1,17 s. Les vingt scénarios antérieurs, dont les contrats de simulation inchangés, ont leur dernier passage global dans la section historique suivante ; ils ne sont pas redatés artificiellement.

**Six parcours UI courts passent ensemble** dans le premier appel navigateur ; leurs durées cumulées sont de 113,331 s. **Le parcours de trois jours passe ensuite en 437,36 s**, après correction de son pilote. Le [rapport consolidé](../../artifacts/colony-validation.json) conserve les deux dates, les durées, les assertions métier et les pièces jointes. Le parcours long hérite du backend logiciel du projet : **WebGL 2/SwiftShader**, ce qui ne constitue pas une mesure de performance GPU. Les parcours courts de gameplay utilisent Chromium normal/WebGPU ; celui des frontières conserve le repli logiciel.

Le pilote UI commence une partie normale, sans fixture injectée ni accélération cachée. Il effectue 43 décisions par menus/clics et utilise la vitesse 6× du jeu. À la fin des trois jours (tick 18 071), il reste **41 bois et 23 portions**, avec **3 lits, 1 table, 3 tabourets, 6 murs et aucun chantier en attente**. Les **21 repas** sont rapprochés de la perte de nourriture ; les trois colons ont été observés dormant dans un lit. Les trois sauvegardes quotidiennes rechargent exactement leur état. Aucun message d'erreur console/pipeline.

La première version du pilote UI fermait Architecte après choix de l'outil : cela le désactivait conformément à l'interface et l'ordre n'était pas envoyé. Le test conserve désormais le panneau ouvert ; cet échec n'est pas un bug du moteur ni un passage réussi. Le premier plan de simulation essayait un siège hors clairière ; le plan a été corrigé sans ajouter d'objets au monde ni diminuer le nombre de sièges attendu. Les captures du repas assis et du camp de trois jours ont été **inspectées visuellement** : volumes, place assise, lits occupés et ressources visibles cohérents. `artifacts/dining-seated.png` et `artifacts/colony-three-days.png` sont régénérables et ignorés dans Git.

### Comparaison matérielle avant/après

Même PC que les audits précédents, WebGPU AMD/RDNA-1, Chromium normal sans fenêtre, 1 440×1 000. Les timings sont distincts du parcours fonctionnel en rendu logiciel. Aucun autre audit GPU n'a tourné simultanément.

| Mesure | Avant | Après |
|---|---:|---:|
| Douze arbres sur 250², maximum d'intervalle de frame | 204,1 ms | **29,2 ms** |
| Fenêtres suivant les retraits, p95 / maximum | 50,0 / 175,0 ms | **4,3 / 29,2 ms** |
| Créations synchrones de pipelines pendant l'abattage | 75 | **4** |
| Mise à jour de ressources, coût CPU maximal | 15,9 ms | **5,0 ms** |
| Cent colons, scénario repas/sommeil 6×, maximum de frame | 333,4 ms | **20,8 ms** |
| Même scénario, renderer CPU maximal | 101,5 ms | **8,8 ms** |

Les [rapports d'abattage avant](../../artifacts/tree-render-before.json) et [après](../../artifacts/tree-render-after.json) conservent les données et horodatages (16:41:43 et 16:45:54 UTC). Douze arbres réellement abattus, mêmes 141 bois disponibles, aucune erreur ; les ticks de publication diffèrent car les mesures suivent le temps réel. Le p95 global de frame reste 4,3 ms : c'est le maximum et la fenêtre des retraits qui révèlent ici le problème.

Le [nouveau contrôle à cent acteurs](../../artifacts/dining-render-retained.json), à 17:05:27 UTC, utilise le même scénario que le [rapport historique](../../artifacts/dining-render-benchmark.json). En activité, p95 de frame 4,3 ms, maximum 20,8 ms, aucune tâche longue relevée ; adoption des snapshots au maximum 3,1 ms et mise à jour DOM 4,8 ms. Les cent portions sont consommées à table et les cent lits occupés. En pause, p95 8,4 ms, maximum 12,5 ms ; 139 appels de dessin contre 173 auparavant, avec 221 645 triangles dans les deux cas.

Ces résultats montrent la suppression des gros gels reproduits sur ces scénarios. Ils ne garantissent pas toutes les frames sous 16,7 ms ni une fluidité parfaite sur tout matériel, en congestion ou lors d'une nouvelle allocation massive. Les reconstructions locales à l'ajout de ressources et les hausses de capacité restent des points d'audit lors des prochains systèmes.

**Compilation TypeScript/Vite finale réussie** : jeu 985,46 kB minifiés / 272,75 kB gzip, worker inchangé à 55,12 kB. Le warning de chunk supérieur à 500 kB reste visible. Le renderer principal passe de 774 à 667 lignes ; trois responsabilités supplémentaires sont extraites. Contrôle de 27 documents et 231 liens locaux réussi ; fins de fichiers vérifiées avant le commit. Le dernier nettoyage ne change que l'ordre de libération des propriétaires graphiques et retire deux références inutilisées ; le contrôle matériel à cent acteurs le suit.

## Historique : repas à table, confort et FPS — 13 septembre 2026

[Contrat livré](../development/dining.md), [recherche et écarts de référence](../research/dining-reference.md). Tables et tabourets nécessitent livraison et construction ; le repas réserve une place, y transporte la portion puis l'ingère. Le confort dépend de l'usage réel du mobilier ; le premier souvenir concerne le repas sans table. Le schéma 4 conserve les nouvelles phases et migre les versions 1 à 3. L'humeur complète et les types d'aliments restent à développer. Les tables bloquent ici le passage : cette adaptation 3D est explicitement provisoire.

**Simulation : 20/20 scénarios dans huit fichiers, 26,86 s (`npm test`).** Le passage inclut le soak de 60 000 ticks sur cinq graines. Trois familles supplémentaires vérifient les repas concurrents, les interruptions et meubles invalidés, les quatre orientations, les limites de portée, la conservation, les reprises aux différentes phases, la migration d'une véritable ingestion V3, le confort et l'expiration du souvenir. Un oracle compare les résultats et chemins des recherches bornées et complètes sur 120 cartes. Un scénario vérifie la fenêtre FPS, les blocages visibles et le retour d'un onglet caché. Ces contrôles ne constituent pas une couverture exhaustive.

**Intégration : 6/6 parcours passent ensemble en 130,00 s.** Le [rapport archivé](../../artifacts/dining-validation.json), démarrage à 15:53:01 UTC, conserve les durées et pièces jointes. Besoins physiques, boucle matérielle, frontières/migrations, rectangles 250², nouvelles cartes/restauration et repas à table sont vérifiés. Le dernier parcours construit le mobilier avec 53 bois, observe portage et ingestion assise, recharge les deux phases et contrôle le compteur FPS en pause, dans Menu et sur une fenêtre étroite. Chromium normal utilise WebGPU AMD/RDNA-1 ; seul le parcours des frontières emploie SwiftShader.

Les premiers passages ont révélé un conflit d'accessibilité : le compteur en `output` ajoutait un rôle implicite `status`, ambigu avec les annonces de sauvegarde. Le compteur utilise maintenant un `span` avec `aria-live="off"`. Le retrait de réserve a également connu deux échecs intermittents dont la cause n'est pas établie : le contrôle vérifie désormais séparément l'aperçu maintenu puis le retrait par geste rapide après rechargement, avec diagnostics en cas d'échec. Les deux gestes passent dans le passage global final ; aucun correctif du moteur de rectangles n'est revendiqué. La première capture du repas assis a été inspectée ; le test régénère `artifacts/dining-seated.png` (ignoré dans Git). La capture rapprochée suivante n'a pas pu être relue à cause d'une erreur de l'outil d'image.

**Build TypeScript/Vite final réussi** : jeu 983,35 kB minifiés / 272,06 kB gzip ; worker 55,12 kB ; simulation partagée 13,43 / 5,59 kB. L'avertissement du bundle supérieur à 500 kB demeure. Le renderer principal passe de 1 046 à 774 lignes : poses GPU, mobilier et primitives ont été extraits dans des modules dédiés. Le compteur publie à cadence limitée et reste indépendant des ticks de simulation.

### Audit CPU apparié

[Contrôle avant optimisation](../../artifacts/dining-benchmark-before.json) à 15:26:21 UTC et [résultat après optimisation](../../artifacts/dining-benchmark.json) à 15:28:13 UTC, Node 24.11.1 sur Ryzen 5 3600. Même scénario, un échauffement et trois mesures de 400 ticks, cartes 64²/250² avec 3/100 acteurs. Chaque acteur dispose d'une portion, d'une table, d'un tabouret et d'un lit : le scénario isole les décisions et trajets, sans congestion.

Sur **250² et 100 acteurs**, le p95 de la phase repas/trajets passe de **23,70 à 6,90 ms par tick** (environ −71 %) ; maximum de 42,55 à 16,44 ms. Une fois les dormeurs installés, le p95 est de 0,196 ms. Les quatre empreintes finales sont identiques avant/après ; les cent repas assis et les cent couchages sont vérifiés. Le gain vient de recherches BFS arrêtées après la première couche contenant le but, avec départages conservés. Il s'agit de temps CPU, pas de FPS ; les recherches ordinaires de travail restent complètes et la navigation jouée n'utilise pas le laboratoire GPU.

### Audit navigateur et limite observée

[Rapport graphique détaillé](../../artifacts/dining-render-benchmark.json) à 16:03:20 UTC : Chromium normal sans fenêtre, WebGPU AMD/RDNA-1, 1 440×1 000, carte générée 250² sauf camps dégagés, 100 acteurs. Après 60 frames d'échauffement, chaque phase dure au moins huit secondes et 240 frames ; aucune sérialisation du monde n'est ajoutée dans les frames mesurées. Le script mesure séparément intervalles de rendu, temps CPU du renderer, adoption des snapshots et mise à jour DOM.

| Mesure | Pause | Simulation 6× |
|---|---:|---:|
| Nombre de frames | 1 521 | 1 660 |
| Intervalle de frame p95 / maximum | 8,4 / 25,0 ms | 8,3 / **333,4 ms** |
| Renderer CPU p95 / maximum | 6,1 / 10,9 ms | 4,8 / 101,5 ms |
| Adoption snapshot p95 / maximum | — | 3,9 / 4,3 ms |
| Mise à jour DOM p95 / maximum | — | 5,9 / 5,9 ms |

Les cent portions ont été mangées à table et les cent acteurs dorment au terme du scénario, sans erreur console/GPU. **Une saccade d'environ 333 ms reste observée**, avec une tâche longue de 108 ms et une frame CPU de 101,5 ms. La mise à jour DOM mesurée n'explique pas ce pic ; l'origine exacte côté rendu, pilote ou ordonnancement reste inconnue. Une trace ciblée est inscrite au prochain audit, avant d'augmenter la charge graphique. Le temps CPU inclut les soumissions mais ne chronomètre pas directement l'exécution GPU. Ces percentiles sur une scène sans congestion ne prouvent ni une fluidité constante ni un budget garanti sur d'autres appareils.

## Historique : repas et couchages physiques — 13 septembre 2026

[Contrat et paramètres](../development/needs.md). Consommation à distance et bonus de lit voisin supprimés ; tâches de repas et de sommeil persistées en schéma 3, attribution de lits, interruptions conservant les objets. Deux scénarios de simulation existants enrichis, plutôt qu'une nouvelle multitude de tests. Les résultats antérieurs ci-dessous sont historiques, notamment leurs timings de navigation sous les anciennes règles.

**Simulation : 15/15 scénarios dans cinq fichiers, 23,68 s.** Le passage global comprend le soak des cinq graines, 60 000 ticks avec invariants, les nouvelles interactions repas/transport et couchage, les migrations V1/V2, les rectangles, la génération et le codec.

**Build final réussi** : jeu 980,07 kB, gzip 270,57 kB ; worker 49,36 kB. L'avertissement de chunk supérieur à 500 kB reste présent. Le shader d'ingestion et les poses de lits utilisent les attributs instanciés existants, sans animation d'os par personnage sur CPU.

**Mesure CPU dédiée** : [rapport complet](../../artifacts/needs-benchmark.json), Node 24.11.1, Ryzen 5 3600, 14:51:39 UTC. Sur 250² avec 100 colons, la phase mêlant décisions/trajets et arrivée au lit mesure 17,47 ms au p95 et 27,55 ms au maximum par tick ; après installation des dormeurs, 0,089 ms au p95. Les cent portions sont ingérées et les cent lits occupés. Le même scénario sur 64² mesure 2,02 ms au p95 et 12,79 ms au maximum pendant la première phase. La grande carte renchérit donc les recherches complètes : le plafond de recherches n'annule pas leur coût. Ce sont des ticks CPU, pas des frames ou un profil de colonie congestionnée ; les pointes peuvent peser sur le rattrapage à vitesse 6×. Les trois colons sur 250² culminent à 9,49 ms dans ce scénario. Les anciennes mesures du moteur à repas distants ne sont pas un contrôle à gameplay équivalent.

**Intégration : 5/5 parcours passent ensemble en 113,24 s.** [Rapport archivé](../../artifacts/needs-validation.json), démarrage 14:52:56 UTC : besoins 10,5 s, boucle matérielle 14,1 s, frontières/migration 46,1 s, rectangles 250² 25,5 s, nouvelles cartes/restauration 15,0 s. Le scénario des besoins a utilisé **WebGPU, adaptateur AMD / RDNA-1**, sans erreur console/GPU. Le parcours des frontières conserve SwiftShader ; les autres lancent Chromium normal.

Le contrôle navigateur des repas a été inspecté : portion en main et deux dormeurs allongés à la hauteur et dans l'orientation de leur matelas. La capture `artifacts/needs-eating-sleeping.png` est régénérable par le test et ignorée dans Git. Les premiers essais du nouveau scénario avaient deux erreurs de préparation UI (découverte de sauvegarde après injection et tentative de fermer un menu déjà fermé par le chargement) ; elles ont été corrigées dans le test. Elles ne sont pas comptées comme des validations.

