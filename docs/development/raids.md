# Premier raid du camp — V68

**Référence du 20 septembre :** la [lecture Core 1.6.4871](../research/colony-pacing-reference.md) distingue introduction classique à 5,4 jours écoulés, fenêtres du narrateur et budget contextuel. Le calendrier provisoire décrit ici reste celui du jeu livré ; il ne représente pas encore Cassandra / Récit d’aventure.

Le joueur doit défendre **la colonie qu’il construit**, puis rendre leur autonomie aux survivants. [Référence confrontée](../research/raid-reference.md), [preuves](../history/validation-raids-v68.md). Corpus chapitres 17/20/21/23/24, SYS/TEST-110/111/117/132..135 ; budget de narrateur SYS-133 différé.

## Calendrier et groupe

`World.raids` utilise un PRNG indépendant. Les nouveaux camps ordinaires l’activent ; le scénario Rencontre reste distinct. Première échéance à 3,5–4 jours, puis 6–8 jours après résolution ; **calibration provisoire**, sans richesse, adaptation ni narrateur Cassandra. Premier groupe : une personne sans arme, chemise ; suivants : deux personnes dont une avec revolver. Les autres compositions ne sont pas livrées.

Entrées de bord physiquement disponibles et reliées à au moins une personne coloniale valide dans le graphe stratégique. Une première personne isolée ne masque pas les autres composantes. Échec d’admissibilité/capacité : report de six heures, aucune personne, pile, identité ou consommation aléatoire partielle. Création atomique des personnes et objets portés. Lettre persistante à droite, accès caméra et bilan ; fermer la lettre n’arrête pas l’assaut. Pas de pause automatique ni de son d’alerte dans cette tranche.

## Approche, bataille, retraite

`raid-space.ts` distingue intention stratégique et mouvement réel : accès ouvert d’abord ; sinon BFS cardinal hypothétique sans murs/portes pour trouver la première barrière, puis route physique vers une place de mêlée accessible. La route hypothétique n’est jamais parcourue par les acteurs. Les places de mêlée partagent une capture par décision ; les cibles sont énumérées progressivement jusqu’au premier accès valide, sans construire les places de toute la population. Aucun cache ne survit à la décision synchrone. Marche réelle pondérée à huit voisins, coins solides, arêtes et permissions hostiles conservées. Ce choix d’une brèche est une adaptation technique/stratégique explicite, pas une copie de toutes les tactiques Core.

`raid-behavior.ts` partage budget de recherche, mêlée, postes de tir et éclairage avec les contrôleurs existants. Une recherche locale infructueuse ne doit ni supprimer le trajet stratégique ni empêcher sa création. Les personnes endormies peuvent être attaquées par l’assaut ; les autres profils locaux gardent leur filtre historique. Impacts, dégâts aux barrières, XP, blessures, réveils et chute de toit restent dans leurs systèmes communs.

Pertes violentes cumulées au sein du groupe, même après récupération : seuil tiré de 40 à 70 %, enregistré en millièmes. Délai 2 600–3 800 ticks locaux (26 000–38 000 Core). Retraite également si la colonie n’a plus de personne mobile : adaptation explicite tant que vol/enlèvement manquent. Un délai n’autorise aucune téléportation ; les retraites bloquées cherchent une brèche réelle, y compris si les murs couvrent toutes les cellules du bord. Les intentions de tir/mêlée contre les humains sont retirées ; récupération et arêtes engagées finissent.

Sortie seulement au bord, après fin de translation/récupération et hors sommeil/étourdissement, sans cargaison non déposée. Retrait après la boucle des acteurs pour ne pas en sauter un. `departed` conserve identité, groupe, date/cellule et objets portés complets ; les objets au sol restent sur carte. Pas de seconde copie vivante des équipements exportés. Une récupération de coup dirigée vers une personne déjà sortie conserve son orientation par sa dernière cellule.

Issue lorsque plus aucun membre valide n’est encore sur carte. Les blessés et morts **restent sur place**, avec leur état médical et vêtements ; le bilan photographie l’issue, il ne suit pas rétroactivement les décès ultérieurs. Un blessé ennemi remis debout cherche ensuite une sortie. Secours/soins des colons, démobilisation, maintenance du foyer et reprise utilisent les mécaniques déjà livrées. Dépouilles encore représentées comme personnes : ni capture, secours ennemi, transport de corps, sépulture ou dépouillage manuel.

## Persistance et limites

V67 strictement validée avant V68 neutre : aucun raid ajouté à une ancienne partie. Bouton **Activer les raids du camp** pour ouvrir volontairement son calendrier. Schéma, mandats, membres/pertes, échéances, issues et identités/objets exportés sont validés ; variantes inconnues refusées. Calendrier facultatif ne signifie pas permission d’importer un ennemi orphelin.

Non livrés : narrateur complet/points/difficulté, vagues variées, vol/enlèvement, incendies, sièges/sapeurs organisés, nourriture autonome complète des NPC, simulation hors carte et suite complète des victimes. Pas de clôture de G3/G4 ni de l’intégralité de l’étape 2 par cette tranche. Prochaine priorité visible : quelques traits/interactions utiles, conformément à ROADMAP.
