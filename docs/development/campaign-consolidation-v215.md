# V215 — Conservation et défense des campagnes

Consolidation préparée sur V214 `c82c2040`, schéma195. Aucun nouveau format de partie, contenu ou coefficient de simulation n'est requis par les défauts identifiés. Le lot conserve les payloads publics, graines, objectifs physiques et assertions de survie. La validation complète des campagnes de cette base reste en cours ; leur échec initial n'est pas remplacé par le résultat d'une reprise ciblée.

[Référence et distinction des producteurs](../research/campaign-consolidation-v215.md).

## Rendement et conservation

Les arbres gardent un potentiel nominal dans `woodAccount`. Depuis V179, leur production humaine applique l'arrondi stochastique du rendement physique, puis un second arrondi si le facteur final de compétence dépasse1. Le résultat peut donc dépasser le potentiel nominal retiré : l'ancienne égalité sans bonus ne constitue plus un oracle valable. [Règles Plantes](plants-skill-v179.md), [référence](../research/plants-skill-core-v179.md).

Une instrumentation commune capture la source, le rendement physique et le facteur final au vrai appel du producteur. Elle vérifie indépendamment les au plus quatre quantités autorisées par les deux arrondis, la consommation unique de la source et l'augmentation exacte des piles de bois. Une production refusée conserve source, quantités, PRNG et allocation d'identifiants. Aucun excédent du bilan global n'est crédité comme bonus supposé.

Le bilan garde son égalité stricte : potentiel et stock réels, plus pertes nettes de rendement, moins bonus nets, plus pâture et pertes physiques connues, moins repousses réellement produites. Les pertes de feu et de destruction restent séparées des recettes et du combustible déjà suivis ; aucun compteur n'est ajouté deux fois. Les compteurs d'instrumentation sont versionnés dans les checkpoints du pilote. Un checkpoint historique ne permet pas de reconstruire rétroactivement les récoltes non observées.

## Défense et portée

La campagne Énergie de la base a perdu Ada après un contact avec un animal en rage. Deux coutures sont examinées séparément. Son pilote commun savait sélectionner cette menace, mais sa demande répétée de tir au contact ne produisait aucune défense. Le producteur d'acquisition automatique recontrôle aussi la visibilité du tir sur un contact déjà autorisé par `meleeContact` : en diagonale avec un seul flanc libre, cette condition peut interdire la défense humaine tout en autorisant le coup animal.

Le contact de mêlée doit constituer la même autorisation physique pour les deux acteurs. Le contrôle de visibilité reste requis pour l'approche hors contact ; les coins réellement fermés restent infranchissables. La correction du pilote doit choisir une action réellement admissible de mêlée ou de repli, respecter les incapacités de travail et conserver les réponses aux autres menaces ainsi que les soins. Aucun dégât ni incident n'est modifié pour rendre le scénario gagnant. [Acquisition automatique](automatic-combat.md), [mêlée interespèces](animal-melee.md), [poursuite](melee-pursuit-v197.md).

Les contrôles courts précèdent les reprises des campagnes concernées. Les reprises depuis un checkpoint authentique conservent sa provenance et leurs limites ; une preuve locale de défense ne certifie pas le parcours électrique complet. Les campagnes encore actives utilisent les mêmes sources et tests gelés. Les prototypes privés du monde ne sont ni importés ni exécutés pendant ce contrôle.

## Compatibilité des identités

La revue du futur groupe a révélé une borne plus restrictive dans le namespace humain de V214 que dans le validateur ordinaire des Pawn :48caractères et nom rogné non vide contre1à80caractères. Une partie acceptée sans relation peut ainsi échouer lorsque ce contexte est consulté. La correction doit conserver exactement les noms déjà valides, sans normalisation rétroactive, tout en gardant les refus ordinaires du nom vide ou trop long. Les archives conservent leurs propres gardes ; le resolver ne les remplace pas.

## Entretien et matière

La campagne Prison initiale atteint soins, alimentation et recrutement, puis échoue sur une cuisine électrique en panne hors Foyer. Le pilote partagé doit étendre le Foyer aux empreintes des appareils réellement installés à ses emplacements. Il ne peint pas les futurs plans, ne répare pas directement et ne crée ni travail ni composant : le producteur [V144](breakdown-v144.md) réserve, prend, livre et consomme la vraie pièce.

La campagne Environnement échoue au tick530750 sur un composant. Le checkpoint conserve le remplacement réellement accompli par Noé au tick530677 ; le bilan ancien ignore cette consommation de V144. Le contrôle de matière doit observer le producteur de remplacement, sa pièce livrée et sa consommation exacte, que l'issue soit succès ou échec. Aucun composant disparu ailleurs ne peut être crédité comme entretien. Un refus ou travail inachevé ne consomme rien ; reprise et ledger d'instrumentation doivent être explicites.

## Validation et continuité de travail

La cohorte initiale de treize fichiers sur `c82c2040` est terminée : huit fichiers réussissent, cinq échouent, soit36cas réussis, sept échoués et deux ignorés. Durée enregistrée3672,529s. Les preuves courtes du correctif et les futures reprises restent distinctes de cette base rouge.

Une campagne longue peut utiliser une copie exacte des fichiers suivis d'un commit, avec manifeste SHA256 et dépendances inchangées. Le développement suivant peut alors modifier le dépôt principal sans altérer les sources de ce contrôle. Aucun résultat de cette copie ne valide des modifications ultérieures ; aucune mesure de performance n'est comparée sous concurrence de contrôles lourds. Les fixtures et rapports historiques restent des entrées immuables.
