# Plan de développement

État : **19 septembre 2026, après V74**. ROADMAP est l’unique calendrier G0–G5. G0 en consolidation, G1/G2/G3 partiels, G4 engagé par l’accueil, G5 absent ; aucun jalon complet. Les numéros de schéma ne mesurent pas l’avancement du jeu. [Inventaire réel](gameplay/implementation-status.md), [preuves](development/validation.md), [index](README.md).

Dernière fonctionnalité publiée : [canicule V74](development/heatwave.md), protection vestimentaire et refuge refroidi face à une exposition réelle. [Preuves](history/validation-heatwave-v74.md). La recherche et le tailleur V73 donnent toujours un projet collectif puis une chemise confectionnée et portée dans le camp. L’étape proche 4 est satisfaite par cette boucle, sans terminer l’arbre technologique ni le catalogue. [Preuves](history/validation-research-v73.md). Accueil, menace et première différenciation des personnes restent livrés dans leurs périmètres annoncés.

## Priorité actuelle

**Mode jour.** L’automatisation nocturne reste en pause. Une livraison cohérente, validation adaptée, commit/push explicatif, puis retour utilisateur.

La [revue de progression du 19 septembre](research/progression-review-2026-09-19.md) remplace l’ordre « terminer pensées/traits/relations, puis ouvrir les incidents ». Les interactions physiques, cas limites, migrations et budgets restent exigés. Nous avançons maintenant par changements vécus dans la colonie, en traversant G1–G4 selon leurs dépendances. Les jalons sont des domaines de couverture, pas des portes obligeant à finir tout G3 avant G4.

**Première tranche de l’étape 5 livrée : canicule V74.** Le cadrage a retenu une chaleur temporaire, avec tenue tribale et refuge passif déjà obtenables, plutôt qu’un hiver incomplet. Calendrier, température, croissance et santé ont des conséquences réelles ; le camp traverse l’événement par commandes et secours. L’étape 5 reste ouverte.

**Prochain lot visé : première conservation au froid obtenable.** Rechercher le climatiseur électrique Core, sa face froide/chaude, température cible, demande électrique et réponse aux coupures. Décision nouvelle : investir bois/acier/composants et énergie pour protéger des provisions périssables. Réutiliser générateur, air local et âges existants ; ne pas terminer câbles, batteries ou tous les appareils avant cette boucle. Critère d’arrêt : un petit garde-manger construit, alimenté puis privé d’énergie conserve/reprend réellement les âges, avec chaleur rejetée, perte de nourriture possible et reprise exacte. Coûts/recherche/placement à vérifier avant code. Saisons et froid corporel viendront avec mortalité végétale, protection et chauffage ; aucune saison seulement cosmétique.

| Ordre de priorité | Résultat que le joueur doit pouvoir constater | Limite de périmètre |
|---|---|---|
| 1 — Population qui évolue, première tranche V66 livrée (G0/G1/G3/G4) | Un arrivant entre réellement sur la carte, rejoint les interfaces et politiques pertinentes, consomme et travaille ; le joueur adapte couchage, production et affectations. | Compétences déjà actives réutilisées ; générer un profil cohérent sans prétendre livrer biographies/traits complets. Calendrier persistant avec premier incident réel, sans moteur de quêtes général. |
| 2 — Menace et conséquences dans le camp, première boucle V68 livrée (G2/G3/G4) | Alerte en cours de partie, préparation/défense, issue de la menace, blessés soignés et reprise ou perte réelle. | Examiner camp fermé, dégâts/réparation nécessaires et gestion des victimes ; découper en livraisons visibles si nécessaire. Ni ennemi figé à une porte ni disparition sans conséquence. Pas toutes les factions/stratégies ni un narrateur complet. |
| 3 — Personnes distinctes : première tranche V69/V70 livrée (G1/G3) | Des différences de caractère et premières interactions/opinions changent les affectations ou l’humeur, avec causes inspectables. | Petit ensemble de traits/interactions Core réellement actifs ; ne pas enchaîner tout le catalogue de psychologie avant la progression matérielle. |
| 4 — Premier objectif de production, tranche V71–V73 livrée (G1/G4) | Une filière obtenable permet de fabriquer un équipement utile ; première recherche reliée à un vrai déblocage admissible. | Vérifier les déblocages d’origine : ne pas inventer de recherche pour une recette de départ. Matière → atelier → travail → produit → usage, sans terminer l’arbre technologique ni tous les ateliers. |
| 5 — Pressions environnementales : première canicule V74 livrée (G2) | Les conditions du site obligent à prévoir aliments, protection ou réserve ; climat et risques ont des effets réels. | Saisons/météo, risques et chaîne du froid selon dépendances. L’électricité utile revient avec son besoin concret ; interrupteurs/conduits ne deviennent pas un préalable à toute la colonie. |

Les animaux, la chasse, le commerce, les prisonniers, les nombreuses familles de contenu, le monde et les objectifs longs restent dans G1–G5 et l’inventaire. Cet ordre proche n’est pas une suppression de ces systèmes. Après les trois premières livraisons cohérentes, réexaminer la progression visible et l’ordre suivant ; les lignes ci-dessus ne sont pas une promesse d’un commit chacune.

Avant chaque lot, écrire : décision nouvelle du joueur, invariant indispensable, comportements nécessaires à la boucle, extensions différées et critère d’arrêt. Toute dépendance dépassant ce périmètre déclenche une revue ; ne pas terminer par inertie le domaine voisin. Les corrections de stabilité importantes peuvent interrompre cette priorité, avec leur motif explicite.

**Acceptation d’une livraison visible :** chemin accessible dans une partie ordinaire, conséquence expliquée, manipulation physique, sauvegarde/reprise pendant les transitions et scénario de colonie adapté. Les branches rares ont aussi des fixtures contrôlées. Le pilote adapte sa politique à l’accueil d’une quatrième personne et à l’assaut du camp : mobilisation, défense, démobilisation et reprise sur cinq jours. Le parcours observé V68 ne blesse aucun colon ; les scénarios de rencontre restent nécessaires pour prouver secours/soins après des impacts réels.

## Contrats de progression

La grille plane 3D low poly, les interactions physiques, l’UI de référence et le [corpus](research/reference-adoption.md) restent la cible. Les [adaptations](gameplay/decisions.md) sont explicites. Carte 250², simulation déterministe, travail ordonné, sauvegardes migrées strictement et rendu GPU sont des frontières maintenues, pas des raisons de retarder indéfiniment le gameplay.

Tests regroupés par contrats : conservation, continuation, espace, véritable partie UI/worker et charge. Enrichir le pilote de colonie aux nouvelles boucles ; profiler régulièrement 3/30/100 colons avec activités mixtes et scènes chargées, sans prétendre couvrir toutes les combinaisons. Garder les pointes et échecs observés dans les preuves, même si une reprise passe.

## G0 — Socle et continuité

Contrats livrés : définitions immuables ciblées, propriété unique, pile au sol par cellule, réservations quantitatives, livraison avant construction, reprise exacte, commandes ordonnées et refus atomiques. Navigation CPU à huit voisins, progression euclidienne ; le laboratoire GPU est indépendant.

À compléter :

- Zones nommées et politiques partagées ; filtres enrichis au rythme du contenu.
- V17 : sélection multiple et file de travaux exécutables avec motifs de refus livrées. V18 complète transport et approvisionnement avec réservations quantitatives. V19 ajoute dégagement des chantiers et combustible forcés. V20 ajoute dégagement des piles sur semis et cuisine forcée. V23 complète le maintien sur la cellule pour les familles présentes. Restent autres familles sélectionnables et fournisseurs liés aux contenus absents ; [contrat](development/player-orders.md).
- Construction V16 : plan/cadre/ouvrage, dégagement des piles/plantes et approvisionnement par bâtisseur livrés. V21 ajoute coexistence par définition et plans dans les réserves. V22 ajoute franchissement/coûts/arrêt du mobilier présent. Restent autres profils et déplacement des personnes gênantes ; voir [contrat](development/construction.md).
- Étendre les profils de franchissement et cases de travail à mesure que les activités arrivent ; passage civil et distinction avec les réservations de lits/repas/postes livrés en V14. La présence d’un colon ne ferme plus un couloir. Collisions hostiles debout V58 ; autres profils à compléter avec G3 ; lisibilité 3D des superpositions encore partielle.
- Manifeste de contenu/générateur, journal complet des commandes datées, export/import et garanties d’évolution.

**Acceptation G0 :** trois colons développent un camp par des commandes explicables ; matériaux conservés à chaque transition, engagements sans duplication, continuation exacte pendant les transports, contrôle de charge reproductible. Les premiers scénarios passent ; les manques ci-dessus empêchent de déclarer le jalon clos.

## G1 — Survie quotidienne

Agriculture et croissance, récolte renouvelable, cuisine avec recettes et files de fabrication, conservation des aliments, couchages réservés et trajets vers les lits, horaires et vrais besoins. Les relations de temps et de ressources doivent créer des arbitrages lisibles. Introduire traits et compétences seulement avec leurs effets mesurables.

Le corpus précise cette tranche : croissance intégrée sur le temps favorable, factures avec critères d'ingrédients et de comptage, repas réellement accessibles/transportés/ingérés, besoins séparés des jobs qui les satisfont. Ajouter l'explication des statistiques sur les premières valeurs effectivement utilisées. L'expiration des trois aliments périssables est livrée ici ; les effets des pièces, du refroidissement et de l'électricité relèvent de G2.

**Acceptation :** colonie autonome plusieurs jours avec alimentation produite et consommée ; effets vérifiables de compétence, distance, stock insuffisant et interruption. Le tutoriel doit expliquer les raisons d'un échec de survie.

## G2 — Habitat et environnement

Minage, déconstruction, portes, pièces et toits, températures intérieur/extérieur, saisons, météo persistante, électricité et incendies. Développer les types de sols, les cinq roches naturelles de base et les minerais, les espèces et biomes locaux avec leurs propriétés ; différencier sol découvert, bloc rocheux, chunk et matériau taillé. Le cycle visuel déjà livré ne vaut pas simulation de ces systèmes. La topologie des enceintes est livrée pour l’inspection, avec vérification des obstacles et recalcul global mesuré, séparée de la navigation. Les premiers consommateurs de production et de température sont livrés ; autres consommateurs, climat complet et invalidation locale de la topologie générale restent à développer. Prévoir coupe visuelle des toits/murs dès l'introduction de pièces.

Adapter la scène E du corpus : porte détruite/reconstruite, pièce fusionnée, alimentation coupée et feu déclenché. Les causes de panne et les changements de topologie doivent être partagés avec les travaux et la navigation. Les dégâts de toiture aux personnes sont ajoutés en V45 ; autres producteurs restent à développer avec G3 ; une injection de feu de test n'exige pas déjà le narrateur G4. Les environnements complexes des extensions restent ultérieurs.

**Acceptation :** une pièce fermée change effectivement température et confort ; une porte ou brèche invalide la bonne région ; feu, énergie et stocks interagissent sans simulation liée aux FPS.

## G3 — Personnages et conflits

Santé anatomique, capacités dérivées, soins, blessures et douleur ; combat avec ordres directs, visibilité, couverture et projectiles ; moral avec pensées, relations et crises. Animaux avec alimentation, comportement et reproduction pourront utiliser le même socle d'acteur avec des besoins distincts.

Dépendances internes : corps/capacités → soins ; équipement/ligne/impact → combat ; situations vécues → pensées et relations. Ces dépendances ne prescrivent pas de terminer tout G3 avant les incidents de G4 ; suivre la priorité actuelle ci-dessus. Le résolveur sépare intention, préparation, émission, projectile, impact et santé. Les scènes B/C du corpus sont des réserves de cas ; les coefficients et règles de cible mobile issus du miroir de code demandent vérification avant adoption. L'animation et les collisions de meshes n'ont aucune autorité sur les dégâts.

**Acceptation :** une blessure affecte réellement déplacement/travail/combat ; un soin et un équipement changent le résultat ; comportements et règles de ciblage restent reproductibles aux frontières d'obstacle et de portée.

## G4 — Histoires et progression

Incidents, rythme de tension, menace liée au contexte de colonie, factions, visiteurs, commerce, recherche et événements sociaux. Garder conditions, poids et causes observables pour équilibrer le storyteller. La difficulté doit être une décision de conception documentée, sans prétendre recopier des coefficients non vérifiés.

Séparer événement de domaine et notification, état de quête et texte, panier commercial et transfert confirmé. Enregistrer échéances, identité des participants, choix de récompenses et RNG nécessaires. La richesse et les budgets d'incidents lisent les objets existants ; une récompense déjà remise ne peut être rejouée au chargement. L'artisanat général et les déblocages prolongent les recettes de survie de G1.

**Acceptation :** des parties seedées produisent des chaînes de conséquences variées mais expliquées, sans événements impossibles, seuils absurdes ou blocage de progression.

## G5 — Monde et consolidation

Carte du monde, voyages et caravanes, échanges entre cartes, objectifs longs, migrations de sauvegarde, accessibilité, optimisation à centaines d'acteurs, configuration graphique et intégration des assets définitifs. Comparer à la matrice des domaines du jeu de base avant d'étendre le périmètre aux DLC.

La scène D du corpus guide les transferts : une personne ou pile garde son identité et un propriétaire unique entre carte, caravane et rencontre. Les sites mondiaux peuvent être abstraits ; aucune simulation intégrale des colonies étrangères n'est présumée. Le monde devient jouable à ce jalon, mais le contrat de génération locale doit déjà pouvoir recevoir un contexte de site versionné sans exiger sa réalisation immédiate.

**Acceptation :** partie longue, reprise après versions, tests multi-cartes, budgets de performance sur appareils choisis, documentation de toutes les mécaniques livrées.

## Chantiers transversaux

Audit V74 : les ancres de croissance thermique n’invalident plus les lots forestiers sans changement visible. À 100 acteurs sous canicule, image p95 41,6→33,3 ms ; pics jusqu’à 66,6 ms sur le cas 30 acteurs. Poursuivre snapshots/scène/végétation, sans garantie 6×. [Mesures et limites](history/validation-heatwave-v74.md).

Audit V66 : cinq compilations GPU à l’arrivée supprimées en conservant les lots de personnages. Croissance 3→4/30→31/100→101 vérifiée ; les pointes à cent acteurs restent ouvertes (CPU p95 40,28 ms, image p95 20,80 / max 125 ms). Maintenir l’audit de captures/scène/rendu avec les futures menaces ; aucun budget 6× global validé. Les exports de diagnostic du banc sont désormais hors mesure. [Preuves](history/validation-arrivals-v66.md).

Audit V48 : à cent acteurs en clinique, les pointes d’image restent observables pour alimentation et traitements déjà présents. Suivre séparément coût des transferts/scène/HUD et rendu lors du prochain audit mixte ; zéro compilation GPU ne suffit pas à prouver l’absence de saccades. [Mesures et limites V48](history/validation-feeding-v48.md).

Audit V51 : coût DOM de caméra au repos supprimé après profilage. Les courtes charges natives conservent néanmoins des pointes jusqu'à 87,1 ms ; poursuivre réception des snapshots, matrices/parcours de scène et DOM sur une charge mixte plus longue avec le prochain lot de personnages. Le gain ciblé n'est pas une validation globale de fluidité. [Données V51](history/validation-medicines-v51.md).

- **Assets et 3D** : décor/bâtiments/objets en code, placeholders remplacés progressivement, personnages squelettiques GPU et apparence commune carte/portraits. Blender seulement lors des sessions demandées. Les [échelles](research/spatial-design.md) et empreintes doivent rester cohérentes.
- **Performance** : audits courts aux changements de boucle/rendu, percentiles et machine consignés. Distinguer simulation, snapshots, rendu et GPU ; aucune garantie depuis une capacité de buffer. V22 : poursuivre le coût de planification à cent acteurs et surveiller l’erreur ponctuelle d’allocation au chargement WebGPU 250², non reproduite dans les deux contrôles suivants. Les [ressources graphiques conservées](development/render-lifecycle.md) restent le contrat pour l’abattage.
- **Navigation GPU** : [laboratoire](research/gpu-navigation.md), comparaison CPU et régions, rendu concurrent, révisions et adoption déterministe au tick. Pas de lecture GPU bloquante par colon.
- **Fidélité** : nouvelle recherche par mécanique et relectures rétroactives ; conserver chapitre/ID, provenance et décision. Plusieurs sols, roches, plantes et biomes restent prévus en G2 ; le ciel ne clôture pas météo/climat.
- **Tests et docs** : peu de scénarios profonds, pilote de colonie entretenu ; contrôles regroupés suivant [testing](development/testing.md). Mettre à jour contrats, guide, inventaire et preuves sans recopier les mêmes règles dans tout le dossier.

## Questions de conception ouvertes, sans bloquer le socle

Objectif d'une partie, tonalité fictionnelle, contraintes de verticalité, taille maximale de colonie/carte, profondeur des interactions sociales et matériel cible restent à préciser en jouant les prochains jalons. Aucun ajout d'étages, multijoueur, moteur physique global ou cloud obligatoire n'est présumé.

## Estimation de charge — 18 septembre 2026

Descriptions factuelles corrigées le 19 septembre après V74 ; fourchettes de charge conservées comme hypothèses historiques, sans nouvelle mesure de vélocité ni date de fin réengagée. La revue stratégique ne transforme pas ces pourcentages en mesures objectives.

**Environ 20 % du travail total, fourchette 15–25 %**, pour une reproduction substantielle du jeu de base en 3D, avec contenu, intégration, corrections et finition. C'est un jugement de planification du co-lead, pas une mesure objective, un pourcentage de code, de fidélité certifiée ou d'objets disponibles. Les domaines ont des poids différents et partagent des dépendances : ne pas faire la moyenne des lignes ci-dessous. La borne basse reste plausible tant que combat et narration ne produisent pas de partie complète. G0–G3 partiels, G4 engagé par accueil et raid, G5 absent ; aucun jalon clos.

| Aspect de la cible | Avancement estimé | Ce qui explique le travail restant |
|---|---:|---|
| Socle simulation, navigation, persistance et commandes | 60–70 % | Contrats et migrations actifs ; profils hostiles, multi-cartes, journal complet et comportement sous charge à poursuivre. Navigation GPU encore expérimentale. |
| Survie quotidienne, besoins et travail | 50–65 % | Boucles physiques utilisables ; variété alimentaire/agricole, métiers, interruptions et besoins à compléter. |
| Construction, logistique et habitat | 40–55 % | Matériaux, plans/cadres, transport, pièces/toits, lumière/température présents ; catalogue, réparations hors murs/portes, sols, risques et électricité complète manquants. |
| Génération, végétation, biomes et climat | 20–35 % | Site local déterministe et premières filières ; canicule et exposition V74 ; nombreuses espèces, biomes, saisons, autres météos et toits naturels absents. |
| Anatomie, santé et soins | 35–50 % | Blessures/capacités/secours/soins intégrés ; maladies, infections, immunité, chirurgie, prothèses et dépouilles restent importantes. |
| Compétences, traits et identité | 15–25 % | Construction, Médecine, Tir et Mêlée actifs ; six traits actifs V69 ; Artisanat, Social et Intellect également actifs ; autres compétences, biographies, traits et effets croisés restent partiels/absents. |
| Équipement, vêtements et inventaire | 10–20 % | Revolver, chemise et gilet physiques avec protection ; inventaire personnel, autres équipements, tenues automatiques, masse et grand catalogue absents. Tenue tribale et chemise fabricables V72/V73, isolation active V74. |
| Combat | 5–15 % | Tir, santé, pouvoir d’arrêt et sentinelle de scénario désormais jouables ; Fuir/Attaquer/Ignorer et collisions intégrés. Mêlée V59, tir automatique/Attaquer V60 et approche ennemie visible V61 livrés ; protection corporelle V63 et réveils V62 présents ; murs/portes destructibles V67 et raid ordinaire V68 ; tactique collective complète et dépouilles transportables absentes. |
| Humeur et relations | 5–10 % | Humeur causale, premières pensées/mémoires, errance triste, six traits et deux échanges/opinions V70 ; autres crises, attentes variables, romance/parenté/deuil et psychologie complète absents. Estimation large inchangée pour cette tranche limitée. |
| Production, recherche et contenu | 10–20 % | Repas, blocs et filière coton→vêtement ; recherche Vêtements complexes au poste V73. Nombreux ateliers/recettes et arbre complet absents. Ce n'est pas un ratio d'objets : aucun catalogue exhaustif vérifié. |
| Animaux et élevage | 0–5 % | Aucun animal jouable ; le socle spatial/médical est réutilisable, ses règles animales ne sont pas développées. |
| Narration, factions, commerce, monde et objectifs | 0–5 % | Accueil V66 et raid limité V68 ; narrateur complet, diplomatie, marché, planète, caravane ou fin de partie absents. |
| Rendu, interface, audio et finition | 30–45 % | Scène 3D GPU, caméras, UI du camp et FPS présents ; tenue partagée carte/portrait V63 ; assets définitifs, portraits finaux, effets, audio, accessibilité et UI des systèmes absents restent à réaliser. |

**Ordres de grandeur calendaires supplémentaires**, du point de vue utilisateur avec sessions de développement régulières, plages autonomes autorisées, retours de jeu et périmètre Core stable : **4–8 semaines pour une alpha cohérente** avec survie, combat, soins et premières menaces/progression ; **4–8 mois pour approcher un jeu de base substantiel en 3D**. Une reproduction exhaustive et sa finition peuvent dépasser cette seconde fourchette. Pas de date de fin fiable avant d'avoir mesuré une boucle menace → blessure → soins → reprise, puis sa répétition sur plusieurs jours. Les estimations incluent recherche, contenu, intégration et régressions ; elles ne supposent pas un agent travaillant continuellement en mode jour.

Le 15 septembre, la projection était 10–15 %, 3–6 semaines pour une alpha et 3–6 mois pour la cible Core. Les soins ont avancé depuis, mais les derniers lots de combat ont surtout produit des fondations techniques. L'élargissement des délais reconnaît ce coût d'intégration et les vastes domaines encore absents ; il ne signifie pas que le reste sera linéairement proportionnel aux premiers jours. Réévaluer après le premier affrontement réellement joué et le premier épisode de colonie incluant une menace. Le nombre de versions/commits ne sert pas d'indicateur d'avancement.
