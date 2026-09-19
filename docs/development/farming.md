# Agriculture — riz V8, coton V71

V39 : [croissance et semis sous température locale](plant-temperature.md). Le site quotidien 14–28 °C reste favorable ; le froid et la chaleur des volumes conservés modifient réellement la croissance. Les nouveaux semis attendent une température admissible. Mortalité et saisons restent absentes.

État courant : 19 septembre 2026. [Coton et tissu V71](textiles.md) ajoutent le choix d’espèce et une récolte non alimentaire, sans livrer la confection. Tranche G1 ; [recherche et limites de fidélité](../research/farming-reference.md). L'agriculture n'est pas un domaine terminé.

## Contrat livré

Architecte → Zones permet de tracer un champ de riz, de sélectionner le coton dans son inspection, de retirer ses cellules et d'inspecter ses réglages. Semis et coupe des plantes indésirables sont indépendants. Le travail **Culture**, priorité 0–4, produit des intentions ordinaires, réservées et rejointes par les colons. Pas de graines consommées. Les arbres de la cellule et les arbres adjacents empêchant le semis sont coupés si la politique l'autorise. Les autres plantes peuvent être coupées. La récolte automatique attend 100 % ; l'ordre manuel Récolter reste possible strictement au-dessus de 65 %.

Le semis demande 17 ticks de notre horloge, puis crée un plant à croissance 0,0001. Une interruption abandonne son travail partiel ; aucun plant ne pousse pendant un semis inachevé. La représentation du semis est un marqueur de travail, pas un plant provisoire. Récolter du riz demande 20 ticks à vitesse de travail neutre et détruit le plant, avec 6 unités physiques à maturité. Le champ peut ensuite être ressemé. Le coton partage ces durées de semis/récolte, produit dix tissus mûrs et disparaît avant un nouveau semis. Les baies continuent à repousser sur leur buisson.

Désactiver Semis laisse récolter le riz mûr, même avec Coupe désactivée. Sans semis, les autres plantes récoltables mûres peuvent être récoltées si Coupe est autorisée. Retirer une zone conserve les plantes et annule ses travaux générés. Les coupes/récoltes désignées indépendamment restent distinctes. V20 annule aussi les dégagements manuels attachés à cette zone, avec dépôt conservatif des cargaisons. Annuler un travail automatique sans modifier la zone permet sa redécouverte ultérieure.

Le riz au sol rejoint les piles, réservations, transport et ingestion existants : pile de 75 maximum, nutrition 0,05 par unité, souvenir « mangé cru » −7 pendant un jour, cumulable avec le souvenir sans table. La première [cuisine](cooking.md) transforme riz/baies en repas simples depuis V10. Intoxications et compétences Plantes/Cuisine restent absentes ; le [choix alimentaire neutre](food-items.md) est livré, ses modificateurs contextuels restent ouverts.

## Croissance et environnement

V35 : la [couverture construite](roofing.md) arrête la croissance naturelle. Avant pose/retrait, les plantes concernées enregistrent leur progression au tick courant sous l’ancien éclairage ; découvrir reprend sans rattrapage du temps passé sous toit. Mortalité dans l’obscurité, lampes et dépendances complètes du semis à l’environnement restent à développer.

`environment.ts` fixe la lumière d’un site à 45° N, à l’équinoxe et ciel clair ; `temperature.ts` fournit désormais l’air local et le cycle thermique quotidien. La lumière naturelle dépend de l'heure ; elle n'est pas dérivée des pixels ou de l'éclairage nocturne artistique. Croissance nulle sous 51 % de lumière, repos avant 06:00/après 19:12. La prairie vaut actuellement 100 % de fertilité, la terre 70 %. Riz : minimum 70 %, sensibilité 100 %, 3 jours de croissance à taux constant 100 %. Le calendrier réel est plus long : environ sept jours par cycle dans ce preset, avec une date de maturité dépendant de l'heure du semis et du sol. Ne pas afficher « prêt dans trois jours ».

L'intégrale périodique de lumière utilise 6 001 doubles partagés (environ 48 Ko). Chaque requête de croissance coûte O(1), quelle que soit la durée écoulée. Le monde ne parcourt pas tous les végétaux à chaque tick. Toits V35 et températures V39 conservent cette intégrale entre changements de taux, en checkpointtant la croissance acquise. Saisons, météo, fertilisation et lampes restent absentes.

## Frontières et coût

- `farming.ts` : intentions de culture, découverte tournante, contrôle des politiques, durée et fin du semis. Au maximum 512 cellules examinées tous les 10 ticks et 128 intentions automatiques en attente. Ce plafond limite la file, pas la surface cultivable. Le curseur fait partie de la sauvegarde. Une très grande zone remplit cette file progressivement. Si la file est pleine, ses intentions automatiques non attribuées sont renouvelées tous les 100 ticks depuis le curseur courant ; les travaux attribués sont conservés. Un champ inaccessible ne monopolise ainsi pas toute la file.
- Les index dérivés sont reconstruits à partir des tableaux persistants. Les producteurs remplacent les tableaux de ressources et de zones ; ne pas modifier leurs coordonnées/cellules en place sans adapter cette invalidation.
- `CropLayer` garde des instances et réutilise les emplacements retirés. Deux formes distinctes riz/coton préchauffées, un lot par forme présente, aucune ombre projetée par les petits plants. Les matrices utilisent un buffer de stockage à taille dynamique ; sa variante est précompilée au chargement. La capacité est réservée pour au plus un plant par case de carte (puissance de deux supérieure), donc aucun lot ne grandit pendant les semis ordinaires. Pour 250² : 65 536 emplacements, environ 4,75 Mio de matrices/couleurs par forme côté CPU et autant côté GPU (9,5 Mio par côté pour deux formes) ; seules les plages utilisées sont actualisées. Ce coût mémoire borné est assumé pour supprimer les créations de mesh/bindings en partie. Un lot vide ne dessine rien. Matrices/couleurs actualisées aux changements de ressources et tous les 25 ticks, jamais par plant à chaque image. Les frontières des champs utilisent les lots existants, uniquement sur leurs contours.
- `ResourceLayer` et `OverviewLayer` ignorent les cultures riz/coton : semer ne reconstruit pas la forêt. Les tableaux dynamiques des snapshots, dont les zones, restent transmis en entier ; indexation et transmission de champs couvrant toute la carte restent à profiler avant d'annoncer cette échelle comme validée.

## Sauvegardes

Schéma **8** : zones, paramètres, curseur, environnement, métier Culture, riz, association de travaux et souvenir de repas cru. Migration V7 : calculer une dernière fois la croissance selon l'ancien éclairage rectangulaire, la figer au tick courant, puis utiliser la nouvelle intégrale pour le futur. Ne pas recalculer le passé sous les nouvelles règles. Les versions V1–V6 passent par leurs migrations existantes. Une sauvegarde invalide est refusée avant remplacement du monde.

## Écarts restant ouverts

Depuis V9, les piles bloquant un semis sont déplacées physiquement hors des cultures par le cultivateur, même sans réserve et avec Transport désactivé. Les fragments de roche décoratifs restent non collectables. Ce sont des limites connues, pas un champ déclaré terminé. Le coût de déplacement dans les plantes, leurs points de vie, leur mortalité, le blocage fin entre espèces et les aptitudes du cultivateur restent ouverts. Le système actuel ne simule ni maladies des plantes ni perte de rendement liée à une mauvaise compétence. Les autres cultures au-delà du riz/coton, sols et biomes sont prévus sans être implicitement présents.

Les scénarios approfondis prolongent `plant-cycle.test.ts`, le joueur ordinaire et son parcours UI : croissance indépendante de la cadence d'observation, interruption, réglages, reprise exacte, premier rendement physique, stockage, second semis et stabilité des buffers. Les preuves d'exécution sont dans [validation](validation.md).


## Dégagement matériel (V9)

[Recherche et décisions](../research/food-clearing-reference.md), SYS-051..061/070..072. L’intention de semis reste en attente devant une pile. Le planner lui substitue un transport local de priorité Culture ; aucun plant ne naît sur une pile restée au sol. La capacité de portage existante (10 unités, calibration provisoire) peut demander plusieurs trajets. Les réservations de source et de destination respectent les autres transporteurs et les repas. Un dépôt compatible fusionne la pile ; un autre type exige une autre case.

La destination doit être accessible et hors de toutes les cultures, objets de décor et empreintes de travaux/constructions. Une réserve compatible peut la recevoir, sinon un sol libre suffit. Si aucun dépôt n’existe, le colon laisse les matériaux en place. La recherche locale partage le budget de paires du planner et sa grille déjà calculée ; les valeurs ne dépendent pas de l’horloge réelle.

Une case réservée pour ce dépôt ne reçoit pas entre-temps un plan, une nouvelle culture ou une modification de stockage. Désactiver Culture interrompt le transport avec dépôt conservatif ; désactiver Transport ne l’interrompt pas. Retirer le champ ou modifier sa politique annule les semis suivants ; le déplacement automatique déjà engagé termine son dépôt, qui n’a pas de référence fragile au champ supprimé. Une fatigue ou une faim prioritaire peut l’interrompre normalement.

V20 ajoute le clic droit **Dégager avant de semer**, avec Culture activée même sans Transport. Une entrée en file réserve la pile et son dépôt, et conserve zone/cellule au lieu du job temporaire. Désactiver Culture après acceptation conserve cet ordre forcé ; modifier la politique ou retirer le champ l’annule avec dépôt conservatif. [Contrat](player-orders.md), [sources récentes](../research/cooking-orders-reference.md).
