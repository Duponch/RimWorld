# V430 — préparation de la végétation hors du thread de rendu

Lot publié : produit `70282ec6921db1afba668918b9069bd31bc2de44`, déploiement Cloudflare `86069a64`. Schéma 263 inchangé. Gains×6 mesurés sur trois références, ×1 mixte et stabilité200FPS toujours ouverte.

Le 19 octobre 2026, l’utilisateur autorise cette refonte en autonomie, avec sauvegardes préservées et comparaison des trois parties, notamment en ×6. Le résultat visé est la stabilité, pas seulement une moyenne proche de200FPS. Aucun changement de gameplay, de détail graphique, de vitesse demandée ou de schéma263.

## Responsabilité extraite

Le diagnostic [V429](performance-contexts-v429.md) avait observé environ1,4million de prévisions naturelles pour1637changements visuels dans la phase thermique du départ neuf. Déplacer cet agenda tel quel aurait reporté son coût sur la simulation. V430 le remplace, dans le Worker fixe déjà existant, par une passe d’apparence exacte au tick publié : croissance partagée, taille quantifiée littérale, maturité, feuilles et possibilité de récolte. Il n’y a plus de prévision future sur cette voie. La passe reste linéaire dans le nombre de ressources ; son coût doit être mesuré séparément du gain MAIN.

`WorkerNaturalAppearance` conserve des captures primitives par identité, jamais le World ni des Resource mutables. Il publie seulement les formes ou identités visuelles modifiées, y compris blight et support hydroponique. Les métadonnées sans effet visuel restent silencieuses. Un hook synchrone explicite reçoit le World visible et le paquet final exact avant l’envoi ; l’ordre des commandes, réponses, pistes de mouvement et sauvegardes reste celui du runtime commun.

L’enveloppe résidente passe en version2, distincte du SnapshotMessage public. La préparation est attachée aux mêmes epoch/révision/tick ; les checkpoints sont complets, les deltas adjacents et les sorties sans carte portent `natural:null`. L’adaptateur MAIN prépare ses données dans la transaction existante et ne les publie qu’après son admission complète. Le lecteur public et la validation SAVE restent inchangés.

La vue numérique utilise des pages de256identités, partagées tant qu’elles ne changent pas. Seules les pages touchées sont copiées. Elle ne retient ni chaîne d’anciens Worlds ni historique non borné. Un World joué garde ses propres valeurs même si des publications plus récentes sont déjà admises. La comparaison des pages couvre les états intermédiaires sautés ; un changement de domaine ou d’ordre explicite entraîne une lecture numérique complète, sans agenda ni calcul de croissance MAIN.

Le consommateur graphique utilise l’index de ressources existant pour retrouver les rares identités modifiées et transmet les nombres aux mêmes couches et lots GPU. Les ressources stables dont l’apparence évolue avec le tick sont prises en compte. Checkpoint sur la même carte, suppressions, retour d’identités, changement culture/naturel et passages vers le lecteur public réinitialisent ou retirent les bons éléments. Les ordinaux précédents utiles à l’ordre de libération des slots sont transitoires ; aucun second index complet n’est ajouté.

## Contrôles ciblés et reprises

Sources réparties entre trois missions bornées, intégration centrale ; revues croisées du producteur, de l’admission et du consommateur sans blocage restant. ROOT seul exécute les contrôles lourds, successivement. Les copies privées et reçus sont sous `tmp/performance-matrix-v430`.

La première passe obtient23cas sur24 en13,457s : le seul rouge est une fixture qui ajoutait une zone de déneigement sans état de neige adopté. Le Decoder public la refuse correctement. Réparation de fixture seule : intention de zone de foyer valide au même tick, égalité complète avec le Decoder public conservée, aucune garde détendue. La passe suivante groupe le consommateur, l’index et cette reprise :27cas acquis en18,382s. Au total,43cas distincts dans cinq fichiers sont acquis par ces reprises ; aucune suite exhaustive n’est revendiquée.

Les cas couvrent notamment les valeurs littérales à plusieurs ticks et climats, éclipse/substrat/toit/lumière, mêmes ticks, support et blight, retraits/naissances/cultures, retries après refus tardif,70publications sautées, copies non admises, ordre des slots, retour d’une campagne sans carte et bascule public/préparé. Les fixtures numériques ne prétendent pas être des sauvegardes jouées. Compilation et typage acquis en17,269s (`v430-build`).

## Comparaison native

Les trois entrées, leurs empreintes, matériel et qualité reprennent la matrice V429 : Aulnes V394 au10733, Éclaircies V419 au1730 et vraie création UI à trois colons au35, toutes250². Chrome155, WebGPU matériel RX5700XT, Ryzen5 3600,2560×1440/DPR1, réglage équilibré et mêmes détails. Une importation par référence puis continuation réelle, caméra inclinée large, mouvements rapides de clic droit, poses restaurées par les gestes UI avant chaque fenêtre. Aucun setter de caméra ou de World, aucun profilage dans les fenêtres.

Chaque partie a quatre fenêtres : ×1fixe, ×1rotation, ×6fixe, ×6rotation. Le départ neuf doit commencer sa rotation×6 au plus tard au300 et continuer jusqu’au moins800 ; une fenêtre courte sur le candidat rapide ne peut donc esquiver la phase thermique. L’amplitude et la trajectoire sont répétées, avec événements et durée réellement observés conservés. Les historiques de simulation évoluent selon le débit : mêmes entrées et poses ne signifient pas états finaux identiques.

Le premier lancement de référence est arrêté après diagnostic : l’option Node de récupération mémoire exigée par le pilote existant manquait. Aucun FPS de ce lancement n’est retenu. La reprise `v430-baseline-native-gc` passe255,701s avec trois exports entiers stricts, contrôle de leur égalité dans le navigateur et1741sources exactes. Référence sous `baseline02`. Le candidat compile puis fige1746sources dans `candidate-source-freeze.json`.

Les métriques MAIN s’emboîtent et ne s’additionnent pas : CPU image inclut l’application due, réception et adoption sont mesurées séparément. Le pas Worker mesure stepWorld ; l’avance comprend simulation, observateurs et publications. La préparation naturelle est chronométrée distinctement dans le hook local, son coût est retiré du temps de postMessage rapporté. Les fenêtres courtes, une seule répétition, Chrome headless matériel et l’activité Firefox/YouTube non confirmée en pause limitent la portée. Aucun coût GPU nul ni200FPS stables n’est déduit d’un compteur CPU.

Le candidat `v430-candidate-native` passe en257,715s. Les douze fenêtres sont acquises, les sources servies sont exactes avant/après et l’écart maximal des poses de caméra est9,14×10⁻⁶, sous la tolérance10⁻⁴. Les rapports détaillés sont `tmp/performance-matrix-v430/comparison-candidate01.md` et son JSON ; ils conservent compteurs, durées, maximums, échantillons et chemins sources.

Les paires suivantes comparent V429 à V430 sur cette nouvelle mesure appariée, sans réutiliser les FPS d’une autre campagne. `Application` désigne le coût moyen d’application visuelle lorsqu’elle a lieu ; `RAF` donne le99e percentile puis le maximum des intervalles entre images, en millisecondes.

| Partie / fenêtre | FPS moyens avant → après | Application ms | RAF p99 / maximum ms avant → après |
|---|---:|---:|---:|
| Aulnes ×1 fixe | 202,34 → 206,64 | 8,54 → 8,27 | 24,8 / 41,6 → 25,0 / 54,1 |
| Aulnes ×1 rotation | 185,11 → 183,61 | 8,42 → 5,86 | 24,9 / 29,2 → 25,0 / 37,5 |
| Aulnes ×6 fixe | 189,65 → 200,29 | 13,44 → 7,20 | 25,0 / 33,3 → 20,9 / 29,2 |
| Aulnes ×6 rotation | 152,60 → 165,76 | 12,42 → 6,41 | 29,2 / 37,5 → 25,1 / 37,5 |
| Éclaircies ×1 fixe | 209,21 → 196,79 | 10,45 → 9,98 | 16,7 / 25,0 → 16,7 / 25,0 |
| Éclaircies ×1 rotation | 169,41 → 172,41 | 12,71 → 8,15 | 20,8 / 29,2 → 16,7 / 25,0 |
| Éclaircies ×6 fixe | 121,55 → 174,39 | 26,13 → 12,79 | 50,0 / 162,4 → 20,9 / 162,4 |
| Éclaircies ×6 rotation | 100,79 → 137,39 | 25,15 → 12,28 | 50,0 / 58,4 → 25,1 / 33,4 |
| Départ neuf ×1 fixe | 228,18 → 226,54 | 5,90 → 5,35 | 8,4 / 12,5 → 8,4 / 16,6 |
| Départ neuf ×1 rotation | 191,72 → 196,86 | 5,65 → 4,74 | 12,5 / 20,9 → 12,5 / 16,7 |
| Départ neuf ×6 fixe | 126,28 → 174,19 | 44,90 → 10,89 | 108,3 / 166,7 → 29,1 / 70,8 |
| Départ neuf ×6 rotation | 24,67 → 112,33 | 104,84 → 21,64 | 183,3 / 225,0 → 45,8 / 112,4 |

Le gros blocage de préparation du départ neuf diminue fortement : CPU image14,24→5,46ms en rotation×6, application maximale169,5→53,5ms. Les intervalles RAF supérieurs à50ms passent de117 sur18,89s à15 sur15,45s (environ6,2→1,0par seconde). La référence couvre les ticks292–968 avec300gestes, le candidat264–803 avec780gestes ; la trajectoire répétée permet au candidat de traverser lui aussi la phase300–800. Sur cet intervalle commun, l’application moyenne baisse de102,91 à21,93ms,72→79appels : l’économie ne dépend donc pas seulement de la queue différente des fenêtres. Ce sous-ensemble ne reconstruit pas des FPS.

La préparation n’est pas gratuite : son coût moyen Worker est6,06–6,58ms sur Aulnes,13,26–15,01ms sur Éclaircies et11,72–12,72ms sur le départ neuf, selon la fenêtre. Le débit réel de simulation demandé×6 reste mesuré séparément :

| Partie | Vitesse réelle fixe avant → après | Vitesse réelle rotation avant → après |
|---|---:|---:|
| Aulnes | 5,22× → 5,23× | 4,91× → 5,07× |
| Éclaircies | 5,94× → 5,55× | 5,10× → 5,16× |
| Départ neuf | 5,77× → 5,94× | 5,95× → 5,79× |

Il s’agit donc surtout d’un gain de fluidité, pas d’un gain général de débit de simulation. Les régressions mesurées sont conservées : Aulnes×1rotation légèrement moins rapide, Éclaircies×1fixe moins rapide, une pointe54,1ms sur Aulnes×1fixe ; Éclaircies×6fixe garde une pointe162,4ms. L’objectif200FPS stables n’est atteint dans aucune de ces preuves. Les résultats sont ceux de ce lot combiné ; aucun pourcentage n’est attribué isolément à un helper.

## Sauvegardes et suite

Les six sorties entières sont validées strictement puis comparées intégralement dans le navigateur après recharge. Leurs empreintes de fichiers sont recalculées dans l’analyse finale. Les points de reprise du candidat sont Aulnes11107, Éclaircies2133 et départ neuf825 ; les historiques originaux ne sont pas remplacés.

| Sortie | Tick | SHA-256 |
|---|---:|---|
| Référence Aulnes | 11118 | `f7840c2d466336f6a7292adccf4c5edeac373173dc75b4747d2e1cf151151c83` |
| Référence Éclaircies | 2162 | `2fbeac8a09529bc35380405f206d88eb724ac36058559e9cc15e6c03f57c8dab` |
| Référence départ | 1014 | `1d1a177aaf65feef02dc6493e0e2dc69db1079651885e689565976999b125ab9` |
| Candidat Aulnes | 11107 | `bd23f859b45a868ed7e8ed78e15f5a779e4016ba7bb0924c1e4c0ba111d46c49` |
| Candidat Éclaircies | 2133 | `6dbbb2a08ca86e5ea242fa8dc542aff029b19d97a67f271d1452380fe3a663ee` |
| Candidat départ | 825 | `b884c0bfe04d1102fe8ead71b715534f8333b8253acdd2b088f2e95ffc351034` |

Le lot supprime le calcul prévisionnel naturel MAIN de la voie résidente et conserve les couches GPU. Il ne termine pas la refonte générale. Les coûts restants à isoler sont l’application encore dense du départ neuf (moyenne21,64ms), les parcours communs d’index/structures et le transport, puis la préparation Worker désormais mesurée et le rendu caméra. Une migration Rust/WASM ou un Worker de rendu complet reste une option à comparer à ces coûts ; aucun gain de migration n’est présumé.

`npm run test:presentation` est acquis en158,757s (`v430-presentation`) :45s de minage puis45s d’abattage, pauses/reprises et changements de vitesse du pilote commun. Zéro saut, dépassement de déplacement continu ou occupation solide sur les deux actions ;10708/10752images, maximums20,9/29,2ms. Ce parcours confirme ses contrats temporels, pas la fluidité des trois colonies mesurées séparément.

Le premier contrôle documentaire relève un espace manquant entre « schéma » et263 dans le nouvel index d’architecture ; en-tête corrigé sans changement produit, puis contrôle repris acquis en1,806s.

## Publication

Le produit `70282ec6921db1afba668918b9069bd31bc2de44` est commité et poussé sur `origin/main`. Son build Pages propre passe en15,043s et son inspection en1,680s (`tmp/elsewhere-pages/v430-package-X95yvS/report.json`). Les70fichiers de sauvegardes/catalogue correspondent exactement au public local ; les67fiches,68anciens payloads et la démonstration Éclaircies restent conservés. Les deux entrées Worker sont compilées ; aucun instrument de mesure privé ni laboratoire ne rejoint le paquet.

Cloudflare publie [86069a64](https://86069a64.elsewhere-cq7.pages.dev) en13,645s ; [l’adresse publique](https://elsewhere-cq7.pages.dev) est actualisée. Les138réponses HTTPS contrôlées sur les deux origines sont exactes en10,188s, avec les MIME attendus et aucune erreur (`tmp/elsewhere-pages/v430-http-osTMK5/report.json`). Ce contrôle prouve la disponibilité des fichiers, sans constituer un nouveau parcours de jeu ou une nouvelle mesure FPS en production.

L’avertissement Wrangler de dépôt non propre concerne uniquement le dossier utilisateur non suivi `references_UI/`, laissé intact et absent du paquet. Les sources produit qualifiées sont commitées ; le reçu documentaire est ajouté séparément. Aucun schéma, sauvegarde publique ou réglage de qualité n’est modifié par cette publication.
