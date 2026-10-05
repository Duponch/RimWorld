# V216 — Globe et voyage collectif

**Livré dans le périmètre contrôlé.** Base V215 `643b84d1`, schéma196 après validation stricte195 puis migration du numéro seul. [Recherche primaire](../research/planet-group-core-v216.md), [suivi](../history/validation-planet-group-v216.md). La preuve distingue contrôles exécutés, scène préparée et limites.

## Boucle retenue

Le joueur adopte explicitement une géographie, choisit un à huit adultes libres et sains, des provisions au sol et une destination terrestre. Un autre colon capable reste au foyer. Rassemblement, prises réservées et sortie des membres utilisent les déplacements pondérés ordinaires et leurs budgets. Tous les membres terminent leur arête avant le départ collectif. Annuler garde les biens déjà portés et permet leur déchargement physique.

Le groupe conserve les personnes originales et leurs vrais inventaires, armes et vêtements dans un propriétaire exclusif hors carte. Une route traverse des cases voisines du globe ; masse, relief, biome, hiver et nuit interviennent. Le joueur peut interrompre la marche ou choisir une autre destination. Pause, visite et entrée fermée continuent besoins, clinique, âge et souvenirs. Une visite du comptoir propose les achats et ventes existants avec fonds finis, devis et transfert atomique ; aucune transaction ni route de retour automatique. Le retour réinsère les personnes originales sur des cellules de bord distinctes puis dépose réellement leur inventaire.

## État et frontières

`World.planet?` contient162 cases d'une sphère subdivisée originale : centres unitaires, voisins, biomes, relief, température moyenne et pluie. Douze pentagones et150 hexagones ;960 arêtes dirigées. Les polygones graphiques sont dérivés, jamais une seconde géographie persistée. Terrain généré simplifié, trois biomes locaux et océan ; foyer compatible avec la carte existante et comptoir à trois sauts terrestres. Cela adapte l'échelle et la génération Core ; aucune sélection rétroactive d'une nouvelle carte locale.

`World.group?` contient un seul groupe actif : rassemblement, chargement, sortie, voyage, visite, attente d'entrée ou déchargement. Pendant formation, les reçus de contact comptent seulement les prises nouvelles. Au vrai départ, un baseline séparé capture les biens présents, y compris ceux déjà portés. Repas consommés, doses de soins, paiements, ventes et achats soldent ce baseline ; les biens retenus avec un décès du même groupe restent dans l'équation. Aucun reçu historique n'est reconstruit depuis le stock courant.

`World.groupLosses?` conserve au plus64 dossiers : personne réellement morte, cause/tick clinique, case et biens originaux. La capacité restante est réservée avant le départ. Une perte est figée à son horloge réelle ; elle ne marche, ne mange et ne rentre pas. Cette conservation prudente adapte Core et ne livre pas un corps récupérable ou un camp.

La capture commune des propriétaires humains lit carte, voyages individuels existants, groupe vivant et archives réelles. Elle ne transforme aucun lien familial, référence de formation ou quête en propriétaire. Les IDs des nouvelles personnes/piles sont enregistrés avant les gardes de références et relations ; géographie et groupes ont des namespaces privés. Schéma195 refuse les nouvelles propriétés même explicitement `undefined` ; migration196 sans planète, groupe, progression, ressource, personne ou tirage ajouté.

## Évolution personnelle et limites

L'horloge `lastPersonalTick` est initialisée après le passage local au vrai départ. Chaque tick confirmé traite les personnes une fois, puis ingestion/soins/loisirs et dix pas Core de route. La clinique partage les noyaux locaux avec contexte explicite de sol/repos ; aucun bonus de lit, chambre ou météo du foyer lu aux anciennes coordonnées. Les rations viennent des inventaires réels. Les soins mondiaux consomment une vraie dose et suivent une consultation hash de1250 ticks Core, sans faux travail de chevet ou XP de Toil.

Humeur et souvenirs personnels continuent ; attente et pauses permettent loisirs solitaires/sociaux existants. Les crises spatiales hors carte sont différées. Leur exposition sous les seuils est réinitialisée au départ, sans crise rejouée au retour ni récompense/catharsis ajoutée. L'attente sociale et certaines pensées Core de caravane sont partielles ; l'attente de richesse de la colonie utilisée ici est une adaptation. Un membre incapable arrête la marche : portage humain mondial et bêtes de somme différés. Aucun nouveau climat nocif, rencontre ou maladie sans producteur.

## Interface et coût borné

Le panneau Monde réunit globe/groupe et anciens voyages individuels. SVG résident de162 faces, rotation locale, noms via `textContent`, marqueurs foyer/comptoir/destination/groupe ; aucune nouvelle scène Three. Sélection et prévisualisations utilisent le snapshot confirmé. Commandes attendent l'acquittement réel ; refus, état inconnu et resynchronisation restent visibles.

Une capture de connectivité par membre répond aux sources, rassemblement et sorties ; aucun parcours par source/spectateur. Budget maximal de huit captures de carte pour une formation. Routage mondial limité à162 nœuds et960 arcs par requête explicite, jamais un Dijkstra par tick. Le passage personnel ne clone pas le World ; un draft médical clone seulement le dossier effectivement soigné. Ces bornes ne prouvent aucun gain du tick, FPS ou coût GPU nul. Coût de publication du globe et du groupe à mesurer séparément.

## Différé et validation requise

Génération mondiale exhaustive, routes/fluviales, factions/diplomatie, rencontres et cartes de camp, installation d'une autre colonie, plusieurs groupes, division/fusion, animaux/prisonniers/enfants en formation, lit porté, corps récupérables et marchandises générales restent absents. Les voyages individuels historiques conservent leurs règles adaptées.

Sonde du producteur réel avant navigateur : deux colons, prise/sortie, besoins, commerce, reprise et retour/dépôts. Gardes passives : commandes et schémas, collision d'IDs, références de quête/famille, clinique terminale, champs futurs, topologie/géométrie, snapshots atomiques et remplacement d'epoch. Contrôles lourds successifs ; la campagne V215 s'exécute sur sa copie SHA256 indépendante et ne valide pas V216.


Interruptions locales : le déchargement cède à la vraie fuite, poursuite ou visée, avec arête/frappe/récupération conservées. Une source future détruite, prise ou contaminée annule la préparation après réconciliation ; les prises passées restent des faits et les biens conservés ne sont pas remboursés ou reconstruits. L’admission d’une cellule de dépôt consulte connectivité et stationnement ; seul le déplacement ordinaire paie la recherche pondérée et son budget. Une surcharge au comptoir n’empêche pas de consulter le catalogue de vente, mais tout échange confirmé doit rentrer dans la capacité finale et les fonds réels.
