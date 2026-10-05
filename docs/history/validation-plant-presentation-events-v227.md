# Validation V227 — agenda végétal et partition des cultures

Lot livré dans le périmètre contrôlé le 6 octobre 2026 sur V226 `c45f06a7`, produit métier V225 et schéma 198 inchangés. [Contrat](../development/plant-presentation-events-v227.md), [recherche](../research/plant-presentation-events-v227.md). La comparaison matérielle finale montre un gain local de 5,11 %. La cible proche de 240 FPS et les pointes demeurent ouvertes.

Référence publique V224 inchangée : Les Aulnes · sièges corrigés250×250, tick6934. Baseline V225 archivée sous tmp/performance-orientation-v226/baseline, servie5207 ; candidat courant5208. Root seul lance les contrôles lourds séquentiels, sources produit gelées, validate:logged et caches sous tmp/host-cache. Sessions utilisateur, references_UI et captures historiques préservées ; les outputs V227 ont des chemins privés distincts.

La revue statique indépendante ne trouve pas de bloqueur dans les brackets numériques, les invalidations, la heap bornée, les références ou l'ordre. Deux erreurs pratiques de préparation sont corrigées avant les contrôles : GameProfile est un objet, mais seule sa présence influence climateTick ; cette présence remplace une garde string et une comparaison d'identité d'objet cloné. ClimateProfile est typé directement. Aucun résultat du candidat antérieur à ces corrections n'est crédité.

## Attribution indépendante du décodeur

`aulnes-v227-decoder-sections-baseline-2026-10-05T23-01-50.550Z-12732` passe48,255s. Transformation SSR privée sur l'archive V225 seulement : subdivisions minutées, aucun garde modifié,240ticks ordinaires et24de préparation,216échantillons. Worlds/PRNG/paquets exacts et sources stables. Adoption6,490ms moyenne, p959,804ms et max17,744ms ; ressources/collisions étrangères1,962ms et namespace2,710ms. Reconstruction0,401ms, headers0,409ms ; les autres postes gardent leurs coûts. Timers ajoutés, chemin CPU isolé : aucun FPS, gain candidat ou cause de243ms n'est acquis. Cette attribution motive l'investigation suivante ; le prototype namespace reste privé non adopté.

## Oracles et typage

Premier groupe `aulnes-v227-nature-crop-oracles-2026-10-05T23-06-59.804Z-22096` rouge69,306s :27cas passent, deux échouent. La fixture retire l'ancre du healroot domestique alors que son garde exige la paire ; le cas d'ancre absente est conservé par requête mutable pour ce kind, sans assouplir le transport. L'oracle Aulnes dépasse30s à cause des assertions quadratiques sur toutes les anciennes frames après chaque lecture ; il vérifie désormais toutes ces frames une fois après les adoptions, avec comparaisons courantes à chaque lecture. Le motif natural-timed-v224 inexistant ne certifie rien.

Reprise `aulnes-v227-nature-crop-oracles-retry-2026-10-05T23-09-35.838Z-24636` verte37,986s :3fichiers/25cas. Ajout d'un haut tick effectivement adopté au-delà de2^40, distinct des clones/mutables ; les requêtes historiques restent exactes. Le groupe initial conserve ses cas V225/cultures passés. Valeurs complètes, présence de vue, Map ordonnée, références actuelles, anciennes vues, seuils voisins doubles, feuilles5999/6000, civil/toit/sol sans patch de resource, suffixes64/éviction, checkpoints, stale/refus et types de culture sont couverts. Les fixtures de requête ne prétendent pas être des campagnes ou des sauvegardes historiques.

Typage initial `aulnes-v227-types-initial-2026-10-05T23-11-04.929Z-28188` passe4,618s. Comparaisons isolées puis matérielles restent à terminer ; les62payloads et métadonnées ne sont pas régénérés.

## Essais intermédiaires conservés

`aulnes-v227-natural-events-abba-2026-10-05T23-11-21.332Z-19516` passe243,407s avec sources/Worlds/PRNG/vues/ordre/références historiques exacts : deux cycles A/B/B/A sur deux charges et trois fenêtres réellement jouées. Le premier agenda recherche jusqu'au prochain cycle naturel ; les lectures Aulnes régressent de36à54% selon la fenêtre et le cycle. Les pics récurrents64à72ms aux ticks6946/6958/6959 et le coût froid79à134ms motivent sa révision. Aucune comparaison FPS n'est lancée sur ce candidat régressant.

`aulnes-v227-natural-startup-h32-2026-10-05T23-22-26.609Z-18316` passe33,417s, un cycle startup A/B/B/A de32ticks Aulnes. Le bracket court améliore la moyenne naturelle6,995→4,954ms, mais p9510,049→32,918ms et maximum10,376→36,822ms se dégradent ; coût froid20,637→55,211ms en moyenne. Le candidat n'est pas adopté sur cette moyenne. En outre, l'index32 est une lecture sautée du protocole : ce banc seul n'observe pas la première vague complète de renouvellement. Le suivant est étendu à64ticks, les certifications réparties et les prédictions primitives recapturées après les lectures structurelles complètes. Les rapports, manifests et sources du premier candidat restent privés, sans écrasement.

Le méta-test de hash brut de quatre fichiers entiers est retiré pour éviter une dépendance CRLF/LF et le gel de refactorings métier légitimes. Les sources exactes et modules indépendants demeurent dans les manifests du banc. Deux cas de comportement supplémentaires couvrent renouvellements jusqu'à256révisions, frontières31/32/33 et62/63/64/65, lectures répétées, recréation d'ID et invalidations du mémo ; aucune vérification des détails privés ne remplace l'oracle V225.

## Candidat avec recapture et échéances réparties

`aulnes-v227-natural-startup-memo64-2026-10-05T23-27-27.192Z-1752` passe56,991s, un cycle A/B/B/A,64ticks réellement joués après6934, huit de préparation puis56adoptions/47lectures mesurées par passe. Worlds/PRNG/paquets/vues/Map ordonnée/références/anciennes frames exacts, sources stables. Moyenne naturelle6,813→3,159ms (−53,6%), adoption+lecture par publication−21,3%. P959,849→17,897ms et max10,987→26,568ms restent défavorables ; construction froide14,739→74,853ms moyenne. L'amélioration moyenne ne vaut pas disparition des pointes ni admission matérielle.

`aulnes-v227-natural-memo-oracles-2026-10-05T23-28-52.798Z-15172` passe55,768s :5fichiers/34cas, dont21nouveaux naturels, deux journaux de cultures, trois temporisésV224, six naturelsV225 et deux partitionsV224. La revue indépendante finale ne trouve pas de bloqueur statique ; elle précise la mémoire de pointe O(Nancien+Ncourant+Rtoit), les captures primitives recertifiées et les cohortes potentiellement importantes sur frontière ou grand saut. Aucun contrôle ou timing d'un sous-agent n'est crédité.

## Deux comparaisons matérielles avant sélection legacy

Chromium153 headless matériel AMD/rdna-1, Ryzen5 3600,1920×1080,DPR1, même caméra iso-near et checkpoint6934. Tous les réglages de qualité canoniques actifs, aucune météo imposée ni sonde de méthode supplémentaire, timestamps GPU désactivés. Deux cycles A1/B1/B2/A2 séquentiels indépendants : trois secondes de préparation puis huit de mesure, sources/entrées/harness stables. `aulnes-v227-native-abba-2026-10-05T23-30-11.954Z-2372` passe89,902s ; `aulnes-v227-native-abba-cycle2-2026-10-05T23-32-08.997Z-27168` passe89,912s.

| Cycle/passe | RAF images/s | Débit réel | CPU frame moyen | CPU frame p95 |
| --- | ---: | ---: | ---: | ---: |
| 1 A1 V225 |85,896|5,946×|6,564ms|20,7ms|
| 1 B1 V227 |99,227|5,907×|5,308ms|17,7ms|
| 1 B2 V227 |95,777|5,814×|5,461ms|18,9ms|
| 1 A2 V225 |92,233|5,923×|5,943ms|19,2ms|
| 2 A1 V225 |91,011|5,947×|6,120ms|19,4ms|
| 2 B1 V227 |102,257|5,898×|5,110ms|16,4ms|
| 2 B2 V227 |95,505|5,902×|5,573ms|19,7ms|
| 2 A2 V225 |90,014|5,925×|6,177ms|19,3ms|

Moyennes par cycle :89,064→97,502RAF/s (+9,47%) et90,512→98,881 (+9,25%). Chaque passe B dépasse les deux témoins du même cycle. CPU frame6,253→5,384ms puis6,148→5,341ms. Gain local modeste répété, pas la valeur FPS du moniteur utilisateur ou une garantie statistique générale. La moyenne des p95 par passe diminue, mais B2 du second cycle conserve un p9519,7ms supérieur aux témoins19,3/19,4ms : les pointes ne sont pas résolues. Débits5,935→5,861× puis5,936→5,900× ; aucun gain de vitesse ni vrai6× certifié. Les chiffres de campagnes antérieures ne sont pas ajoutés à ce comparatif.

Le budget240FPS est4,167ms par image ; les applications synchrones et le décodage restent au-delà. La construction froide de l'agenda s'ajoute au chargement et les lectures structurelles complètes restent coûteuses. Réduire les autres parcours de scène et le namespace est la suite, sans changer contenu, qualité ou cadence pour améliorer artificiellement le compteur.

## Continuations et contrepartie legacy

`aulnes-v227-natural-final64-2026-10-05T23-34-20.888Z-20272` passe293,972s : un cycle A/B/B/A par fenêtre et charge,64ticks par fenêtre dont huit de préparation ; deux charges, trois fenêtres startup/après200ticks réellement joués/64ticks avant frontière absolue200. Tous les Worlds/PRNG/vues/ordre/refs/anciennes frames sont exacts, sources stables. Ce contrôle est celui du candidat avant sélection legacy, distinct des deux cycles initiaux de32ticks et du candidat suivant.

Sur Les Aulnes, moyenne naturelle startup6,827→3,025ms (−55,7%), après200ticks8,067→5,867ms (−27,3%), frontière7,469→2,750ms (−63,2%). Adoption+lecture par publication−23,2%,+0,28%,−38,9% ; la fenêtre après200 ne prouve donc aucun gain complet. P95/max restent supérieurs dans les trois fenêtres ; maximum après20015,195→54,666ms. Le décodeur produit est inchangé ; ses variations ne reçoivent aucun crédit d'optimisation.

Sur mixed100, 10077 ressources sans espèce au tick 2000 et aucune source naturelle temporisée au départ, les moyennes naturelles deviennent défavorables :0,584→0,641ms,0,265→0,666ms et0,315→0,833ms ; l'ensemble régresse d'environ33% dans les deux dernières fenêtres. Le coût de reconstruire l'agenda pour quelques courbes legacy ne se justifie pas. L'initialisation finale le réserve aux sources temporisées avec espèce/healroot et conserve la partition V225 dans cette contrepartie. Deux cas supplémentaires legacy→oak→legacy et mature→immature sont ajoutés, sans vérifier le choix interne d'un algorithme.

`aulnes-v227-native-lanes-2026-10-05T23-42-07.950Z-21744` passe89,897s sur les sources finales, même protocole ordinaire A/B/B/A. A1/A2 donnent94,061/92,606RAF/s, B1/B2 donnent98,985/97,224. Moyenne93,334→98,105 (+5,11%), les deux B dépassant les deux A. CPU frame moyen5,954→5,339ms ; p95 A19,2/19,3ms et B18,2/18,3ms. Débit A5,967/5,926×, B5,936/5,961× : pas de gain de vitesse déclaré. Les deux cycles antérieurs +9,47/+9,25% restent identifiés comme sources intermédiaires ; le chiffre final ne leur emprunte pas silencieusement une moyenne. Gain local utile mais modeste, aucune proximité240FPS ni disparition des pointes certifiée.

Les maxima CPU frame matériels restent défavorables : A1/A2 35,1/32,9 ms, B1/B2 47,3/45,3 ms. L'amélioration moyenne et du p95 n'est donc pas une amélioration de toute latence. Ce parcours ordinaire n'attribue pas causalement ces maxima et ne reproduit pas la pointe historique de 243 ms.

`aulnes-v227-natural-final-lanes-2026-10-05T23-44-16.876Z-19012` passe 173,539 s sur les sources finales : un cycle A/B/B/A par fenêtre, 64 ticks ordinaires, huit de préparation. Les Aulnes sont rejouées dans la fenêtre initiale, mixed100 dans les trois fenêtres ; les continuations Aulnes précédentes restent explicitement celles du candidat intermédiaire. Worlds, PRNG, paquets, vues, ordre, références courantes et anciennes frames sont exacts, avec empreintes avant/après identiques.

| Charge/fenêtre finale | Nature moyenne A → B | Nature p95 A → B | Nature max A → B | Adoption + nature |
| --- | ---: | ---: | ---: | ---: |
| Aulnes, démarrage | 7,918 → 3,011 ms | 11,985 → 18,707 ms | 16,758 → 27,723 ms | −30,84 % |
| mixed100, démarrage | 0,370 → 0,365 ms | — | — | −0,26 % |
| mixed100, après 200 ticks | 0,353 → 0,371 ms | 0,906 → 0,994 ms | 9,133 → 7,749 ms | +12,75 % |
| mixed100, frontière | 0,298 → 0,420 ms | 0,876 → 1,065 ms | 0,936 → 9,353 ms | +3,33 % |

La moyenne naturelle Aulnes baisse de 61,97 %, mais sa construction froide augmente de 17,278 à 74,291 ms, avec un maximum candidat de 98,621 ms. La sélection legacy retire la forte régression de reconstruction observée auparavant ; elle ne certifie aucun gain général sur petite charge. La dernière contrepartie ajoute 0,122 ms en moyenne naturelle, avec une pointe défavorable. Le décodeur inchangé varie aussi, notamment dans la fenêtre après 200 ticks ; ses variations ne sont pas attribuées au candidat. La sélection est réexaminée aux initialisations complètes, pas à chaque patch : un agenda déjà actif peut rester actif jusqu'à cette invalidation après disparition de la dernière source concernée.

## Frontières finales et reprise du contrôle

`aulnes-v227-final-boundaries-2026-10-05T23-48-38.379Z-16576` termine rouge en 71,390 s : 17 fichiers, 91 cas réussis, un échec et un ignoré. Seul l'oracle authentique Aulnes dépasse le budget individuel de 30 s (30,816 s), en plus des replays privés de 64 ticks et fenêtres ultérieures. Les 22 autres cas naturels et les 16 autres fichiers passent ; aucune erreur produit n'est constatée.

Le préfixe de cet oracle unitaire passe de 16 à 12 ticks, en conservant les comparaisons complètes courantes et les anciennes vues. Aucun timeout, garde ou règle n'est assoupli. `aulnes-v227-natural-final-retry-2026-10-05T23-51-27.784Z-27132` passe en 33,505 s : un fichier, 23 cas. L'union finale par reprises est **17 fichiers, 92 réussites et un ignoré** ; le premier rouge demeure conservé. Les contrôles couvrent naturel/cultures, journal du transport, publication, géométrie et latence de présentation, sans nouvelle campagne longue.

## Continuité matérielle, compilation et préservation

`aulnes-v227-native-save-recovery-2026-10-05T23-55-40.113Z-17348` passe en 56,208 s : chargement réel par le catalogue, Chromium matériel WebGPU, quatre vues de caméra, au moins 18 ticks ordinaires à 1× puis 120 à 6×, sauvegarde manuelle compressée et rechargement exact, enfin au moins 18 ticks supplémentaires à 6×. Un parcours natif réussit, sans erreur de page ; ces reprises ne sont pas une mesure de FPS. Les captures demeurent dans le nouveau répertoire privé V227, sans écraser V224.

`aulnes-v227-types-final-2026-10-05T23-57-10.934Z-24464` passe en 4,686 s ; `aulnes-v227-build-final-2026-10-05T23-57-15.690Z-19560` passe en 1,667 s. `aulnes-v227-public-bytes-2026-10-05T23-57-17.436Z-17924` passe en 0,271 s : métadonnées et **62 payloads comparés octet par octet** à l'archive V225 ; aucune différence Git métier dans simulation, transport, UI ou sauvegardes. Ce contrôle de préservation ne prétend pas rejouer 62 nouvelles campagnes.

L'adoption porte uniquement sur le renderer et ses partitions exactes. Le gain matériel final reste modeste, les pointes et le coût froid défavorables sont conservés, les contreparties legacy ne promettent aucun gain. Aucun changement de cadence, qualité, règle, PRNG, phase, commande ou recovery ne gonfle le compteur ; aucune campagne longue, parité Core ou performance générale n'est recertifiée. La suite vise les scans complets du décodeur et des applications de scène.

`aulnes-v227-docs-final-2026-10-05T23-59-22.483Z-16444` passe en 0,929 s ; les six en-têtes courants indiquent le schéma 198 et les sources originales contrôlées restent identiques. `git diff --check` passe. Les documents canoniques renvoient au contrat et à cette preuve ; aucun journal privé n'y est recopié.
