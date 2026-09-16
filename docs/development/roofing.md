# Toits construits — contrat V35

V43 applique désormais la [compétence Construction](skills.md) aux phases concernées : vitesse relative, apprentissage seulement lors de la finition d’un cadre approvisionné et de la déconstruction à coût. Les durées du catalogue restent des unités de travail neutre.

15 septembre 2026. [Recherche](../research/roofing-reference.md), [validation](validation.md). Corpus : chapitres 5/10/21/22, SYS/TEST-023..025 et 061, scène E. Ce contrat couvre la toiture construite ; les plafonds rocheux naturels et les dégâts aux objets restent ouverts ; V45 ajoute les blessures humaines.

## Couverture, zones et travail

`World.roofing` conserve trois tableaux triés d’indices : couverture construite, zone de pose, zone de retrait ; les zones sont exclusives. Absence du champ signifie aucune toiture connue. Le curseur d’énumération est persisté. La couverture est une couche indépendante du sol, des piles, des plantes et des chantiers ; elle ne ferme pas la navigation.

Architecte → Zones expose Construire un toit, Retirer un toit et Ignorer le toit. Ignorer efface les intentions sans retirer le plafond. La zone de retrait empêche aussi la désignation automatique. Fermer une enceinte par mur/porte propose sa couverture si elle ne touche pas le bord et compte au plus 320 cases. Il faut toujours un bâtisseur ; aucun toit n’apparaît à la fin du mur. La limite Core de régions n’est pas transposée à notre partition différente.

Construction fournit les travaux sans matériau ni cadre. Le colon rejoint une case de service adjacente, travaille quatre ticks locaux à vitesse neutre, puis pose les cellules admissibles de son voisinage 3×3. Le retrait traite une cellule et les composantes devenues flottantes. Un arbre ciblé doit être réellement coupé ; son bois reste une pile et son travail de dégagement est réservé. Une autre tâche ne peut pas couper simultanément le même arbre. Interrompre réinitialise le travail de toit ; sauvegarder conserve une opération engagée.

Les tâches générées sont bornées à deux par bâtisseur, avec plafond 128 ; jusqu’à 1 024 cellules examinées toutes les cinq unités de simulation. Si toutes les intentions restent non réservées, elles tournent toutes les 50 unités pour qu’un groupe inaccessible ne bloque pas les autres zones. L’identité d’une intention non acceptée peut donc changer. Les travaux actifs et les ordres déjà acceptés gardent leur réservation ; effacer la zone réconcilie aussi la file du colon. Une zone inaccessible reste visible, sans couverture fictive.

## Supports et retraits

Mur terminé, porte et roche pleine sont porteurs. La pose exige un chemin cardinal de cellules couvertes jusqu’à un porteur, dans un disque euclidien de rayon 6,9 autour de la cible ; la cible est supposée couverte pendant cette recherche. Un porteur géométriquement proche derrière un trou ne suffit pas. Plans, cadres et meubles ne sont pas des supports.

Le retrait volontaire élimine seulement les composantes sans connexion à un porteur, sans limiter la longueur de cette connexion. Il peut laisser un détour dépassant le disque de pose. Déconstruire/miner un support teste la portée près du support perdu, puis la connexion des composantes ; retirer un tabouret ne déclenche pas ce calcul. La résolution locale de portée et globale de connexion est synchrone, sans physique de corps rigides. Les contextes sont partagés uniquement dans une décision/tick sans mutation ; changer toiture ou support les invalide.

**Effondrement partiel V45 :** la couverture perdue inflige maintenant des blessures anatomiques aux personnes dessous. Le retrait volontaire reste sans dommage. [Résolution, sources et limites](health.md). Dommages aux objets/bâtiments, gravats, toits naturels et pause automatique restent absents.

## Plantes, inspection et présentation

Avant toute variation de couverture, les plantes concernées enregistrent leur croissance acquise à l’ancien taux. Sous toit, la lumière naturelle ne fait plus croître riz/baies ; découvrir reprend la progression depuis ce point, sans croissance rétroactive. Mortalité dans l’obscurité et éclairage horticole restent absents. Regarder le ciel exige une cellule sans toit ; la psychologie complète de la pièce attend son consommateur.

L’inspection distingue enceinte, couverture partielle/totale et cellule sélectionnée. Aucun bonus de température, repos, humeur ou atelier n’est accordé par cette seule information. V36 branche les [critères distincts de pièce/lumière](work-environment.md) sur les recettes ; V38 ajoute les [échanges thermiques](temperature.md), sans bonus psychologique implicite.

La dalle de 12 cm se place au-dessus des murs suivant `WORLD_SCALE`. Le bouton permanent affiche/masque les toits sans effet sur World. `RoofLayer` réutilise deux lots instanciés de `BoxBatches`, préparés aussi lorsqu’ils sont vides. Programme TSL stable pendant croissance des buffers ; aucune géométrie par frame. Le masquage retire le toit de la carte d’ombres, mais le [champ d’éclairage intérieur](environment-lighting.md) conserve l’obscurité et les feux sous la couverture logique. Cette première dalle est une présentation procédurale provisoire, sans étage jouable.

## Persistance et contrôles

V34 est strictement validée avant V35, sans régénération ni toiture rétroactive. V35 vérifie bornes, tri/unicité, exclusivité des zones, curseur, composantes reliées, arbres et unicité/forme des tâches de plafond. La portée de pose n’est pas un invariant permanent après retrait volontaire. Les tâches au sol et plafond peuvent partager une cellule, leurs réservations restent distinctes.

Les scénarios toiture et pièces contrôlent supports, trou intermédiaire, détours, annulation en file, travail inaccessible, défrichage, coexistence, croissance, désignation automatique et reprise. Le pilote de plusieurs jours couvre 28 cases autour du repas et garde son champ découvert. Les audits 3/30/100 acteurs séparent tick CPU, copie, adoption et images WebGPU ; voir les preuves, sans garantie universelle de cadence.
