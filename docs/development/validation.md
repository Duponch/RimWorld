# Validation du prototype

## État courant : abattage fluide et partie de plusieurs jours — 13 septembre 2026

[Cycle de vie graphique](render-lifecycle.md), [relecture de la collecte et du pilote](../research/colony-progression.md), [inventaire du gameplay](../gameplay/implementation-status.md). La simulation et le schéma 4 restent inchangés : cette tranche corrige les reconstructions graphiques répétées et ajoute une vérification de développement de colonie.

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

[Contrat livré](dining.md), [recherche et écarts de référence](../research/dining-reference.md). Tables et tabourets nécessitent livraison et construction ; le repas réserve une place, y transporte la portion puis l'ingère. Le confort dépend de l'usage réel du mobilier ; le premier souvenir concerne le repas sans table. Le schéma 4 conserve les nouvelles phases et migre les versions 1 à 3. L'humeur complète et les types d'aliments restent à développer. Les tables bloquent ici le passage : cette adaptation 3D est explicitement provisoire.

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

[Contrat et paramètres](needs.md). Consommation à distance et bonus de lit voisin supprimés ; tâches de repas et de sommeil persistées en schéma 3, attribution de lits, interruptions conservant les objets. Deux scénarios de simulation existants enrichis, plutôt qu'une nouvelle multitude de tests. Les résultats antérieurs ci-dessous sont historiques, notamment leurs timings de navigation sous les anciennes règles.

**Simulation : 15/15 scénarios dans cinq fichiers, 23,68 s.** Le passage global comprend le soak des cinq graines, 60 000 ticks avec invariants, les nouvelles interactions repas/transport et couchage, les migrations V1/V2, les rectangles, la génération et le codec.

**Build final réussi** : jeu 980,07 kB, gzip 270,57 kB ; worker 49,36 kB. L'avertissement de chunk supérieur à 500 kB reste présent. Le shader d'ingestion et les poses de lits utilisent les attributs instanciés existants, sans animation d'os par personnage sur CPU.

**Mesure CPU dédiée** : [rapport complet](../../artifacts/needs-benchmark.json), Node 24.11.1, Ryzen 5 3600, 14:51:39 UTC. Sur 250² avec 100 colons, la phase mêlant décisions/trajets et arrivée au lit mesure 17,47 ms au p95 et 27,55 ms au maximum par tick ; après installation des dormeurs, 0,089 ms au p95. Les cent portions sont ingérées et les cent lits occupés. Le même scénario sur 64² mesure 2,02 ms au p95 et 12,79 ms au maximum pendant la première phase. La grande carte renchérit donc les recherches complètes : le plafond de recherches n'annule pas leur coût. Ce sont des ticks CPU, pas des frames ou un profil de colonie congestionnée ; les pointes peuvent peser sur le rattrapage à vitesse 6×. Les trois colons sur 250² culminent à 9,49 ms dans ce scénario. Les anciennes mesures du moteur à repas distants ne sont pas un contrôle à gameplay équivalent.

**Intégration : 5/5 parcours passent ensemble en 113,24 s.** [Rapport archivé](../../artifacts/needs-validation.json), démarrage 14:52:56 UTC : besoins 10,5 s, boucle matérielle 14,1 s, frontières/migration 46,1 s, rectangles 250² 25,5 s, nouvelles cartes/restauration 15,0 s. Le scénario des besoins a utilisé **WebGPU, adaptateur AMD / RDNA-1**, sans erreur console/GPU. Le parcours des frontières conserve SwiftShader ; les autres lancent Chromium normal.

Le contrôle navigateur des repas a été inspecté : portion en main et deux dormeurs allongés à la hauteur et dans l'orientation de leur matelas. La capture `artifacts/needs-eating-sleeping.png` est régénérable par le test et ignorée dans Git. Les premiers essais du nouveau scénario avaient deux erreurs de préparation UI (découverte de sauvegarde après injection et tentative de fermer un menu déjà fermé par le chargement) ; elles ont été corrigées dans le test. Elles ne sont pas comptées comme des validations.

## Historique : désignations rectangulaires — 13 septembre 2026

La [tranche de désignation](area-designations.md) ajoute abattage, récolte, annulation et création/retrait de cases de réserve en rectangle. Les matériaux, les déplacements et le schéma 2 restent ceux de la boucle matérielle. Le geste est transitoire ; la validation et le bilan d'application viennent du worker.

**`npm test` : 15/15 scénarios, cinq fichiers, 22,40 s.** Aux huit familles de simulation, trois de génération, deux de contrats GPU et une de codec s'ajoute une famille de désignation : oracle via commandes unitaires, quatre sens, frontières et mauvais paramètres, conservation/reprise pendant prélèvement ou portage, annulation unique d'un lit sur deux cellules et préservation d'un autre chantier. Le scénario exerce également la carte entière 250² et la capacité des identités. Le soak de 60 000 ticks avec invariants fait toujours partie du passage global.

**Les quatre parcours navigateur passent ensemble**, environ 1,5 minute :

| Parcours | Navigateur | Durée |
|---|---|---:|
| Boucle matérielle, réserves tracées en rectangle, transport, couchages et reprise en livraison | Chromium normal | 14,3 s |
| Frontières, commandes, migration V1 et interface compacte | Chromium avec SwiftShader | 41,1 s |
| Rectangles 250² : aperçu, interruptions, stockage, rotation et collecte réelle | Chromium normal, WebGPU AMD/RDNA-1 | 20,4 s |
| Défaut 250², tailles 128²/200²/250² et ancienne colonie restaurée exactement | Chromium normal | 12,6 s |

Le [rapport graphique et métier](../../artifacts/area-gameplay-validation.json), **14:09:36,801 UTC**, conserve cinq interruptions (Échap, second bouton droit, relâchement sur l'interface, événement blur injecté, changement d'outil), dix cellules de réserve, une collecte réelle et 24 unités de bois conservées. Une première réserve de huit cellules conserve ses réglages lors d'un rectangle chevauchant qui n'ajoute que deux cellules. Le retrait garde les piles, le rechargement retrouve le monde complet. L'aperçu a été capturé pendant un geste maintenu et réellement inspecté ; aucun message d'erreur console/GPU. Le rapport est également joint au test sous `area-gameplay` ; un reporter Playwright JSON permet de conserver cette pièce jointe lors d'un nouveau passage.

Le premier essai visait une extrémité masquée par Architecte : son refus était conforme au contrat, mais une assertion textuelle lisait encore le contenu d'un indicateur caché. Le pilote vérifie désormais les extrémités sur le canvas et la visibilité réelle de l'aperçu. La gestion des boutons a aussi été corrigée : presser le droit pendant le gauche produit un changement de `buttons` dans `pointermove`, pas nécessairement un nouveau `pointerdown`. Ce cas fait partie du parcours régulier. La caméra suspend aussi son amortissement pendant le tracé.

La relecture suivante a ajouté un précontrôle conservateur du nombre d'IDs nécessaires aux dépôts d'une annulation ou d'un retrait. Une sauvegarde valide peut avoir épuisé ce compteur ; la commande doit alors être refusée avant toute suppression de propriétaire. Les régressions vérifient un chantier approvisionné et une cargaison portée à cette limite. **Le scénario de désignation final repasse en 954 ms, et le parcours navigateur ciblé en 19,0 s**, après ce garde-fou. Les autres règles sont inchangées depuis les passages globaux ci-dessus. Le JSON du rapport reste celui du passage global à 14:09 ; la capture locale a été régénérée par le passage ciblé.

**Build TypeScript/Vite final réussi** : jeu 978,69 ko minifiés / 270,13 ko gzip ; worker 43,03 ko ; simulation partagée 12,27 / 5,18 ko ; laboratoire GPU 18,29 / 7,29 ko. L'avertissement du bundle supérieur à 500 ko reste visible. L'archivage du rapport a été sorti du code du test pour conserver le typecheck navigateur sans ajouter de dépendance Node uniquement pour cet export ; cela ne change aucune assertion de jeu.

Le [benchmark de commandes](../../artifacts/area-designation-benchmark.json) mesure le noyau Node, séparément du navigateur : 156 désignations dans un rectangle 32² sur carte 250² prennent 1,85 ms en médiane par commande groupée contre 10,40 ms via commandes unitaires. Les petits rectangles ne bénéficient pas tous d'un gain : deux cibles prennent 2,40 ms contre 0,49 ms, du fait de la préparation de l'index. Conditions, contrôle de l'égalité et limites dans [area-designations.md](area-designations.md). Aucun FPS ni coût d'exécution ultérieure de milliers de travaux n'en est déduit. Les anciens profils de carte ci-dessous ne sont pas redatés après cette livraison.

## Historique : cartes moyennes 250² — 13 septembre 2026

Le défaut jouable est 250×250, avec 200² et les dimensions compactes conservées. Les anciennes sauvegardes gardent leur terrain et leurs identités. Les [mesures appariées de simulation, communication et rendu](map-scale.md) distinguent l'ancien défaut 64², l'ancien moteur dont seules les bornes sont étendues, et le nouveau moteur. Elles documentent également les coûts supplémentaires de mémoire et de préparation ; aucune absence générale de régression n'est revendiquée.

**Noyau : 14/14 scénarios passent en 19,14 s**, dans quatre fichiers : huit familles de simulation, trois de génération, deux de contrats GPU et une de transport des snapshots. Les familles existantes comprennent toujours 60 000 ticks avec conservation ; la génération couvre maintenant 60 paysages, 13 dimensions rectangulaires, 12 départs de camp et un trajet dépassant les anciennes tailles de carte. La comparaison CPU de contrôle vérifie séparément l'égalité complète des générations et continuations. Les tests Vitest de contrats GPU ne lancent pas les shaders.

Après ce passage, la frontière de présentation a reçu un indicateur explicite de remplacement de carte. L'intégration a ensuite détecté un défaut d'ordre des clés JSON dans la reconstruction des deltas : les valeurs étaient égales, mais le snapshot n'avait plus exactement la représentation de la sauvegarde autoritaire. La reconstruction préserve désormais l'ordre du checkpoint et le scénario de codec exige aussi l'égalité JSON intégrale. **Ce scénario ciblé repasse sur le code final en 746 ms** ; la simulation, déjà vérifiée, n'a pas changé depuis le passage global.

**Les trois parcours navigateur passent dans un même appel `npx playwright test`**, en environ 1,2 minute, après cette correction :

| Parcours | Navigateur | Durée |
|---|---|---:|
| Portage physique, réserve filtrée, couchages, sauvegarde/reprise exacte pendant livraison | Chromium normal | 14,1 s |
| Commandes répétées, chargement invalide atomique, vraie migration V1, interface compacte | Chromium avec SwiftShader | 41,6 s |
| Défaut 250², créations 128²/200²/250², sauvegarde/rechargement 250², restauration intégrale de l'ancienne colonie 32² | Chromium normal | 12,5 s |

Ces durées sont des contrôles fonctionnels, pas des benchmarks. Le test des grandes cartes compare les mondes complets, pas uniquement leur dimension ou leur hash. Les parcours inspectent les erreurs console et de pipeline.

**Build final TypeScript/Vite réussi** : jeu 973,26 ko minifiés / 268,66 ko gzip ; worker 38,94 ko ; simulation partagée 10,58 / 4,58 ko ; laboratoire GPU 18,29 / 7,29 ko. L'avertissement du bundle principal supérieur à 500 ko demeure visible. Ni les dépendances ni les kernels de navigation GPU n'ont changé dans cette tranche.

La préparation des rapports a révélé deux défauts d'instrumentation graphique : un parcours quittait entièrement la carte et un retour Playwright sérialisait le renderer. Les profils affectés sont explicitement exclus ; seules les comparaisons nettoyées sont retenues dans [map-scale.md](map-scale.md). Les limites de cette machine et les pointes encore observées font partie du résultat.

**Contrôle graphique final 250² réussi à 13:41:17 UTC**, WebGPU sur AMD/RDNA-1, sans erreur console/GPU : portage physique, mur et lit 1×2 achevés, quatre orientations, occultation sans mutation de la simulation, interface compacte et reprise de poses au chargement. Le chargement garde terrain et IDs identiques mais augmente le tick et déplace un colon ; les poses initiale et finale sont immédiatement égales à sa position restaurée. Le [rapport courant](../../artifacts/render-probe.json) et [l'inspection visuelle](render-validation.md) précisent les captures réellement examinées. Les mesures de performance ont précédé le correctif d'ordre des clés du codec ; leurs timestamps restent inchangés.

## Historique : tranche matérielle G0, schéma 2 — 13 septembre 2026

Cette section décrit les preuves de la tranche matérielle avant le passage aux cartes 250². Les sections suivantes sont **historiques** : leurs nombres, backends et simplifications décrivent les versions alors testées. La boucle matérielle est livrée ; G0 conserve les limites détaillées dans [ROADMAP](../ROADMAP.md) et [les choix de gameplay](../gameplay/decisions.md).

`npm test` réussit avec **13/13 scénarios en 10,46 s** : huit familles de simulation, trois de génération et deux de contrats GPU. Les huit familles incluent 60 000 ticks sur cinq graines avec bilan matière et invariants à chaque tick. Elles couvrent partage et fusion de piles, réservations de quantités et capacités, interruptions aux transitions de portage, livraison partielle, reprise exacte, empreintes et migrations V1 actives ou interrompues. Les régressions finales couvrent aussi une capacité abaissée avec report vers une réserve de priorité égale, un colon inactif bloquant seulement la destination, et une recherche de 40 000 couples reprise après la fenêtre de 32 768 via le curseur sauvegardé. Les tests de contrats GPU n'exécutent pas les kernels sur un appareil.

Le build TypeScript/Vite réussit. Les tailles produites sont :

| Sortie JavaScript | Minifiée (ko) | Gzip (ko) |
|---|---:|---:|
| Jeu | 968,25 | 266,85 |
| Worker | 37,21 | — |
| Module de simulation partagé | 10,51 | 4,56 |
| Laboratoire GPU | 18,29 | 7,29 |

Ces tailles ne mesurent ni chargement réseau ni fluidité. L'avertissement de taille du bundle principal reste visible.

Les **trois parcours navigateur passent lors de passages ciblés successifs**, sur les mêmes sources finales :

| Parcours | Navigateur | Durée du test |
|---|---|---:|
| Transport réel, pause pendant le portage, sauvegarde/reprise exacte, annulation depuis la seconde cellule du lit | Chromium normal, adaptateur sélectionné automatiquement | 20,4 s |
| Frontières de commandes, chargement invalide atomique, migration d'une vraie sauvegarde V1, interface compacte | Chromium avec SwiftShader | 54,8 s |
| Cartes 64²/128² et restauration intégrale de la colonie précédente | Chromium normal | 28,3 s |

Ces durées ne sont pas des benchmarks. L'ancien parcours matériel logiciel observait parfois une cargaison, puis la demande de pause arrivait après son dépôt. Le helper envoie désormais la pause dans la même observation navigateur que la détection du portage et attend la pause autoritaire. Le passage matériel utilise Chromium normal ; le test de frontières conserve le backend logiciel. Un résultat « trois parcours passés » n'affirme pas qu'ils ont été exécutés dans un unique appel global.

Le [diagnostic graphique archivé](../../artifacts/render-probe-material.json), daté du **13 septembre 2026 à 12:44:44,892 UTC**, rapporte **WebGPU sur AMD/RDNA-1**, sans erreur. Il capture une cargaison de sept bois appartenant au colon 734, puis construction réelle d'un mur et d'un lit 1×2, en pause au tick 420. Le script attend deux images avant les captures ; le code du jeu est inchangé. Un [contrôle ciblé des aperçus aux quatre orientations](../../artifacts/placement-preview-probe.json) n'a révélé aucun défaut. Captures et portée dans [render-validation.md](render-validation.md). Cela valide le chemin graphique exercé, sans preuve de performance de centaines de personnages, de rigs glTF ou de rendu et navigation compute simultanés.

### Mesure finale du noyau matériel

[Données brutes schéma 2](../../artifacts/simulation-benchmark.json), **13 septembre 2026 à 12:39:49,525 UTC**, Node v24.11.1, Windows x64, AMD Ryzen 5 3600, 12 processeurs logiques, 17 131 188 224 octets de mémoire système. Le protocole emploie cinq mondes neufs par population, carte ouverte 64², collecte distante et stockage dimensionné pour tout le bois. Il mesure le premier tick, 200 ticks supplémentaires par lots de 20, puis vérifie les résultats à 1 001 ticks. Le monde inactif est distinct ; le portage est limité à dix unités.

| Colons | Premier tick médian (ms) | Tick actif médian (ms) | p95 des moyennes de lots (ms/tick) | Tick inactif médian (ms) | Travaux achevés à 1 001 | Bois stocké à 1 001 |
|---:|---:|---:|---:|---:|---:|---:|
| 3 | 0,849 | 0,013 | 0,076 | 0,013 | 3/3 | 36/36 |
| 30 | 1,481 | 0,025 | 0,405 | 0,013 | 30/30 | 336/360 |
| 100 | 1,485 | 0,055 | 0,956 | 0,020 | 100/100 | 1 038/1 200 |
| 300 | 2,041 | 0,914 | 2,244 | 0,040 | 300/300 | 2 783/3 600 |

Les achèvements et quantités stockées sont les moyennes des cinq répétitions. La conservation est vérifiée dans chaque répétition. **Collecte achevée ne signifie pas stockage achevé** : à 300 colons, 2 783 des 3 600 bois sont en réserve à la fin de la fenêtre. Les quantités restantes existent encore ailleurs ; cette mesure ne ferme pas le chantier de congestion. Les maxima du premier tick et observations d'affectation restent dans le JSON.

Le p95 porte sur des moyennes de lots, pas sur les pointes individuelles. Le test inclut besoins, BFS, travail et transport CPU ; il exclut GPU, rendu, navigateur, DOM, échanges worker et persistance. Ces chiffres ne donnent aucun FPS. L'ajout du transport change le scénario par rapport au schéma 1 : **aucune comparaison A/B** n'est déduite de l'écart avec les [données initiales](../../artifacts/simulation-benchmark-initial.json).

## Historique : adoption documentaire du corpus utilisateur — 13 septembre 2026

Les trois fichiers de `docs/new_docs` ont été examinés : lecture des 36 chapitres HTML, extraction et comparaison du PDF de 49 pages, inspection visuelle de dix pages structurantes, lecture des neuf feuilles du classeur et contrôle de ses identifiants/compteurs. HTML et PDF contiennent le même rapport. Les 181 premiers TEST ont été comparés à leurs fiches SYS : ce sont des critères reformulés, et aucun des 196 TEST du dossier n'est donné comme exécuté. L'annonce officielle 1.6.4850 a été recontrôlée ; les constantes et la parité complète n'ont pas été vérifiées en jeu.

Les décisions, renvois erronés et annexes absentes sont dans [reference-adoption.md](../research/reference-adoption.md). ROADMAP, matrice, architecture, stratégie de tests et consignes de reprise ont été harmonisés autour de ces références. Cette livraison est documentaire : aucun code ni comportement du jeu n'a changé. Les contrôles portent sur les liens locaux, la traçabilité et la cohérence des jalons ; les suites de simulation et navigateur n'ont pas été relancées. Les résultats ci-dessous restent ceux de leurs exécutions antérieures.

## Historique : extension spatiale, interface et navigation GPU — 13 septembre 2026

Le générateur spatial, les dimensions 3D, l'organisation d'interface et le laboratoire de navigation ont été ajoutés après la validation initiale consignée plus bas. `npm test` réussit avec **13/13 scénarios** : 8 de simulation, 3 de génération et 2 de contrats/oracle de navigation. Le soak de 60 000 ticks fait toujours partie des huit scénarios de simulation. Les familles et leur portée sont dans [testing.md](testing.md).

`npm run build` réussit avec deux entrées : jeu et laboratoire. Le JavaScript du jeu représente 956,22 ko minifiés / 263,02 ko gzip ; le laboratoire 22,59 ko / 9,26 ko. Le worker fait 17,21 ko. Ces tailles de fichiers ne sont pas une mesure de chargement réseau. L'avertissement de taille du bundle du jeu demeure visible.

La validation matérielle du calcul GPU couvre **110 requêtes sur 18 fixtures répétées**, puis invalidation en vol, concurrence et capacités ; aucune divergence de coût ou de chemin admissible et aucune erreur GPU. Les mesures de lots, conditions et limites sont dans [gpu-navigation.md](../research/gpu-navigation.md). Les tests Vitest seuls ne prouvent pas l'exécution des shaders. L'essai WebGPU logiciel n'a pas trouvé d'adaptateur et reste non validé.

L'interface du laboratoire a été exercée séparément sur le GPU AMD/RDNA-1 : paysage 64², obstacle 250², résultat vérifié contre Dijkstra et édition invalidant le chemin. [Diagnostic du laboratoire](../../artifacts/navigation-lab-smoke.json). Aucune performance de foule ni de rendu simultané n'est déduite de ces contrôles.

Le contrôle final du jeu sur WebGPU, après réglage de l'angle de caméra et correction de la surface du socle, réussit également sans erreur : collecte, construction réelle de mur/lit, coupe, feuillage et priorités accessibles. Le diagnostic attend explicitement la pause autoritaire avant de comparer l'état ; cliquer sur Pause sans attendre son acquittement créait une course dans la version précédente du script. [Rapport graphique et captures](render-validation.md).

**Les trois parcours d'intégration ont réussi lors de passages ciblés successifs** : collecte → trois lits réellement achevés → alerte supprimée → sauvegarde/reprise exacte et annulation ; rafale de priorités, chargement invalide atomique et organisation 1280×720/768×900 ; création des cartes 64²/graine 271 et 128²/graine 4 294 967 295 puis restauration intégrale de la colonie 32² avec son ordre et sa priorité désactivée. Les deux premiers utilisent SwiftShader avec repli WebGL 2. Le troisième lance Chromium normal et s'achève en 17,7 s sur cette machine ; cette durée n'est pas un benchmark.

Le parcours 128² sous SwiftShader a dépassé son budget global de 90 s, malgré les derniers états et assertions consultés corrects. Le point précis du dépassement n'a pas été isolé ; on ne déclare donc pas ce backend validé pour ce parcours. Un [diagnostic des extraits observés](../../artifacts/integration-software-diagnostic.json) est conservé ; le zip complet a été effacé par le run suivant, ce qui limite l'analyse rétrospective. Le transfert des états au protocole Playwright utilise une chaîne JSON, et leur comparaison intégrale évite de parcourir des milliers d'objets dans le matcher. Ce changement préserve la comparaison exacte ; aucune assertion de conservation n'a été remplacée par une simple longueur ou un hash.

Le générateur a également fait l'objet d'une exploration de 480 cartes. Une graine enfermant le départ a conduit à une réparation de passage vers la région principale de sa rive. Le contrat régulier contrôle 36 paysages quantifiés et neuf continuations de parties. [Détail de génération](world-generation.md). Les anciennes sauvegardes sont chargées sans régénération ; un nouveau départ avec une ancienne graine peut changer de paysage.

Les séquences de la vidéo fournie réellement consultées et leurs limites sont consignées dans [visual-reference.md](../research/visual-reference.md). Elles fondent la structure d'interface et l'interprétation des volumes ; elles ne constituent pas une validation de combat, de fuite ou des diagonales de RimWorld.

## Historique : validation initiale

### Environnement initial

Première validation réalisée le 13 septembre 2026, Windows x64, Node 24.11.1. Dépendances exactes dans package-lock.json. Le serveur Vite utilise localhost ; aucune publication distante n'a été faite.

### Contrôles fonctionnels initiaux

`npm run check` a réussi sur la version finale des règles : **8/8 scénarios de simulation, build TypeScript/Vite et 2/2 scénarios d'intégration**. Les dernières corrections de présentation ont ensuite été vérifiées par l'inspection WebGPU ciblée et un nouveau build. Le bundle Three.js reste volumineux : environ 0,95 Mo minifié, 0,26 Mo gzip, avant cache HTTP. L'avertissement de taille du bundler reste visible ; il ne doit pas être masqué pour donner l'impression d'un chargement optimisé. Le découpage et le chargement des futurs assets seront évalués avec leur coût réseau réel.

Les huit scénarios de simulation couvrent déterminisme et sauvegarde en trajet, concurrence et conservation des matériaux, accessibilité/commandes invalides, épuisement et récupération, faim critique, nouvelle obstruction de chemin, 23 familles de corruptions de sauvegarde et soak sur cinq graines. Le soak totalise 60 000 ticks, soit dix jours cumulés ; il ne représente pas dix jours pour chacune des cinq colonies.

Deux scénarios d'intégration Chromium pilotent la carte et les commandes réelles. Ils couvrent production des ressources, construction, priorités, pause, restauration exacte d'un état en attente, annulation, chargement invalide atomique, aide et format compact. La frontière horloge/commandes est aussi exercée par une rafale d'actions de priorité. Captures dans artifacts/, traces conservées uniquement en cas d'échec.

### Défauts initialement détectés et corrigés

| Défaut | Correction et preuve |
|---|---|
| Priorité 3 choisie avant 1 alors que l'interface promettait l'inverse | Tri ascendant, 0 exclu ; scénario d'une collecte prioritaire plus lointaine qu'un chantier. |
| Envoi de commandes réinitialisant le temps réel du worker | Réinitialisation limitée aux changements d'horloge ; rafale d'actions dans l'intégration. |
| Retour BFCache conservant l'interface mais un worker détruit | Pas de destruction sur pagehide.persisted ; correction relue. Parcours retour/avance BFCache encore à automatiser. |
| Colon inactif bouchant indéfiniment un passage | Cession locale déterministe ; fixture de couloir et conservation de non-chevauchement. |
| Affectation simultanée de centaines d'acteurs provoquant une pointe de BFS | Maximum huit recherches par tick, ordre d'examen rotatif et test de progression de tous les travaux. |
| Rig dépassant les huit emplacements de vertex buffers du device testé | Attributs géométriques entrelacés, cinq buffers utilisés ; compilation et affichage WebGPU vérifiés. |
| Surfaces de dalles voisines se superposant | Dimensions ramenées à une cellule exacte ; inspection graphique ciblée. |

### Mesures initiales de simulation

Les [données brutes initiales](../../artifacts/simulation-benchmark-initial.json) concernent le moteur à stock global du schéma 1. Elles séparent premier tick d'affectation, travaux actifs et population inactive, avec issues métier contrôlées. Le [contrat courant de simulation](simulation.md) décrit désormais le schéma 2 ; le tableau en tête de ce document et le nouveau fichier de benchmark portent sur le transport physique. Aucun de ces résultats ne comprend rendu, GPU, interface, messages worker, sérialisation ou congestion générale d'une vraie colonie.

Les percentiles des lots de 20 ticks décrivent des **moyennes par tick de lot**, pas la queue de distribution de ticks individuels. Les différences entre runs reflètent aussi la charge de la machine ; comparer des modifications exige le même protocole et plusieurs répétitions.

### Rendu initial et limites de la preuve

Les tests d'intégration de cette première version utilisaient Chromium et SwiftShader, avec repli WebGL 2 observé. Ils validaient l'intégration et la compilation du chemin de compatibilité ; leurs FPS ne représentaient pas le GPU de l'utilisateur. Des passages séparés avaient validé le pipeline WebGPU sur AMD/RDNA-1, avec personnages et ombres sans erreur console. Le [compte rendu graphique](render-validation.md) et `render-probe.json` sont maintenant actualisés pour la tranche matérielle ; leur dernier contenu ne constitue pas une archive du premier passage.

Restent à valider avant annonce de performance : centaines d'acteurs animés et équipés, import glTF réel, transitions de clips, perte/restauration de device, vrai matériel de référence, coût des snapshots et profils p95/p99 de frames. Le compteur intégré ne mesure qu'une cadence d'images et un coût CPU récent de simulation.

### Portée des preuves historiques

Ces preuves concernent le prototype et les scénarios décrits. Elles ne certifient ni l'équivalence complète à RimWorld, ni la validité de toutes ses formules, ni toutes les combinaisons futures de mécaniques. Les prochaines fonctionnalités doivent étendre les invariants et scénarios correspondants.
