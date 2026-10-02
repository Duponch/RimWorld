# Réfugié poursuivi — première quête locale V183

La décision nouvelle du joueur est d'accueillir une personne **en acceptant sa poursuite annoncée**. Cette boucle complète l'accueil paisible V66 et utilise les personnes, possessions et raids physiques existants. La [recherche Core](../research/quest-local-core-v183.md) distingue `ThreatReward_Raid_Joiner` des extensions et vérifie sa conclusion neutre : elle ne signifie pas victoire contre le raid.

## Périmètre et adaptations

Une première famille locale, activée dans **Quêtes**, concerne seulement le départ Atterrissage/Cassandra. Le calendrier `pursued-joiner-v1` possède son propre PRNG ; première offre après huit jours, puis espacement de huit jours. Cette cadence locale et la menace annoncée d'un seul bandit au couteau (composition pirate minimale de 35 points) ne reproduisent pas la sélection pondérée de toutes les quêtes Core. Aucun ticket Misc ni opportunité Cassandra n'est détourné. Une offre attend une colonie vivante de moins de douze personnes, une bordure accessible et les capacités ; sinon nouveau contrôle cent ticks plus tard, sans tirage engagé.

L'offre dure 0,3 jour, soit **1 800 ticks locaux**. À l'acceptation, les échéances tirées à la création engagent une arrivée après 60–120 ticks puis un raid après 175/200/225/250 ticks. Les proportions et l'arrondi suivent la conversion 60 000→6 000 ticks/jour ; le profil du nouvel arrivant est une adaptation. Les délais, le nombre d'ennemis, la chemise reçue et l'absence de butin promis sont lisibles avant réponse. Refuser ou laisser expirer ne crée aucune personne, possession, pensée de refus V66 ou menace. Aucune annulation après acceptation n'efface la poursuite engagée.

## Transactions et chronologie

L'acceptation revalide l'offre, sa borne stricte (`tick < expiresAt`), le contexte et l'admission sans allocation ni tirage. L'arrivée revalide une bordure libre reliée à une personne vivante, puis crée atomiquement un colon et sa chemise externe : deux nouvelles identités, propriétaire apparel exact, aucun lit, repas, monnaie ou recherche. Son identité reste celle acquise, y compris après décès, départ en reconnaissance ou retour. Ses besoins et compétences suivent ensuite les règles ordinaires.

L'absence de place retarde l'entrée, sans teleportation. La poursuite attend au moins l'intervalle annoncé entre arrivée et raid. Un raid déjà actif, une capacité atteinte ou une bordure fermée garde l'état en attente, avec reprise au plus chaque cent ticks. Le groupe entre à la même bordure, près du point initial, avec les modes d'accès/breaching ordinaires ; si cette bordure ne possède aucune entrée admissible, il attend. La création partagée conserve exactement les tirages/identités du raid ordinaire ; la voie quête consomme seulement le PRNG de quête. `originQuestId` et `raidGroupId` fixent les liens, sans modifier l'agenda Cassandra.

Soixante ticks **après l'apparition effective** du raid, la quête est « Conclue », issue neutre. C'est une adaptation de la date Core planifiée pour ne pas conclure avant une poursuite bloquée localement. Ni mort de l'arrivant, ni capture, ni défense n'inventent un succès/échec. La conclusion ne retire aucun acteur et n'efface pas le raid encore actif. Sa résolution demeure dans les systèmes de combat et le panneau des raids.

## Persistance et coût

Schéma **172** : valider strictement 171 avant migration neutre, rejeter `quests` et les liens de raid futurs dans l'ancien schéma. La migration n'active aucun calendrier et ne produit ni offre ni personne. `quests` conserve le calendrier et au plus 32 dossiers ; seul un dossier peut être proposé ou engagé. Les dossiers conclus/refusés/expirés les plus anciens sont retirés, sauf ceux référencés par le raid actif ou le dernier résultat. `Pawn.originQuestId` conserve la provenance de l’entrée ; les références sont contrôlées dans les deux sens, sans exiger une chemise encore portée après les changements ordinaires. Les mêmes identités sont vérifiées dans le registre réunissant carte et reconnaissance hors carte.

Le chemin inactif est constant ; les dossiers sont bornés et les recherches de connectivité ne se font qu'à une admission ou une reprise espacée, jamais par image. Le rendu utilise les lots résidents existants ; aucune scène, animation ou ressource GPU spécifique à la quête. Cela ne prouve pas un coût global nul : le groupe physique utilise le coût ordinaire des nouveaux acteurs. L'UI lit le tick confirmé, maintient focus et texte sûr (`textContent`), couvre les HUD et distingue offer, attente, arrivée, poursuite et conclusion.

## Contrôles requis

Expiration/acceptation à la borne, réponses périmées et doublons sans mutation ; refus sans cadeaux ; entrée/reprise puis raid exactement une fois ; bordure et capacité bloquées/libérées ; raid ordinaire concomitant et RNG/agendas indépendants ; conclusion neutre pendant un combat actif, y compris arrivant décédé ; sauvegarde à chaque phase et validation des liens, propriétaire, champs futurs/migration 171 ; commandes worker au même tick et UI native. La colonie préparée « Asile et poursuite » propose la vraie offre avant acceptation, sans personne/raid précréés. Contrôles ciblés, régression bornée, présentation, build et coûts isolés seront consignés dans une preuve distincte.

Planètes, destinations, hospitalité temporaire, récompenses matérielles/diplomatiques, graphes génériques, choix de factions et autres familles de quêtes restent absents. Ce lot ne clôt pas G5.
