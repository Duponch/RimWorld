# V210 — Passé personnel et travaux interdits

Après la [consolidation V209](consolidation-v209.md), ce lot ouvre une différence jouable entre les personnes : enfance et activité adulte, effets initiaux sur les compétences, métiers interdits, consultation avant accueil, affectation et refus expliqués. La [recherche Core](../research/colonist-backgrounds-core-v210.md) vérifie le programme installé 1.6.4871 rev590 et distingue ses règles du catalogue local. La preuve de livraison sera conservée dans un seul document V210.

## Règles adoptées et adaptations

Une enfance est enregistrée à la création d'une nouvelle personne. Une activité adulte n'est sélectionnée qu'à partir de vingt ans biologiques. Les interdictions des deux récits se cumulent. Elles sont distinctes d'une priorité à zéro, d'un seuil de compétence et d'une incapacité médicale temporaire. Un ordre direct ou une intention acceptée ne les efface pas. Les compétences totalement interdites n'apprennent pas et n'oublient pas ; les interactions sociales et loisirs continuent selon leurs propres admissions, sans créer d'XP interdite.

Six enfances et huit activités adultes sont des récits originaux de Lisière. Leurs gains s'additionnent une seule fois lors de la naissance et les niveaux restent bornés à 0–20. Les profils de compétences et passions préexistants restent le socle local explicitement composé : V210 ne prétend pas reproduire la distribution gaussienne, les budgets de passions, les catégories culturelles ou tout le catalogue Core. Le choix déterministe privé ne consomme pas les flux de simulation, combat, incident ou commerce. Un combattant généré ne reçoit pas un récit incompatible avec la violence ; les trois personnages du départ sont composés pour conserver nourriture, construction, médecine et défense accessibles.

Le passage de `WorkTags` aux dix-huit métiers locaux doit conserver les exceptions de secours, capture, livraison et installation établies par la recherche. Transport et nettoyage utilisent le travail manuel simple ; cuisine, construction, plantes, minage et artisanat le travail manuel qualifié ; Médecin, Geôlier, Recherche, Art et Dressage ont leurs interdictions propres. Chasse et combat distinguent chasse et violence. Patient et repos au lit restent disponibles. Le contrôle intervient avant proposition, réservation et acceptation, puis à la reprise ou au contact d'une tâche. Les dépôts de cargaison interrompue gardent leur garantie physique de conservation.

## Création, sauvegarde et reprise

La négociation directe refuse une compétence Social totalement interdite ; le départ commercial local applique cette même admission au négociateur avant chargement. Les marchands générés doivent permettre Social, tandis que les gardes et assaillants doivent permettre la violence. La reconnaissance et le portage personnel de voyage restent distincts du Transport ordinaire.

Le secours automatique d'un colon relève de Médecin ; ramener un prisonnier au lit relève de Geôlier. Secours et capture directs gardent leurs admissions physiques et ne demandent pas ces métiers. Un bâtisseur peut dégager une plante ou une pile pour son chantier ; la roche et la déconstruction exigent leurs métiers propres. Le ravitaillement ordinaire relève de Transport, tandis que le combustible d'une facture admise reste lié à son fournisseur. Les niveaux interdits sont conservés en données, mais ne constituent pas une capacité effective. Animaux reste utilisable si Dressage ou Chasse est possible.

Schéma 191 après validation stricte de 190. La migration change uniquement le numéro : aucune enfance, compétence, passion, interdiction, humeur, expérience ou consommation de PRNG rétroactive. L'absence de passé reste une absence neutre, y compris dans une ancienne offre acceptée plus tard. Les propriétaires hors carte et les archives historiques conservent leurs données ; un champ futur sous 190, un récit inconnu, un mauvais emplacement enfance/adulte, un passé sans âge connu ou une forme partielle sont refusés.

Une nouvelle offre d'accueil ou d'asile capture son passé et son âge dès sa proposition. La personne admise reprend exactement ce choix, sans nouveau tirage ni variation liée aux identifiants alloués entretemps. Les autres personnes futures reçoivent leur profil à leur création effective : départ, capsule, visiteurs et ennemis. La fabrique neutre des terrains et fixtures ne produit aucun passé automatiquement. Les anciens payloads publics ne sont pas régénérés.

## Ce que constate le joueur

Bio expose les deux titres, leurs récits, les gains initiaux et les incapacités actuelles. Une personne historique indique que son passé n'est pas renseigné. Travail garde les priorités sauvegardées mais rend les métiers interdits indisponibles avec un motif accessible à la souris et au clavier. Les menus d'ordre affichent le même refus fourni par la simulation. Les offres permettent d'examiner les différences avant de répondre ; une autre personne capable peut effectuer le travail refusé.

Les textes sont écrits via `textContent`, les infobulles réutilisent le composant commun et les panneaux restent utilisables sur une fenêtre compacte. Aucun nouveau récit familial, souvenir de jeunesse, profession simulée hors carte ou relation n'est inventé.

## Validation du lot

Contrôles regroupés : catalogue, âge frontière, combinaison des interdictions, gains appliqués une seule fois, flux aléatoires inchangés ; ancienne offre et migration neutres, données futures/corrompues refusées, propriétaires hors carte et archives exacts ; propositions, ordres directs et intentions persistantes, urgences, livraison/installation, tâches reprises, XP et conservation ; parcours navigateur natif avec consultation, refus expliqué, travail par une personne capable et sauvegarde/rechargement. Build, documents et régressions pertinentes sont exécutés après gel des sources. Les campagnes longues et mesures lourdes restent successives et ne sont pas relancées après chaque retouche.

Famille, romance, choix initial de huit candidats, distribution Core exhaustive et incapacités produites par d'autres systèmes restent ouverts. Une biographie ne prouve pas à elle seule une parité complète des personnages.
