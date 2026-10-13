# V338 — première production alimentaire naturelle

13 octobre 2026. **Première chaîne naturelle acquise par reprises : Chrome/WebGPU PASS133,506s.** Depuis l’aube réelle V336, des colons sèment, récoltent, transportent, cuisinent et consomment un repas issu du stock attesté, avec resemis et recharges exactes. Les rouges et les limites ci-dessous sont conservés. Aucun produit, moteur, bridge, rendu, schéma ou public n’est modifié ; les corrections concernent le pilote. Ce lot de qualification ne demande aucun déploiement dédié.

## Départ et décisions du joueur

Départ réel au **tick6145** : carte250×250, monde42, tuile tempérée0, graine locale3398550437, personnes originales **Iris18530, Gaël18532, Léonie18534**. L’abri payé, les couchages, le toit, le climat, les besoins, les propriétaires et les agendas sont ceux de la [première nuit V336](human-sleeping-spots-v336.md). Les **44 rations initiales restantes** sont distinguées du riz et des repas produits. Aucun besoin, végétal mûr, aliment, résultat de combat ou tick n’est forcé. Checkpoint privé : `tmp/early-access-v336/native-biomes-first/first-night-v336-first-nat-59dc2-sleepers-and-exact-recovery/dawn-temperate-forest.json`.

Par UI ordinaire, le joueur prépare le champ de riz **18770**,80cellules de(110,116) à(119,123), et construit la cuisinière **18884** en acier à(126,116), orientation0 : **80acier consommés,450→370**. Facture **18886**, repas simple jusqu’à six portions, riz seul, rayon30, destination stock. Les fers **18860** coûtent10bois à(118,108). Gaël équipe le fusil original18558 ; les trois colons reçoivent Loisir18/19 en conservant leur sommeil initial.

Le setup est exporté et rechargé exactement au **7124** ; sa copie finale porte le SHA256 `ec470b679bede1a872c350a32e3f25b36b9256c59152997f0b70778de95e8db4`. Les reprises réemploient les exports réels et un carnet privé lié par empreinte, hors du World et du format de sauvegarde. Ce carnet ne remplace aucune possession et ne crédite pas une observation manquante.

## Chaîne alimentaire acquise

Au **31878**, huit pieds sont réellement récoltables, maximum de croissance rapporté **0,6858809985**. La récolte est dirigée par l’UI après dépassement réel de65%, sans maturité100% préparée. La [règle des plantes](../../src/sim/plants.ts) intègre lumière, repos nocturne, fertilité, température et toit ; trois jours nominaux ne constituent pas une échéance de trois jours civils. Au final39073, le carnet conserve **24 récoltes,39 cargos et23 resemis**. Le resemis sur une cellule récoltée amorce le renouvellement ; aucune deuxième récolte de ces nouveaux pieds n’est acquise.

Quatre produits sont attestés avec la même station18884, facture18886 et recette : **19223 au33709** par Léonie, **19301 au37443** par Iris, **19355 au38376** et **19385 au38802** par Léonie. Chacun produit une portion après transformation de **dix riz**. Le premier repas est exporté et rechargé exactement au **33710**.

Le premier carnet conservait trois allocations4+3+3 désignant toutes la pile19158 de dix riz ; leur somme ne devait pas être interprétée comme trois piles de dix. Le pilote déduplique cet alias ; au **33707**, une allocation de dix riz placés est observée avant leur consommation. Aucun doublon produit ni défaut du bridge n’est établi.

Le stock qualifié **19301** rassemble des produits de la même facture. Iris prélève la portion portée **19398** depuis ce stock et commence à manger au **39023**. L’export d’ingestion est rechargé exactement au **39024**. Dernière phase active observée au **39071**, progression49 ; au **39072**, la portion disparaît et le besoin alimentaire atteint100 avec l’événement exact : « Iris a mangé une portion (1 × Repas simple) sans table. » Au39073, le déclin ordinaire suivant donne99,97333333333333.

La preuve porte sur une portion issue de ce **stock de production qualifié**, avec source, portion portée, phases et événement liés. La fusion des piles ne conserve pas une généalogie unitaire permettant de rattacher19398 à l’un des quatre produits précis. Les stocks propres aux visiteurs restent distincts. Léonie porte19399 depuis la même source mais mange encore au39073, progression41 : **son ingestion n’est pas créditée**.

Les événements antérieurs signalent des repas assistés de Gaël par Iris aux33938/36844 et un repas autonome d’Iris au36355. Sans filiation observée entre source, portion et produit attesté, ils ne qualifient pas cette chaîne. Les phases courtes pouvaient échapper aux lectures espacées du pilote ; la reprise finale observe les phases utiles. Aucun défaut produit ou bridge n’est déduit de ces témoins manquants.

## Incidents, soins et décès réels

La gazelle18560 devient la menace naturelle au **20400**, avant la récolte. Recharges exactes aux **20423/20990**. Elle est à terre au20983 avec contusions/fissures ; la commande de fusil acceptée20984 intervient après sa mise à terre. Ce combat ne qualifie aucun tir victorieux : XP brute de mêlée Gaël **0→1120000**, tir0 avant/après. Au20990, les trois originaux sont vivants et démobilisés, mais Gaël garde dix blessures non soignées et une perte de sang1355418.

**Léonie** traite quatre plaies de Gaël avec médicaments au21639 puis six au21756 ; médicaments **30→28**. Au32404, ses blessures sont vides et sa perte de sang nulle. Le visiteur **19071, Villageois 3.1**, à terre20827 avec treize blessures encore présentes20990, meurt ensuite par perte de sang au **24225**, confirmé par son dossier clinique et l’événement de décès. La récupération des trois colons ne représente pas celle de toutes les personnes exposées.

Le raid naturel **r1/assaillant19176** arrive au **32400** et reste actif32674. Après cadrage UI du pilote, l’assaillant reçoit deux blessures par fusil nées au32795, puis des blessures de mêlée. XP brute de tir Gaël **0→1332800**, mêlée **1120000→2100000**. Au **32920**, le registre termine le raid avec la raison **defended**, à terre1, tué0, échappé0 ; la recharge32924 est exacte. Gaël présente alors six nouvelles plaies non soignées. L’assaillant meurt ultérieurement par perte de sang au **35664**, confirmé par son dossier et l’événement. Le bilan initial du raid ne certifie pas sa survie ultérieure.

Au final **39073**, les trois colons originaux vivent. Gaël se repose, humeur31, avec quatre blessures résiduelles toutes soignées (`tended>0`) et perte de sang0. **Visiteur19071 et assaillant19176 sont morts**. La rencontre, la défense et les soins sont observés ; aucune récupération générale, survie de tous les exposés ou résolution exhaustive des incidents n’est annoncée. Les agendas [petits incidents](../../src/sim/cassandra-small.ts) et [raids](../../src/sim/cassandra-raids.ts) restent naturels et actifs, sans tirages remplacés.

## Conservation et contrôles ROOT

ROOT seul contrôle sur entrées gelées. Les douze checkpoints suivants sont exportés et rechargés exactement ; les noms de fichiers ne remplacent pas leurs ticks confirmés.

| Étape | Ticks confirmés |
| --- | --- |
| Setup | 7124 |
| Animal / récupération initiale | 20423 /20990 |
| Riz récoltable /cargo /raid initial | 31902 /32149 /32404 |
| Menace après reprises | 32674 /32706 |
| Fin du raid /premier repas | 32924 /33710 |
| Ingestion en cours /première chaîne | 39024 /39073 |

Les exports d’échec32674,32706 et38476 sont repris tels quels aux passages suivants, sans rejouer la préparation. Leur ancien champ de carnet `reloaded:false` décrit leur passage d’origine, tandis que les chargements suivants sont vérifiés séparément. L’état final39073 et son carnet `first-chain.json.evidence.json` portent le SHA256 **e6eea52468ce91196a2a3b816b1df488e09acf47a498bfddb6891bb810a21925**.

| Contrôle | Résultat et portée |
| --- | --- |
| Typage du pilote | Rouge11,945s sur tuple d’IDs ; correction pilote en number[], PASS11,847s puis13,453s ; typage final après dernier pilote **PASS13,027s**, aucun changement ensuite |
| Setup Chrome/WebGPU | **PASS79,789s**,6145 chargé exact,7124 rechargé exact, erreurs[] |
| Première campagne | **ROUGE1379,993s**, corps1084,583s/budget18min, export32674, sept récoltes/cinq cargos/six resemis ; aucun repas produit encore attesté |
| Première reprise | **ROUGE38,703s**,32674 chargé/rechargé exact, export32706 ; inspection ASIDE masquant la projection attendue CANVAS, arrêt avant le clic |
| Reprise avec cadrage UI | **ROUGE1087,278s**, corps1082,801s/budget,32706→38476 ; raid terminé, premier repas33710 exact, trois produits attestés, aucune ingestion qualifiée |
| Reprise depuis le stock | **PASS133,506s**,38476→39073, ingestion liée d’Iris et deux recharges exactes, quatre produits au total, erreurs[] |

La première clôture Playwright est interrompue volontairement par ROOT après environ cinq minutes de compression d’une trace7,631Go, avec worker21948/Chrome18244 vérifiés possédés ; le rapporteur signale **worker exited**. Cette limite de trace est conservée, sans transformer le rouge en PASS. TraceOFF par défaut évite sa répétition. Le cadrage, la déduplication du carnet et l’attribution des portions corrigent le pilote seulement ; les règles produit restent intactes.

Les journaux sont sous `tmp/validation-runs/`, dont `v338-native-reprise-2026-10-13T02-01-46.256Z-2940/output.log`. Les artefacts sont sous `tmp/early-access-v338/native-setup/`, `native-campaign/`, `native-reprise/`, `native-cadrage/` et `native-stock/`, dans le sous-dossier `early-colony-food-v338-V33-dc881-ooking-eating-and-reseeding/`. Rapport final : `native-stock/.../food-campaign-summary.json` ; carnet final : `first-chain.json.evidence.json`. ROOT inspecte les captures setup, menace32674, campagne finale, premier repas, ingestion, première chaîne et carte finale. **Gel2858exact**.

## Limites et suite

La première chaîne naturelle et sa conservation sont acquises par reprises ; les menaces et leurs conséquences sont documentées séparément. Les rations initiales soutiennent encore le camp : cette preuve ne certifie ni autonomie alimentaire, ni réserve suffisante pour trois personnes jusqu’à la prochaine récolte, ni deux cycles complets, ni campagne multi-saison. Aucun repas assisté n’est attribué à un produit sans filiation observée ; Léonie n’a pas terminé sa portion au checkpoint final.

Les qualifications [V336](human-sleeping-spots-v336.md) et [V337](colonist-availability-v337.md) restent distinctes. Ce lot de qualification sans changement produit n’ajoute aucun nouveau build ni passage du corpus public ; aucune publication V338 n’est prévue. V338 n’atteste ni early access entière, suite complète, compatibilité matérielle exhaustive, gainFPS ou240FPS. Contrôle documentaire PASS1,936s, sources/tests/publics/entrées2858exacts. La suite [early access](early-access-readiness.md) commence par l’avertissement préventif d’humeur déjà simulée, puis doit observer un second renouvellement, les réserves, saisons, incidents et reprises réparties. Le lot de vérification est conservé dans Git ; les publications suivantes restent regroupées.
