# Demandes d’accueil — V66

V69 : une nouvelle offre enregistre aussi les [traits du profil](traits.md) et les annonce avant acceptation. L’entrée copie ces identifiants sur la personne. Une offre migrée sans traits reste neutre, sans réinterprétation rétroactive de son numéro de profil ; aucun tirage supplémentaire ni changement de cadence.

Le nouveau camp paisible reçoit des demandes pendant la partie. Une lettre dans les alertes propose accueillir, refuser ou décider plus tard ; le temps de simulation continue si le jeu n’est pas en pause. [Référence et adaptations](../research/arrival-reference.md).

## Autorité et frontière

`arrival-state.ts` contient le profil, le flux PRNG indépendant, la prochaine vérification, le compteur d’offres et les issues. `arrivals.ts` possède le producteur et la commande ; `arrival-entry.ts` capture la connectivité pour une décision synchrone ; `arrival-save.ts` valide. `ui/arrivals.ts` lit le même état et émet des commandes. Le bouton de lettre reste attaché pendant les rafraîchissements des autres alertes afin de conserver le focus clavier. Une lettre fermée reste en attente ; elle n’est pas un événement DOM autoritaire.

L’offre garde prénom/profil/identité d’offre et dates. Aucun personnage, lit ni vêtement n’est créé sur la carte avant acceptation. Les délais n’avancent que par ticks. À la limite exacte d’expiration, accepter/refuser est déjà impossible ; l’expiration est traitée avant les actions du tick. Un même identifiant ne peut produire deux arrivants ni deux souvenirs.

L’acceptation revalide la capacité et une bordure libre reliée à au moins un colon vivant, selon obstacles, portes et occupation. La connectivité cardinale ne modifie ni les routes pondérées ni les diagonales. Aucun parcours de carte hors vérification/acceptation. La capture ne survit pas à la commande. Si l’accès est perdu, aucun ID, stock, PRNG ou issue ne change ; ouvrir un passage permet une nouvelle tentative avant expiration.

La transaction ajoute la personne et sa chemise portée avec des IDs distincts. Ce vêtement est un apport extérieur conservé dans le bilan du pilote, pas une fabrication ni un retrait de réserve. Les piles déjà présentes restent intactes. Le colon utilise ensuite le travail, l’alimentation, le repos, les affectations, le rendu instancié et les ordres communs. Aucune réservation de lit, nourriture à distance ni accélération de déplacement n’est offerte par l’arrivée.

Le profil de personne est un contenu provisoire déclaré dans la recherche. Sa meilleure compétence active est annoncée dans la demande ; les autres se consultent après acceptation. Les nouveaux acteurs possèdent leurs propres objets de compétences, horaires, besoins et files. Un régime supprimé ne laisse pas de référence invalide : le premier régime présent au moment de l’accueil sert de défaut, même si son ID n’est plus 1.

## Refus et continuité

`Pawn.deniedJoining` garde au plus cinq dates d’expiration, six jours après le refus. Les colons vivants hors crise reçoivent le souvenir ; les états gelant la jauge n’arrêtent pas son expiration. Effet partagé inspection/simulation : −3 × somme des puissances successives de 0,75. Le nettoyage fonctionne aussi pour les personnes décédées conservées. Traits annulant cette mémoire et familles restent absents, comme dans le catalogue actuel.

V65 est strictement validée avant V66 ; aucun passé ni arrivant n’est ajouté à une ancienne partie. L’absence de calendrier préserve les anciennes continuations et les fixtures isolées. Le bouton « Activer les demandes d’accueil » permet d’engager le calendrier dans ces camps ; cliquer à nouveau ne remet pas son échéance à zéro. Les nouveaux camps ordinaires l’activent à la création dans le worker. Rencontre armée demeure une scène contrôlée, activable séparément par le même bouton.

Le calendrier, l’offre, les issues et mémoires sont validés en relation avec le tick. Une sauvegarde antérieure contenant déjà ces champs est refusée. Les snapshots transportent le même état et les changements de population sont publiés avec leurs événements ; aucune voie de simulation parallèle ne pilote le rendu.

## Bornes et livraison

Le calendrier n’est pas le narrateur complet. Après la quatrième personne, le pilote de camp refuse une nouvelle expansion pour stabiliser ses ressources ; le joueur reste libre de décider. Le pilote ajoute un lit, augmente sa cible de repas, affecte les travaux et conserve ses contrôles de production, conservation et reprise.

Contrôles requis : acceptation/refus/expiration, duplicata, bord inaccessible puis rouvert, régime supprimé, migrations, reprise d’offre et de marche, camp sur plusieurs jours et UI 1×/6×. Auditer le pic d’acceptation et le passage de N à N+1 acteurs, en plus des ticks et snapshots à forte charge. La validation publiée distingue toujours préparation de fixture, vrai calendrier de partie et exécution constatée.
