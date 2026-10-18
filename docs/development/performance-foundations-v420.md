# Performances après les fondations — V420

18octobre2026, schéma263 inchangé. Diagnostic CPU/GPU acquis et premier correctif CPU ciblé qualifié localement ; publication V420 encore à effectuer, production V419 `95084b6c`. Le bilan fonctionnel et la démonstration sont [livrés séparément](../gameplay/foundations-demo-v419.md). Cette phase répond au ralentissement signalé sur Les Aulnes et une nouvelle partie à trois colons ; elle ne clôt pas les performances du jeu.

## Observation acquise

Chrome155 natif headless, WebGPU AMD RDNA1, Ryzen5 3600, Windows,16Gio, surface1440×1000/DPR1. Deux scènes250²/une carte, caméra et réglages comparés : orthographique, textures/herbe/chambre/diorama, ombres60Hz/2048, animation équilibrée. Chaque fenêtre dure5s après1s de chauffe exclue. GC/JIT et charge externe ne sont pas contrôlés ; ce sont de courts échantillons, pas une endurance ni une mesure sur le poste/réglage exact du joueur.

A : copie diagnostique des Aulnes publiquesV394/tick10733,15personnes dont14colons,17 912ressources,2454structures,382piles,128tâches,19animaux. B : vraie créationV419 au35 **avant patrimoine**,3colons/0ordre,28 371ressources,162structures,1630piles,56animaux. Les sources sont immuables et les quatre états complets avant/après sont conservés ; les copies seules avancent. La nouvelle démonstration publique1730 ne sert pas de partie neuve vide et n'est pas modifiée.

| Scène | Mode | RAF observés/s | CPU image moyen | Decoder moyen/adoption | RAF p95/p99 | Tick observés |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Les Aulnes | pause | 172.6 | 2.09ms | — | 6.5/6.6ms | 0 |
| Les Aulnes | ×1 | 128.9 | 3.61ms | 26.22ms | 22.5/34.7ms | 30 |
| Départ3colons | pause | 166.7 | 2.29ms | — | 6.1/6.1ms | 0 |
| Départ3colons | ×1 | 127.7 | 4.58ms | 19.10ms | 24.0/36.0ms | 30 |

**Baseline PASS133,752s**, quatre fenêtres acquises, `errors:[]`, sources1733fichiers et deux inputs exacts. Les deux scènes maintiennent30ticks dans leur fenêtre×1de5s. Le coût synchronisé du Decoder —26,22ms sur A et19,10ms sur B en moyenne — donne une piste CPU concrète ; il ne prouve pas à lui seul l'origine historique de la régression. Les écarts A/B mélangent population, histoire, ressources, tâches et terrain, donc ne sont pas une comparaison causale isolée.

Le Worker annonce des moyennes de pas de28,56ms sur A et34,15ms sur B, échantillonnées par publication. B a des pointes p95≈121,8ms/p99≈151,7ms ; ce ne sont pas des temps WorkerTOTAL ni des distributions indépendantes par tick. La réception après Decoder et l'adoption différée dans l'image ont d'autres chemins ; ces durées ne doivent pas être additionnées mécaniquement. Les RAF sont une cadence observée, le CPU image une durée JavaScript/soumission. À cette première étape, GPU, encodage natif, transit IPC et WorkerTOTAL n'étaient pas mesurés.

## Profils MAIN acquis

CDP natif PASS119,306s, deux fenêtres ×1 de5s sur les mêmes entrées. Les profils démarrent et s'arrêtent par le protocole autour de ces fenêtres : leurs durées réelles sont6,114s et5,698s, avec marges et coût d'observation. Échantillonnage demandé1000µs ; chaque échantillon est pondéré par son `timeDelta`. Ce sont des attributions statistiques, pas des chronomètres exacts par fonction. Les inclusifs s'emboîtent : ne pas additionner les lignes.

| Profil | Poids inclusif rendu | Poids inclusif Decoder | Chemins identifiés |
| --- | ---: | ---: | --- |
| Aulnes | 2069,5ms | 992,5ms | Vérification profonde des propriétaires `noOwnedClock`, couchages, mises à jour Three/uniforms et `writeBuffer` |
| Départ3colons | 2497,0ms | 655,2ms | Substrat des plantes, validation du terrain/plantes, ressources présentées, mises à jour Three/uniforms et `writeBuffer` |

Les piles de rendu expliquent du travail CPU de soumission ; elles ne donnent pas le temps GPU. Le profil de la partie neuve confirme que « aucun ordre » laisse néanmoins des milliers de ressources et des animaux à traiter. La planète chaude réemploie déjà un propriétaire immuable ; les coûts de génération/import froid ne doivent pas lui être attribués à chaque tick. Les profils ne comparent pas les versions d'hier et d'aujourd'hui et ne prouvent pas l'origine historique de chaque ralentissement.

## Premières corrections, sans gain net démontré

Trois petits changements sont préparés : lire directement la fertilité lorsque le consommateur ne demande que ce nombre, et éviter la récursion vers les valeurs primitives dans `noOwnedClock`. Aucun état, cadence, PRNG, sauvegarde, cache ou index ajouté. Les optimisations qui auraient supprimé un refus existant sur une valeur géologique mal formée ont été écartées ; les lecteurs complets de terrain et de marais sont inchangés.

Type PASS10,523s. Ciblés :32PASS/6RED sur38cas et7fichiers en37,240s. Les six rouges ont ensuite été reproduits exactement avec les trois fichiers originaux :9PASS/6mêmesRED sur les15cas des deux fichiers concernés,22,506s. Ils concernent un oracle de projection et des préparations historiques devenues invalides ; aucun validateur ni témoin n'a été assoupli pour les rendre verts. Cette reprise ne transforme pas le contrôle initial en suite entièrement verte.

La comparaison native après ces trois changements a terminé les quatre fenêtres et les exports, puis a échoué au contrôle des erreurs : WebSocket du serveur de développement, `ERR_NO_BUFFER_SPACE`. Le run reste RED137,184s, sans filtrage de l'erreur. Ses nombres sont non uniformes : Decoder A26,22→27,00ms ; B19,10→18,46ms avec29adoptions contre30. **Aucun gain global ou causal établi.** Le relevé système effectué après le run — mémoire disponible5,17Go, commit74% — ne décrit pas la pression pendant les fenêtres et n'attribue pas l'erreur à la RAM.

## Passes GPU mesurées séparément

Natif GPU02 PASS136,701s, `errors:[]`. Quatre fenêtres de2s avec1s de chauffe, mêmes deux entrées, caméra et réglages. Paquet QA compilé privé avec bindings d'observation, sans client HMR ; aucune instrumentation dans le produit. Ce mode diffère du serveur DEV de la baseline CPU : ne pas attribuer son écart de cadence au correctif. Le premier lancement GPU01 reste RED16,986s : réseau de la sandbox refusé avant chargement de la partie ; reprise avec la permission réseau locale, mêmes fichiers et entrées.

| Scène | Mode | Frames fraîches couvertes | Somme GPU des passes, moyenne / p95 |
| --- | --- | ---: | ---: |
| Aulnes | pause | 476 | 1,805 / 3,088ms |
| Aulnes | ×1 | 255 | 2,130 / 3,650ms |
| Départ3colons | pause | 456 | 1,655 / 2,282ms |
| Départ3colons | ×1 | 214 | 1,955 / 2,852ms |

Chaque UID provient d'une paire effectivement allouée par Three0.186, chaque frame est résolue une seule fois et la couverture correspond exactement aux frames CPU enregistrées. La distribution somme les passes de chaque frame fraîche ; elle ne répète pas le scalaire de la dernière résolution. Restauration des descripteurs et du tracking après fenêtre, lectures sérialisées et bornées. Périmètre : les caméras et passes réellement utilisées ici ; aucun parcours ArrayCamera revendiqué.

Ce sont des durées de passes instrumentées : copies/uploads hors passes, attente de file, compositeur et présentation écran ne sont pas inclus. L'observateur ajoute son propre travail CPU/readback. Ces échantillons de2s ne prouvent ni coût GPU total, ni absence de régression sur d'autres résolutions/vues/matériels. Sur ces scènes, les blocages CPU d'adoption sont néanmoins nettement plus longs que les passes mesurées ; le CPU reste la première cible justifiée.

## Premier correctif CPU qualifié

Le seul propriétaire de structures déjà présent réemploie désormais le witness sparse interne pour les mises à jour non vides : prédécesseur confirmé, dimensions/schéma/graine, tableau et longueur compatibles ; chaque ordinal remplacé, son ID et son record complet restent contrôlés. Les références conservées viennent de la reconstruction canonique fermée MAIN. Un witness fourni par un appelant mutable quelconque n'acquiert aucune autorité. Copie avec liste vide, même tableau avec upsert, checkpoint, remap, adhésion/ordre modifiés et métadonnées incohérentes gardent le parcours complet. L'horloge et tous les autres domaines sont relus ; confirmation uniquement après adoption entière, abandon du candidat au refus.

Type PASS17,628s et sept nouveaux cas PASS29,635s. Comparaison au Decoder public, même tick, refus profondément imbriqués, fallback et reprise/commit contrôlés ; anciens témoins laissés intacts. Pas de nouvel index, cache par objet, domaine certifié ou état de simulation. Cette extension a été adoptée **après** le relevé GPU. Elle vise A et ses2454structures ; B162 reste sur transport complet et n'a pas de bénéfice sparse annoncé.

Mesure ciblée ROOT PASS22,079s, Node24.19.0/Ryzen5 3600/Windows. Deux exports diagnostiques confirmés des Aulnes10733→10770 fournissent leurs projections produit entières ; aucun tick, ordre, tirage ou champ sélectionné ajouté. Le véritable Encoder puis Decoder produisent une paire sparse avec **31 remplacements sur2454structures**. Baseline exacte et candidat partagent les dépendances, entrées et graphe de records ; cinq paires alternées de huit mesures par mode. Parse, projections, encodage, validation complète du Decoder et certification initiale sont hors chronomètre. Issues, graphes, paquets, sources et entrées restent exacts.

| Seul contrôle propriétaire `validate+commit` | Avant | Après |
| --- | ---: | ---: |
| Moyenne,40 mesures par mode | 7,013ms | 3,248ms |
| Médiane | 6,977ms | 2,706ms |
| p95 des40 mesures individuelles | 10,040ms | 6,431ms |

Les cinq paires ont une moyenne plus faible après correction. Les petits échantillons, l'échauffement JIT et le GC non contrôlé limitent la généralisation. Le gain mesuré de3,765ms concerne **ce contrôle et cette paire de publications**, pas le Decoder entier, MAIN natif, Worker, GPU ou les FPS. L'écart de37ticks ne décrit pas la fréquence des changements dans chaque instantané ordinaire. Les scénarios de tableau vide, remap ou checkpoint ne bénéficient pas tous de ce chemin. Aucune somme arithmétique avec les anciens bancs V399/V400.

Le natif GPU et ses recharges ont été acquis avant cette extension ; les sept cas et la paire réelle Encoder/Decoder couvrent les frontières modifiées ensuite. Présentation V418, archives publiques et démonstration V419 sont réutilisées : aucune horloge, interpolation, phase de travail, format ou donnée publique modifiée. Les anciens six rouges et les essais d'infrastructure restent conservés. Pas de nouvelle campagne, corpus inchangé ou banc FPS automatique.

## Ce qui reste ouvert

Mesurer l'effet du correctif dans le navigateur, puis attribuer les coûts résiduels : validation/adoption MAIN de la partie neuve, préparation des ressources/HUD, simulation/Worker, encodage/transit et CPU de soumission du rendu. Le relevé GPU actuel ne couvre pas les autres vues, résolutions ou le poste exact du joueur. Les temps de création/import et l'action Reform restent des sujets de confort distincts. Aucun contenu secondaire repris pour cette consolidation.

Preuves locales : `tmp/world-foundations/demonstration-v419/performance-baseline01.json`, `main-profile-acquired01.json`, `main-profile-analysis01.json`, `legacy-baseline-comparison01.json`, `gpu-acquired02.json`, `sparse-adoption01.json`, `sparse-owner-bench02-report.json`, `sparse-owner-bench02-summary.json` et leurs gels de sources/entrées. Sorties privées `p419n01`, `p419p01`, `p420n01`, `g420n02`. Aucun gain FPS acquis à ce stade.

Contrôles de livraison : typage final17,628s, Pages5,563s et documentation14,090s. Les39cas passés distincts sont acquis par reprises sur8fichiers, dont sept nouveaux ; six rouges de témoins historiques restent conservés et reproduits sur l'ancienne source. Ce bilan ne déclare pas une suite complète verte. Archives, catalogue67fiches/70chemins et patrimoine de la démonstration inchangés.
