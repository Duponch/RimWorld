# Raids — combat V68 et cadence Cassandra partielle V82

**V82 :** la [lecture Core 1.6.4871](../research/colony-pacing-reference.md) distingue introduction classique à 5,4 jours écoulés, fenêtres du narrateur et budget contextuel. Le nouveau profil Atterrissage forcé adopte la première occasion et les fenêtres majeures, avec une sélection et des groupes encore partiels. Les camps historiques conservent leur calendrier provisoire.

Le joueur doit défendre **la colonie qu’il construit**, puis rendre leur autonomie aux survivants. [Référence confrontée](../research/raid-reference.md), [preuves](../history/validation-raids-v68.md). Corpus chapitres 17/20/21/23/24, SYS/TEST-110/111/117/132..135 ; budget de narrateur SYS-133 différé.

## Calendrier et groupe

`World.raids` utilise un PRNG indépendant. Les camps historiques et Trois survivants gardent `camp-raids-v1` : première échéance à 3,5–4 jours, puis 6–8 jours après résolution, **calibration provisoire**. Le scénario Rencontre reste distinct.

Le nouveau `crashlanded` active `cassandra-raids-v1`. L'agenda conserve son propre RNG, son index de cycle et les prochaines occasions, distincts du RNG de composition/retraite. Introduction à **J5,4 écoulés** ; fenêtres majeures à **J11 + 10,6 × n**, actives **4,6 jours**, puis **6 jours** de repos ; **une ou deux occasions**, espacement minimal **1,9 jour**. Dates quantifiées par 100 ticks locaux, soit 1 000 Core. Le choix déterministe des dates utilise notre PRNG, sans promettre des dates identiques pour une graine RimWorld.

Une impossibilité d'entrée, une capacité saturée ou un groupe encore actif **consomme l'occasion sans la reporter**. Un groupe ne déplace jamais les fenêtres suivantes quand il se termine. La limite d'un groupe actif reste une simplification : Core peut faire coexister davantage de menaces. Aucun arrêt arbitraire du narrateur à J20 ; au-delà, cette tranche continue avec **des raids seuls**, sans reproduire le choix pondéré entre toutes les grandes menaces. Petite menace introductive, visiteurs, Misc, maladies et factions demeurent distincts et absents de ce producteur.

Dans les deux calendriers, le premier groupe effectivement créé reste une personne sans arme, chemise ; les suivants deux personnes dont une avec revolver. **Ce n'est pas un calcul des 40 points introductifs, du facteur de budget 0,60, de richesse ni d'adaptation.** Les autres compositions ne sont pas livrées. Les effets médicaux/d'humeur réellement appliqués par Récit d'aventure sont décrits dans le [contrat de départ](scenario-start.md).

Entrées de bord physiquement disponibles et reliées à au moins une personne coloniale valide dans le graphe stratégique. Une première personne isolée ne masque pas les autres composantes. Échec d’admissibilité/capacité : report de six heures pour le calendrier historique seulement ; occasion consommée pour Cassandra partielle. Aucun acteur, pile, identité ou tirage de composition partiel dans les deux cas. Création atomique des personnes et objets portés. Lettre persistante à droite, accès caméra et bilan ; fermer la lettre n’arrête pas l’assaut. Pas de pause automatique ni de son d’alerte dans cette tranche.

## Approche, bataille, retraite

`raid-space.ts` distingue intention stratégique et mouvement réel : accès ouvert d’abord ; sinon BFS cardinal hypothétique sans murs/portes pour trouver la première barrière, puis route physique vers une place de mêlée accessible. La route hypothétique n’est jamais parcourue par les acteurs. Les places de mêlée partagent une capture par décision ; les cibles sont énumérées progressivement jusqu’au premier accès valide, sans construire les places de toute la population. Aucun cache ne survit à la décision synchrone. Marche réelle pondérée à huit voisins, coins solides, arêtes et permissions hostiles conservées. Ce choix d’une brèche est une adaptation technique/stratégique explicite, pas une copie de toutes les tactiques Core.

`raid-behavior.ts` partage budget de recherche, mêlée, postes de tir et éclairage avec les contrôleurs existants. Une recherche locale infructueuse ne doit ni supprimer le trajet stratégique ni empêcher sa création. Les personnes endormies peuvent être attaquées par l’assaut ; les autres profils locaux gardent leur filtre historique. Impacts, dégâts aux barrières, XP, blessures, réveils et chute de toit restent dans leurs systèmes communs.

Pertes violentes cumulées au sein du groupe, même après récupération : seuil tiré de 40 à 70 %, enregistré en millièmes. Délai 2 600–3 800 ticks locaux (26 000–38 000 Core). Retraite également si la colonie n’a plus de personne mobile : adaptation explicite tant que vol/enlèvement manquent. Un délai n’autorise aucune téléportation ; les retraites bloquées cherchent une brèche réelle, y compris si les murs couvrent toutes les cellules du bord. Les intentions de tir/mêlée contre les humains sont retirées ; récupération et arêtes engagées finissent.

Sortie seulement au bord, après fin de translation/récupération et hors sommeil/étourdissement, sans cargaison non déposée. Retrait après la boucle des acteurs pour ne pas en sauter un. `departed` conserve identité, groupe, date/cellule et objets portés complets ; les objets au sol restent sur carte. Pas de seconde copie vivante des équipements exportés. Une récupération de coup dirigée vers une personne déjà sortie conserve son orientation par sa dernière cellule.

Issue lorsque plus aucun membre valide n’est encore sur carte. Les blessés et morts **restent sur place**, avec leur état médical et vêtements ; le bilan photographie l’issue, il ne suit pas rétroactivement les décès ultérieurs. Un blessé ennemi remis debout cherche ensuite une sortie. Secours/soins des colons, démobilisation, maintenance du foyer et reprise utilisent les mécaniques déjà livrées. V86 permet la [capture physique d'un assaillant vivant à terre](prisoners.md), puis ses soins, repas et recrutement. Un captif ne poursuit plus l'assaut ; sa capture compte comme une perte du groupe. Une personne encore portée ne peut pas sortir au bord après récupération. Les morts humains restent représentés comme personnes : transport de corps, sépulture et dépouillage manuel absents.

## Persistance et limites

V67 strictement validée avant V68 neutre : aucun raid ajouté à une ancienne partie. Bouton **Activer les raids du camp** pour ouvrir volontairement son calendrier. Schéma, mandats, membres/pertes, échéances, issues et identités/objets exportés sont validés ; variantes inconnues refusées. Calendrier facultatif ne signifie pas permission d’importer un ennemi orphelin.

V81 strictement validée avant V82 neutre : aucune ancienne pendule remplacée. L'agenda Cassandra exige le profil de partie correspondant, des dates futures cohérentes avec son cycle, et l'accord avec l'échéance publique hors assaut. Sauvegarder/reprendre ne recalcule ni les occasions ni la durée du groupe. Le décalage civil de 06 h ne s'ajoute pas à J5,4 : l'agenda conserve le temps réellement écoulé depuis le départ.

Non livrés : narrateur complet, points/adaptation, vagues variées, vol/enlèvement, incendies, sièges/sapeurs organisés, nourriture autonome complète des NPC, simulation hors carte et suite complète des victimes. Pas de clôture de G3/G4 ni de l’intégralité de l’étape 2 par cette tranche. [ROADMAP](../ROADMAP.md) conserve seule les prochaines priorités.
