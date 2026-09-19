# Stratégie de validation

V68 : huit scénarios regroupés `raids.test.ts` (admissibilité atomique, champ lointain, barrière multicouche, sleeper, pertes cumulées, retraite enfermée, objets exportés, décès et schéma strict). `raid-colony.test.ts` construit et accueille puis subit le calendrier réel pendant cinq jours ; il écrit `tmp/raid-camp-v68.json`. Exécuter ensuite `raids.spec.ts` : cette vraie UI reprend ce camp à l’approche de la bataille à 1×/6×, sans refaire cinq jours de préparation. Ce n’est pas une nouvelle passe monolithique de cinq jours dans le navigateur. `RAIDS=1 BARRIERS=1 VALIDATION_VERSION=v68` enrichit les bancs CPU/natif existants : naissance au bord pendant la mesure, plus un acteur aux effectifs de base 3/30/100, dégâts/réparation/minage/abattage en parallèle. Mesures successives ; ce banc ne représente pas cent assaillants. Une UI courte distincte contrôle aussi une retraite, la sauvegarde d’arête et le retrait commun des instances corps/cargaison/sélection. [Preuves](../history/validation-raids-v68.md).

V67 : six scénarios profonds `barriers.test.ts` et familles combat/réveil/arrivée/retrait/toiture, avec deux projectiles séparés par une destruction, toit qui blesse le frappeur, libération de files, cadence/XP indépendante et migrations corrompues. `barriers.spec.ts` vérifie les commandes, poses et réparation à 1×/6×. Le pilote peint les murs/portes achevés et compte les pertes. `BARRIERS=1 VALIDATION_VERSION=v67` sélectionne la charge 3/30/100 dans les bancs CPU/natif existants ; exécutions successives, sources gelées pendant la capture. [Preuves et limites](../history/validation-barriers-v67.md).

Audit V66 : `render-retention.test.ts` couvre aussi croissance/retrait des personnes et partage des poses ; la capture native refuse de nouvelles compilations lors d’un accueil. Les exports complets de World par CDP sont effectués après la fenêtre mesurée : le diagnostic ne doit pas être confondu avec une frame de jeu. Conserver les essais antérieurs et leurs pics.

V66 : `arrivals.test.ts` vérifie offre/identité, refus/expiration, bordure bloquée/rouverte, régime supprimé, journal plein, migration stricte et continuation. `arrivals.spec.ts` exerce worker/lettre/entrée/sauvegarde à 1×/6×. Le pilote accepte une quatrième personne sur la graine 42 et adapte lit/repas/affectations ; graines 93/2048 restent des témoins paisibles. UI longue : calendrier normal, sans injection d’arrivant. Banc CPU d’acceptation et option `ARRIVALS=1` du banc natif pour N→N+1 sous charge ; ces offres de charge sont contrôlées, y compris au-dessus de la limite du producteur. [Preuves](../history/validation-arrivals-v66.md).


V65 : huit scénarios profonds `mental-break.test.ts` croisent seuils/hasard, interruptions et cargaison saturée, repas/sommeil réels, récupération, cinq catharses, corruption/migration et blessure + marche lente. UI native `mental-break.spec.ts` à 1×/6× ; charge existante avec `MENTAL_BREAKS=1` (civils alternés en crise) dans les bancs CPU/natif, successivement. Conserver `mentalActors` pour distinguer cette charge des anciennes mesures. Le pilote exclut les personnages en crise des ordres directs et relève leur exposition. [Preuves](../history/validation-mental-break-v65.md).

V64 : quatre scénarios profonds `mood.test.ts` confrontent besoins, douleur anatomique, vêtements, progression/gel, souvenirs, migration/rejeu et snapshots. Le pilote cœur vérifie la borne de variation à chaque tick sur cinq à huit jours et expose causes/cible dans ses bilans. `mood.spec.ts` observe ingestion et retrait réels à 1×/6× avec sauvegarde en cours ; les bancs mixtes existants mesurent le coût ajouté sans nouveau benchmark redondant. [Preuves](../history/validation-mood-v64.md).

V63 enrichit les frontières d’équipement/impact avec six scénarios profonds : habillage sauvegardé, couches/remplacement interrompu, sol saturé/incapacité, migration stricte, protection balistique/couverture exacte et mêlée/toit. UI 1×/6× vérifie ownership, phases et attributs GPU/portrait sur la même scène. Le pilote de camp équipe ses colons par commandes et exige quatre vêtements conservés. Les bancs mixtes existants acceptent `APPAREL=1` (chemises de tous les acteurs, gilet d’un acteur sur deux) ; source gelée pendant mesure, résultats séparés du pilote long. Les contrôles d’armure isolés ne remplacent pas ces parcours.

Les entrées de versions antérieures ci-dessous conservent les contrats et contextes de leurs validations.

Protection isolée sous V62 : `tests/armor.test.ts` regroupe couverture/compatibilité, seuils/distribution, ordre/usure/conversion, arrondis et corruption. Aucun parcours UI n’est exigé avant présence d’un consommateur ; son intégration physique déclenchera les scénarios et audits décrits dans [le contrat](armor.md).

V62 : six scénarios profonds de réveil, vrais producteurs projectile/mêlée, acoustique/portes/audition, médical/ordres/cargo et migrations. L’UI observe le passage de la pose endormie à la sortie physique du lit à 1×/6×. Le compagnon de rencontre sait mobiliser une réserve endormie avant secours et médicaments sur une journée. Audit mixte commun 3/30/100 ; [preuves](../history/validation-disturbance-v62.md).
V61 : six scénarios profonds dans `pursuit.test.ts`, compagnon de rencontre fixe/mobile avec secours réellement terminés, UI `pursuit.spec.ts` à 1×/6× et audit `PURSUIT=1` sur les bancs de tir existants. Les CPU conservent désormais aussi les vingt premiers ticks et le maximum sur tous les ticks : le démarrage des recherches ne doit pas disparaître derrière une phase de chauffe. [Preuves et échec du pilote diagnostiqué](../history/validation-pursuit-v61.md).

V60 : `automatic-combat.test.ts` regroupe autorisations, ordres, mouvement, portée/ligne, cible pondérée, cargaison, cycles et continuation stricte. Le pilote de rencontre défend désormais par tir libre. Parcours natif `automatic-combat.spec.ts` à 1×/6× ; `AUTOMATIC=1 VALIDATION_VERSION=v60` étend les bancs CPU et navigateur `shooting-*` aux décisions autonomes, sans ordres de tir injectés. Exécuter simulation, UI, charge et garde de présentation successivement pour ne pas fausser leurs mesures. [Preuves](../history/validation-automatic-combat-v60.md).

Pilote civil V60 : le minage de réserve entretient jusqu’à quatre cellules, car une roche naturelle ne garantit pas un fragment. La UI exige toujours le mur en pierre et les stocks construits au troisième jour ; elle suit les IDs de maintenance encore acceptés à minuit jusqu’à leur achèvement après sommeil normal. Un échec conserve le checkpoint complet en `tmp`, permettant de vérifier sa continuation avant de rejouer les trois jours. Les échecs et reprises restent dans les preuves, sans ressource injectée ni chance de butin augmentée.

V59 regroupe statistiques/outils, résolution anatomique, approche/duel/rejeu, refus/migration, récupération et arrêt continu dans `melee.test.ts`. Le navigateur vérifie le vrai bouton de mêlée et la pose GPU à 1×/6× ; les bancs de tir ont une variante `MELEE=1`. Le compagnon du pilote choisit la mêlée pour une menace au contact. Geler les sources pendant une mesure native (le rechargement du serveur invalide le parcours). Ne pas exécuter le long pilote civil en concurrence avec les contrôles natifs : le timeout initial V59 est conservé dans les preuves.

V58 ajoute une famille de rencontre profonde : autorité/relations, tirs réels/XP/rejeu, fuite avec cargaison et refuge, navigation/portes, migration, puis adversaire → colon à terre → réponse du joueur → secours/médicament → journée de récupération. Le pilote de camp expose son compagnon `encounterDecisions`, sans fabriquer de blessure. UI native : scénario de création, exclusion de la gestion coloniale, réglage Fuir/Ignorer, tir adverse visible à 1×/6×, sauvegarde pendant le portage et soins. Les bancs de tir acceptent `HOSTILE_TARGETS=1` ; distinguer cette variante de l’ancien tir allié. [Preuves](../history/validation-encounter-v58.md).

V57 : quatre scénarios croisés dans `stagger.test.ts` couvrent intégration indépendante, refresh/expiration, migration stricte, vrai projectile, portage et GPU. `stagger.spec.ts` utilise de vrais clics à 1×/6× et confronte les attributs rendus à une intégrale indépendante. Le pilote civil reste pacifique ; pas de tir sur ses colons ajouté artificiellement. Les bancs de tir acceptent `MOVING_TARGETS=1` (16 trajets de quatre cellules), avec compteurs de personnes ralenties et d’arêtes retimées ; `VALIDATION_VERSION=v57` protège les preuves antérieures.

V56 : cinq scénarios profonds `shooting.test.ts` couvrent phases, cadence fractionnaire, refus atomiques, interruptions/changement de cible, chutes, balle indépendante du tireur, reprises à chaque tick, snapshots et migration stricte. `integration/shooting.spec.ts` joue ciblage/Échap, visée sauvegardée, impacts à 1×/6× puis soins du blessé réel ; observe le rig et les traces GPU. Le pilote civil relève combat/XP et interdit les tirs spontanés entre alliés ; le futur adversaire fournira son épisode naturel. `shooting-bench.ts` et `shooting-load.spec.ts` mesurent 3/30/100 acteurs mixtes, séparément. Garder maximums et échecs d’oracle dans les preuves, sans les masquer par les seuls percentiles.

V55 : cinq scénarios `projectile-system.test.ts` ajoutent vrais pas World/sauvegardes/snapshots à chaque phase du vol, cible déplacée par commande, ordre sous-pas avant identifiant, décès avant le second contact, décor modifié, disparition/sortie, enveloppes malformées et comparaison exhaustive des cellules d'une petite fixture entre capture complète et lot médical. Le test de transport a détecté une collection sparse restant dans un ancien delta ; corrigé sans affaiblir l'oracle. Pilote civil et migrations rejoués pour la nouvelle version ; le pilote ne doit pas inventer un combat sans commande. `projectile-system-bench.ts` distingue premiers ticks de rafale et séquence mixte 250² à 3/30/100 acteurs. Les émissions y sont injectées, aucune preuve de visée/commande/rendu déduite de ce banc. [Contrat et limites](projectiles.md).

Sous V54, neuf scénarios `bullet-flight.test.ts` couvrent émission/vol/arrivée, masques, RNG explicite, probabilités de tir ami distinctes, portes/cibles mutables, limites et 72 continuations. La relecture du code de référence a ajouté des contrôles discriminants : exception cardinale et couvert unique sans tirage. Reprise JSON de noyau et sauvegarde médicale réelle sont distinguées ; elles ne livrent pas la persistance de tirs dans World. Regrouper avec requêtes/décor/impacts. Pas de longue UI ou colonie avant branchement ; le banc de vols complets exclut explicitement émission, World, worker et rendu. [Contrat](projectiles.md).

La capture `projectile-world` enrichit la famille `combat-world.test.ts` de cinq scénarios : candidats complets, recouvrement/couches/empreintes, relations et identifiants ordonnés ou non, vrai secours, puis chaîne de fixture ligne→émission→déplacement commandé→Gunshot/reprise. Les tests de géométrie qui superposent des objets restent volontairement distincts des sauvegardes valides. Le banc dédié inclut capture et vols complets sur carte générée 250², puis premiers accès aux plantes ; aucune assimilation à un combat rendu.

Sous V54, `combat-world.test.ts` ajoute quatre scénarios groupés : catalogue/empreintes, coexistence/états de porte, mutation sans avancer le tick, puis vrai minage/coupe/construction et sauvegarde. Les fixtures de géométrie ne prétendent pas être des parties valides. Le banc `combat-world-bench.ts` inclut la capture de toute la carte et la partage entre 3/30/100 candidats ; création/résolution séparées. Aucun nouveau parcours UI avant intégration d'une attaque. [Contrat et mesures](combat-world.md).

V54 : six scénarios `bullet-impact.test.ts` regroupent sélection anatomique, overkill, propagation létale, Gunshot/guérison, soins physiques/snapshots, migration et cargaison interrompue. `integration/health.spec.ts` est enrichi avec inspection, soins et rechargement des nouvelles lésions ; les impacts y sont explicitement injectés, aucun tir joueur fictif. Le pilote civil relève Gunshot sans en créer artificiellement. Banc `bullet-impact-bench.ts` à 3/30/100 dossiers, 0/20 lésions, indépendant du navigateur. Rejouer migrations médicales, snapshots et colonie ; pas de longue garde de minage pour ce producteur non appelé par la boucle normale. [Contrat](bullet-impact.md).

Socle de tir sous V53 : `combat-queries.test.ts` regroupe huit scénarios, dont un oracle géométrique indépendant sur 117 649 combinaisons, coins/portes/bords/portée, probabilités, mutations en place, sept qualités, unités de temps et précision sous pertes anatomiques réelles. Regrouper avec `body.test.ts` pour les capacités. `combat-query-bench.ts` mesure les requêtes isolées, pas des combattants ni du rendu. Typecheck et tests ciblés suffisent tant qu'aucune boucle World/UI n'appelle ces modules ; colonie et présentation seront enrichies puis jouées à cette intégration. [Contrat et mesures](combat-queries.md).

V53 : huit scénarios tactiques profonds (`drafting.test.ts`) croisent file/groupe, porte/diagonale, sauvegarde, santé, sommeil, patient et cargaisons sur sol saturé. `integration/drafting.spec.ts` joue bouton/R/clic droit/Maj/arrêt et mesure les attributs de pose GPU. Le pilote commun commence par une reconnaissance physique aller-retour puis reprend le camp. Charge mixte : `MINING_DRAFTING=1` dans le banc minier natif ; moitié des acteurs mobilisés, deux déplacements, démobilisation automatique puis reprise des activités. Réutiliser la garde de présentation pour les transitions discrètes.

Optimisation de transport sous V52 : `node --experimental-strip-types scripts/snapshot-encoder-bench.ts 5df8af0 <étiquette>` compare l’encodeur au témoin Git, avec six charges de mutations et ordre de mesure alterné. Les reconstructions sont contrôlées hors mesure ; `bridge-snapshot.test.ts` ajoute les mutations au même tick, références conservées après permutation, remplacement à effectif égal, vidage et réapparition. Puis garde native minage/abattage avec changements de vitesse. Ni modification de mécanique, ni nouvelle migration : pas de répétition du long pilote civil déjà vert pour ce seul cache de transport.

V52 : cinq scénarios `equipment.test.ts` croisent propriété/accès/échange, file ordinaire, dépôts, incapacité/lit/décès/sol saturé, récupération, filtres, migrations et snapshots. `integration/equipment.spec.ts` observe les attributs GPU sur le vrai parcours UI. Pilote naturel enrichi d’une arme obtenue par commande et conservée plusieurs jours. `equipment-bench.ts` mélange équipement, soins, abattage, minage et stockage à 3/30/100 acteurs ; `MINING_EQUIPMENT=1` arme le banc natif minier. Résultats dans [validation](validation.md).

V51 : six scénarios `medicine.test.ts` croisent groupes, plafonds, puissance/XP, sources inaccessibles, recharges, dix réservations, auto-soins urgents, saturation/pourriture, migrations et cent acteurs. `integration/medicine.spec.ts` observe les attributs GPU après rendu aux phases physiques et conserve les snapshots. Le pilote civil range/conserve trente doses ; il ne crée pas de blessure. Bancs partagés `--medicine` / `MEDICINE_LOAD=1` mesurés séparément ; conserver les échecs initiaux et les limites de charge.

Le mode facultatif `MEDICAL_PROFILE=1` du banc natif conserve un profil CDP du thread principal dans `tmp/medical-main-profile.cpuprofile`, sur le seul cas de cent acteurs. `MEDICAL_LOAD_REPORT` permet de préserver la mesure normale ; ne pas mélanger les percentiles avec et sans profileur. Le profil sert à attribuer les coûts, puis une mesure sans instrumentation lourde confirme l'effet du changement.

Pour une attente de présentation intermittente, `HARVEST_TRACE=1` ajoute au banc existant les tâches longues et un contexte borné des images/réceptions autour de chaque attente. Une reprise de diagnostic conserve le premier échec ; elle ne prouve pas sa disparition universelle et ne change ni le budget de 100 ms ni l'oracle de progression.

Les clics/tracés de cellule attendent maintenant une projection caméra stable sur trois images, avec une borne de 2,5 s, avant l'entrée souris réelle. Une cellule visible peut encore bouger après un zoom ou un déplacement amorti ; un délai fixe ne suffit pas à fort dézoom. `CAMERA_TRACE=1` conserve le déplacement observé pendant cette attente. Le pilote conserve aussi commande, outil, notification, événements et capture sur un échec d'action ; les attentes métier restent inchangées.

V50 : cinq scénarios de décision urgente croisent meilleur métier activé, seuil strict, soin unique puis repas, lit, budget, interruptions, migration et cent acteurs. Le parcours UI urgent vérifie la chronologie du geste puis de l’ingestion ; le banc médical partagé accepte `URGENT_LOAD=1` et mesure aussi scène/réception, le banc CPU `--urgent`. Ne pas assimiler ces camps dégagés à une charge mixte en forêt.

V49 : cinq scénarios d’auto-soins enrichissent les contrats médicaux (sortie du lit, interruptions, qualité, migration et cent acteurs) ; le parcours UI observe orientation, annulation et reprise. Un échec natif a révélé une orientation perdue au rechargement, corrigée sans assouplir l’oracle.

V48 : six scénarios `feeding.test.ts`, dont clinique de cinq jours, stock/régime partagé, reprise de chaque phase, pourriture et sol saturé. `integration/feeding.spec.ts` joue Travail/clic droit/sauvegarde et inspecte les poses GPU réellement présentées. `scripts/rescue-bench.ts --feeding` et `FEED_LOAD=1` dans `integration/rescue-load.spec.ts` réutilisent le banc médical 2/30/100, à lancer séparément. Les clés historiques rescued/carryTicks/carriedFrames signifient patients nourris, ticks et observations au chevet dans ce mode. Le pilote commun relève tâche feed et faim.

V47 : `care.test.ts` croise résultats réels, XP/qualité, réservations, repos/sommeil, interruption, accès, migration et continuation. `integration/care.spec.ts` contrôle les commandes, la sauvegarde au chevet et les poses GPU effectivement présentées. Charge : `scripts/rescue-bench.ts --care` et `CARE_LOAD=1` avec `integration/rescue-load.spec.ts`, à exécuter séparément. Les anciennes clés `rescued`/`carryTicks`/`carriedFrames` désignent alors patients entièrement traités, ticks travaillés et observations de soin au chevet ; ce ne sont pas des mesures de secours. Le pilote commun relève traitements, repos médical et XP.

V46 : `rescue.test.ts` ajoute six scénarios profonds, `rescue.spec.ts` le parcours UI physique et `rescue-load.spec.ts` la charge native 2/30/100 acteurs. `scripts/rescue-bench.ts` mesure séparément les ticks/copies. Le pilote partagé contrôle aussi les relations de secours et usages de lit. Rejouer la partie UI et la présentation aux changements de ces transitions ; une couleur seule ne justifie pas ces suites longues. [Contrat](rescue.md).

V45 : cinq scénarios intégrés `health-world.test.ts`, migration stricte, arrêt/cargaison/repas, toit réel et retour au travail. `health.spec.ts` observe aussi les attributs GPU, jamais seulement le World ; reprendre la partie UI de trois jours et `test:presentation` pour cette activation. Le pilote relève les dossiers et vérifie son camp sans accidents. Audit `health-world-bench.ts` à 3/30/100 acteurs et 0/20/100 lésions ; `MINING_MEDICAL_WOUNDS=20` enrichit le banc graphique minier existant. [Contrat](health.md).

Socle initial V44 (preuve historique) : `injuries.test.ts` enrichit les scénarios anatomiques avec état local, évolution sur plusieurs jours, seuils létaux et continuation du PRNG. `scripts/injury-bench.ts` mesure dossiers et copies à 3/30/100 acteurs. Comme il ne change aucune commande, Pawn, worker ou pose, la longue UI n’est pas rejouée ; elle devient obligatoire avec l’activation des dommages. [Contrat](injuries.md).

V44 : huit scénarios `interrupted-cargo.test.ts` regroupent interruption, conservation, dégagement par un autre colon, repas/pourriture, meubles, recettes, arêtes, migration et comparaison des dépôts. Le pilote relève `interruptedCargo` ; le navigateur dédié vérifie sommeil, rechargement et dégagement par commandes UI. L’audit `scripts/interruption-bench.ts` sépare coût initial, ticks, copies et résultats pour 3/30/100 acteurs et 0/10 000 piles de sol. [Contrat](interrupted-cargo.md).

V43 : `skills.test.ts` confronte seuils XP indépendants, saturation, oubli/dette, minuit, travail physique et sauvegarde corrompue. Le pilote relève les apprentissages et utilise les aptitudes affichées pour son bâtisseur ; les anciennes fixtures retirent le profil V43 avant validation de leur version. [Contrat](skills.md).

V42 : `power.test.ts` couvre construction/fuel sur toutes les faces, réseaux/surcharge/reprise et refus de sauvegarde ; pilote de trois cartes enrichi de 200 acier extraits et six composants, avec générateur et lampe entretenus. Parcours natif `power.spec.ts`, parcours de colonie UI et audit `power-render-bench.mjs` à 3/100 mineurs avec appareils. Observer `power.on` et le parent comme phases discrètes ; rejouer la garde de présentation après sa modification.

V41 : deux scénarios composants, familles minage/logistique/persistance et pilote cœur regroupés ; parcours minier navigateur enrichi jusqu’au portage/rangement des composants. Audit natif `MINING_COMPONENTS=1` à 3/100 mineurs, quantités finales et programmes/buffers réels contrôlés.

V40 : deux scénarios `passive-cooling.test.ts` enrichissent combustible/température/reprise ; `integration/temperature.spec.ts` joue construction, inspection, recharge manuelle et comptabilise les pipelines natifs. `passive-cooling-bench.ts` mesure 3/30/100 transporteurs, sans navigateur concurrent. Le pilote propose un refroidisseur seulement dans une pièce chaude, et son bilan inclut le combustible de chaque appareil. Les températures initiales synthétiques ne valent pas météo livrée.

[Retour d’expérience des défauts visibles en jeu](playability-validation.md) : vérifier des critères utilisateur indépendants du code, séparer état final et chronologie affichée. `npm run test:presentation` impose le parcours naturel avec assertions et fait partie de `npm run check`. Il se lance aux changements d’horloge/bridge/présentation ou des phases de travail, pas après chaque retouche.

Réactivité des vitesses sous V38 : oracle indépendant de taux à la frame suivante, changements toutes les 100 ms, fractions du worker conservées, démarrage/reprise et pénurie de snapshots. Le banc de zones mesure clic→vitesse effective et les frames sans progression après amorçage. Ces contrôles remplacent l’ancienne attente de 400 ms à chaque commande positive.

Correctif de synchronisation sous V38 : enrichir les scénarios spatiaux et bridge avec changements rapides de vitesse/pause, phases de travail et disparition différée des ressources. Parcours natifs mouvement/transport et pilote UI, puis banc `harvest-sync-bench.mjs` (zones naturelles, changements répétés) et `mining-render-bench.mjs` (100 mineurs). Mesurer l’application de scène distinctement de la réception ; ignorer les callbacks sans rendu pendant préparation. Aucun changement de règle ne justifie de relancer toutes les migrations.

V38 : enrichir les deux scénarios `temperature.test.ts` (oracle spatial global, pièces/toits/portes adjacentes, échanges, chaud/froid, fusion/division, vrais transports, mélanges, seuil, migration, snapshots). Le pilote conserve ses bilans et ajoute les températures. Audit `scripts/temperature-bench.ts` sur 3/30/100 ateliers chauffés, avec reprise et coût de clonage séparé. L’atelier UI construit son feu et vérifie le réchauffement avant le pilote de trois jours.

V37 : deux scénarios profonds dans `light-work.test.ts` couvrent les familles de travail, le dégagement, les fractions, les coups capturés, les changements de milieu, les arêtes/diagonales/délais et la migration V36. Les fixtures pré-V37 sont construites sous leur cadence neutre ; elles ne requalifient pas des arêtes nouvelles en anciennes. Pilote multi-graines et UI de trois jours, parcours mouvement GPU et audit `scripts/light-work-bench.ts` à 3/30/100 travailleurs.

Présentation lumineuse sous V36 : scénario de rétention du champ et des ressources GPU ; parcours natif enrichi avec comparaison de pixels nuit/jour, extinction, mur, toiture et deux vues. Audits `scripts/environment-lighting-render-bench.mjs` à cent artisans/feux et `scripts/environment-lighting-overview-bench.mjs` sur forêt naturelle 250², avec témoin sans le shader et LOD distant vérifié. Le second contrôle aussi les véritables envois GPU après retrait/restauration arbre/roche et leur absence en pause. Les règles/commandes/sauvegardes étant inchangées, ne pas répéter le long pilote de trois jours pour cette tranche graphique.

V36 : `work-environment.test.ts` confronte un oracle de relaxation indépendant à la diffusion locale ; la famille production couvre unités/migrations, perte de feu, rôles et changements de taux. Le pilote conserve les bilans et expose les facteurs des postes. Audit `scripts/work-environment-bench.ts` avec 3/30/100 artisans et autant de feux ; UI courte puis pilote de trois jours.

Toiture V35 : enrichir les familles espace/temps/intégration avec `roofing.test.ts` et le scénario de pièces. Le pilote couvre 28 cellules du repas, garde ses bilans et son champ découvert ; le parcours UI ajoute les mêmes commandes. `roofing-bench.ts` et `roofing-render-bench.mjs` mesurent la même charge de 100 bâtisseurs, jusqu’à 2 500 cellules et 1 200 bois de défrichage.

V39 : croissance intégrée, sauvegarde/deltas et semis aux limites thermiques dans `temperature.test.ts` ; feu construit et progression réellement affichée dans `integration/farming.spec.ts`. Le pilote suit les facteurs végétaux. Audit CPU à 3/30/100 cultivateurs, comparaison tempérée/froide avec continuation.

## Principes

Maintenir peu de scénarios riches : effets de jeu, invariants, cas limites et diagnostics reproductibles. Un test qui relit simplement la valeur qu’il vient d’écrire apporte peu. Chaque bug important enrichit la famille correspondante ; ni une accumulation de petits tests ni une partie longue sans assertions ne garantissent l’absence d’anomalies.

La cohérence de notre simulation et la fidélité à RimWorld sont deux validations distinctes. Une règle de référence précise source, version, unité et contexte. La continuation de notre monde doit être exacte pour une même version de règles ; notre PRNG n’a pas à produire la séquence de RimWorld. Un oracle doit avoir une implémentation indépendante du chemin qu’il contrôle.

Regrouper les changements cohérents avant de lancer leur lot de contrôles. Après un échec, corriger sa cause et rejouer les scénarios concernés. Ne pas desserrer un seuil uniquement pour obtenir un résultat vert. Un fichier de rapport ancien reste daté ; il n’est pas une preuve d’exécution sur le code présent.

## Choisir les contrôles

| Changement | Contrôles nécessaires selon son contrat |
|---|---|
| Texte, couleur, détail procédural sans logique | Inspection visuelle ciblée ; pas de partie de trois jours. |
| Documentation | Liens, fragments, intégrité des sources et relecture du sens ; pas de suites gameplay. |
| Recette, besoin, réservations, transport ou planner | Scénarios du domaine avec bilans/interruptions/continuation ; pilote cœur si ses boucles changent. |
| Commande, persistance ou protocole worker | Refus atomiques, migrations et reconstruction ; parcours de la vraie UI/du worker. |
| Plusieurs boucles livrées ensemble ou régression de partie longue | Pilote cœur multi-graines, puis parcours UI de trois jours. |
| Navigation | Oracle, cibles inaccessibles, coins, trafic, obstacle ajouté et reprise ; audit à forte population si le coût change. |
| Rendu, caméra, interpolation | Contrôles purs des contrats et parcours graphique natif ; inspecter les captures, pas seulement la console. |
| Algorithme ou cycle de vie GPU | Oracle indépendant, exécution GPU réelle, révisions/bornes et audit avec rendu concurrent. Un backend absent ne vaut pas réussite. |

Compiler à l’intégration du lot. Les suites longues, compilations et benchmarks lourds ne tournent pas en concurrence. Vitest borne le parallélisme à deux workers ; les parcours navigateur utilisent un worker. Une optimisation interne conservant exactement les états n’exige pas de rejouer une longue UI déjà verte si ses contrôles n’ont pas changé.

L'audit `scripts/spatial-query-bench.ts` compare des empreintes SHA-256 du monde entier à cadence fixe et à achèvement, pour 3/30/100 bâtisseurs. Exécuter `before` sur la révision témoin exportée puis `after` sur le code modifié ; conserver même scénario, échauffement, cadence et machine. Hash/validation/snapshot sont hors mesure du tick. Cette égalité complète les bilans et l'oracle ; elle ne remplace pas un test d'une correction de règle volontaire. Navigation vérifie aussi égalités, réserve supérieure inaccessible puis ouverte et absence d'exploration d'un candidat déjà dominé ; loisirs vérifie fragments et retrait.

Une commande sans progrès doit être diagnostiquée puis arrêtée. Les scripts d’audit disposent de bornes ; le pilote long suit ses ticks et checkpoints, avec surveillance des attentes. Une partie de trois jours qui avance normalement prend plusieurs minutes : distinguer durée attendue et blocage. Si un arrêt est nécessaire, conserver motif et dernier état avant correction/reprise.

## Familles en place

La matrice conserve [cinq familles F1–F5](../gameplay/systems-matrix.md#stratégie-de-validation--peu-de-familles-scénarios-riches) : conservation/identité, temps/continuation, espace/topologie, intégration réelle, charge. Un scénario peut traverser plusieurs familles ; les nombres de lots qui se recouvrent ne s’additionnent pas en une couverture indépendante.

| Scénarios du dépôt | Risques contrôlés |
|---|---|
| `food-policy.test.ts` | Régimes partagés, copies, refus atomiques, faim, choix avant score/accès, repas engagé, transport/cuisine indépendants et migration V12 ; cuisinier affamé gardant son produit pendant l’attente de budget de navigation, sauvegarde/reprise ; pilote cœur/UI gérant les rations par commandes. |
| `schedules.test.ts` | Commandes atomiques, frontières horaires, lit réellement rejoint, famine/réveil, fin de travail, fatigue/effondrement et reprise ; le pilote décale la nuit de la cuisinière par commande. |
| `food-preservation.test.ts` | Âges pondérés, transferts, ingestion/recette au seuil, sol saturé, 40 jours, migration et pertes groupées ; pilote et UI incluent ces données. |
| `simulation.test.ts` | Priorités, transformations, annulations, besoins, propriété, corruption, reprise et soak multi-graines. Bilans et résultats métier, pas seulement hash. |
| `world-generation.test.ts` | Déterminisme 32 bits, dimensions jusqu’à 250² et rectangles extrêmes, rivières/massifs, accès du départ, distributions, débuts de camp et corridor long. |
| `spatial-contracts.test.ts`, `navigation-budget.test.ts` | Pile unique, capacité typée et matière conservée ; durées diagonales, coins, trafic et chemins. L’oracle de distances O(V²) des petites cartes ne réutilise ni file ni voisins du moteur ; 120 cartes comparent accès progressif, demandes pondérées successives et parcours complet, y compris les départages, emprises tournées et modifications des buffers appelants après capture. |
| `dining.test.ts`, `food-items.test.ts` | Portion réellement prélevée/portée/ingérée, place et lit réservés, interruptions, distances/préférences, confort/souvenirs et migration des aliments historiques. |
| `plant-cycle.test.ts`, `area-designation.test.ts` | Croissance, récolte, coupe, politique agricole, dégagement des piles, rectangles/empreintes, compatibilité, concurrence, interruption et refus atomiques. |
| `production.test.ts`, `player-cooking.test.ts` | V20 ajoute trois parcours profonds de cuisine forcée/file/réservations, reprise et dégagement manuel avant semis ; les mêmes scénarios couvrent expiration, factures et accès perdus. Trois scénarios combinent feu construit, deux jours de combustible/recharge, recette mélangée, conservation, travail interrompu/repris, deux postes concurrents, factures ordonnées et chef ravitaillant sans Transport. Les mêmes scénarios vérifient les diagnostics de phases et de blocages. |
| `bridge-snapshot.test.ts` | Reconstruction égale au monde autoritaire, snapshots antérieurs immuables, deltas invalides/périmés/manquants, ordre des clés, changement d’epoch et reprise sans état initial. Ce codec pur ne remplace pas le vrai worker. |
| `render-retention.test.ts`, `rock-surface.test.ts` | Identité/capacité/libération des buffers, retraits et restauration de chunks, faces rocheuses exposées. Un retrait injecté ne vaut pas minage jouable. |
| `daylight-camera.test.ts`, `frame-metrics.test.ts` | Cadrage/projections, temps du ciel, pauses/cadence, longues images et bornes des métriques. |
| `gpu-navigation.test.ts` | Contrats du laboratoire : résultats, capacités et révisions. Le laboratoire ne dirige pas les colons. |
| `construction.test.ts` | V21 enrichit cinq scénarios : profils des six meubles, objets conservés/dégagés, réservations libérées, zones retirées sans perte, dessin agricole dans les deux sens et migration stricte. |
| `integration/*.spec.ts` | Commandes et gestes réels, UI, worker, sauvegardes et présentation ; les fixtures synthétiques sont signalées. |

Le parcours de frontières conserve le rendu logiciel/WebGL 2, notamment pour les contrôles compacts et la migration historique dans le worker. Les parcours matériels lancent Chromium normal et vérifient le backend obtenu. Un canvas visible et un compteur FPS ne suffisent pas : capturer les erreurs console/GPU et inspecter effectivement la pose ou l’aperçu testé.

V14 enrichit la famille spatiale avec un couloir d'une case : deux traversées opposées, dormeur central immobile, lits exclusifs, deux cargaisons qui se croisent, refus des superpositions V13 et reprise V14 au milieu des arêtes. La cuisine vérifie aussi qu'un effondrement au sol ne vole pas le poste. `integration/movement.spec.ts` conserve son contrôle de vitesse/orientation GPU et ajoute migration V13, pause sur une cellule partagée, sauvegarde/rechargement et arrivée dans trois lits via le vrai worker. La fixture commune `scenarios/civil-traffic.ts` est synthétique ; elle ne remplace pas le pilote ordinaire.

Les assertions d’état navigateur comparent un JSON complet sans sérialiser chaque sous-objet séparément par le protocole du pilote. Le suivi courant utilise les ticks ; récupérer un monde complet seulement aux étapes utiles. Pour une phase brève, observer puis cliquer le vrai bouton Pause dans le même callback, attendre son acquittement et vérifier que la phase attendue existe encore.

Le pilote de gestes cadre les cellules par de vrais mouvements de molette et vérifie qu’elles atteignent le canvas, hors panneaux. Une géométrie cachée ne prouve pas la visibilité d’un aperçu ; capturer le rectangle pendant que le pointeur reste maintenu. L’injection de perte de focus dans son test reste explicitement qualifiée comme telle.

## Pilote de colonie

**Revue de progression du 19 septembre :** les parcours existants démontrent les résultats de leur camp, pas la diversité des décisions ni l’intérêt d’une partie. Avec les prochaines boucles, adapter la politique à une population variable, puis à un incident et à ses suites, par les commandes publiques. Conserver un témoin paisible et des branches rares contrôlées ; distinguer déclenchement naturel, événement forcé de test et fixture synthétique. La première adaptation de population est livrée en V66 ; le comportement face aux menaces reste à développer. Une revue du jeu lancé accompagne les livraisons ; les tests ne mesurent pas automatiquement le plaisir de jouer. Voir la [revue stratégique](../research/progression-review-2026-09-19.md).

`tests/scenarios/colony-player.ts` est la politique commune du joueur : elle lit le monde et produit des commandes motivées, sans le modifier directement. Elle développe réserves, trois lits, table/tabourets, murs, riz et feu, maintient une facture et collecte les ingrédients nécessaires même si les rations initiales couvrent encore la faim. La [recherche de progression](../research/colony-progression.md) distingue ce pilote d’une mesure empirique des joueurs de RimWorld.

- `colony-player.test.ts` joue cinq jours sur trois graines 250², dont la graine 42 prolongée à huit jours. Celle-ci décide toutes les quatre heures comme le navigateur, les autres toutes les heures. Contrôler matière, ingestions, sommeil par colon, camp, cultures, repas et reprise quotidienne.
- `integration/colony-journey.spec.ts` joue trois jours via la vraie UI et le vrai worker WebGPU, avec décisions toutes les quatre heures et sauvegardes quotidiennes. Aucun saut de temps ni stock artificiel après démarrage. Ce parcours de plusieurs minutes n’est pas un benchmark graphique.
- La chaîne agricole complète jusqu’à maturité et second semis est testée au cœur ; trois jours de navigateur ne suffisent pas à la prouver. Un checkpoint mûr synthétique utilisé ailleurs dans l’UI reste distinct de la progression du joueur.

Le résumé du pilote relève aussi les cellules partagées par plusieurs colons. Il n'impose pas qu'un nombre arbitraire de croisements survienne dans une partie naturelle ; le corridor dédié vérifie cette propriété de façon contrôlée. Conservation et progression restent ses critères métier.

Le bilan du bois inclut matériaux présents, constructions et combustible restant/brûlé. Le bilan alimentaire distingue récoltes, unités présentes et mangées, et conversion de **dix ingrédients en un repas** : ajouter neuf unités retirées par repas fabriqué. La nutrition n’est pas conservée par cette transformation. À chaque nouvelle mécanique, enrichir ce même bilan et ses objectifs plutôt que multiplier les pilotes.

## Diagnostics et mesures

Faire un audit aux changements de boucle, d’algorithme ou de cycle de vie graphique et toutes les deux ou trois tranches qui augmentent la charge. Reprendre le cas à cent acteurs lorsqu’il est affecté. Conserver machine, backend, versions, carte, scénario, durée, échauffement, percentiles, maxima et résultats métier. Aucune conversion d’une capacité de buffer ou d’un test logiciel en FPS promis.

| Audit | Portée et limites |
|---|---|
| `scripts/cooking-bench.ts` | 3/30/100 acteurs actifs sur 250² : cuisine, combustible, champs, chantier et stockage. Ticks individuels, état final validé, matières et diagnostics de recherche. `visited` compte les cellules pondérées finalisées, `connectivityVisited` celles développées pour l'accès ; ne pas confondre leur coût. Avec plusieurs répétitions, les percentiles agrègent les ticks, les bilans/compteurs détaillés décrivent la dernière répétition. Setup hors mesure ; bornes explicites et surveillance à 90 secondes. |
| `scripts/cooking-render-bench.mjs` | Worker réel et GPU natif, 60 images d’échauffement puis au moins 300 images/cinq secondes par vue. RAF, soumission CPU, appels, triangles et progression séparés. Locale/générale avancent successivement le monde : pas un comparatif caméra à état identique. |
| `scripts/navigation-continuation-audit.ts` | `capture|compare <dossier-tmp> <rapport.json>` : avant/après optimisation, égalité byte pour byte de quinze sauvegardes complètes, 3/30/100 colons aux ticks 1/100/300/600/1000. Rapports SHA-256 compacts, mondes dans `tmp`. Pas de mesure de performance. |
| `scripts/navigation-parity.ts` | `record|compare` : 30 états complets aux ticks 1/100/150/300/450 pour 3/30/100 colons, cuisine ordinaire et faim simultanée avec régimes. Enregistrer sur la version précédente avant modification, puis comparer exactement les chaînes sauvegardées dans `tmp/navigation-access-baseline` ; les SHA-256 servent à la provenance. La faim injectée distingue ce stress du pilote ordinaire. Watchdog 120 s. |
| `scripts/needs-bench.ts`, `scripts/dining-bench.ts` et variantes de rendu | Charges de repas/couchages. Préciser le profil alimentaire, les fixtures et leur schéma ; ne pas comparer comme identiques des règles différentes. |
| `scripts/map-bridge-bench.ts` | Microbenchmark Node de clone/encodage/adoption : ni IPC navigateur, ni GPU, ni gameplay. Options tailles/graine/échantillons/échauffement/sortie bornées ; égalité hors chronométrage. |
| `scripts/gpu-navigation-bench.mjs` | Kernels réels contre oracle : coûts/chemins, murs/labyrinthes/bords, pondération, sortie, révisions et concurrence. Mesurer aussi la lecture GPU et le rendu concurrent. |

Sur grande carte, séparer génération, sérialisation, communication/adoption, simulation et rendu. Le temps CPU de soumission n’est pas un temps GPU, et le p95 de moyennes de lots n’est pas le p95 des ticks. La métrique worker publiée à l’écran peut répéter une même moyenne sur plusieurs frames. La mémoire JSON ou comptée par Three n’est pas tout le heap ou le pilote.

Comparer à carte/population/cadrage/actions équivalents et sans autre build/test lourd en parallèle. Les audits anciens sur moteur à bornes étendues sont [archivés et qualifiés](../history/map-scale-v2.md) ; leurs chiffres ne remplacent pas les [preuves courantes](validation.md). Captures inspectées et erreurs sont consignées dans la validation, les rapports bruts dans `artifacts/`.

`scripts/compact-ui-report.py` extrait les grands checkpoints base64 vers `tmp/<rapport>-checkpoints` en gardant tick, taille et SHA-256 dans le JSON versionné. Il conserve erreurs et assertions, y compris pour les essais échoués. Ne pas supprimer une preuve d’échec diagnostiqué pour présenter artificiellement tous les passages comme réussis.

L’audit de minage observe aussi les créations natives de pipelines. Les premiers dépôts doivent réutiliser les ombres préparées ; le témoin peut désactiver uniquement leur helper. Les traces GPU sont des diagnostics bornés et intrusifs, séparés des percentiles sans trace. Voir [préparation et reproduction](shadow-preparation.md). La restauration des lots vides ne doit pas écraser un snapshot reçu pendant l’attente de la file GPU.

## Exploiter les scénarios du référentiel

Le [corpus utilisateur](../research/reference-adoption.md) fournit 196 propositions TEST, pas des tests directement exécutables. TEST-001..181 reformulent les contrats SYS ; ils enrichissent nos familles sans créer une suite par ligne. Les quinze autres entrées peuvent être plus précises, synthétiques ou propres à une version/extension. Le statut d’une cellule du classeur ne vaut pas validation locale.

Le chapitre 32 (PDF pages 39–40) propose les interactions suivantes. Leur calendrier appartient uniquement à ROADMAP.

| Scène | Adoption et familles |
|---|---|
| A — Cuisine interrompue | G0 : pile partagée, destination filtrée, annulation/reprise ; G1 : ingrédients/recette ; G2 : panne électrique. F1 conservation et F2 continuation à chaque transition. |
| B — Combat et cible mobile | G3 : mobilisation, porte, couvert, allié/cible déplacés ; séparer émission et impact. F3 topologie, F2 séquence. |
| C — Maladie et transfert du patient | G3 : soins, médecine, interruption/durée ; G5 : départ en caravane. F1 transferts, F2 durée/reprise. |
| D — Caravane aller-retour | G5 : propriétaires avant/après chaque transfert, individus/piles/consommation. F1 identité, F2 voyage/sauvegarde. |
| E — Pièces, énergie et incendie | G2 : portes/toits/réseaux et feu injecté sans exiger déjà le narrateur ; dégâts aux personnes en G3. F3 topologie, F2 échanges. |

F4 exerce les commandes dans le navigateur quand elles existent ; F5 mesure leur charge représentative. La profondeur combine cas imposés, interactions avec invariants et distributions seulement pour les systèmes probabilistes concernés. Fixer tailles d’échantillon et seuils avant observation ; TEST-182..194 nécessitent l’adoption de leur modèle, TEST-195/196 leur contexte DLC/correctif.

## Documentation

`python scripts/check-docs.py` contrôle liens locaux, fragments, les 25 domaines/cinq familles de la matrice et les SHA-256 des trois originaux. Il ne vérifie pas la vérité du gameplay. Relire le contrat et le code lorsqu’une ancienne formulation contredit une fonctionnalité livrée ; garder le passé dans Git/ADR/history, pas dans une seconde description actuelle.

## Loisirs V15

`recreation.test.ts` couvre trois scénarios : taux/seuils/hystérésis, construction livrée et trois places concurrentes avec trajets/rejeu/obstacles, puis observation physique et migration. Les fixtures historiques omettent les champs plus récents ; les clones de personnes sont profonds pour ne pas partager leur lassitude. Le pilote normal construit le piquet et peint les loisirs du soir ; ses bilans alimentaires et matériels restent exigés. L’UI courte valide aussi les poses et les contrôles ; la partie longue vérifie les deux activités et les sauvegardes quotidiennes.

`scripts/recreation-bench.ts` : 3/30/100 colons, faim/repos actifs, besoin de loisirs initial faible, piquets partagés et camp de travail ; deux passes de 600 ticks, setup et contrôles exclus. Les compteurs d’activité prouvent la charge réellement exercée. Ce stress synthétique complète le pilote humain, sans se faire passer pour une partie ordinaire.

`scripts/cooking-render-bench.mjs artifacts/recreation-render.json 3,30,100 recreation` reprend le même protocole matériel avec les activités de loisirs et conserve leurs effectifs réels. Les modes cuisine et loisirs restent distincts ; aucun travail n’est observé dans la fenêtre de besoin de loisirs bas.

## Chantiers V16

`construction.test.ts` combine trois scénarios matériels/spatiaux : pile typée avec fraîcheur et trois portages, annulation/rejeu en cargaison, plantes dans empreinte tournée et priorités, transporteur sans Construction, arêtes de cadre, finition/diagonale/service et migration stricte. L’index de décision est comparé à la recherche directe. L’oracle spatial incorpore des coûts de cadres.

`integration/construction.spec.ts` : fixture synthétique V15, construction sur pile par l’UI, portage observé, reprise en cargaison et cadre, bilan final. Le pilote normal évite de commander une seconde coupe sur une empreinte tout juste planifiée ; ses résumés recensent plans/cadres/dégagements. La partie de trois jours exige un dégagement naturel et garde bilans, activités et rechargements quotidiens. Suites ciblées groupées, puis audit CPU et rendu successifs ; pas de suite entière pour la documentation.

## Sélection et ordres V17

`player-orders.test.ts` approfondit interruptions, réservation exclusive de la file, accès perdu, métier 0 avant/après acceptation, fatigue, repas engagés et reprise V16/V17. `integration/player-orders.spec.ts` exerce Maj, rectangle, double-clic, annulation, deux projections, refus, ordres et sauvegarde par l’UI. Le pilote rapide et le parcours de trois jours ajoutent les deux premiers lots de bois par ordres directs après leurs désignations.

`scripts/player-orders-render-bench.mjs` garde un même monde de cent colons en pause (après 75 ticks réels dans des camps synthétiques sur 250²) ; par vue, compare 0/1/100/0 sélections avec 60 images d’échauffement et au moins 300 images/trois secondes. Les callbacks UI sont instrumentés ; le menu passe par le vrai worker. Mesurer appels, triangles, RAF, soumission CPU, coût ponctuel de sélection et 30 allers-retours de requête sans mutation. Ce test en pause ne remplace pas l’audit CPU de cent travailleurs actifs.

## Lots de travail V18

`player-hauling.test.ts` complète la famille existante : fractions réservées simultanément et en file, capacités typées, source/destination perdues, livraison sans finition, identité/âge à l'interruption, migration stricte V17 et reprise pendant le portage. Le même parcours UI des ordres couvre livraison → stockage → finition ; le pilote demande une livraison de couchage et le rangement des rations au démarrage.

Workflow : terminer ensemble code, fixtures et pilote, compiler à l'intégration et grouper les contrôles des contrats touchés. Réutiliser les preuves des sous-systèmes inchangés ; ne rejouer un long parcours réussi que si une correction touche son déroulement. Les documents peuvent être entretenus pendant les tests, les sources/configurations de leur exécution restent stables. Un audit CPU suffit lorsque seule la simulation matérielle change ; le nombre d'appels GPU n'est pas réannoncé comme une nouvelle mesure.

L’option `occupancy` de `scripts/cooking-render-bench.mjs` ajoute vingt tables et vingt tabourets portant des piles dans la fixture à cent acteurs. C’est un stress de surfaces synthétique ; ses routes diffèrent du témoin cuisine. Le nombre de travailleurs et les loisirs en fin de phase restent relevés pour ne pas présenter une population inactive comme une foule de bâtisseurs.

## Mobilier V22

`furniture-travel.test.ts` confronte les coûts dirigés à un oracle indépendant sur quatre rotations, puis combine portages opposés, sortie après interruption et migration stricte. `integration/movement.spec.ts` observe aussi le partage des attributs réellement soumis à WebGPU, les hauteurs de traversée et la reprise avec cargaison. Ce n’est pas une lecture GPU des sommets. Les résumés du pilote comptent déplacements avec supplément et intentions de sortie sans exiger qu’un nombre arbitraire survienne naturellement.

V23 : `priority-work.test.ts` ajoute trois scénarios profonds aux familles d’ordres existantes ; la longue colonie et ses diagnostics suivent aussi les intentions maintenues. Le parcours UI de chantier vérifie un seul clic initial, annulation, sauvegarde et lit terminé avec voisin intact ; le parcours de cuisine demande désormais deux recettes successives. L’audit `cooking-bench --prioritized=true` ajoute des ordres acceptés de cuisine/construction à la même fixture ; scénario différent de la référence automatique, à ne pas comparer comme une optimisation à comportement identique.

## Retrait des bâtiments V24

Les quatre scénarios de `tests/deconstruction.test.ts` couvrent récupération, interruption, réservations, migration et refus atomiques. Le pilote commun ouvre un passage après le premier jour ; `woodAccount` inclut pertes et combustible retiré. Le parcours UI dédié exerce le rectangle et les boutons d’inspection. Les lots élargis ne doivent pas réintroduire l’ancienne attente d’un plan de mur bloquant : seuls les ouvrages finis font obstacle. Les audits de déconstruction séparent ticks CPU et frames WebGPU natives ; exécuter ces mesures sans autre suite lourde simultanée.

## Meubles conservés V25

`tests/furniture-transfer.test.ts` regroupe quatre scénarios : retrait/prise/dépôt/pose, rotation et lit occupé, saturation et refus atomiques, migrations strictes et replay/snapshots. Le bilan du pilote inclut les objets emballés ; la colonie réinstalle son piquet après le premier jour. Le parcours UI dédié recharge un lit en plein portage et utilise les boutons sur meuble et paquet. Le banc `scripts/furniture-transfer-bench.ts` mesure 3/30/100 bâtisseurs, avec ticks actifs séparés. Exécuter la mesure hors des suites navigateur et des compilations.

V26 : `tests/furniture-logistics.test.ts` ajoute cinq scénarios de réservation de case entière, files, politiques, saturation, priorité égale/supérieure, dégagement local, conservation sur meuble compatible, annulation/preemption et réinstallation par Transport. Le pilote retire, range puis réinstalle le piquet par les commandes existantes. `furniture-logistics.spec.ts` vérifie le filtre, le clic droit, la sauvegarde portée et la repose avec Construction désactivée. `scripts/furniture-logistics-bench.ts` mesure 3/30/100 transporteurs et sépare ticks actifs et période après rangement. Réutiliser ces scénarios pour les prochains types d'objets entiers ; pas une suite par future définition.

## Identités géologiques V27

Enrichir génération, snapshots et surface résidente ; le court parcours `geology.spec.ts` vérifie inspection, migration et sauvegarde par l’UI. Les commandes de colonie ne changent pas : rejouer le pilote Node de plusieurs jours dans le lot de simulation, sans imposer un nouveau long parcours UI pour ces métadonnées. `geology-bench.ts` compare le générateur V26 épinglé aux résultats normalisés et mesure création/encodage ; `rock-edit-bench.mjs <rapport> [legacy]` mesure les retraits graphiques sur GPU natif. Ne pas confondre ces injections avec du minage ni `render.calls` cumulatif avec `render.drawCalls` par image.

V28 : `mining.test.ts` combine contact/coups/sauvegarde, typage des cinq produits, demandes de transport et coûts de terrain. Le pilote ajoute quatre extractions après installation du camp et range leurs produits ; ses bilans alimentaires et bois restent inchangés. `integration/mining.spec.ts` vérifie ces commandes dans le vrai worker. Le pilote UI sait aussi déplacer la caméra par un glissement du bouton central quand le dézoom ne suffit pas à révéler une cible. Les bancs `mining-bench.ts` et `mining-render-bench.mjs` mesurent 3/30/100 acteurs sur 250², hors vérification des invariants.

V29 enrichit le scénario de minage avec gisements connectés, réserve d’acier, saturation du dernier coup, transfert 75+5, type incompatible, marche et migration stricte. Le pilote cœur/browser mine deux gisements après son camp et vérifie 80 acier rangés ; choix de cases libres plutôt que coordonnées supposées vides. Les audits existants acceptent maintenant une charge de minerai (`steel`) en plus de la pierre, sans nouvelle famille de benchmark.

Le helper UI `panel` attend la fin de l’état `inert` avant d’inspecter ou ouvrir un panneau : le nouveau World peut être visible avant la fin de la préparation graphique. Ne pas compenser cette course par de longs délais fixes ou une hausse des timeouts. Pour le rendu des boîtes, le scénario de rétention couvre aussi la propriété indépendante des petites géométries et la croissance sans libérer un lot voisin ; le banc natif vérifie les pipelines réels.

V30 enrichit la construction avec trois scénarios de matériaux : approvisionnement concurrent typé, portage/annulation/reprise, meuble acier réinstallé/remboursé, champs futurs et recette historique. Le pilote calcule les besoins bois depuis les exigences des ouvrages ; ses nouveaux lits coûtent 45. Le petit essai de génération 8² vérifie mur + tabouret, qui tiennent dans ses 36 bois, et ne prétend plus financer un lit moderne. Les trois graines naturelles 250² restent le contrôle de progression du camp complet. Audit `construction-bench.ts` séparant ticks/snapshots et vérifiant 200 constructions avec 100 colons.

V31 enrichit les mêmes familles avec atelier mixte, agrégation de 105 acier, emprise centrée 3×1, progression longue, retrait atomique de deux ingrédients et transit dans quatre rotations. Le pilote naturel prépare un atelier et comptabilise 30 acier incorporés + 50 en réserve. Le mode `--workshops` du banc construction conserve mesure CPU/snapshot séparée ; le mode `CONSTRUCTION_WORKSHOPS=1` du banc natif existant mesure cent bâtisseurs, sans créer une nouvelle famille de test par bâtiment. [Contrat](stonecutter.md).

V32 enrichit `stonecutting.test.ts` (trois scénarios profonds), les parcours `production.spec.ts` et le pilote partagé. Bancs existants : `cooking-bench.ts --stonecutting=true` et `STONECUTTING=1` pour `mining-render-bench.mjs`. Leurs champs historiques `cooked`/`mined` comptent ici des recettes terminées, pas des repas/minages. [Validation](validation.md).

V33 enrichit les contrôles de matériaux avec `stone-buildings.test.ts` (trois scénarios profonds), le pilote naturel avec un mur produit depuis le minage, et `construction-bench.ts --stone`. Rejouer le parcours UI production→construction et la colonie lorsque ces commandes ou leur persistance changent ; une simple couleur de pierre ne justifie pas ce long parcours.

## Portes V34

Les trois scénarios `doors.test.ts` croisent variantes, livraisons, attente, trafic, obstruction, permissions, sauvegarde et déconstruction. L'oracle indépendant de `navigation-budget.test.ts` reçoit aussi des portes ouvertes, fermées et interdites ; la rétention GPU existante inclut croissance/retrait/réouverture. Le pilote naturel construit sa porte après la première journée. Parcours court `doors.spec.ts` et parcours UI existant de trois jours ; mesures séparées `doors-bench.ts` / `doors-render-bench.mjs`, bornées et avec résultats métier. Le profil CPU sert au prochain lot d'optimisation, pas à annoncer un budget respecté.

## Première topologie des pièces sous V34

`room-topology.test.ts` enrichit F3 avec deux scénarios profonds : oracle indépendant par union sur 80 rectangles, mutations en place et instantanés conservés ; puis vraie déconstruction, plan/cadre, reconstruction, minage et replay. `integration/rooms.spec.ts` contrôle le panneau dans le vrai worker, porte traversée et maintenue ouverte, brèche et rechargement, réouverture de l’inspection en pause. Le banc `scripts/room-topology-bench.ts` sépare vérification inchangée et recalcul sur 250² avec 4 000 murs ; aucune inférence sur les FPS. Les boucles du pilote ne changent pas dans ce lot de lecture seule ; la toiture l’enrichira.

Le pilote UI conserve `artifacts/colony-last-journey.json` et `tmp/colony-last-checkpoint.json` en cas d’échec, indépendamment du reporter. Copier un bilan nommé dans les preuves publiées après livraison. Un chargement n’est vérifié qu’après la fin de la préparation : l’ancien snapshot peut être identique à la valeur attendue avant même la réponse du worker. Le scénario toiture retarde la réponse de sauvegarde pour vérifier que Charger attend sa persistance.

Pour les lots avec UI modifiée, lancer le parcours UI court du domaine avant la partie longue ; cela évite de découvrir un simple problème de contrôle après plusieurs minutes de simulation. Une file d’entretien encore présente à minuit n’est pas un blocage : préserver l’exigence sur les constructions et prouver que les ordres concernés se terminent au réveil normal, sans injection d’état. Les fixtures de charge soutenue fournissent des rations physiquement accessibles ou déclarent explicitement qu’elles mesurent la famine.

Le diagnostic `HARVEST_TRACE=1` du banc de récolte horodate séparément publication/réception et lots worker (réveil, simulation, encodage, envoi). L’instrumentation est injectée uniquement dans la page/worker du banc et ne modifie pas la simulation ni le protocole de production. Ses temps restent séparés des passages ordinaires ; une exécution sans attente n’efface pas un délai de contrôle hors budget.

## Conditions matérielles concurrentes

Avant de conclure à une régression de performance, relever les programmes lourds concurrents avec une courte mesure d’activité, sans les arrêter. Si la machine est occupée, conserver les mesures comme telles et distinguer le contrat fonctionnel, l’échec de garde et l’attribution de la cause. Ne pas assouplir le tampon ni les seuils pour obtenir une passe verte. V56 conserve les premières attentes de minage et le succès séparé d’abattage ; la reprise V56 sans autre jeu 3D passe sur minage/abattage ; les résultats précédents restent conservés et ne sont pas attribués rétrospectivement à une cause unique.





Reprise ciblée d’une maintenance réelle : `COLONY_MAINTENANCE_CHECKPOINT=chemin` puis Playwright `colony-journey.spec.ts --grep "checkpoint maintenance"`. Charge une sauvegarde enregistrée par la vraie UI et réutilise la phase de maintenance du pilote complet. Les stocks/travaux doivent finir après sommeil normal dans le même budget, sans injection ; ce succès ne vaut pas une passe globale du parcours. V63 déplace la vérification du rangement de l’acier à cette phase, en conservant quantité totale à minuit et rangement final obligatoire.
