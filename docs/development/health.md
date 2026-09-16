# Santé active V45

16 septembre 2026. [Recherche recoupée](../research/health-reference.md), [anatomie](body.md), [lésions](injuries.md), [validation](validation.md). Corpus : chapitre 15, SYS/TEST-089..091, 094, 096..097 ; chapitres 5/21 pour les toits. Le socle médical est maintenant intégré ; soins et combat restent les prochains consommateurs, pas des fonctions implicitement livrées.

## Propriété et transitions

`Pawn.health?` possède un dossier sparse, absent chez un colon jamais blessé. L'arbre naturel adulte est partagé et immuable. `health.ts` fait avancer le dossier sur l'horloge du monde, avec le PRNG sauvegardé et une phase par identité. Les capacités sont dérivées par `health-rules.ts`, sans sauvegarder un deuxième état anatomique ni calculer un squelette à chaque image. Le rendu ne modifie pas le dossier. Les placeholders gardent encore leur silhouette entière malgré une partie perdue ; amputations et accessoires visuels sont une limite de présentation connue.

Une incapacité interrompt immédiatement travail, ingestion, loisirs, priorité maintenue et file d'ordres. Leurs réservations sont libérées. Les objets restent conservés par le [contrat des cargaisons interrompues](interrupted-cargo.md), y compris si tout le sol proche est occupé. Une réaffectation de lit ou une libération de tâche ne remet pas un blessé debout. Manipulation nulle interdit aussi le travail, sans empêcher par principe les besoins autonomes encore possibles.

**Adaptation 3D explicite :** une arête déjà engagée finit comme translation du corps allongé ; aucun nouveau pas ni travail n'est exécuté pendant cette fin d'arête. Position, collision et historique restent ceux du segment capturé. Le pather Core annule vers sa cellule logique d'origine avec recentrage visuel ; nos cellules sont engagées à destination dès le début du segment. Cette décision évite une téléportation sans inventer une position logique fractionnaire. Elle peut être révisée avec la locomotion tactique. Le repos et son bonus de guérison ne commencent qu'une fois la translation terminée.

`downed` est distinct de `sleeping`. Un patient conserve un lit seulement s'il l'utilisait réellement lors de la chute. Aucune réservation de lit voisin ni téléportation vers un couchage. La posture allongée favorise la guérison ; le besoin de repos augmente seulement pendant le sommeil effectif. `medicalSleep?:true` conserve ce sommeil : endormissement sous 75 de repos hors famine, réveil à 100. L'inconscience, le sommeil et la mort suspendent les loisirs ; un blessé conscient peut encore les perdre.

Le décès est irréversible : pas de nouveaux besoins, apprentissage, action ou guérison. L'identité du colon et sa position sont conservées, avec pose couchée grisée et inspection du dossier. Le dossier médical garde son tick de décès ; la simulation peut seulement finir l'arête capturée et déposer passivement une cargaison devenue déposable. **La dépouille n'est pas encore un objet transportable** : sépulture, décomposition, boucherie et effets sociaux restent absents. Le compteur de besoins et les alertes alimentaires excluent les morts.

## Consommateurs présents

| Action | Facteur physique, avant les autres facteurs existants |
|---|---|
| Marche | Mobilité, capturée au départ de la prochaine arête ; délai de terrain/mobilier additif |
| Construction/déconstruction et pose/retrait | Manipulation × (0,8 + 0,2 × vue plafonnée à 1) |
| Plantes, dégagement et cuisine | Manipulation × (0,7 + 0,3 × vue plafonnée à 1) |
| Minage et taille de pierre | Manipulation × (0,5 + 0,5 × vue plafonnée à 1) |
| Ingestion | max(0,15 ; (0,05 + 0,95 × alimentation) × (0,7 + 0,3 × manipulation)) |

Les travaux suivent le contrat des fractions entières. L'ingestion conserve maintenant sa fraction ; un repas interrompu ne donne aucun gain de faim. Les coups miniers et arêtes engagés ne sont pas retimés après une blessure. Lumière, Construction et matières gardent leurs effets séparés. Les restrictions propres à chaque activité de loisir (vue, manipulation, etc.) restent à compléter ; incapacité générale et inconscience sont déjà prises en compte. Le portage reste calibré à dix unités et vingt blocs en sortie de taille : son adaptation quantitative à Manipulation est **encore partielle**, à traiter avec inventaire/équipement sans supprimer une cargaison déjà engagée. Compétences minières/agricoles/cuisine et statistiques de rendement restent absentes.

## Premier accident réel

`roof-damage.ts` résout la chute d'une toiture **construite**, déclenchée par retrait de support via minage ou déconstruction. Chaque personne sous une cellule effondrée reçoit un tirage 15..30 PV, partie supérieure extérieure pondérée par couverture restante. Conservation extérieure à un PV selon l'excès ; peau → coupure, solide → fissure, autre → écrasement. Ce n'est ni le worker d'arme contondante avec frappe interne, ni le toit de montagne létal.

Profil actuel : autorisation de mort instantanée à 100 %, valeur par défaut du code de difficulté étudié. Les réglages de difficulté/personnages, armures et protections ne sont pas livrés. Un retrait volontaire de toit ne blesse pas. Le travail qui enlève le support termine sa transaction avant les conséquences médicales ; aucun job voisin ne doit être supprimé ou colon réactivé par le nettoyage de fin d'action.

Dommages aux objets/bâtiments, gravats, sang au sol, pause automatique et toits naturels restent absents. Aucune blessure climatique ou de famine n'est produite implicitement. Ramper après incapacité (Core depuis 1.5) est également différé avec les secours et déplacements tactiques.

## Sauvegarde et contrôles

V44 est validée selon ses anciennes règles **avant** migration 45 ; aucun dossier, événement ou blessure n'est inventé. Les arêtes anciennes conservent leur durée. Dossier vivant au tick du monde, dossier mort figé à son décès ; état/action/horloge incohérents sont rejetés. Un dossier isolé valide ne suffit pas à valider son propriétaire. La borne de vitesse minimale d'une arête mobile vaut 0,16 × 0,8 ; coups miniers jusqu'à 25 000 ticks Core pour le facteur minimal admissible. Les bornes V44 restent inchangées.

Cinq scénarios intégrés complètent les quinze scénarios anatomiques/médicaux : retrait réel de support et retrait sans danger, accident en transport saturé avec un second colon, travaux/ingestion ralentis, récupération/sommeil/décès, corruption/migration stricte. Le pilote normal de plusieurs jours vérifie désormais l'absence d'accident dans son aménagement sûr. Le navigateur observe les véritables attributs GPU de chute, l'inspection et la reprise, en plus du contrôle temporel minage/abattage. Le banc World mesure 3/30/100 colons blessés au travail, simulation et copies séparées. Ces contrôles ne constituent pas une couverture exhaustive.
