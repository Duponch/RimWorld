# Approche ennemie et postes de tir — recherche du 19 septembre 2026

Corpus relu : chapitres **17, 20 et 21**, **SYS/TEST-113..117**, acquisition/ligne/attaque des chapitres 17–20. Adopter la distinction accès, route et suivi, les obstacles mobiles et les engagements persistants ; adapter algorithme, ordre des égalités et temps local ; différer mandat collectif, raids et retraite. Les propositions de pondération du corpus ne certifient pas des constantes Core.

## Sources confrontées

- [Correctif officiel 1.6.4850, 8 juin 2026](https://ludeon.com/blog/2026/06/update-1-6-4850-released/), ouvert à nouveau le 19 septembre : corrections de passage des bloqueurs amis/ennemis, de contournement des personnages et du rayon des défenseurs d'objectif. Il ne décrit pas les algorithmes corrigés. **Ce correctif est postérieur au miroir étudié.**
- [Combat](https://rimworldwiki.com/wiki/Combat) et [raids](https://rimworldwiki.com/wiki/Raids), reconsultés le 19 septembre : les deux camps utilisent le couvert ; un comportement individuel n'est pas la stratégie d'un raid. Le wiki signale des sections incomplètes et certaines données historiques. Pas de certification numérique à partir de ces seuls résumés.
- [Miroir tiers épinglé au 20 mai 2026](https://github.com/Chillu1/RimWorldDecompiled/tree/2d508035082e7cb0c8e29e230d26bda6e546928f) : lectures fraîches de `JobGiver_AIFightEnemy`, `JobGiver_AIFightEnemies`, `JobGiver_AIGotoNearestHostile`, `CastPositionFinder`, `CastPositionRequest` et `JobDriver_Goto`. Pas un binaire récent certifié. Fichiers consultés conservés seulement dans `tmp`, pas distribués dans le projet. Implémentation locale indépendante.

La base FightEnemy acquiert dans un rayon de 56 et conserve au plus 65 ; elle vérifie visibilité à l'acquisition, menace active, accès si le tir actuel est impossible, et fraîcheur d'engagement à la reprise de décision. Les sous-classes/XML peuvent modifier ces paramètres. `chaseTarget` distingue la conservation d'une cible qu'aucune acquisition fraîche ne retrouve. GotoNearestHostile est une autre branche : ce n'est pas une permission de connaître magiquement toute la colonie.

Attente/tir et marche vers un poste expirent dans 450–550 ticks Core ; la décision de mêlée dans 360–480. Un tireur conserve son poste si son tir est valide et s'il bénéficie déjà de couvert (>0,01), ou si sa cible est à moins de cinq cases. Sinon il recherche un poste ; il ne tire pas pendant son trajet.

Le fournisseur concret FightEnemies demande la portée effective autour de la cible, du couvert si portée >5, sans rayon de déplacement maximal explicite. Le score observé combine base 0,3, couvert reçu ×0,55, déplacement ×0,967^distance, préférence pour 80 % de portée via la distance au carré, et pénalité ×0,5 à moins de cinq cases. Le demi-plan du côté du tireur est examiné avant l'autre ; un résultat >0,33 suffit dans cette première moitié. Nous ordonnons les égalités par distance puis z/x. Le facteur pour cases de simple transit ne crée pas le droit de s'y arrêter.

## Décisions et incertitudes V61

- **Adopter** approche réelle, poste à portée avec ligne/penchement/couvert existants, repos entre tirs, corps/corners/portes communs, réservation de destination et mêlée sans arme.
- **Adapter** mandat local aux menaces humaines visibles : acquisition renouvelée à l'expiration, sans branche omnisciente de recherche de bâtiments ni poursuite illimitée derrière une paroi. Un trajet engagé peut finir sa décision avant la nouvelle acquisition ; incapacité/disparition annule à la prochaine décision physique. Vérification au tick local après fin d'arête et récupération, donc pas de raccourcissement du mouvement/cooldown pour coller à une échéance Core.
- **Adapter** les cases d'arrêt aux meubles actuels : nos surfaces réservées ou de transit ne sont pas des postes de tir. Pas de modificateur fictif de feu/danger/zone autorisée en l'absence de ces systèmes. Le miroir possède aussi un champ de distance conditionnel à une borne absente de l'appel concret : ne pas transformer ce détail potentiellement historique en règle certifiée.
- **Adapter la migration** : seuls les nouveaux scénarios Rencontre armée reçoivent le mandat mobile. Les sauvegardes antérieures conservent leur sentinelle fixe, sans cible, RNG, route ni comportement nouvellement inventés. C'est une compatibilité assumée, pas la prétention que RimWorld distingue ces deux versions de scénario.
- **Différer** raids, décisions de groupe, défense d'objectif, attaque de bâtiments/portes, retraite, réveil défensif, recherche de nourriture et récupération autonome d'arme du NPC. Le profil actuel ne clôture pas SYS-113..117 ni tout le combat.

Degré de certitude : élevé pour la séparation mouvement/tir/couvert et les contrats locaux éprouvés ; moyen pour les coefficients de ce fournisseur du miroir ; insuffisant pour annoncer la parité de l'IA complète ou des corrections officielles de juin. La prochaine recherche doit reprendre ces branches avant d'ajouter une stratégie de raid.

Audit rétroactif : le texte d'inspection indiquait encore « sans mêlée » après V59. Il est corrigé en V61 ; les contrats et l'interface doivent décrire les mêmes actions, pas seulement les titres des versions.
