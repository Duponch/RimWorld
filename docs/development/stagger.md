# Ralentissement des impacts — V57

18 septembre 2026. [Recherche fraîche](../research/stagger-reference.md), [preuves](../history/validation-stagger-v57.md), [guide](../gameplay/player-guide.md). Un impact du revolver ralentit réellement un adulte, y compris pendant une arête déjà engagée. Aucun ennemi, raid ou étourdissement n’est ajouté.

## Simulation et continuation

`stagger.ts` reçoit l’impact validé après le producteur médical. Pour le seul profil adulte naturel actuel, puissance + 0,001 ≥ taille 1 : durée 95 ticks Core (9,5 locaux), facteur de marche 0,17. Un coup ultérieur conserve la plus longue échéance, sans multiplier les facteurs ni additionner les durées. Aucun PRNG, consommation de matière, perte de travail ou délai de tir supplémentaire. L’expiration retire le marqueur sparse `Pawn.stagger`.

`travel-timing.ts` isole la durée neutre et son intégration : base euclidienne/lumière/anatomie + délai terrain. Le facteur effectif ralenti est `max(0,17, duréeNeutre/45)`, plafonné à 1 ; le paiement Core minimal demeure respecté. `motion.stagger` contient l’union ordonnée des fenêtres qui concernent cette arête. Une fenêtre conserve son échéance entière, même après la fin de l’arête, pour reporter correctement le reliquat au prochain départ. Le passé et la position au moment de l’impact sont inchangés ; seule la fin future est recalculée.

Le marqueur d’effet et les fenêtres d’une arête ont des durées de vie distinctes. Une fenêtre écoulée reste nécessaire à la reconstruction exacte de sa trajectoire, même après expiration du marqueur. Le départ suivant conserve les fractions sous-tick, y compris une expiration entre deux ticks locaux. Sans ralentissement, la voie ordinaire reste directe et n’alloue pas de liste de morceaux.

Le patient porté partage les fenêtres et la durée de son sauveteur, sur copie indépendante ; la validation croisée refuse des historiques différents. Les personnes portées sont exclues des cibles de projectile par le contrat existant. Une blessure invalidant le secours est réconciliée avant le ralentissement. Les incapacités gardent la fin de l’arête capturée (adaptation V45), sans nouveau pas autonome.

## Persistance et présentation

V56 est strictement validée avant V57 ; aucun impact, état ou trajet n’est inventé. Dates Core entières, effet non expiré, fenêtres finies et ordonnées, borne de délai, fin calculée et cooldown cohérent sont vérifiés. Les champs V57 sont refusés dans V56 ; une sauvegarde invalide ne remplace pas la partie courante.

`MotionRecorder` remplace les morceaux de l’arête retimée et conserve les arêtes précédentes. Les morceaux portent dates et fractions de distance ; ils ne sont pas persistés séparément. L’interpolation GPU reste linéaire dans chacun d’eux, avec les mêmes attributs pour corps, cargaison, arme et sélection. Aucun nouveau lot, draw call ou squelette CPU. `aTravel` passe de vec2 à vec4 : deux flottants de fraction d’arête supplémentaires (8 octets par personne, buffer partagé), pour que le shader conserve la montée/descente du meuble sur la distance originale au lieu de recommencer sa rampe à chaque morceau. Le proxy de sélection emploie la même fraction. La publication observe création, renouvellement et expiration de l’effet. Le panneau Santé explique le ralentissement sans créer une lésion fictive.

Le coût supplémentaire est local aux impacts et aux changements de morceaux ; les effets actifs sont expirés dans la boucle des personnes. Les mesures 3/30/100 incluent cibles mobiles, vrais tirs, blessures et travailleurs civils. Pas de promesse de coût nul ni de fluidité universelle.

## Couverture et suites

Quatre scénarios profonds : oracle d’intégration sur 18 combinaisons (diagonale, terrain, capacités), impacts répétés et historique immuable, vraie balle sur cible mobile et GPU, secours/expiration/reprise exacte. Contrôle UI natif à 1×/6×, sauvegarde en ralentissement, position confrontée à une intégrale indépendante ; garde minage/abattage et pilote civil existants maintenus.

Adversaires/factions, permissions et collisions hostiles, réaction civile, poursuite/fuite, mêlée, armures, autres armes et statistiques de corps restent absents. Le catalogue du revolver ne vaut pas achèvement du combat. ROADMAP porte la prochaine livraison : premier adversaire, puis boucle blessure/secours/retour au camp.
