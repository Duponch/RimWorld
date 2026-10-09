# Lisière

**V275 — prothèses en bois ; schéma 210.**
Un médecin peut rendre une fonction partielle à une jambe, une main ou un pied manquant : bois et deux médicaments réellement livrés, anesthésie, risque opératoire et suivi sauvegardé. [Règles, adaptations et validation](docs/gameplay/wooden-prostheses-v275.md). Les états suivants sont historiques.

**V274 — morts, cadavres et sépultures ; schéma 209.**
Les décès vécus et les dépouilles vues affectent maintenant l’humeur ; laisser un colon sans sépulture crée un malus distinct. Transport et inhumation arrêtent les nouvelles observations, les souvenirs restent temporaires et les deuils familiaux sont conservés. [Règles et validation](docs/gameplay/death-thoughts-v274.md). Les états suivants sont historiques.

**V273 — lanceur EMP ; schéma 208.**
Fabriquer, équiper et tirer une impulsion de zone permet de neutraliser temporairement les machines, puis d’exploiter cette fenêtre avec la défense existante. Adaptation des mécanoïdes, effets électriques, inspections et reprises sauvegardées : [règles et validation](docs/gameplay/emp-launcher-v273.md). Les états suivants sont historiques.

**V272 — paludisme et peste ; schéma 207.**
Deux crises médicales relient incidents, symptômes, soins avec médicaments physiques, repos, immunité et convalescence. Le paludisme affecte la filtration et peut provoquer des vomissements ; la peste progresse plus vite. [Règles, adaptations et validation](docs/gameplay/immune-diseases-v272.md). Les états suivants sont historiques.

**V271 — production de médicaments ; schéma 206.**
Deux recherches ouvrent un laboratoire manuel, puis la fabrication à partir de plantes médicinales, neutroamine achetée et tissu. Collecte, travail et dépôt physiques alimentent les soins existants. [Règles et validation](docs/gameplay/medicine-production-v271.md).

**V270 — fléau des cultures ; schéma 205.**
Le [fléau agricole](docs/gameplay/crop-blight-v270.md) relie incident, contamination de proximité, croissance bloquée, dégâts et coupe sans récolte. Alerte et plants brunis permettent de repérer les foyers ; la commande collective crée du travail physique, puis les zones libérées sont ressemées. Hydroponie concernée, sauvegarde prospective et lecteurs communs. Autonomie et push après chaque commit maintenus ; les états suivants sont historiques.

**V269 — révoltes de prisonniers ; schéma 204.**
Les [évasions collectives](docs/gameplay/prison-break-v269.md) relient risque individuel, portes ouvertes physiquement, combat, défense et tourelles, brèche faute de route, puis mise à terre et soins ou sortie avec possessions. Adoption prospective et inspection du risque ; limites Core et résultats de validation dans la note du lot. Autonomie et push après chaque commit maintenus, aucun FPS annoncé. Les états suivants sont historiques.

**V268 — hydroponie ; schéma 203.**
Les [bacs hydroponiques](docs/gameplay/hydroponics-v268.md) relient recherche, construction, courant, cultures sous toit, récolte et récupération après panne. Riz, pommes de terre, coton et racine médicinale utilisent le travail agricole ordinaire ; 280 % de fertilité, 70 W par bac et dépérissement progressif sans courant. Autonomie et push après chaque commit maintenus. Les états suivants sont historiques.

**V267 — libération des prisonniers ; schéma 202.**
La [libération volontaire](docs/gameplay/prisoner-release-v267.md) relie consigne d’inspection, portage physique par un colon affecté à Basique ou Geôlier, puis sortie autonome avec les possessions conservées. Les archives de prison et de raid distinguent ce départ de l’évasion ; aucun bonus diplomatique ajouté. Autonomie, validations regroupées et push après chaque commit restent autorisés ; les états suivants sont historiques.

**V266 — Zzztt… court-circuit du réseau ; schéma 201.**
Le [court-circuit](docs/gameplay/short-circuit-v266.md) relie conduits alimentés, réserves du seul réseau touché, incendies, dégâts et reprise physique : éteindre, soigner, réparer et recharger. La lettre décrit les conséquences réelles ; les anciennes parties adoptent ce calendrier prospectivement. Développement autonome, validations regroupées et push après chaque commit autorisés ; les états V265 et antérieurs ci-dessous sont historiques.

**V265 — vague de froid et éclipse ; schéma 200.**
Deux [crises climatiques](docs/gameplay/climate-incidents-v265.md) relient protection des habitants et cultures, chauffage, lumière naturelle, panneaux solaires et réserves d’énergie. Alertes et ciel suivent les conditions réellement simulées ; sauvegardes anciennes adoptées prospectivement. Développement autonome, validations regroupées, commit et push de chaque lot selon la dernière consigne ; les repères suivants sont historiques.

**V264 — secours, récupération et intégration ; schéma 199.**
Les nouveaux [naufragés indépendants](docs/gameplay/pod-rescue-joining-v264.md) réellement secourus peuvent rejoindre la colonie au relèvement, avec leurs blessures, compétences et possessions. Les autres finissent leur convalescence puis repartent. Statut visible dans l'inspection, décision unique sauvegardée et anciennes capsules inchangées ; 74 contrôles ciblés, les 62 sauvegardes publiques, build et présentation native passent.
La reprise fonctionnelle suit la [méthode du 8 octobre](docs/development/consolidation-v209.md#consigne-de-méthode-du-8-octobre-2026) : lots plus larges, cadrage réduit et validations regroupées. Le [bilan CPU/GPU](docs/history/performance-bilan-2026-10-08.md) conserve les gains et limites antérieurs, sans nouveau FPS annoncé. Relance automatique en pause, commits locaux sans push. Les repères suivants sont historiques.

**V262 — admission Core privée et reprise GPU positives, produit V242 et schéma 198 conservés.**
Les [résultats caméra compilés](docs/development/core-compiled-camera-v262.md) et l'audit passif des ombres permettent une résidence native ; vingt cas composants, sauvegarde/reload et vraie perte du device suivie de continuation passent dans les [contrôles](docs/history/validation-core-compiled-camera-v262.md).
Aucun FPS, coût Core, oracle graphique complet, GAME de performance ou adoption acquis ; les 62 références et 65 fichiers publics restent exacts.
V263 doit qualifier le Core A/B complet dans les fragments privés avant promotion ; relance automatique en pause, commits locaux sans push. Les repères suivants sont historiques.

**V261 — premier raccord au vrai Core, produit V242 et schéma 198 conservés.** La [préparation résidente privée](docs/development/core-resident-admission-v261.md) atteint Les Aulnes, mais son audit refuse à froid un callback caméra des sprites ; les [diagnostics et reprises](docs/history/validation-core-resident-admission-v261.md) sont conservés sans gain FPS annoncé. Suite sur l'identité des sorties caméra déjà compilées, puis qualification graphique et coût du jeu avant adoption. Les 62 références restent exactes ; objectif240FPS/6× ouvert, relance automatique en pause, commits locaux sans push. Les repères suivants sont historiques.

**V254 — fonctions du Worker source identifiées, produit V242 et schéma 198 conservés.** Le [profil CPU](docs/development/source-v8-attribution-v254.md) situe des coûts répétés dans les pièces, les requêtes de meubles et les préparations spatiales. Les [preuves](docs/history/validation-source-v8-attribution-v254.md) conservent un refus final du banc après profil et sauvegarde/reprise ; aucun FPS ajouté par ce diagnostic. La suite vise une refonte des données réellement relues, avec mêmes règles, qualité et cadence. Les 62 références restent exactes, cible 240 FPS/6× ouverte ; relance automatique en pause et commits locaux sans push.

**V253 — moteur source attribué, produit V242 et schéma 198 conservés.** Le [diagnostic des vrais ticks](docs/development/source-step-attribution-v253.md) mesure 22,81 ms par step instrumenté, dont 10,10 ms pour les acteurs et 2,05 ms pour la réconciliation prison. Les [contrôles et reprise](docs/history/validation-source-step-attribution-v253.md) passent après un refus d'armement initial conservé. Aucun FPS ajouté ; priorité aux noyaux de décision réellement coûteux. Les 62 références restent exactes ; cible 240 FPS/6× ouverte, autonomie autorisée, relance automatique en pause et commits locaux sans push. Les repères suivants sont historiques.

**V252 — phases de scène actuelles attribuées, produit V242 et schéma 198 conservés.** Le [diagnostic du jeu complet](docs/development/scene-apply-current-v252.md) mesure 10,72 ms par application de scène, avec un coût réparti entre végétation, cultures et plusieurs parcours de bâtiments. [Contrôles et reprise](docs/history/validation-apply-current-v252.md) passent ; aucun FPS ajouté par cette mesure. La suite vise une refonte groupée des données réellement relues. Les 62 références restent exactes, cible 240 FPS à 6× ouverte, relance automatique en pause et commits locaux sans push.

**V251 — lecteur scène unique qualifié puis écarté, produit V242/schéma 198 conservés.** Le [prototype à un seul lecteur](docs/development/single-reader-scene-v251.md) [dessine moins d'images dans le banc Core](docs/history/validation-single-reader-scene-v251.md) :146,75→131,1875/s. Il reste privé, sans port GAME ou FPS ajouté.62références exactes, objectif240FPS/6× ouvert ; poursuivre la réduction du travail de scène, commits locaux sans push et relanceauto en pause. Les repères suivants sont historiques.

**V250 — refonte source qualifiée puis écartée, produit V242/schéma 198 conservés.** Le [journal des mutations](docs/development/source-mutation-v250.md) réduit le coût source, mais [le jeu complet ne gagne pas de FPS](docs/history/validation-source-mutation-v250.md). Aucun code produit ou contenu ajouté ;62références exactes, objectif240FPS/6× ouvert. La suite étudie réception et affichage avec un seul lecteur World ; commits locaux sans push, relanceauto en pause. Les repères suivants sont historiques.

**V249 — coûts de publication source attribués, produit V242 et schéma 198 conservés.** Le [profilage du vrai Worker](docs/development/source-attribution-v249.md) mesure 8,853 ms par encode, principalement ressources et terrain. Les [contrôles et la sauvegarde/reprise](docs/history/validation-source-attribution-v249.md) passent ; aucun FPS ajouté par ce diagnostic. La refonte vise maintenant ces parcours répétés, sans changer règles, cadence ou qualité. 62 références exactes, cible proche de 240 FPS à 6× ouverte ; commits locaux sans push, relance automatique en pause. Les repères suivants sont historiques.

**V231 — diagnostic matériel, schéma 198 inchangé.** L'[attribution des coûts](docs/development/render-throughput-attribution-v231.md) cible les longues applications de scène ; les montages hors thread essayés n'apportent pas de gain et sont écartés. Produit V230 et 62 références conservés, cible proche de 240 FPS à 6× ouverte ; [preuves et limites](docs/history/validation-render-throughput-attribution-v231.md). Les refontes autonomes continuent, avec commits locaux sans push.

**V230 — refonte locale du rendu, schéma198 inchangé.** Le [cœur de scène](docs/development/scene-render-core-v230.md) est séparé des interactions DOM, avec rendu, sauvegarde et récupération GPU contrôlés. Les62 références restent exactes. Les [preuves](docs/history/validation-scene-render-core-v230.md) ne démontrent aucun gain FPS stable ; le travail autonome continue sur le débit du vrai rendu dans un worker, encore privé, pour rapprocher Les Aulnes de240FPS à6×.

**V229 — scène des Aulnes, schéma 198 inchangé.** La [réconciliation végétale et les signatures](docs/development/scene-reconciliation-v229.md) réduisent les reconstructions répétées sans changer règles, cadence ou qualité. Deux [cycles matériels](docs/history/validation-scene-reconciliation-v229.md) trouvent un gain RAF local d'environ7 %, avec sauvegarde/reprise contrôlée et62 scènes préservées. Coût froid, pointes et cible240FPS restent ouverts. L'autonomie continue sur les copies de données et l'adoption hors main, avec commits locaux sans push.

**V227 — présentation végétale, schéma 198 inchangé.** Un [agenda exact et une partition des cultures](docs/development/plant-presentation-events-v227.md) réduisent les lectures répétées sur Les Aulnes. La [comparaison matérielle finale](docs/history/validation-plant-presentation-events-v227.md) donne 93,33 → 98,10 RAF/s (+5,11 % local), avec pointes et coût froid persistants. Les 62 sauvegardes demeurent exactes. La cible proche de 240 FPS à 6× reste ouverte ; le travail autonome se poursuit sur le décodeur et les applications de scène, avec refontes autorisées et commits locaux sans push. Les repères suivants sont historiques.

**V226 — diagnostic de performance, schéma 198 inchangé.** L’[essai de croissance](docs/development/plant-growth-read-v226.md) est retiré après une [comparaison sans gain FPS significatif](docs/history/validation-plant-growth-read-v226.md). Le produit conserve V225 et les62scènes, dont [Les Aulnes250² corrigées](docs/gameplay/aulnes-seating-v224.md). L’utilisateur autorise la poursuite autonome et les refontes profondes pour des gains mesurés ;240FPS au vrai6× restent ouverts. Commits locaux sans push ; les pauses des repères suivants sont historiques.

**V220 livré dans le périmètre contrôlé, schéma 198.** Conservation de la préparation et de la récupération du tir humain sous vrai étourdissement. [Contrat](docs/development/shooting-stun-v220.md), [référence primaire](docs/research/shooting-stun-core-v220.md), [preuves et limites](docs/history/validation-shooting-stun-v220.md). Deux défauts reproduits puis corrigés ;17nouveaux cas, régression par reprise572fichiers/2609réussites/un ignoré, typage/build, natif ciblé et59sauvegardes passent. Consigne utilisateur : commit local de ce lot, puis arrêt pour ses tests et attente de son signal ; relance automatique en pause, aucun push.

**V216 livré dans le périmètre contrôlé, schéma 196.** Globe, formation et voyage collectif, besoins hors carte, commerce et retour physique : [contrat](docs/development/planet-group-v216.md), [recherche primaire](docs/research/planet-group-core-v216.md), [contrôles et limites](docs/history/validation-planet-group-v216.md). La 58e scène est préparée ; régression par reprises, build et parcours navigateur matériel passent. Les résultats des campagnes longues restent distincts. Développement et commits locaux continuent en autonomie selon la consigne utilisateur, sans push.

**V214 livré dans le périmètre contrôlé, schéma 195.** Proches annoncés, couples adultes, opinions dirigées, logement par deux lits possédés et deuil familial au décès réel. [Contrat](docs/development/family-v214.md), [recherche](docs/research/family-core-v214.md), [preuve et limites](docs/history/validation-family-v214.md). 537 fichiers/2 442 réussis/un ignoré, 31 nouveaux cas, build et parcours natif composé ; mariage, lit double, enfants, planète et performance générale restent ouverts.

**V212 — mini-tourelle, schéma 193, livré dans le périmètre contrôlé.** Défense automatisée : recherche, chantier, courant, tirs réels, acier porté pour le réarmement, dégâts, explosion et refuge physique. [Contrat](docs/development/mini-turret-v212.md), [référence Core et adaptations](docs/research/mini-turret-core-v212.md), [contrôles et limites](docs/history/validation-mini-turret-v212.md). [Travail autonome](docs/history/autonomous-progress-2026-10-05.md) ; commits locaux sans push jusqu’au retour annoncé ou à une pause.

**V211 — trois crises aux conséquences distinctes, schéma 192, livré dans le périmètre contrôlé.** Destruction de bâtiments, fureur violente et colère meurtrière ciblée relient humeur, déplacement, dégâts, défense et récupération. Les biographies V210 et la consolidation V209 précèdent ce lot. [Contrat](docs/development/mental-crises-v211.md), [recherche Core](docs/research/mental-crises-core-v211.md), [preuve](docs/history/validation-mental-crises-v211.md). Développement autonome autorisé jusqu’au retour annoncé ou à une pause ; commits locaux sans push.

**V208 — télévision cathodique, schéma 190, livré dans le périmètre ciblé.** Recherche, acier/composants et courant alimentent un nouveau loisir assis, avec lassitude propre. [Contrat](docs/development/television-v208.md), [référence Core et adaptations](docs/research/television-core-v208.md), [preuve](docs/history/validation-television-v208.md), [guide](docs/gameplay/player-guide.md#regarder-la-télévision--v208). Visionnage au lit et écrans avancés différés. Mode jour : commit local puis attendre la relance.

**V207 — sacs de sable, schéma 189.** Cinq tissus livrés puis construits donnent un couvert bas franchissable, endommageable et réparable dans le foyer. La 53e scène préparée **« Sacs de sable · construction et couvert »** laisse réaliser construction et tirs. [Contrat](docs/development/sandbags-v207.md), [recherche Core et adaptations](docs/research/defensive-cover-core-v207.md), [preuve ciblée](docs/history/validation-sandbags-v207.md), [guide](docs/gameplay/player-guide.md#construire-et-utiliser-un-couvert-bas--v207). Tissu seul ; positions de tir Core adaptées, barricades et gravats spécifiques différés. Parcours natif matériel, présentation et publication passent ; aucun coût GPU ou gain général déduit des contrôles ciblés. Mode jour : commit local puis attendre la relance.

**V206 — rations renouvelables, schéma 188.** Les repas de survie emballés peuvent être fabriqués sur les cuisinières, après recherche, avec Cuisine 8 et six protéines plus six végétaux. Ils alimentent les reconnaissances et le comptoir existants sans pourrir ; la contamination reste possible. La 52e scène préparée **« Repas de survie · production et voyage »** permet de suivre cette chaîne. [Contrat](docs/development/packaged-survival-v206.md), [recherche Core et adaptation](docs/research/packaged-survival-core-v206.md), [preuve V206](docs/history/validation-packaged-survival-v206.md). Pâte nutritive et recette par quatre restent différées.

**V205 — lit d’hôpital, schéma 187.** Un couchage spécialisé relie recherche, construction et soins depuis le lit réellement occupé. La 51e scène préparée **« Lit d’hôpital · recherche et soins »** permet de réaliser cette chaîne avec trois colons. [Contrat](docs/development/hospital-bed-v205.md), [recherche Core et adaptation](docs/research/hospital-bed-core-v205.md), [preuve V205](docs/history/validation-hospital-bed-v205.md). Les validations et performances générales ne sont pas déduites de cette préparation.

**V203 — ventes de textiles, schéma 185.** Tissu et laine peuvent être chargés au contact, vendus contre la monnaie réelle du comptoir, puis financer les fournitures. Les invendus rentrent et sont déposés physiquement. La 49e scène publique **« Ventes de textiles · 3 colons »** prépare ce circuit sans argent initial. [Contrat](docs/development/caravan-sales-v203.md), [règles Core et adaptations](docs/research/caravan-sales-core-v203.md), [preuve ciblée](docs/history/validation-commercial-sales-v203.md).

**V202 — éruption solaire, schéma 184.** Les appareils électriques s’arrêtent progressivement, les batteries cessent leurs échanges et les solutions au bois/manuelles restent disponibles. La 48e scène préparée **« Éruption solaire · réserves et secours »** permet d’observer début et reprise. [Contrat](docs/development/solar-flare-v202.md), [règles Core et adaptations](docs/research/solar-flare-core-v202.md), [preuves et limites](docs/history/validation-solar-flare-v202.md). Calendrier mondial distinct, sans éclipse ni nouveau traitement graphique.

**V201 — animal sauvage en rage temporaire, schéma 183.** Un animal déjà présent devient une menace pour les humains : fuir, rejoindre un abri fermé ou combattre exige des déplacements et contacts réels. La 47e scène **« Animal en rage · abri et défense »** prépare une introduction Cassandra à reprendre, sans pirate ni blessure initiale. [Contrat](docs/development/manhunter-v201.md), [référence Core et adaptations](docs/research/manhunter-core-v201.md), [preuve et limites](docs/history/validation-manhunter-v201.md). Scaria, meutes et narrateur exhaustif restent absents ; G3/G4 restent ouverts.

**V200 — repères et corrections visuelles, schéma 182 inchangé.** Les cinq besoins ont leurs seuils visibles ; les brins suivent la peinture du sol et seuls ceux enracinés dans les taches de sang sont rouges. Le trou central des nuages est légèrement élargi. [Contrat](docs/development/needs-grass-clouds-v200.md), [référence](docs/research/needs-grass-clouds-v200.md), [preuve et coût borné](docs/history/validation-needs-grass-clouds-v200.md). Pas de nouvelle mécanique.

**V199 — refonte des dossiers et infobulles, schéma 182 inchangé.** Les fiches humaines, Animaux et Recherche reprennent la hiérarchie Core en conservant la palette pastel. [Contrat](docs/development/colonist-ui-v199.md), [référence et écarts](docs/research/colonist-ui-core-v199.md), [validation ciblée](docs/history/validation-colonist-ui-v199.md). Présentation des données existantes, sans nouvelle mécanique.

**V198 — continuité des déplacements, schéma 182 inchangé.** La fuite civile repart dès sa réobservation de danger sous budget ; les prédateurs conservent leur préfixe sûr et les produits rejoignent un dépôt libre au-delà des voisins occupés. [Contrat](docs/development/movement-continuity-v198.md), [recherche Core/CPU/GPU](docs/research/navigation-cpu-gpu-v198.md), [preuve ciblée](docs/history/validation-movement-v198.md). Correction de l’existant, sans nouveau contenu ni navigation GPU activée.

**V197 — poursuite de mêlée continue, schéma 182 inchangé.** Le renouvellement d’un chemin et la révision périodique d’une même cible ne créent plus de pauses artificielles. Les recherches restent bornées ; obstacles, contacts et récupérations restent physiques. [Contrat](docs/development/melee-pursuit-v197.md), [recherche Core](docs/research/melee-pursuit-core-v197.md), [preuve ciblée](docs/history/validation-melee-pursuit-v197.md). Correctif du combat existant, sans nouvelle mécanique.

**V196 — sang, dépouilles et douleur, schéma 182 inchangé.** Le sang colore l’herbe des cellules tachées et les régions corporelles blessées. Les animaux morts gardent leur modèle et pelage de vivant, couchés avec yeux en croix ; la marche traverse le mobilier franchissable au sol. Trois râles masculins et trois féminins suivent le sexe visuel du colon ; le renard reçoit deux prises de douleur. [Contrat](docs/development/visual-blood-v196.md), [recherche](docs/research/visual-blood-core-web-v196.md), [preuve et limites](docs/history/validation-visual-blood-v196.md). La 46e colonie de test prépare les comparaisons. Le suivi du pigment terrain, différé dans V196, rejoint V200 après mesure de coût. La [culture médicinale V195](docs/development/healroot-domestic-v195.md) reste jouable dans son périmètre ciblé.

Lisière est un jeu de colonie 3D low poly pour navigateur, inspiré de RimWorld Core 1.6.4871. [V193](docs/development/caravan-trade-v193.md) livre une première expédition commerciale : charger rations et argent, rejoindre un comptoir civil, acheter médicaments ou composants puis les ramener et les déposer physiquement. La colonie préparée « Expédition commerciale » est accessible dans Charger → Colonies de test. La [preuve ciblée](docs/history/validation-commercial-v193.md) borne les contrôles ; planète, groupes, rencontres, ventes générales et diplomatie restent ouverts.

[V191](docs/development/prey-navigation-v191.md) optimise la navigation vers les proies, sans nouvelle mécanique ni migration. Une recherche progressive unique doit conserver exactement décision, contact, coût et trajet V190. Les contrôles ciblés et la mesure CPU isolée sont acquis ; leur [preuve dédiée](docs/history/validation-prey-navigation-v191.md) conserve leur périmètre et leurs limites, sans annoncer de gain général.

## Démarrer

Node.js 22.12 ou plus récent et un navigateur avec accélération graphique sont requis. Les dépendances sont épinglées.

```powershell
npm ci
npm run dev
```

Ouvrir [le jeu local](http://127.0.0.1:5173). Three.js utilise WebGPU si disponible, puis WebGL 2. Le backend apparaît dans Menu → Diagnostics. L’accueil propose Nouvelle partie et Charger ; la carte normale fait 250 × 250 cases. Le [guide joueur](docs/gameplay/player-guide.md) décrit les commandes et les règles.

## Développer

```powershell
npm run test:quick
npm run test:regression
npm run build
npm run test:integration
python scripts/check-docs.py
```

Choisir les contrôles adaptés au changement selon la [stratégie de tests](docs/development/testing.md). `npm test` conserve la suite Vitest complète ; `npm run test:campaign` isole les campagnes longues avec leurs journaux. La [validation courante](docs/development/validation.md) distingue les contrôles exécutés, les reprises et les limites ; les preuves [V161](docs/history/validation-fine-meal-bulk-v161.md), [V160](docs/history/validation-simple-meal-bulk-v160.md), [V159](docs/history/validation-carnivore-lavish-v159.md), [V157](docs/history/validation-vegetarian-lavish-v157.md), [V156](docs/history/validation-carnivore-fine-v156.md), [V155](docs/history/validation-vegetarian-fine-v155.md), [V154](docs/history/validation-lavish-meal-v154.md) et [V152](docs/history/validation-fine-meal-v152.md) bornent les repas récents. Aucune preuve ciblée ne certifie à elle seule la suite exhaustive. Les contrats, recherches, preuves et archives sont orientés depuis l’[index documentaire](docs/README.md). Le [laboratoire de navigation GPU](http://127.0.0.1:5173/navigation.html) est une expérience séparée.

Le [README antérieur](README-pre-v145.md) conserve les annonces et mesures datées de la période V101–V108. Son indication de version du site public ne vaut pas vérification du déploiement actuel.
