# V269 — Révoltes et évasions collectives de prisonniers

Schéma **204**. La prison comporte désormais un risque de révolte collective : conserver des personnes captives demande aussi de pouvoir contenir une fuite, défendre la colonie et soigner les blessés. L'évasion opportuniste par une ouverture reste un mécanisme distinct.

## Risque et déclenchement

La référence Core utilise un intervalle moyen individuel de **60 jours**, avec un contrôle toutes les **2 500 ticks Core**, adapté à **250 ticks locaux**. Ce délai moyen ne constitue ni un compte à rebours ni une garantie de tranquillité.
La mobilité, bornée entre 1 % et 100 %, divise l'intervalle moyen ; une mobilité réduite diminue donc le risque. Le nombre de portes donnant hors de la cellule divise aussi cet intervalle : plusieurs accès augmentent le risque individuel.
Une participation récente multiplie l'intervalle selon une courbe linéaire par morceaux : **20 juste après la révolte, 1,5 après cinq jours, 1 après dix jours**. L'humeur n'entre pas dans cette formule Core.

L'initiateur doit être un prisonnier mobile, éveillé et présent dans une cellule fermée. Les prisonniers déjà libérés, à terre, morts, portés ou engagés dans une crise incompatible ne déclenchent pas cette révolte. Un prisonnier endormi peut cependant rejoindre celle d'un autre prisonnier.
L'inspection affiche l'intervalle moyen individuel calculé sans bloquer l'information pendant le sommeil ; elle précise que dormir suspend le déclenchement. Pendant la révolte, elle indique le danger actif et désactive le changement de consigne.

La migration des anciennes sauvegardes vers le schéma204 est neutre. L'adoption du risque intervient lors d'un futur tick joué, sans tirage rétroactif ni historique de participation inventé. Le flux aléatoire privé de chaque prisonnier est déterministe et sauvegardé ; il ne reproduit pas la séquence aléatoire globale de Core et ne consomme pas les flux existants du monde ou des conversations.

## Collectif, portes et défense

L'adaptation locale conserve la pièce de l'initiateur et examine les pièces de prison rencontrées dans un rayon de **20 cases**. Chacune des autres pièces candidates a **50 %** de chances de participer, dans un ordre local stable. Les personnes admissibles de ces pièces partagent l'identité de l'initiateur et le tick de départ, sans changer de faction ni créer une deuxième personne.
Les engagements de soins et de conversation sont interrompus de façon conservative ; les objets transportés doivent pouvoir être déposés réellement avant l'engagement du participant. Une révolte active ne peut coexister avec un faux mandat de libération ou de soins.

Les révoltés peuvent ouvrir les portes, **même interdites**, comme le permet le Lord Core. Ils attendent néanmoins leur ouverture physique : vitesse, matériau, alimentation des portes automatiques et passage du corps restent effectifs. Une porte fermée n'est donc pas automatiquement un mur à détruire.
Ils cherchent le bord de la carte, combattent les défenseurs hostiles immédiatement proches et peuvent attaquer une barrière pour créer une brèche lorsqu'aucune route de sortie n'existe. Navigation, contact de mêlée, dégâts, protection et récupération après attaque utilisent les systèmes communs. Les colons peuvent se défendre et les tourelles considèrent les révoltés actifs comme des cibles hostiles ; les détenus ne deviennent pas ennemis les uns des autres.

## Répression, soins et sortie

La mise à terre met fin à la participation individuelle ; mort, crise incompatible ou besoin médical interrompant la fuite ferment aussi son mandat. Les blessures, la personne et son historique restent présents. Secours, transport vers un lit de prison et soins reprennent leurs règles habituelles ; la consigne de geôlier mémorisée peut ensuite reprendre. Une chute ne recrute pas le prisonnier et ne constitue pas une libération.

Une évasion n'est acquise qu'à la sortie physique au bord, après arrivée du mouvement et fin de la récupération de combat. Une personne portée, chargée d'une cargaison non déposée ou encore engagée dans un service ne disparaît pas avec ses objets.
Les vêtements exportés gardent leurs identités et leur propriétaire archivé. Un ancien assaillant utilise l'archive de départ de raid ; les autres utilisent celle de prison, sans double propriétaire. Le départ reste une évasion, distincte de la libération volontaire V267. Aucun effet diplomatique ajouté.

## Référence primaire et limites

Installation locale lue : **RimWorld Core 1.6.4871 rev590**, `E:/Steam/steamapps/common/RimWorld/RimWorldWin64_Data/Managed/Assembly-CSharp.dll`, SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`.
Lecture ILSpy8.2 ciblée sous `tmp/prison-break-v269-reference` : `PrisonBreakUtility`, `LordJob_PrisonBreak`, `LordToil_PrisonerEscape`, `JobGiver_PrisonerEscape`, `PawnKindDef` et classes de base Lord. Les définitions locales `Data/Core/Defs/DutyDefs/Duties_Misc.xml` complètent le comportement de combat. Les sources décompilées restent privées ; aucun code propriétaire copié dans le produit.

Core regroupe les participants via ses régions et chemins, désigne éventuellement un sapeur et orchestre plusieurs phases de Lord. V269 adapte la sélection aux pièces et à la navigation locales : **pas de Lord, regroupement ou escorte de leader**, pas de ramassage d'armes, drogues de combat ou creusement de rochers. L'interdiction historique des armes équipées par les captifs demeure. Les facteurs des gènes et contenus d'extensions ne sont pas modélisés. Le risque affiché ne certifie pas une fréquence naturelle mesurée en campagne.

## Validation

**155 cas uniques dans 25 fichiers passent par reprises ciblées, dont 40 nouveaux cas.** Risque, tirage collectif, propriétaires et interruptions conservatives, portes physiques, brèche, défense, fatigue, mise à terre puis secours au lit, archives et sauvegarde/reprise sont couverts. Les 62 sauvegardes publiques sont décompressées, migrées et validées sans modifier leurs fichiers. Les frontières du Decoder refusent un faux mandat de révolte ou des soins concurrents sans consommer la révision.

Le parcours WebGPU privé passe en **19,258 s** : révolte explicitement préparée au tick 3000, inspection et consigne désactivée, sauvegarde/rechargement exacts au tick 3006, puis porte interdite réellement ouverte et sortie au tick 3092. Porte conservée, archive unique et aucune erreur navigateur. Rapport et captures dans `tmp/prison-break-v269-native-UdiXLO` ; navigateur et port 5298 possédés fermés. Le déclenchement aléatoire, la brèche et la répression sont contrôlés par simulation ; ce parcours graphique ne prétend pas jouer leur fréquence naturelle en campagne.

Le build, incluant le typage final, passe en 6,529 s. Les premiers rouges de typage et de fixtures restent sous `tmp/validation-runs`. Deux sélections initiales comprenant par erreur la campagne historique longue de prison ont été interrompues sans verdict ; la suite regroupée suivante passe 142 cas et révèle un ancien test de libération fixé au schéma 202, repris au schéma courant. La reprise des frontières passe 25 cas, avec 13 cas communs à la suite précédente. Aucun gain FPS annoncé.

Deux défauts communs révélés par cette boucle sont corrigés : une chute de fatigue sur son propre lit utilise ce lit physique au lieu d'inventer un sol non praticable ; la fin de révolte annule les visées automatiques entrantes, notamment celles des tourelles, tout en conservant les récupérations, rafales déjà engagées et projectiles tirés.

Développement fonctionnel autonome et push après chaque commit restent autorisés ; ROOT seul exécute les contrôles de cette intégration.
