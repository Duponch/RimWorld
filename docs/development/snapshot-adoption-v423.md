# Coût d’adoption des snapshots — V423

18 octobre 2026. Schéma263 inchangé. Ce lot réduit des coûts communs d’adoption identifiés en [V422](foundations-performance-regression-v422.md), sans nouvelle mécanique. Le coût CPU du Decoder baisse sur les deux entrées Chrome ; Les Aulnes deviennent plus fluides dans ce relevé, mais le départ trois colons reste défavorable en cadence d’image. **Le confort global n’est pas déclaré rétabli.**

## Changements et frontières conservées

Dix sources sont concernées : deux modules terrain, six modules de propriétaires humains, MAIN et Decoder. Le substrat réemploie un scratch local pour les zones et des DTO de définitions terrain profondément immuables pour les plantes. L’API historique sans scratch conserve ses sorties fraîches ; aucun cache par World ou case n’est ajouté. Chaque appel relit le terrain, la pierre, la fertilité et les surfaces dans l’ordre historique ; les cas inconnus gardent leur calcul complet et leurs refus.

Les variantes internes de relations, décès, santé et admission Cobra lisent les propriétaires à leur frontière historique. MAIN partage paresseusement une capture dans le seul contexte du candidat courant. Les wrappers publics et RAW recapturent ; les relations conservent leurs deux lectures et refus. Aucun contexte humain ne survit à l’adoption.

Marsh réemploie seulement le witness de ressources déjà produit par le vrai Decoder, dans la classe MAIN privée. Après une adoption entière réussie, les seules positions remplacées peuvent être relues si le prédécesseur est exact, les métadonnées et le tableau de terrain inchangés, et l’ordre/population prouvés stables. Les diagnostics suivent l’ordre historique. Quand toutes les positions sont remplacées, ou en cas d’absence de preuve, full, remappage, changement de carte ou métadonnée non prise en charge, le parcours reste complet. Supports, structures, travaux, semis et zones restent entièrement vérifiés.

Le hook reste à la frontière Bridge→Marsh→Snow. Le candidat pending n’est confirmé qu’après le résultat applied de l’adoption entière ; refus, exception et retry ne publient aucune autorité anticipée. Aucun nouvel index maintenu ni protocole de snapshot. Règles, PRNG, sauvegardes, schéma et migrations sont inchangés ; les lecteurs publics restent complets.

## Contrôles ciblés

Le bilan par reprises est **56 PASS distincts sur neuf fichiers, dont23nouveaux**. Les14rouges préexistants sont reproduits sur la base exacte a037 puis conservés : anciens oracles RAW/projection, calendrier et attentes historiques. Aucune suite complète verte n’est annoncée et aucun validateur n’est détendu.

La première passe donnait43PASS/15RED en40,759s. Le nouvel oracle de pont comparait à tort le RAW à la projection ; la comparaison entière avec campaignPresentation passe ensuite en29,846s. Readonly : huit cas ciblés PASS31,993s. Sparse03 :11PASS/1nouveauRED28,702s ; seule la fixture confondant legacy water et une eau naturelle devient water-shallow admis au schéma255, assertion inchangée. Reprise des deux cas concernés PASS26,269s.

Le nouveau témoin utilise le vrai Encoder/Decoder, un refus Snow postérieur à Marsh, le même delta valide repris, stale et arête vide. Le spy transparent observe effectivement1/1/0/0lectures pendant les adoptions, puis est restauré avant les oracles RAW ; il distingue une vraie reprise sparse d’un repli complet après mauvais commit. Les autres cas gardent les ordres de refus, exceptions, champs malformés et absence de mutation.

Typage complet final PASS51,861s, scope entier, Go borné GOMAXPROCS=2/GOMEMLIMIT=768MiB. Les essais antérieurs restent consignés, dont OOM du compilateur natif et cast d’une nouvelle fixture volontairement inconnue corrigé via unknown sans changer les valeurs JS. Build QA final PASS3,397s. Gel avant Chrome03 :1767fichiers dont1726sources, exacts après tous les contrôles acquis ; originaux Aulnes, départ neuf et démonstration inchangés.

## Mesures Node bornées

Le microbanc readonly PASS34,448s mesure seulement validateMarshTransport avec changedTiles=[], sur les deux vrais inputs strictement admis, invariants et SHA hors chrono. Moyennes A8,561→7,634ms et B21,617→17,632ms. Quelques paires sont moins bonnes ; JIT/GC non contrôlés. Ce n’est ni le Decoder total ni une mesure de FPS.

Le banc sparse PASS175,096s compare le Marsh public readonly déjà optimisé à l’owner sparse avec le même helper : **pas un gain cumulatif V421→V423**. Chaque original est admis deux fois ; seule une copie avance réellement d’un tick. Vrais Encoder/Decoder et delta : A10733→10734, K91/N17912 ; B35→36, K142/N28371 ; zéro tuile modifiée. Cinq paires alternées×deux adoptions/mode/input, seul hook Marsh chronométré : A moyenne7,099→2,443ms, médiane7,036→1,950 ; B moyenne22,711→0,825ms, médiane20,599→0,787. Les cinq paires sont meilleures par input. Sources, inputs, continuations, paquets et prédécesseurs entiers restent exacts ; autres admissions et oracles hors chrono. Ce résultat Node ne prouve ni adoption totale, ni Worker total, ni confort Chrome et ne s’applique pas aux replis complets.

## Comparaison Chrome finale

Chrome155 natif headless/WebGPU, Ryzen5 3600/AMD-RDNA1,1440×1000/DPR1, même caméra orthographique et réglages équilibrés, textures/herbe/pièces/diorama, ombres60Hz/2048, son coupé. Build V421 figé contre V423 final, profileurs MAIN/Worker/GPU désactivés. Ordre séquentiel ref1→candidate1→candidate2→ref2, workers1/retries0. Chaque projet réimporte les deux originaux250² : Aulnes10733 et départ trois colons35 avant patrimoine préparé, sans nouvel ordre de jeu. Une seconde de chauffe exclue, puis cinq secondes pause et cinq secondes×1 par input :16fenêtres et huit recharges UI entières exactes.

ABBA03 PASS906,639s ; analyse hors ligne PASS12,064s, status COMPLETE_OFFLINE_COMPARISON_NO_COMFORT_THRESHOLD et issues[]. SHA du rapport c423-analysis03.json :898ed5a220dda8d40527754301d5012977362963cd74e59826c4b5789c9e221d. Revue indépendante des16formules frames/elapsed et ticks/elapsed, variations,64ACK corrélés et huit reçus de recharge sans écart arithmétique.

| Groupe | RAF moyen référence→candidat, images/s | Decoder moyen référence→candidat, ms |
|---|---:|---:|
| A pause |236,75→233,53|absent|
| A×1 |117,99→138,35 (+17,26%)|30,84→24,64 (−20,11%)|
| B pause |223,61→217,42|absent|
| B×1 |120,26→93,56 (−22,20%)|22,07→16,74 (−24,13%)|

Il s’agit des moyennes arithmétiques de deux fenêtres par version et groupe, sans mélanger les charges ni choisir la meilleure fenêtre. A×1 : RAF100,802/135,170→113,414/163,282 ; p99 des intervalles54,2/45,9→45,8/33,3ms ; images>50ms10/3→2/1. Les maxima candidats restent62,4/54,1ms : amélioration observée, pas absence de blocages.

B×1 : RAF144,241/96,283→82,899/104,221 ; p99 45,9/66,6→66,6/50ms ; images>50ms2/10→12/4 et>33,3ms12/35→34/24. Le CPU image et la réception restent plus coûteux dans l’agrégat de ces observations. Le Decoder moins cher ne suffit donc pas à démontrer une fluidité meilleure sur B. Ces métriques se recouvrent : aucune somme ni cause GPU/OS exclusive n’en découle.

Pause : zéro tick/adoption et aucune image>33,3ms. A×1 :30ticks/30adoptions partout. B×1 :30/30ticks et30/30adoptions en référence,30/29ticks et29/29adoptions candidats. Les64ACK speed sont reconnus sans absent, ambigu ou refus ; ils couvrent toutes les phases UI, pas clic→image. Les huit recharges complètes sont identiques à leur propre export après fenêtre. Les fichiers d’origine restent exacts.

Deux observations/version/input/vitesse, fenêtres courtes, JIT/GC, thermique, charge extérieure et alignement des ticks non contrôlés. stepMs est une moyenne de pas sur le préfixe du batch publié, pas le coût total Worker. Aucun GPU total, endurance, débit général ou FPS universels annoncé.

## Essais conservés et livraison

Chrome01 sur le premier correctif était déjà meilleur sur A mais mixte sur B ; ce résultat motive les deux tranches terrain suivantes. Ses séries restent séparées. Chrome02 est RED316,986s sur le budget cumulé300s du premier projet : candidat non exécuté, trois projets non lancés, B incomplet. Après revue, seule l’enveloppe globale du pilote passe à600s ; load90s, expect12s, ACK, chauffe, fenêtres et oracles restent inchangés. Chrome03 est une nouvelle ABBA complète, jamais un remplacement favorable des fenêtres rouges.

L’analyse initialement liée à c423p01 refuse la racine03 avant lecture en0,304s. La copie de reprise ne change qu’une occurrence de chemin c423p01→c423p03, calculs et assertions identiques. Cet échec reste conservé. Présentation01 est RED36,685s avant mesure : URL sans e2e et sonde harvest absente du paquet de profilage. Ce n’est ni une preuve de bug gameplay ni un contrôle acquis ; une compilation privée avec la vraie sonde existante est requise avant publication.

La reprise utilise la sonde harvest existante émise sans réécriture puis compilée avant bundling, DEV/e2e, build privé PASS3,862s. Le wrapper02 atteint sa limite globale180s après le minage complet : RED180,162s conservé. La phase mine conservée repasse ses assertions originales hors navigateur, sans rejouer sa chronologie ; seule la phase chop manquante est ensuite exécutée avec le même script,45s, vitesses1→6/1/3 et toutes les assertions actives : PASS107,058s. Les critères communs de présentation sont donc acquis **par reprises**, pas par un wrapper entier vert.

Les deux phases ont22changements de vitesse, zéro saut discontinu, occupation solide, starvation ou erreur navigateur. Le diagnostic complémentaire conserve un excès de déplacement continu au contact dans chop, distinct des critères communs : il n’est ni effacé ni transformé en garantie d’interpolation parfaite. Deux captures ROOT inspectées, AMD-RDNA1/WebGPU ;1776fichiers du gel exacts après. Aucun code produit ni seuil n’a changé pendant ces reprises. Aucun nouveau gain de confort ou FPS n’en est déduit.

## Publication

Produit `c5bd4f9708d26daeb9c703016b2660147a4f1d03` commité et poussé sur main, déploiement unique `84b9d5b0` sur elsewhere-cq7.pages.dev. Pages reconstruit sur ce HEAD en8,043s, paquet local vérifié9,047s, déploiement16,097s et136réponses HTTPS200/MIME/octets exacts14,095s. Paquet540fichiers/143936852octets,67fiches/70chemins de sauvegarde exacts ; rapports tmp/elsewhere-pages/v423-package-GWWx8B et v423-http-eW07P8. Archives publiques, Les AulnesV394 et démonstrationV419/tick1730 inchangées ; aucun paquet QA publié.

Les résultats mixtes V420/V421 et le diagnostic V422 sont conservés. Cette publication ne déclare pas le confort du départ neuf rétabli ; aucune nouvelle optimisation ou mécanique n’est incluse.
