# Capture, captivité et recrutement — référence V86

20 septembre 2026. Recherche vérifiée ; gameplay V86 livrée. Périmètre : capture d'un assaillant humain à terre, prison physique, soins/nourriture, conversations et recrutement. Ce document ne constitue pas une validation du gameplay. Commerce et diplomatie restent distincts.

## Provenance et décision

Référence primaire actuelle : installation locale `E:/Steam/steamapps/common/RimWorld`, Core 1.6.4871 rev590, `RimWorldWin64_Data/Managed/Assembly-CSharp.dll`, SHA256 précédemment relevé `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Lecture seule des classes et Defs, aucune copie de source propriétaire ou de sauvegarde personnelle dans cette note.

Corpus relu via `docs/research/reference-adoption.md` : chapitres 09, 13, 14, 15, 22 et surtout 27 ; SYS-148 capture/recrutement, SYS-149 évasion/enlèvement, SYS-150 invités, UI-017 transport/soin, UI-018 capture/arrestation, TEST-148/149/150. Le tableau SYS-148 demande explicitement conservation des blessures et de la parenté. Ses statuts de référence ne prouvent pas une implémentation. SYS-150 renvoie notamment à une source Royalty : les invités à contrat ne sont pas déduits automatiquement du Core.

Contrats locaux relus : `arrivals.md`, `raids.md`, `health.md`, `social.md`, enquêtes `colony-pacing-reference.md`, `colony-observation-reference.md`, `colony-progression-observed.md`. Les 87 sauvegardes personnelles historiques décrivent une trajectoire particulière (ancienne version, tutoriel, autres réglages), pas une durée moyenne de recrutement. Une hausse de population dans ces états ne prouve pas une capture sans trace complémentaire.

Sources publiques recroisées ce jour :

- [Ludeon, annonce de la mise à jour 1.4, 5 octobre 2022](https://ludeon.com/blog/2022/10/biotech-expansion-announced-update-1-4-on-unstable-branch/) : les prisonniers indéfectiblement loyaux font partie du Core gratuit ; ils sont distincts des usages Biotech/Ideology. Leur existence protège la progression démographique malgré un plus grand nombre de survivants ennemis. Source primaire historique, pas certificat de tous les détails 1.6.
- [Ludeon, publication 1.3 et Ideology, 20 juillet 2021, archive officielle](https://ludeon.com/blog/page/9/) : rattachement historique au changement du système. [Historique communautaire 1.3.3066](https://rimworldwiki.com/wiki/Version/1.3.3066) signale le retrait du tirage final et les plages de résistance par type de personne. Les règles actuelles ci-dessous sont confirmées directement dans l'exécutable local.
- [Wiki Prisoner](https://rimworldwiki.com/wiki/Prisoner), consulté le 20 septembre : guide secondaire utile pour les interactions, mais son paragraphe de chance de recrutement après résistance nulle contredit la branche humaine actuelle. Son attribution générale de l'alimentation assistée au Médecin ou au Geôlier ne correspond pas au filtrage des travailleurs humains observé dans cette version.
- [Wiki Negotiation Ability](https://rimworldwiki.com/wiki/Negotiation_Ability), recroisé avec les Defs de statistiques et `PawnCapacityFactor`/`StatWorker` locaux.
- [Tynan, forum de développement, juillet 2018](https://ludeon.com/forums/index.php?topic=41766.3315) : les anciennes discussions mentionnent encore la difficulté de recrutement comme facteur probabiliste. À conserver comme provenance datée, pas comme formule actuelle.

Arbitrage : les classes/Defs de l'installation 1.6.4871 priment pour ce lot. Aucun « pourcentage de réussite final » humain ajouté depuis un guide ancien.

## Capture et conservation de la personne

Sources : `JobDriver_TakeToBed`, `Pawn_GuestTracker.CapturedBy/SetGuestStatus`, `RestUtility`, `FloatMenuOptionProvider_Arrest`, `GenGuest`.

- Une capture d'ennemi à terre est un travail physique : réserver personne et place au lit, approcher, prendre en charge, porter, déposer au lit. Le transport conserve identité et dossier médical. Si la personne se relève avant la prise, l'objet disparaît ou le lit devient inadmissible, le travail échoue ; un corps déjà porté est reposé physiquement, pas ramené au point initial.
- Pour une capture d'une autre faction, le statut prisonnier est appliqué à l'arrivée au lit, juste avant installation. La faction d'origine demeure ; une faction hôte définit la captivité. L'arrestation d'une personne déjà membre de la colonie a un traitement distinct. Ne pas changer immédiatement la faction d'un assaillant en colonie pour le rendre « inoffensif » : cela ouvrirait aussi travail, besoins, draft et relations ordinaires.
- La capture abandonne les engagements militaires précédents. La provenance de raid et ses bilans doivent néanmoins conserver ce qui est arrivé à ce membre. Une personne capturée n'est ni un mort inventé ni un objet exporté hors carte ; après guérison, elle ne doit pas reprendre l'ancien ordre d'assaut/retraite.
- Le changement de statut humain normal abandonne équipement, inventaire et objet porté, en conservant les vêtements. Dans Lisière, la commande exige actuellement un colon démobilisé comme les secours existants, adaptation explicitement annoncée du transport Core. L'équipement tombé à l'incapacité et les piles déjà présentes gardent leur identité ; toute nouvelle dépose doit prévalider place, quantité et propriétaires. Les variantes Core détruisant un équipement spécial à sa chute restent hors du catalogue présent.
- L'arrestation d'une personne debout n'est pas cette capture : acteur mobilisé/manipulation, lit, accès et chance d'arrestation distincte. La base de cette dernière dépend de Sociabilité et de Manipulation. Ne pas introduire son tirage dans la capture d'un assaillant déjà à terre. Arrestation de colons/neutres différée pour le périmètre retenu.

Le déplacement Core en entraves multiplie la vitesse par .35. Porter une personne ajoute un facteur .6 au transporteur ; conserver ou adapter explicitement le contrat existant de secours, sans modifier silencieusement tous les anciens déplacements. Les personnages animés et la simulation doivent partager l'arête capturée.

## Prison : lit, pièce et portes

Sources : `Building_Bed.RoomCanBePrisonCell/SetBedOwnerTypeByInterface`, `Verse.Room.ProperRoom/IsHuge/Notify_RoomShapeChanged`, `RestUtility`, `Building_Door.FreePassage/WillCloseSoon/BlockedOpenMomentary/PawnCanOpen`, `JobGiver_PrisonerEscape`, `Humanlike.xml`, `JobGiver_PrisonerWaitInsteadOfEscaping` et `Pawn_GuestTracker.ShouldWaitInsteadOfEscaping`.

- Un lit de prison doit se trouver dans une pièce normale ne touchant pas le bord de carte. `IsHuge` refuse une pièce de plus de 60 régions internes ; ce sont des régions de l'algorithme Core, **pas 60 cases**. Aucun seuil arbitraire de surface n'est transposé à Lisière.
- La vérification de prison ne demande pas de toit. Toiture, exposition, chaleur et qualité de vie ont leurs effets ordinaires ; ne pas inventer un verrou « chambre entièrement couverte » pour autoriser la capture.
- La pièce devient une prison lorsqu'elle contient un lit marqué prisonnier. Le choix s'applique aux autres lits de cette même pièce ; un nouvel agencement reliant des pièces peut propager ce rôle. Les propriétaires durables sont libérés quand le rôle du lit change. Usage médical et usage prisonnier sont deux attributs distincts.
- Une prison n'est pas une immobilisation au lit. Le détenu apte mange, dort et marche dans sa pièce. Le Core utilise notamment une errance dans la pièce (rayon 7, attentes 125–200 ticks Core) et des branches ordinaires de faim/repos. Les fonctions de pathfinding et les coins physiques restent autoritaires.
- `PrisonerIsSecure` est un statut comportemental (pas libéré, hôte, pas d'agression/crise d'évasion), pas une preuve géométrique de murs continus.
- Une ouverture réelle vers le bord permet une fuite. Le Core cherche une connexion par régions sans porte bloquante ou à travers les portes `FreePassage`, puis fait suivre un trajet réel vers la sortie. La borne de recherche interne de 25 régions n'est pas transformée en 25 cellules.
- `FreePassage` exige une porte ouverte et soit maintenue ouverte, soit ne devant pas se refermer prochainement. `BlockedOpenMomentary` considère objets, personnes et cadavres sur l'emprise, mais **ce blocage ne suffit pas à conclure au passage libre**. Après les conditions de délai et de fermeture automatique, `WillCloseSoon` vérifie aussi les personnes sur la porte et ses quatre voisines cardinales : une personne non hostile, non à terre, autorisée à ouvrir, située sur la porte ou dont le déplacement en cours vise cette porte, signifie qu'elle se refermera prochainement. Une personne immobile dans une case voisine ne suffit pas. Le maintien volontaire ouvert prime sur cette vérification.
- Le contrôle Core de fermeture automatique dépend d'un contact amical récent de 120 ticks Core et de l'absence de maintien ouvert ; le délai de fermeture utilise son propre état. La décision ne se réduit donc pas à l'animation visible de la porte. Pour Lisière, le mouvement conserve son exigence d'ouverture achevée avant l'arête ; le passage ordinaire d'un colon autorisé doit être distingué d'une ouverture maintenue ou d'un objet/corps qui demeure réellement dans l'ouverture.
- Correction rétroactive de notre première lecture V86, le 20 septembre : elle omettait la dernière clause de `WillCloseSoon` et assimilait tout corps bloquant à un passage libre. Dans le banc à 30 colons et trois captifs, un geôlier en livraison a ainsi déclenché une intention d'évasion pendant son passage ; le détenu est devenu ensuite lui-même l'obstacle empêchant la fermeture. Les trois départs ne démontrent pas un rythme Core d'évasion et le graphe de pièces n'est pas la cause identifiée. La correction doit préserver les fuites par brèche, maintien ouvert et obstruction sans passage amical, plutôt qu'ajouter un délai destiné au banc.
- Dans le `Humanlike` Core, l'attente avant évasion précède la recherche de sortie sur une carte de colonie. Elle exige un délai déjà enregistré dans `Pawn_GuestTracker` et la présence d'au moins un colon libre ; `JobGiver_PrisonerWaitInsteadOfEscaping` ne produit toutefois **aucun travail lorsque le détenu est dans une cellule de prison**. Ce n'est ni une protection générale due à la proximité d'un geôlier, ni une temporisation universelle à ajouter après capture. Les circonstances complètes déclenchant ce délai ne sont pas certifiées par cette relecture ciblée ; elles ne sont pas nécessaires pour corriger la porte du banc.
- Les évasions organisées avec incident, agressions et recrutement d'autres détenus existent en Core, distinctes de la fuite par ouverture. Leur fréquence n'a pas été auditée ici ; elles ne seront pas annoncées livrées par un simple trajet de sortie.

## Geôlier, repas et médecine

Sources : `WorkGivers.xml`, `WorkGiver_Warden`, `WorkGiver_Warden_TakeToBed`, `WardenFeedUtility`, `WorkGiver_Warden_Feed/DeliverFood`, `JobDriver_FoodDeliver`, `WorkGiver_FeedPatient`, `WorkGiver_Tend`, `Pawn_FoodRestrictionTracker`.

Ordre interne Core des tâches Geôlier concernées : ramener au lit avant alimenter au lit, avant livrer nourriture, avant discuter. Les autres priorités (libérer/exécuter) appartiennent à des actes distincts.

- Geôlier réserve le prisonnier, et vérifie état, accessibilité et appartenance à la colonie hôte. Deux soignants/interlocuteurs ne doivent pas servir la même personne simultanément.
- Un prisonnier à terre ou ayant besoin de repos médical **et installé au lit** relève de l'alimentation assistée. L'acteur va chercher une dose physique puis la fait ingérer au chevet. Dans le parcours humain normal local, le filtre Médecin exclut ce cas réservé au Geôlier ; le soin des plaies reste Médecin.
- Un prisonnier mobile relève de la livraison. Le geôlier prend une portion réellement disponible et la dépose près du détenu dans la prison. Cette livraison n'ajoute aucune satiété : la personne approche et mange ensuite par l'ingestion ordinaire.
- Le seuil de décision est strictement inférieur au seuil « hungry » + .02 de jauge ; pour le profil adulte utilisé, .24+.02=.26. Lisière a déjà un seuil médical de 26, avec une frontière historique à préserver ou corriger explicitement si touchée.
- Le Core évite une nouvelle livraison si la nourriture adaptée dans la pièce suffit à la demande des détenus affamés : il tient compte des aliments portés, d'une catégorie minimale de préférence et d'une marge de .5 nutrition. Une adaptation bornée peut garder une portion par demandeur et les réservations exactes, mais doit annoncer l'écart de cette heuristique, sans alimenter à distance.
- La politique est respectée par le geôlier qui choisit pour le patient. Un prisonnier de faction étrangère qui se sert seul ignore la politique du joueur dans `GetCurrentRespectedRestriction` ; ce n'est pas une autorisation de voler n'importe quelle pile de la colonie au-delà des accès de la prison.
- Lecture complémentaire `SocialProperness` : les aliments concernés ne conviennent pas socialement à un consommateur libre dans une prison ; un captif doit être dans leur même pièce. `Verse.AI.HaulAIUtility` refuse le transport de la nourriture nutritive humaine réservée aux prisonniers. `WorkGiver_DoBill` ne contient pas cet appel dans la classe auditée : une interdiction générale des ingrédients n'est donc pas déduite. Le geôlier V86 exclut les piles déjà en prison de ses sources de livraison, évitant une boucle de déplacement des aliments présents.
- Les soins utilisent dossier, médecin, médecine, temps, dose et qualité existants. Une captivité ne referme pas les lésions, ne remet pas les infections/immunités à zéro et ne dispense pas de repos ou nourriture après cicatrisation.
- Un personnage guéri n'est plus forcé au lit pour rendre la tâche de livraison plus simple. Un lit devenu indisponible doit provoquer une vraie replanification, avec cargaison conservée.

## Conversations et résistance, valeurs 1.6.4871

Sources : `Pawn_GuestTracker.ScheduledForInteraction/SetupRecruitable`, `Pawn_MindState`, `JobDriver_ChatWithPrisoner`, `Toils_Interpersonal`, `InteractionWorker_RecruitAttempt`, `Stats_Pawns_Social.xml`, `PawnCapacityFactor`, `StatWorker`, `Interactions_Prisoner.xml`, `Thoughts_Memory_Social.xml`, `PawnKinds_Pirate.xml`.

Le mode initial est sans interaction de recrutement. Le joueur choisit Réduire la résistance ou Recruter ; les soins/aliments sont distincts. Réduire s'arrête à zéro ; Recruter conserve la réduction puis poursuit vers l'adhésion.

Conditions : prisonnier encore sécurisé, éveillé, hors crise mentale ; s'il est à terre, il doit être au lit. Le geôlier doit pouvoir parler. La conversation réserve le patient et ne peut pas utiliser une relation/opinion d'un autre personnage par substitution.

Cadence : **écart strict >10 000 ticks Core**, et **au plus deux interactions par jour civil local**. Le compteur est incrémenté à la phase finale, pas à la simple désignation d'un trajet. Une journée comporte 60 000 Core ticks ; dans Lisière, 6 000 ticks locaux et arrivée à 06h via `calendarTick`, donc conversion >1 000 ticks locaux et réinitialisation au changement de jour civil, pas au seul modulo du temps écoulé.

Une visite contient cinq phases de rapprochement (`BuildRapport`), chacune avec un délai de 350 ticks Core lorsqu'elle se produit, puis une phase finale de réduction/recrutement avec délai de fermeture de 350 ticks Core. Les trajets et attentes d'interaction s'y ajoutent. Valeurs locales : cinq phases de 35 ticks puis fermeture de 35 ; une seule réduction par visite, pas cinq. L'effet final peut survenir avant la fin du délai de fermeture ; interruption/rechargement doivent conserver les effets déjà attribués.

Chaque rapprochement apporte 45 XP Social de base et une mémoire dirigée `RapportBuilt` : +2 opinion multipliée par l'impact social de l'initiateur, durée 20 jours, cumul multiplicatif 1, maximum 50 souvenirs par interlocuteur et 300 totaux. Elle suit la décroissance ordinaire de mémoire sociale, pas celle du bavardage cumulatif. La phase finale apporte 230 XP de base ; une visite entière réussie représente 455 XP de base, avant passions/apprentissage/saturation. Les souvenirs doivent persister après recrutement.

Résistance positive : réduction = 1 × aptitude de négociation du geôlier × facteur humeur instantanée du détenu × facteur opinion du détenu envers ce geôlier. L'humeur instantanée est la cible courante issue des pensées, **pas la jauge lissée**.

| Facteur | Points vérifiés, interpolation linéaire |
|---|---|
| Humeur instantanée | 0 → .2 ; .5 → 1 ; 1 → 1.5 |
| Opinion dirigée | −100 → .5 ; 0 → 1 ; 100 → 1.5 |
| Social en pleine capacité | niveau0 → .4 ; niveau8 →1 ; niveau20 →1.9 ; formule .4+.075×niveau |
| Parole | capacité plafonnée à1 après tolérance de défaut .05, poids .9 |
| Audition | capacité plafonnée à1 après tolérance de défaut .20, poids .9 |

La pondération de capacité multiplie la valeur par .1+.9×capacité corrigée ; le résultat de négociation est borné en bas à .4 dans les Defs. L'incapacité de parler empêche toutefois la tâche. L'effet maximal appliqué est la résistance restante.

**Atteindre zéro ne recrute pas dans cette même conversation.** À une prochaine conversation éligible, un humain ordinaire recrutable rejoint directement. Aucune probabilité résiduelle de « difficulté de recrutement % » dans cette branche actuelle. Inspiration et cas d'animaux/humains sauvages sont d'autres branches, non adoptées implicitement.

La résistance initiale est un tirage de la plage du type de personne, arrondi probabilistement en entier. Exemples locaux : Drifter7–12 ; Scavenger17–26 ; Thrasher14–23 ; Pirate7–12. Ce n'est pas une plage universelle de tous les captifs. Adaptation retenue : attribuer à nos assaillants limités le profil Drifter7–12, présenté comme adaptation de ce type, sans certifier leur équipement, budget de raid ou démographie Core.

`Difficulty.unwaveringPrisoners` est vrai par défaut ; Medium/Récit d'aventure ne le surcharge pas. La décision de recrutabilité dépend aussi de l'intention de population du narrateur. Comme ce modèle n'existe pas dans Lisière, le lot proposé garde ses assaillants recrutables avec **divergence démographique explicite** ; ne pas prétendre que tous les ennemis Core peuvent être recrutés.

Aucun nombre universel de jours n'est déduit : résistance initiale, compétences, capacité, humeur, opinion, horaires et disponibilité du geôlier changent le temps. Une visite deux fois par jour est une limite d'éligibilité, pas un engagement d'exécution.

## Besoins et limites d'humeur

`Needs.xml` exclut le besoin de loisirs des prisonniers ; faim, repos, confort et humeur restent pertinents. `ExpectationsUtility` fait dépendre les attentes d'un prisonnier de colonie de la richesse réelle de la carte, comme pour les colons ordinaires. La base d'humeur locale vaut 32 ; avec ses attentes fixes +30 et aucune autre pensée, la cible instantanée vaut 62 %, indépendamment de la jauge lissée. Le +30 fixe de Lisière n'est pas une règle de captivité Core : il reste une adaptation déjà globale à signaler explicitement ; aucun nouveau bonus de prison inventé. Habillement, douleur, chaleur et repas continuent avec leurs limites existantes.

Libération Core : acte du geôlier, transport/placement à l'extérieur puis départ physique. Les bénéfices diplomatiques dépendent d'une faction et de relations réelles ; ne pas octroyer une réputation fictive. La présente tranche peut différer ce mode plutôt que proposer un bouton prétendument complet ; la fuite par ouverture doit néanmoins être effective.

## Persistance et validation

V85 doit être validée avec ses anciennes exigences avant ajout du schéma V86. Aucune ancienne carte transformée en prison ni ancienne personne dotée de résistance à la migration ; nouveaux champs admis seulement en V86. Les règles transversales restent neutres sans prisonnier/lit prison. La nouvelle priorité Geôlier nécessite une décision de migration explicite, sans réécrire les autres priorités.

Contrôles profonds proposés : vraie blessure puis capture avec sauvegarde pendant approche/portage/dépose ; refus atomique si sol saturé ; concurrence sur patient/lit/repas ; interruption conservant identité/quantité ; médecin versus alimentation du geôlier ; captif guéri autonome ; lit/prison ouverte et trajet réel d'évasion ; cinq rapprochements sans cinq réductions ; résistance zéro puis prochain entretien ; frontière1000/1001ticks et deux visites/jour civil ; continuation exacte et identité/compétences/relations/équipement conservés au recrutement ; raid ne recommence pas après guérison. Un long pilote doit distinguer un assaillant réellement capturable d'une fixture avec blessures imposées.

Limites à publier : catalogue de types humains et population du narrateur incomplets, prisonniers indéfectibles non modélisés, attentes de richesse provisoires, arrestation de neutres/colons, libération diplomatique, prison breaks organisés, esclavage/conversion/croyances, torture/exécution/chirurgie et commerce non livrés par ce lot. L'obtention d'un quatrième colon ne certifie ni progression moyenne ni économie autonome Core.
