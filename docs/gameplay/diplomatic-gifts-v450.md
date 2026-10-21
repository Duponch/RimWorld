# V450 — Dons au comptoir d'une faction

État : **publié ; qualification ciblée, présentation et parcours natif acquis par reprises**. Schéma **274**, après V449 publiée. Les échecs initiaux et les limites sont conservés ci-dessous. Publication vérifiée ; aucun gain FPS ni clôture d’ensemble annoncé.

## Résultat joueur et périmètre

Une vraie caravane arrivée au **comptoir déjà visité d'une faction non hostile** peut offrir du **tissu ou de la laine de muffalo** réellement transportés. Le joueur choisit des quantités, consulte l'évolution prévue de la relation puis confirme : les mêmes biens passent au stock du comptoir, aucun argent n'est reçu ou dépensé, la charge de la caravane baisse et la vraie relation de faction évolue. Une faction neutre peut devenir alliée en atteignant le seuil requis.

**L'ensemble4, narration/combat/quêtes/diplomatie, devient le chantier principal de ce lot.** Les autres ensembles restent ouverts ; les bras/jambes V449 et les armes déjà livrées sont conservés. Les glaives restent reportés et il n'est pas nécessaire de terminer tout le catalogue de l'ensemble2 avant cette boucle diplomatique. Le [plan des six ensembles](../development/core-completion-plan-20261020.md) reste la référence, sans clôture générale ni victoire livrée.

Le lot est borné à ces deux textiles et à ce canal géographique déjà présent. Les autres biens, personnes/animaux donnés, cadeaux aux visiteurs ou vaisseaux, radio et capsules, paix avec une faction hostile, assistance et comportements militaires supplémentaires restent différés. Une valeur d'alliance ne suffit pas à déclarer ces autres boucles fonctionnelles.

## Référence et provenance

Référence primaire locale relue le **21 octobre2026** : **RimWorld Core1.6.4871 rev590**, `E:/Steam/steamapps/common/RimWorld/`. SHA-256 recalculé d'`Assembly-CSharp.dll` : `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Relevés privés `tmp/diplomatic-gifts-v450/reference.md` et `factions-audit.md`, avec les lectures commerciales historiques V88/V193 conservées. Aucun code ou asset propriétaire n'est intégré au produit.

Classes relues : `FactionGiftUtility` dans **RimWorld.Planet**, `DiplomacyTuning`, `SimpleCurve`, `Tradeable`, `TradeUtility`, `TradeDeal`, `TradeUI`, `Dialog_Trade`, `Settlement_TraderTracker`, `Settlement`, `CaravanArrivalAction_OfferGifts`, `Faction`, `FactionRelation` et les situations de goodwill. Les Defs de diplomatie, factions, difficultés, postes marchands et textiles complètent ces lectures. Les nombres ci-dessous ne sont pas déduits d'une sauvegarde préparée.

Recherche Internet ciblée : [annonce officielle Ludeon du12octobre2026](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/), relue le21octobre, distinguant principale1.6 et bêta instable1.7. Elle ne fournit pas les coefficients de dons ni le dernier numéro Steam exact ; l'installation locale identifiée reste l'autorité mécanique. Les discussions d'utilisateurs anciennes trouvées pendant la recherche ne sont pas traitées comme une règle actuelle.

Le [corpus humain](../research/reference-adoption.md), son [document original](../reference/originals/Documentation_developpement.html) et son [classeur original](../reference/originals/Referentiel_developpement.xlsx) restent préservés. Chapitres26/27 : **SYS/TEST-138..144** pour propriétaires et voyages, **SYS/TEST-145 et UI-032** pour panier revalidé/transaction, **SYS/TEST-147** pour diplomatie. Adopter biens réels, destinataire et conséquences ; adapter le périmètre et les stocks existants ; différer les autres canaux. Aucun identifiant global n'est clos.

## Conditions de remise et biens

La caravane doit être réellement présente, au bon établissement et sur la bonne tuile, avec son négociateur actuel disponible et ses propriétaires à jour. Le comptoir doit déjà posséder son vrai stock, relié à l'établissement et à sa faction ; consulter le don ne génère aucun stock ni bonne volonté. Le négociateur vient du lecteur commun de TradePriceImprovement. Un humain absent ou incapable n'est pas remplacé par un marchand fictif.

Le mode cadeau Core conserve les filtres de négociabilité du trader et l'état admissible des objets. Les établissements ordinaires Outlander/Neolithic acceptent le domaine Textiles, qui comprend ces deux matières. V450 ne transforme donc pas tout objet visible en cadeau. Le choix se limite aux unités réellement portées par les membres et leurs porteurs animaux actuels, sans toucher les vêtements portés ni les ressources restées à la colonie.

Les factions cachées, temporaires, vaincues, la faction du joueur et les ennemies permanentes sont exclues ; la vraie paire diplomatique doit être présente et non hostile. Une base actuellement attaquée empêche une amélioration. Le Core possède un parcours distinct de cadeaux à une base hostile non permanente pour rechercher la paix ; ce parcours et les verrous diplomatiques de quête restent hors lot. Les producteurs de noms, personnes et stocks gardent leurs adaptations originales.

## Valeur et gain diplomatique

Le don reconnaît le **prix unitaire de vente réel**, avec négociateur, offset du comptoir **+2points**, facteurs de matière/état applicables et règles communes de marché. **Aucun argent de vente n'est arrondi puis remis.** Le tissu a une valeur de base1,5 ; la laine de muffalo2,7. Ces matières brutes n'ont pas de qualité et leur détérioration physique n'affecte pas leur prix selon leurs Defs Core.

Pour ces textiles sans bonus d'extension, le prix de vente combine la valeur, **0,6**, le facteur de difficulté commerciale et **1+TradePriceImprovement+0,02**. Plancher0,01, arrondi unitaire au pair au-delà de99,5 et plafond par le prix d'achat appartiennent au lecteur économique partagé. Le contexte local actuel conserve une perte de difficulté commerciale **0** ; le Core prévoit notamment0,10 en Blood and dust et0,20 en Losing is fun. Ce lot n'annonce pas la couverture de toutes les difficultés commerciales par le seul ajout du don.

Le Core calcule en **Float32**, par ligne négociable : prix unitaire×quantité, division par **40**, puis addition des bases. La base totale est traitée par fractions de **0,25**. Le facteur dépend de la relation courante **et du gain déjà accumulé** : **1 jusqu'à0**, baisse linéaire jusqu'à **0,25 à75**, puis reste0,25. La relation est relue après chaque fraction ; un simple multiplicateur calculé au début serait différent.

Le gain demandé est plafonné à **200**, puis **tronqué vers0**. Il ne se confond ni avec l'argent affiché ni avec le gain effectivement appliqué. Exemples scalaires calculés depuis les règles, sans partie native jouée : goodwill0, valeurSELL40 → gain demandé0 ;41 →1 ;400 →9. À75, valeur160 →1. L'ordre Float32 par ligne est conservé : une division unique du total monétaire peut franchir à tort une limite entière.

Le helper pur expose une entrée scalaire lisible et une entrée de base préagrégée ; la transaction multi-lignes utilise cette dernière. Le cas analytique de référence à goodwill75, unitésSELL0,01 et79,99 données deux fois chacune, produit une base Float32 **3,999999761581421**, puis **0,9999999403953552** avant troncature : gain demandé0. Arrondir d'abord la valeur à160 produirait1. Ces cas analytiques font partie de la passe ciblée ; ils ne constituent pas une partie native jouée.

Après ce gain demandé, le retour vers le goodwill naturel reçoit le bonus Core de25% sur la portion correspondante, **arrondi au pair**. Une faction civile paisible a naturel0 : un don depuis une relation négative non hostile peut recevoir ce bonus jusqu'à la distance vers0. Un don déjà au-dessus de0 ne l'obtient pas. Le goodwill est ensuite limité à **−100..100**. Les situations d'ennemi permanent et de base attaquée sont refusées par ce canal ; aucun plafond favorable n'est inventé.

À100, un cadeau positif peut quand même être remis sans augmenter davantage la relation. Un petit cadeau dont le gain est tronqué0 peut également partir. Le devis conserve les valeurs non arrondies du calcul et distingue gain demandé, ajusté et effectif ; le panneau affiche valeur reconnue, bonne volonté et relation avant/après, ainsi que charge finale. Les prix affichés à deux décimales ne sont pas réinjectés dans le calcul. Si le gain effectif est nul, l'aperçu le dit explicitement sans empêcher la remise confirmée. Le don ne reçoit pas en plus le bonus du commerce ordinaire basé sur la valeur envoyée/600.

## Relation persistée et hystérésis

La relation diplomatique garde son état précédent. En mutation Core : non hostile devient hostile à≤−75 ; non allié devient allié à≥75 ; hostile redevient neutre à≥0 ; allié redevient neutre à≤0. Une alliance80→70 reste donc alliée. L'initialisation historique≤−10/≥75 n'est pas appliquée à chaque don.

Le schéma274 doit préserver cette histoire : hostile−100..−1, neutre−74..74, allié1..100 se chevauchent volontairement. Le nombre seul ne reconstruit pas le passé. Les lecteurs et mutateurs de réputation concernés reprennent cette hystérésis pour274 ; les anciennes versions gardent leurs règles initiales. Les relations de faction ne deviennent pas des opinions individuelles ni une autorisation de réécrire les PNJ.

## Transfert, reçu et sauvegarde

La confirmation revalide le panier, le destinataire, l'état du groupe et la relation. Une pile entière garde son identité ; une division alloue uniquement la portion transférée. Les objets passent au **stock du comptoir sans fusion**, avec leur état physique ; aucune pièce d'argent ne change de propriétaire. La masse du groupe baisse de celle des biens remis. Le reçu de don est distinct d'une vente, et l'équation des possessions enregistre cette sortie réelle.

**Adaptation locale conservatrice :** prévalider toutes les places du stock fini, les limites de piles/identifiants et les destinataires avant le commit. Si la remise complète est impossible, conserver les originaux et la réputation. Le Core peut détruire un objet si son ajout au stock échoue ; cela ne prouve pas une transaction native plus forte et ne justifie pas une perte silencieuse dans notre stock limité. Un devis périmé ou rejoué ne doit pas remettre deux fois les mêmes biens.

La migration livrée valide **273 strictement**, puis change seulement le numéro en274 : aucun cadeau, goodwill, kind, personne, stock, argent ou histoire rétroactive. La qualification comprend les vrais propriétaires de campagne, les reçus, les compteurs de sortie, les limites, les sauvegardes et les voies publiques/checkpoint/delta. Une lecture de devis ne consomme aucun PRNG.

La provenance du reçu est contrôlée contre le **Def de la vraie faction**, son goodwill naturel et le comptoir qui le détient ; une cible naturelle civile0 ne peut pas remplacer celle d'une faction rude−130. Si l'établissement existe encore, ses liens doivent correspondre. Après sa destruction, l'identifiant historique reste borné et la faction connue ; sa vie actuelle, sa relation actuelle ou l'existence ultérieure de la caravane ne sont pas des conditions rétroactives du don.

## Présentation, coûts et qualification

L'interface reprend le vrai panneau du groupe et du comptoir, avec quantités et effet diplomatique avant confirmation. Aucun asset Core n'est utilisé. La sélection seule ne transfère rien ; la remise et la relation affichée viennent de l'état confirmé.

Le travail porte sur le panier porté, le stock fini et les paires de factions ; aucun parcours terrain ou flore ni nouvelle simulation par image. Les petits devis suivent leur vrai panier et leurs valeurs Float32, même lorsqu'ils ne rapportent aucun point ; leur lecture ne simule pas un voyage. La provenance n'indexe factions et établissements qu'au premier reçu réel, puis réemploie ces index pendant la validation ; un comptoir sans reçu demande une simple vérification de champ.

Le calcul transitoire reste borné à **3200 fractions** au plus, avec saturation garantie à une base de800. À bonne volonté initiale **≥75**, le facteur reste exactement1/4 : la branche directe conserve le résultat Float32 sans rejouer les fractions. Chaque quart aurait ajouté exactement1/16 jusqu'au plafond ; les cas75/100 et base799,999→199,800→200 contrôlent cette équivalence. Aucun gain CPU/FPS ni débit physique général n'est acquis par ce choix.

### Contrôles ROOT conservés

| Passe ciblée | Constat enregistré |
| --- | --- |
| `v450-targeted-2026-10-21T20-06-01.061Z-19008` | 16 fichiers, 120 cas : 113 réussis, 7 échecs ; 161,63 s. Première issue conservée. |
| `v450-reprise-2026-10-21T20-10-05.463Z-5428` | 4 fichiers, 20 cas : 19 réussis, 1 échec ; 59,72 s. L'oracle restant tentait de sérialiser un ancien schéma avec le sérialiseur courant. |
| `v450-migration-reprise-2026-10-21T20-11-49.832Z-11356` | 3 cas : 2 réussis, 1 échec ; 34,11 s. Le delta ancien était admis par la voie résidente malgré son marqueur futur : véritable garde manquante, corrigée par ROOT puis remise en qualification. |
| `freight-ui-head-control-v450-2026-10-21T20-12-53.838Z-18516` | Les 3 anciens cas de fret échouent aussi avec le panneau HEAD `c632668a` sur le même `TypeError: document.createTextNode is not a function` ; 7,47 s. Ces rouges historiques restent distincts du lot. |
| `v450-resident-reprise-2026-10-21T20-29-42.651Z-14244` | 16 cas : 15 acquis, une attente de masse ajoutée à tort à 30 g/unité. Les trois cas de migration passent avec la garde résidente. |
| `v450-gift-mass-reprise-2026-10-21T20-31-12.686Z-15112` | 13/13, 12,569 s. Attente corrigée à 28 g pour la laine, valeur du Def Core et du transport existant ; aucun changement produit. |

La portée acquise est **118 cas distincts dans 16 fichiers**, par reprises ; les comptes de passes ne s'additionnent pas. Ce n'est ni une suite totale du dépôt ni une qualification complète de campagne. La sélection porte sur valeur/bonus/arrondis/saturation, transfert entier/partiel et identité, refus transactionnel, stock/argent finis, passage neutre→allié, provenance, sauvegarde/recharge, voies publiques et anciennes/futures frontières. Les cas dépendant d'archives privées déclarent explicitement leur condition d'exécution ; leurs originaux restent conservés.

**Préparation du pilote natif :** reprise de la vraie campagne géographique259 au tick2905, source SHA`5ff387667bb3933d4b3957c65dd9516c4c3470e13d3c888b2a917878f9778525`. La caravane5 existante est placée par préparation déclarée au véritable comptoir OutlanderCivil ;60tissu et40laine de muffalo sont fournis au même inventaire de Léonie et comptabilisés comme reçus déclarés. Le producteur réel crée le stock fini du comptoir. Personnes, blessures, autres biens et histoires sont conservés. **Ce pilote commence au comptoir : aucun nouveau voyage, production naturelle des cadeaux ou succès antérieur au don n’est crédité.** Les parcours de voyage déjà acquis gardent leurs preuves propres.

**Typage et paquet Pages acquis :** `v450-final-types-2026-10-21T20-32-31.052Z-6700`, 19,476 s ; `v450-pages-build-2026-10-21T20-33-04.270Z-10312`, 10,120 s. Les sources servies sont gelées sur 2 135 chemins ; leur contrôle reste exact après les parcours.

Le premier typage `v450-first-types-2026-10-21T19-58-59.321Z-20116`, rouge16,834s, conserve quatre erreurs de réduction de type dans la garde des reçus et dans le test de campagne. Elles ont été corrigées. Les derniers cas de campagne sont également typés : `v450-final-campaign-types-2026-10-21T20-45-08.401Z-26376`, PASS22,653s.

**Interface native acquise :** `v450-native-ui-2026-10-21T20-33-51.870Z-9692`, 147,113 s ; rapport `tmp/diplomatic-gifts-v450/native-ui/2026-10-21T20-33-51-940Z/report.json`, pilote 144,629 s. Chrome155/WebGPU, 1440×1000. Import et annulation conservent la campagne entière exactement. Au tick2905 en pause, Léonie7 remet60tissu de la pile28396 entière et20laine de la pile28397 ; le reste garde son propriétaire, seul le fragment reçu alloue un identifiant. Valeur Float32 reconnue97,20000457763672, gain2, relation0→2 neutre ; charge affichée15,99kg/70kg. Le compteur de ventes et le ledger commercial restent inchangés. Une seule commande de don, reçu séparé, aucune avance d’horloge ni tirage PRNG. Résultat rechargé et60images en pause : campagne entière exacte. Son/musique coupés avant jeu ; aucune erreur ni notification de mise en page.

**Présentation acquise par reprise bornée :** `v450-presentation-2026-10-21T20-36-43.939Z-23844` atteint la limite globale180,239s après le minage terminé. Le rapport et ce rouge restent conservés ; aucune cause générale n’en est déduite. Reprise du seul abattage `v450-presentation-chop-reprise-2026-10-21T20-40-35.537Z-26376`, PASS101,223s. Chaque phase observe45s avec changements de vitesse1/6/1/3 ; aucun saut, excès de trajet continu ni traversée de solide. Intervalles d’image p50/p95/p99/max : minage4,2/8,4/12,8/54,2ms ; abattage4,2/12,5/20,8/158,4ms. Le pic158,4ms reste explicite : aucun confort général ni objectif FPS déclaré atteint.

**Alliance persistée :** `v450-alliance-continuation-2026-10-21T20-42-59.486Z-26128`, PASS76,069s, deux cas de campagne. Le cas ajouté prépare explicitement une relation neutre74 et60laine supplémentaires dans l’inventaire existant ; le don réel de100laine atteint75 une seule fois, puis la campagne alliée75 se recharge exactement. Une continuation déclarée à70 conserve l’alliance et le reçu historique75 ; RAW et projection publique l’admettent. Ce contrôle n’invente pas les dons antérieurs, un voyage naturel ou une assistance militaire.

### Entretien du stockage demandé pendant le lot

Le21octobre, l’humain demande de libérer plusieurs Go du répertoire temporaire sans perdre les fichiers récents ou utiles.112anciens caches SSR recréables ont été retirés ;148journaux de conversations anciens ont été compressés sur place avec SHA, taille et date de modification identiques.31groupes de paquets, musiques et images figés identiques partagent désormais leur stockage, avec les1817chemins conservés et protégés en lecture seule ; SHA et identités vérifiés. Les dates de ces copies partagées sont celles du canonique, leurs métadonnées originales sont consignées. Il faut les copier dans un nouveau fichier indépendant avant toute modification. Aucun rapport, sauvegarde ou historique n’a été supprimé. L’espace libre mesuré est passé d’environ6Mo à6,10Go ; les contrôles ultérieurs produisent leurs nouveaux rapports. Reçus privés dans `tmp/disk-cleanup-20261021/`, dont `summary.json` et les manifests de suppression, compression et déduplication.

### Publication V450

Produit `deb645ad3e7dcec5ada1eff82516a2253510972c`, poussé sur `origin/main`. Déploiement Pages `04ec28ae`, [adresse du déploiement](https://04ec28ae.elsewhere-cq7.pages.dev) et [site stable](https://elsewhere-cq7.pages.dev). `v450-pages-deploy-2026-10-21T20-48-41.724Z-26868`, PASS22,380s, quatre fichiers ajoutés et546réutilisés. Le seul avertissement de copie de travail concerne `references_UI/`, dossier humain exclu du commit et du paquet.

Paquet local acquis dans `tmp/elsewhere-pages/v450-package-jcmstO/` : toutes les ressources statiques et la feuille de style gardent les octets du paquet V449 qualifié ; aucune addition statique ni instrument privé. Les71chemins publics du catalogue et de sauvegardes, dont68fiches, restent exacts. Aulnes, Éclaircies, Forges et archives sont conservées. Vingt réponses HTTPS ciblées des deux origines correspondent exactement au paquet et à leurs types MIME, PASS6,756s, reçu `tmp/elsewhere-pages/v450-http-RvQd2C/`. Cela établit la disponibilité du paquet ; les comportements joués sont couverts par les parcours locaux distincts.

Les six ensembles restent ouverts. L’ensemble4 a maintenant ce premier canal de don ; le prochain chantier commence la voie de victoire de l’ensemble5, après vérification Core des dépendances et horloges stellaires. L’ensemble2 conserve ses manques et les glaives différés ; aucune assistance diplomatique, campagne jusqu’à la victoire ou cible FPS n’est déclarée livrée.

**Effets sonores et musique coupés avant les tests dans le jeu ; navigateur de contrôle muet.** Les tests restent requis et ces réglages ne sont pas imposés aux joueurs publiés. Les autres relations, incidents et conséquences du gameplay restent actifs. Une passe ciblée ne vaut ni diplomatie exhaustive ni campagne durable, et ne clôt aucun des six ensembles.
