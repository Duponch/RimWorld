# V219 — Lancier et Piquier, combat mécanique à distance

**Livré dans le périmètre contrôlé, schéma 197 après validation stricte196 et migration du numéro seul.** [Recherche primaire](../research/ranged-mechanoids-core-v219.md), [preuve et limites](../history/validation-ranged-mechanoids-v219.md). Le suffixe énergétique V218 a passé sur sa copie exacte ; il reste distinct de ce lot.

Un seul lot pour les deux races : arrivée et composition, corps mécanique réel, visée et balle, défense au contact, mort et carcasse, récupération physique, persistance et présentation. Scyther et acteurs humains/animaux conservent leurs branches historiques. Aucun Pawn, niveau de compétence, besoin biologique, canon inventoriable ou arme récupérable factice.

## Corps et profils

Kinds `scyther/lancer/pikeman`, modèles distincts32/30/20parties, même noyau clinique solide. HealthScale1,32/0,72/0,85 ; mouvements4,7/4,7/2,5. Dossier sparse sain interprété selon le kind original ; aucun repli biologique ni changement d’identité au premier impact. Mort externe hostile certaine sans tirage supplémentaire, même transaction clinique/RNG et mêmes arêtes/frappes capturées. Trauma198/108/127,5 sans tronquer le dernier seuil.

Profils intrinsèques normaux : Lancier portée32,9, préparation102Core, récupération162Core, Bullet30/AP0,45, vitesse1,2case/Core ; Piquier44,9,150/126Core, Bullet15/AP0,35,0,9case/Core. Un projectile, stoppingPower1,5. Quatre précisions respectives0,65/0,85/0,85/0,75 et0,60/0,80/0,90/0,85 ; offset sans compétence8 dans la courbe partagée et vraies capacités. Distance, couvert, météo, posture et interception restent communs.

Deux poings/pieds avant Blunt12 et tête8,5/facteur0,2, cooldown120Core ; outils corporels/du canon vérifiés dans la référence et conditionnés aux vraies parties. Aucune lame Scyther sur ces deux races. Une vraie tentative de mêlée, même manquée, produit la menace ; proximité ou projectile seuls ne la fabriquent pas.

## Horloge, trajet et budget

État ranged propre, ordre à cible typée, stance warmup/cooldown à compteur Core restant et dernier passage. Un seul passage ID/Core ; stun suspend compteurs et contrôles de warmup. Perte de cible, ligne ou chute d’une cible initialement debout annule la préparation sans récupération. À son expiration, essai autorisé ou refus de disponibilité pose un cooldown plein, décrémenté seulement au passage suivant. Une blessure simple ne cancelle pas la visée. Projectile émis indépendant du tireur.

Placement local explicitement adapté : admission au Core courant déclaré, premier décrément au Core suivant ; job borné450..550Core et cadence de consultation20ticks, acquisition65/maintien72 existants. Une échéance de job retire l’intention même pendant un stun ; une récupération déjà engagée reste distincte. À la mort, l’ordre et la préparation cessent, mais le cooldown engagé termine avant conversion, comme la récupération physique de mêlée locale : adaptation de continuité, pas comportement exhaustif d’un Pawn Core mort.

Portée du canon, rayon de staging28 et acquisition sont distincts. Poste réel standable/accessibile, ligne et range ; mêmes recherches pondérées, captures et budgets globaux, aucun quota supplémentaire ni scan de carte par machine/Core. Une recherche reportée n’adopte ni cible, trajectoire, ID ou tirage. Mouvement attendu jusqu’à la fin de l’arête ; pas de trajet ou frappe durant Busy. Les captures sont invalidées au même Core après impact.

Limite du socle de ciblage : l’acquisition à distance choisit les personnes et animaux admissibles, jamais directement une tourelle, porte ou autre bâtiment. Une vraie balle peut toucher une structure en interception. En assaut, le devoir partagé peut ouvrir une brèche dans un mur, une porte fermée ou un climatiseur au contact ; il ne choisit pas une tourelle pour ce repli. Cette limite reste une dette de fidélité explicite, sans annoncer un combat mécanique Core exhaustif.

## Adoption, composition et conservation

Permission prospective `raids.mechanoid.ranged?:{adoptedAt}` sans PRNG ni agenda supplémentaire. La commande existante `enable-mech-raids` ajoute cette permission sous197, sans réinitialiser la politique antérieure ; deuxième activation idempotente. Nouveaux départs197 l’adoptent par leur factory Cassandra. Migration196→197 change seulement le numéro : aucun flag, acteur, projectile, roster, tirage ou bilan rétroactif. UI historique conserve l’activation lorsque seule la politique Scyther existe.

Groupe ranged80 servi à côté de mêlée70 ; all100, centipede30 et breach1 restent absents/silencieux. Coûts Piquier110/Lancier190, roster construit successivement selon budget restant, maxPawnCost et poids Core, sans unité gratuite. L’ancienne branche non adoptée conserve exactement sélection/RNG/roster Scyther. Première menace naturelle J45 et points strictement>300 distincts du minimum de composition110. Admission des sites/IDs/roster/RNG atomique ; StageThenAttack partagé, pas de retraite pirate ajoutée.

Relations amicales mécaniques capturées et typées à l’émission ; anciens rosters humains inchangés. Acteurs/carcas­ses conservent le même ID, kind et dossier terminal. Items `lancer-corpse/pikeman-corpse`, masse solide60kg selon couverture restante, PV d’objet100 ; sortie après vraie récupération et emplacement disponible. Concassage/broyage produisent15acier de base par les filières actuelles, avec leurs deux arrondis et sorties physiques. Aucun canon-pile, butin de groupe ou soin biologique mécanique.

## Gardes et preuve requise

Sous196 : kinds, corps, carcasses, profils de projectile, état ranged et permission future refusés, même dans archives. Gardes contextuelles après namespace complet, cohérence du kind sain/blessé et cible/source réelle ou historique légitime. Les filtres futurs de factures installées ou emballées sont refusés même comme propriétés propres `undefined` ; les archives civiles utilisent la garde commune des carcasses et refusent leur possession inventoriée. Refus atomique et reprise valide. Aucun fichier historique/public régénéré pour faciliter ces contrôles.

Deux silhouettes originales dans des lots par race, masques anatomiques32/30/20, inspection des vraies phases/capacités ; aucun Mesh/lumière/voix/sang humain par propriétaire. Scène publique préparée avant émission/blessure/carcasse, puis producteurs et parcours natif réellement observés. Contrôles groupés sur anatomie, phases/stun/contact, balistique/friendly-fire, roster/adoption/migration et récupération/reprise. Root seul lance les contrôles après gel, puis régression pertinente, build et présentation. Aucun gain CPU/GPU ou parité mécanique exhaustive présumé ; EMP, centipèdes, clusters, contrôle Biotech et butin supplémentaire différés.
