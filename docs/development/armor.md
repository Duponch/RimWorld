# Vêtements physiques et protection corporelle — V63

V74 branche l’**isolation vestimentaire** sur le confort et le coup de chaleur. Qualité appliquée, PV sans effet ; statistique distincte de l’armure chaleur. [Valeurs et santé](heatwave.md).

V73 rend la **chemise en tissu fabricable** après Vêtements complexes, au tailleur manuel (45 tissus). Elle réutilise les propriétés et couches ci-dessous, avec qualité de confection. Le gilet reste non fabricable. [Filière et limites](research.md).

V72 étend ce contrat avec la **tenue tribale en tissu** : torse/jambes, couche peau, 100 PV, neuf ticks pour enfiler/retirer ; protection normale tranchante 7,2 %, chaleur 3,6 %, contondante 0. Incompatible avec chemise, compatible avec gilet. Fabrication et six qualités réellement obtenables : [confection](tailoring.md). La chemise est fabricable depuis V73 ; le gilet conserve son acquisition antérieure, sans fabrication.

Chemise en tissu et gilet pare-balles : acquisition au sol dans les nouvelles colonies, habillage et retrait physiques, couches compatibles, protection anatomique, usure aux impacts et projection commune carte/portrait. [Recherche renouvelée](../research/apparel-reference.md), [preuves V63](../history/validation-apparel-v63.md), [priorité canonique](../ROADMAP.md). Le noyau a été préparé sous V62 ; seule V63 le branche au gameplay.

## Objets et manipulation

`cloth-shirt` : couche peau, torse/cou/épaules/bras ; 100 PV ; 90 ticks Core (9 locaux) pour enfiler/retirer ; protections normales tranchant 7,2 %, contondant 0 %, chaleur 3,6 %. `flak-vest` : couche intermédiaire, torse/cou **sans épaules depuis 1.6**, 200 PV ; 300 ticks Core (30 locaux), protections 100/36/27 %. Les sept qualités multiplient l’armure par 0,6/0,8/1/1,15/1,3/1,45/1,8, plafond 200 %. Les PV restants ne multiplient pas la protection.

Trois chemises et un gilet normaux sont fournis au sol dans un nouveau départ : adaptation annoncée du scénario, pas une recette ni un Crashlanded complet. Une pile par cellule, quantité un, identité et qualité/PV conservés pendant le transport. Le propriétaire `apparel` est distinct de la principale `equipment`, du sol et de la cargaison `pawn`. La réserve accepte les vêtements avec son filtre explicite ; l’interdiction empêche le transport automatique. Un ordre explicite Porter lève cette interdiction.

Réservation immédiate, trajet au contact puis attente physique ; le vêtement reste au sol jusqu’au résultat. Durée capturée : nouveau vêtement + vêtements incompatibles. Les anciens sont déposés pendant l’attente, à partir de leur délai, suivant le tampon cumulatif Core ; au plus un par tick local. Le contenu présent n’a qu’un incompatible possible (la même famille). Annuler après cette dépose laisse deux objets au sol, sans rééquiper magiquement l’ancien. Retirer attend son propre délai puis dépose près du colon et interdit l’objet. Sol saturé : refus conservateur, aucun effacement de vêtement. La file et la politique de tenue restent absentes, donc aucun remplacement autonome après un ordre forcé.

La compatibilité utilise le corps naturel ; enfiler exige au moins une partie couverte encore présente. Les vêtements restent sur le corps à terre ou mort, contrairement à la principale. Le gilet applique −0,12 sur la base Core de 4,6 cellules/s, donc facteur relatif 4,48/4,6 à la capture de la prochaine arête. La calibration locale de déplacement existante est conservée ; aucune arête engagée n’est retimée pour un changement de tenue.

## Frontière

`src/sim/armor.ts` compile une couverture anatomique immuable puis résout un impact sur des instances explicitement fournies. Il ne connaît ni World, ni propriétaire, ni horloge, ni rendu. Un profil rassemble couches, parties couvertes et dernière couche ; il se construit une fois par définition. La compatibilité utilise l'intersection réelle des parties couvertes, y compris les groupes aux noms distincts qui se recouvrent. La couverture n'est pas héritée des parents anatomiques.

L'entrée contient des statistiques déjà résolues par matière/qualité, l'identité et les PV de chaque pièce, la partie exacte touchée, les dégâts et leur pénétration. Le tableau conserve l'ordre stable de portage pour les égalités de dernière couche. Le tri local ne modifie jamais ce tableau. Une pièce multicouche n'est traitée qu'une fois. Le module applique ensuite la protection corporelle fournie ; il ne simule pas des implants ou une race supplémentaire.

La sortie est une transaction : dégât final, catégorie finale et changements de PV demandés aux pièces touchées. Les entrées ne sont pas modifiées ; une destruction n'est engagée que par `apparel-protection.ts`, propriétaire de la transaction. Le classement et la statistique de la pièce sont ceux d'avant son usure. Après conversion de Sharp en Blunt, les couches suivantes continuent à lire la statistique Sharp capturée. Une déviation arrête les pertes des couches plus profondes. La protection de chaleur est une catégorie de dégâts, pas l'isolation thermique d'un vêtement.

Les tirages sont fournis par l'appelant, validés dans [0,1[ ; les formes invalides sont rejetées avant tout tirage. Une exception après tirage n'altère aucun vêtement, mais **le callback RNG a pu avancer** : l'appelant doit utiliser un PRNG local et ne l'engager qu'après réussite, avec dossier médical et usure. Aucune sauvegarde n'est exposée à mi-transaction. L'arrondi stochastique consomme un tirage même à l'entier. L'armure nulle consomme aussi son jet. Les valeurs d'armure du noyau admettent les résidus dépassant 100 % ; le plafond de statistique Core appartient au producteur du profil, désormais résolu dans `apparel-rules.ts`.

## Impacts et persistance

Tir Sharp avec pénétration du projectile, morsure Sharp, coup et Poke Blunt, toit Crush/Blunt avec pénétration nulle : choix de la partie exacte avant armure, propagation ensuite sans second jet. Poke choisit son organe avant protection. Une balle réduite devient lésion contondante mais conserve son worker original, sans effet interne/étourdissement de la mêlée Blunt. Même principe pour la morsure. Le pouvoir d’arrêt et la récupération restent indépendants de la blessure ; un impact dévié peut réveiller par bruit, mais ne déclenche pas de nouveau délai « dommage couché » sans lésion.

Usure, PRNG local et dossier médical sont engagés ensemble. Une pièce à zéro PV disparaît sans produire de matière. Les acteurs sans vêtement conservent l’ancien chemin PRNG sans jet d’armure nulle supplémentaire : adaptation de continuation, jamais promesse de séquence aléatoire identique à RimWorld.

V62 est validée strictement avant passage V63, sans inventer vêtement ni tâche. V63 contrôle qualité, PV, type, quantité, propriétaire, compatibilité, cible réservée et durée capturée ; chargement refusé atomiquement en cas d’erreur. Les besoins, incapacités, ordres, cargaisons et routes gardent leur contrat commun d’équipement.

## Présentation et limites

`character-apparel.ts` projette une fois le snapshot pour le corps GPU et les portraits CSS. Chemise = couleur des manches/torse ; gilet = volume rigide sur le torse, animé avec sa pose. L’attribut d’équipement existant devient vec3 (arme, chemise, gilet), sans nouveau buffer par instance ni nouveau draw call de personnage. Objet plié au sol/cargaison et pièce portée changent au temps de scène, sans retrait anticipé. Le vêtement cosmétique de base n’a toujours aucune protection.

Encore absents : autres vêtements/matières, couvre-chefs, autres fabrications textiles/armures que la tenue tribale et la chemise, politiques automatiques et marquage forcé face à ces politiques, déshabillage d’autrui, rangement automatique après retrait, souillure, usure quotidienne, inventaire personnel, masse et portraits 3D définitifs. Les objets présents sont obtenables et protecteurs ; ces limites empêchent de clore le système d’habillement ou GAP-007.
