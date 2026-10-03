# Continuité de poursuite en mêlée — correction V197

Correction de deux pauses artificielles dans la poursuite existante, **sans nouvelle mécanique ni migration ; schéma 182 conservé**. La [recherche Core 1.6.4871](../research/melee-pursuit-core-v197.md) distingue réexamen du job, renouvellement du chemin et récupération après tentative de coup. Elle ne prescrit aucun repos périodique au poursuivant hors contact.

## Causes et correction

Dans `processMelee`, l'extrémité d'une route pouvait devenir obsolète après un déplacement de la cible. Le délai de nouvelle recherche empêchait alors également de parcourir le début encore sûr de cette route. Dans `processTactics`, l'échéance de révision supprimait l'engagement avant de savoir si l'acquisition allait retenir la même cible ; sa recréation pouvait hériter du délai de recherche précédent.

La route et la cible ne deviennent pas invalides pour la seule raison qu'une nouvelle décision est due. Le délai de planification borne les **recherches**, tandis que le mouvement physique peut continuer sur une route disponible et sûre.

## Contrat de simulation

- **Préfixe de route sûr :** si la prochaine arête reste franchissable, une destination devenue obsolète ne bloque pas ce pas pendant le délai ou l'épuisement du budget de recherche. Chaque arête est revalidée avec les règles existantes d'obstacles, de coins et de personnages. Le chemin restant ne donne aucun droit de traverser un blocage ajouté.
- **Recherche bornée :** les nouvelles routes restent soumises au budget partagé et au délai de planification. Le dernier pas engagé d'une route réussie libère le délai pour préparer son éventuel prolongement après sa fin physique. Un échec de recherche n'engage aucun pas et ne gagne pas cette remise ; une route absente ou réellement bloquée peut toujours attendre une recherche admissible.
- **Révision différée :** quand le budget ou le délai ne permettent pas encore le réexamen, un engagement valide poursuit son exécution. À la révision effective, conserver la même cible conserve sa route et son engagement ; une cible différente annule l'intention précédente avant la nouvelle approche. Une acquisition infructueuse ou une cible devenue invalide libère l'engagement selon les règles existantes. Les changements d'arme et de mode de combat gardent leur réconciliation propre.
- **Contact et interruptions :** aucune frappe avant la fin de l'arête capturée et le contact admissible. Les tentatives, y compris raté/esquive, gardent leur récupération ; arrêt, déplacement, démobilisation ou changement de cible ne l'effacent pas. Étourdissement, incapacité, disparition de cible, porte et obstacle conservent leurs effets physiques. Le ralentissement de la victime ne devient pas un délai du poursuivant.

La correction partage les champs, l'horloge et les déplacements existants. Aucun état rétroactif, tirage supplémentaire de coup, raccourci d'accès ou calcul de navigation par image n'est introduit. La révision tactique consomme son budget et ses tirages seulement lorsqu'elle a effectivement lieu ; elle ne promet pas de conserver la chronologie défectueuse antérieure.

## Validation attendue et limites

Les contrôles doivent exercer une cible mobile, un préfixe encore sûr pendant le délai, l'épuisement de route, une révision gardant la cible, une révision différée faute de budget et un changement réel de cible. Ils doivent aussi conserver les refus d'un pas bloqué, les récupérations, la continuation après sauvegarde et la chronologie visible des segments. Les [oracles temporels](testing.md) distinguent ces transitions d'un simple résultat final de combat.

Ce contrat ne constitue pas une preuve d'exécution. Les résultats de simulation, présentation et navigateur, leurs contrôles non exercés et leurs limites de performance appartiennent à la [preuve de livraison](../history/validation-melee-pursuit-v197.md). La recherche Core n'est pas une reproduction en partie du signalement ; aucune parité exhaustive de l'IA ni aucun gain général CPU/GPU n'est annoncé.
