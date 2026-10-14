# Expiration d’arbre et sortie saturée V353

Le dernier blocage révélé par la revue V352 concerne un arbre déraciné porté qui expire sans place pour son bois. Le dispatcher levait une exception et arrêtait la simulation. V353 conserve la mort et sa contrepartie physique en attente, sans prolonger la vie de l’arbre. Schéma 236 ; les données historiques sont validées à leur schéma avant une migration neutre.

## Comportement et conservation

Au délai existant de42000ticks locaux, une sortie complètement admissible suit la transaction ordinaire. Si la sortie positive est refusée par la place, les IDs numériques ou le plafond de son vrai conteneur, le wrapper original garde un marqueur pendingExpiry avec quantité capturée et retryAt. Le tirage de décès est payé une seule fois ; le même objet et son arbre interne restent dans leur véritable propriétaire. Aucun produit partiel, clone d’arbre, nouvel ID ou extension de délai n’est créé. Une sortie nulle retire directement l’objet sans demander une case ou un ID.

L’objet mort n’est plus replantable. Son inspection explique les restes en attente et leur quantité. Les tentatives suivantes sont espacées de20ticks et ne refont ni travail, XP ou tirage. Une réussite retire le wrapper et dépose tous les restes atomiquement ; une destruction explicite d’un objet déjà mort utilise également sa quantité capturée. La masse existante150kg et le modèle du wrapper sont conservés pendant l’attente.

Les réservations et commandes propres à cet arbre expiré sont relâchées ; les commandes étrangères et le déplacement réel du porteur restent conservés. Le dégagement de replantation ne travaille plus à la frontière du décès. Le dispatcher236 intervient après les acteurs et avant les départs/archives de voyage, pour ne pas figer un arbre expiré sans état mort. Les ordres et chemins bruts jusqu’à235 gardent leur branche historique.

Les propriétaires hors carte conservent leurs catalogues et gardes existants. Le plafond256piles d’un inventaire est vérifié ; aucun nouveau plafond individuel de35kg n’est ajouté au voyage de groupe, dont la surcharge totale possède déjà sa règle. La présence d’arbres utilise le témoin sparse/early out existant ; aucun parcours supplémentaire de tous les acteurs ou ressources ordinaires n’est introduit.

Le transport full/delta admet le marqueur uniquement après validation du domaine. Pour une mort pending effectivement observée dans la même époque de snapshot, le client garde les deux identités, la quantité, les dates et l’original canonique : reroll, nouvelle durée ou retour de cet original comme ressource vivante sont refusés. Les faits ne sont commités qu’après adoption valide. Une nouvelle époque peut charger une autre branche. Ce témoin ne prouve pas les décès immédiats ou survenus entre snapshots ; son coût n’est pas mesuré ici.

## Référence primaire et adaptation

Core1.6.4871rev590, assembly SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a` ; provenance MinifiedTree privée dans tmp/bugfix-v349/reference/provenance.json. Core garde le même arbre contenu, gèle sa croissance, puis produit YieldNow×0,5 tronqué au décès. Son délai420000ticks correspond aux42000ticks locaux existants du clone. La branche de décès détruit le contenu avant TryPlaceThingNear et ignore le résultat de ce placement : cette référence ne garantit donc pas la conservation sous saturation. L’attente atomique est une adaptation explicite et conservatrice du clone, pas une prétention de parité exacte sur cette limite. Aucune classe complète n’est distribuée.

L’entrée235 est strictement validée avant de changer seulement son numéro de schéma. Aucun produit rétroactif ni réparation inventée d’une sauvegarde humaine. La quantité pending doit appartenir aux deux arrondis possibles de la source figée ; marker futur, absent au-delà du délai, faux type, champs inconnus, conteneur ou claim incohérents restent refusés. Les archives ont été qualifiées par leurs domaines, pas par une campagne entière de voyage. Le rendu, LOD et fichiers publics sont conservés ; aucun gain ou coût nul CPU/GPU/FPS n’est affirmé.

## Qualification ROOT

Contrôles lourds séquentiels, sources/tests/pilotes figés. Groupe213cas/14fichiers acquis par reprises, dont31nouveaux/3 : groupe initial rouge30,734s avec206acquis ; reprise31nouveaux rouge10,801s avec30acquis, puis cas de plafond seul PASS10,429s. Les182historiques sont acquis dans le premier groupe. Le plafond32768 est isolé sur une préparation250² valide avec assez de place physique pour100bois en deux identités, mais un total prospectif32769. Les gardes de sauvegarde ne sont pas assouplies.

Typage/Pages PASS24,423s, Vite3,95s. Corpus63références/66fichiers PASS80,076s : octets publics littéraux, migration, full/delta, un vrai tick et replay exacts ; seules les omissions historiques gatherId=undefined déjà documentées sont admises. Gel2932 exact avant documentation/livraison. Deux revues statiques sans contrôles ou écriture ne relèvent plus de défaut concret.

Chrome/WebGPU PASS62,920s, body58,094s, erreurs[] : préparation déclarée32² tardive, vrai portage préalable, décès à45000, attente puis capacité créée par20plans de sol bois réellement payés dans l’UI. À45160, neuf sols sont terminés, le wrapper et l’original ne sont plus présents, et le total physique vaut76800−27+23=76796. Cinq recharges natives exactes :44980/45000/45025/45025/45160. Les deux captures ont été inspectées ROOT ; aucune égalité de pixels ou performance n’en est déduite. Le parcours ne prétend pas jouer les sept jours ni réparer le camp des captures humaines.

Exports/SHA et rapport dans tmp/bugfix-v353/native-reprise/tree-expiry-v353-V353-held-630b0-rests-after-paid-floor-work/tree-expiry-v353-summary.json. Entrée44980 SHA256 `13133af4a9b73a657ad65a425bd060185e697e2ffc5000fce8503280a2abfe7a` ; sortie45160 `b0c9005a28186072117163d164da2072e9305908f3eb83ecc3c013e5f40e9eae`. Rapports unitaires/corpus/gel dans tmp/validation-runs/v353-* et tmp/bugfix-v353.

## Rouges et suite

Le premier typage rouge13,311s venait du nom de sol wood au lieu de wood-planks dans le pilote et d’un paramètre de test inféré littéralement236. Les sept rouges unitaires initiaux venaient d’un libellé historique Chene, d’un inventaire préparé invalide, de quatre changements involontaires d’époque par remplacement de World, et d’un message brut non copié avant mutation. Le contrat Encoder est conservé : postMessage copie synchroniquement ce message. La reprise restante utilisait une dimension256 invalide ; préparation corrigée250², sans modification produit. Un lancement npx non disponible ENOENT0,011s est conservé ; le lanceur local Node est utilisé ensuite.

Premier natif rouge29,208s/body0,230s avant chargement : serveur5412 disparu après la coupure, connexion refusée. Le serveur dédié est relancé, rapport rouge conservé dans native/native-report.json ; reprise distincte dans native-reprise, sans fermer une session humaine ou changer le produit.

Aucun FPS, sauvegarde humaine réparée, campagne entière, early access100% ou parité exhaustive certifiés. Après commit/push et publication vérifiée, poursuivre la réserve médicale intérieure depuis la branche naturelle V34758168, distincte de la branche blessée V344 ; aucun résultat futur acquis.

Produit `8dc7bf70` commité/poussé, documentation initiale PASS9,870s et publication unique `f6ced911` vérifiée sur106réponsesHTTPS exactes ; [clôture et package](../development/cloudflare-pages.md#publication-v353--arbre-expiré-et-sortie-saturée).
