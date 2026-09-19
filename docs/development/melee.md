# Combat rapproché — V59

V61 autorise l’approche en mêlée du NPC muni du [mandat tactique](pursuit.md). Les anciennes sentinelles restent fixes ; le mobilisé en défense automatique ne poursuit toujours pas.

[Recherche et incertitudes](../research/melee-reference.md). Le joueur mobilise un ou plusieurs colons, choisit **Attaquer au corps à corps**, puis clique un personnage. L'ordre est atomique pour le groupe : places accessibles distinctes avant acceptation, trajet réel puis frappe. Il peut viser un allié explicitement ; la sélection ordinaire n'attaque jamais.

V63 applique la protection à la partie exacte avant les effets du worker : Poke choisit son organe avant armure ; une morsure atténuée devient contondante sans relancer Blunt. Usure et anatomie partagent la transaction. [Contrat](armor.md).

## Simulation

`melee-space` définit le contact et les places ; `melee-statistics` les outils, le toucher et l'esquive ; `melee-impact` les lésions résolues ; `melee` orchestre approche, sous-pas, expérience et fin d'engagement. Le contrôleur de combat partage l'horloge Core des projectiles et renouvelle ses captures après un impact de mêlée. Aucun DOM, Three, horloge réelle ou tirage caché.

Poings/tête/dents et trois gestes du revolver utilisent les parties présentes et la principale physique. Niveau Mêlée, vue/manipulation/mouvement ont des consommateurs réels. Raté/esquive ne causent pas de blessure ; toute tentative récupère 120 ticks Core, acquiert l'XP admissible et ralentit la cible 95 ticks Core. La cible nouvellement à terre termine l'ordre ; un ordre explicitement commencé sur une cible déjà à terre peut continuer. Aucune exécution spéciale n'est implicite.

Une arête de l'attaquant finit avant toute frappe. Un ordre de déplacement, un arrêt ou la démobilisation conserve la récupération ; chute médicale et effondrement de fatigue sont des interruptions dures. Les ressources portées passent par l'interruption conservatrice existante. La sentinelle riposte à un ennemi adjacent et retrouve son observation à distance quand le contact cesse.

Les contusions/fissures/écrasements et morsures réutilisent santé, capacités, soins, mort et équipement abandonné. Le résolveur travaille sur une copie avec PRNG explicite. Préservation extérieure, propagation contondante et couches de Poke sont distinctes. Pas de bouclier ou d'armure implicite.

## Étourdissement et présentation

`stun` bloque actions et nouveaux pas. Une arête en cours reçoit un intervalle immobile, conservant sa fraction exacte ; la reprise utilise le même trajet. Ces intervalles et les ralentissements se combinent, puis le bridge envoie des segments à progression constante. Corps, chargement, patient porté et sélection partagent ces segments. Le nombre de programmes/draw calls n'augmente pas par combattant ; frappe évaluée dans le rig GPU existant avec la même horloge que le trajet. FPS maintenus.

Durée provisoire de l'étourdissement : 45 ticks Core, incertitude documentée. La pose de frappe est artistique, pas un modèle de dégâts ni une animation squelettique CPU.

## Persistance et frontières

Schéma **59**, validation stricte de V58 avant ajout de Mêlée niveau 8, aucune passion ni expérience passée inventée. Préserver carte, acteurs, arêtes, ressources et PRNG. Nouvelles formes sparse `Pawn.melee`, `Pawn.stun`, `motion.stuns` et nouvelle lésion `bite` interdites aux versions antérieures. Les fixtures historiques retirent le nouveau profil ; le chargeur ne répare pas une sauvegarde invalide.

Une place de combat est distincte des réservations civiles ; les combattants debout se bloquent, les civils conservent le partage du transit. Les captures spatiales ne survivent pas à leur décision synchrone. Les scènes en charge emploient des frappes et blessures réelles, sans restauration périodique de santé.

## Limites

V60 livre tir automatique et réaction Attaquer ; V61 poursuite visible et postes de tir ; V63 chemise/gilet protecteurs. Restent terrains offensifs, autres armures/vêtements et armes, attaque d’objets, infections, prisonniers et raids. La mêlée est utilisable avec le contenu actuel ; cela ne termine ni Combat ni G3.
