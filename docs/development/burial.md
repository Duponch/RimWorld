# Dépouilles humaines et sépultures

V89 — **validée dans son périmètre**. [Référence Core 1.6.4871](../research/human-burial-reference-v89.md), [preuves communes](../history/validation-hygiene-v89.md). La chaîne jouable est décès réel → corps accessible → transport → tombe construite → inhumation persistée ; la déconstruction restitue le même corps. Le pilote avec reprises conserve trois identités effectivement inhumées, distinctes des situations contrôlées de saturation, interruption et destruction. [ROADMAP](../ROADMAP.md) reste l'unique calendrier.

## Identité et propriété

Le `Pawn` mort reste dans `world.pawns` avec son identifiant, sa santé, son anatomie, sa faction et ses références sociales/raid/visite. Il ne devient jamais un nouveau vivant. `Pawn.body` note le début d'observation V89, la pile matérialisée ou la disparition physique. Le contenu `human-corpse` est une pile quantité 1 avec un identifiant distinct et `humanCorpse.pawnId` ; il ne copie pas le dossier médical. Les vêtements, équipements et inventaires gardent leurs identifiants et leur propriétaire personne. Leur position physique se résout par le corps, jamais par l'ancien lieu de décès.

Les propriétaires possibles du corps sont sol, cargaison d'un porteur et tombe. Une seule de ces positions fait autorité. La représentation du Pawn au sol disparaît dès que la pile prend le relais ; un corps inhumé n'est ni un obstacle mobile ni un acteur dessiné dans la tombe. L'inspection de la sépulture permet de retrouver la personne et le décès. Le retrait définitif du corps conserve le Pawn comme référence historique et empêche sa recréation.

L'arme déjà lâchée au décès reste une pile indépendante. Si ce dépôt était bloqué lors de la matérialisation du corps, l'arme reste attachée au défunt ; son ancien ordre de dépôt est retiré pour empêcher un lâcher ultérieur aux coordonnées historiques. Le déshabillage volontaire des dépouilles n'est pas ajouté par cette tranche.

La chute termine son arête capturée. Si le sol est saturé, le corps reste auprès de la personne décédée avec son âge thermique ancré. Un transporteur au contact peut le prendre directement sans créer d'abord une deuxième pile sur la cellule. Identités et capacité des collections sont prévalidées avant attribution d'une pile. Aucune téléportation vers une cellule libre distante pour résoudre le décès.

## Ouvrage, décisions et réservations

Tombe orientable 1×2 dans Architecte, sans matériau ni recherche, travail de construction neutre 80 ticks locaux. Terrain creusable naturel seulement ; pas de toit porté, couverture, paquet de meuble ou récupération de matière. Elle reste traversable, mais ne sert pas de cellule de stockage ordinaire. Une tombe contient au maximum un corps humain. Les filtres colons/étrangers sont activés initialement ; une affectation nominative à un colon prime sur ces filtres.

Transport choisit un corps admissible et une tombe accessible, avec réservations exclusives des deux. `order-bury` donne la même tâche physique via un vrai ordre ; la file de plusieurs inhumations n'est pas ajoutée implicitement. Les phases sont approche/prélèvement, portage, puis dépôt de 50 ticks au contact. Le temps de service n'accorde ni expérience ni bonus de santé. Priorité Transport, incapacités, danger, tâches forcées et interruption utilisent les frontières communes.

Si l'acteur s'interrompt, le corps est déposé avec son identité et son âge. Un sol saturé conserve la cargaison interrompue ; il n'autorise ni suppression ni duplication. Une tombe occupée, retirée, devenue inaccessible ou réservée par autrui est revalidée avant dépôt. Changer filtre/affectation ne déplace pas instantanément un corps déjà inhumé.

## Température, salissure et destruction

Un corps exposé prend les phases thermiques communes : frais jusqu'à 2,5 jours, putréfié jusqu'à 5 jours, puis desséché. Le froid ralentit réellement cette progression. L'inhumation suspend l'âge thermique suivant les classes locales 1.6.4871 ; elle ne remet aucun compteur à zéro. L'âge civil du décès reste distinct. La bile quotidienne d'un corps putréfié exposé est fournie au système de salissures ; elle ne prétend pas transmettre une maladie infectieuse.

Le feu peut détruire la pile et les possessions qui sont encore attachées à la personne. Les objets déjà déposés conservent leur existence. Le Pawn, sa cause/date de décès et les références historiques subsistent. La tombe elle-même n'a pas de PV Core. Sa déconstruction doit préplanifier la sortie du corps et des éventuelles autres cargaisons, puis commettre cette même allocation de sol avant toute mutation : manque de place = attente, sans remboursement ni perte.

Les dégâts spontanés de pourriture/détérioration extérieure restent une frontière d'adoption séparée des phases d'âge ; ne pas annoncer leur présence à partir de la seule dessiccation. Les dépouilles animales V79 gardent leur propre contrat tant qu'une modification rétroactive n'est pas explicitement décidée.

## Migration et contrôle commun

V88 est validée strictement avant migration. La désérialisation n'invente ni pile, ni tombe, ni décomposition passée. Au premier pas simulé, les morts existants démarrent leur observation V89 à leur cellule actuelle et gardent le vrai décès ; absence d'historique thermique annoncée. Sauver puis reprendre doit conserver exactement attente au sol, portage, service, âge, réservation, inhumation et disparition.

Les contrôles de `burial.test.ts` couvrent construction réelle, concurrence de deux transporteurs, corps retenu sur sol saturé, interruption, filtre/affectation, température puis tombe, restitution impossible puis possible et destruction avec équipement. Les premières corrections d'intégration et de fixture restent dans les journaux conservés. La campagne centrale et le parcours natif ont réussi ; Architecte, Transport, inspection et sauvegarde/rechargement sont exercés par les commandes réelles. Le pilote commun reprend les morts présents après combat et se termine à J161,569 avec trois corps identifiés en tombe et quatre habitants vivants. Son échec de circulation puis sa réparation et les secours physiques restent documentés ; les situations cliniques et incendiaires sont séparées de cette trajectoire. Ni ce parcours ni la charge mesurée ne certifient le traitement complet des morts ou une performance universelle.
