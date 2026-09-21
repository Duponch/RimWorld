# Confection physique — V72/V73

V91 ajoute cuir ordinaire, fourrure bleue et cuir de dromadaire aux cinq familles existantes. Chaque ouvrage conserve une matière unique, son auteur, ses ingrédients et sa progression. Les quinze vêtements nouveaux sont fabriqués et portés ; propriétés et limites dans la [référence des produits biologiques](../research/biome-products-reference-v91.md). Les vêtements historiques gardent leurs statistiques et identités.

V73 : les contrats d’auteur, d’interruption, de remboursement et de qualité s’appliquent aussi à `shirt`/`unfinished-shirt`, avec **45 tissus** et **270 ticks locaux neutres**. Le tailleur manuel a une vitesse ×0,5 et les facteurs Atelier/extérieurs communs. L’emplacement gratuit ne fabrique toujours que la tenue tribale. Les recettes et inachevés sont strictement distincts ; `stationRecipes` expose le catalogue admissible sans dupliquer le moteur de production. [Recherche et migration V73](research.md).

La filière obtenable est désormais **coton → tissu → tenue tribale → habillage**. Le joueur choisit une facture et un artisan, puis utilise le vêtement produit. [Sources revérifiées](../research/tailoring-reference.md), [preuves](../history/validation-tailoring-v72.md). V73 prolonge cette filière avec [recherche, tailleur manuel et chemise](research.md).

## Poste, matières et travail

Architecte → Production pose immédiatement un emplacement d’artisanat gratuit de 1×1. Il se tourne, reste traversable et se retire immédiatement par Déconstruire, sans matériaux rendus. Une case contenant une plante doit d’abord être dégagée. Ce marquage n’est pas un meuble emballable ni un atelier donnant un rôle de pièce. Son poste de travail est la cellule devant lui ; l’ouvrage et les ingrédients utilisent une cellule accessible adjacente distincte du travailleur. Il peut porter un objet au sol mais pas une réserve.

Une tenue consomme **60 tissus**, rassemblés physiquement par trajets de dix unités au maximum dans notre capacité locale actuelle. Réservation de la totalité avant engagement, approvisionnement et staging typés communs aux factures existantes. Aucun prélèvement distant. Répétition, rayon, filtres, suspension et destination utilisent l’interface des factures. « Jusqu’à X » compte les produits stockés et les cargaisons, exclut les vêtements équipés ; le réglage Core optionnel « inclure équipés » reste absent.

Travail neutre : 1 800 ticks Core = 180 ticks locaux avant facteurs. Le poste multiplie la vitesse par 0,5 ; extérieur psychologique ×0,8, lumière et capacités physiques communes. Pénalité thermique ×0,7 sous 9 °C ou au-dessus de 35 °C, à la cellule du poste ; les deux seuils eux-mêmes sont neutres. Pas de malus de rôle Atelier. Ces effets sont multiplicatifs et n’accélèrent pas la collecte. Le facteur thermique est branché aux deux postes de couture ; les autres recettes conservent leur contrat existant, dont la révision reste identifiée.

## Ouvrage, auteur et transactions

Au début du travail, les ingrédients déposés deviennent un objet `unfinished-tribalwear`, pile indivisible de un. Son état conserve recette, auteur, soixante tissus, quantités des piles incorporées, travail entier et facture liée. La création prévalide sol/capacité/identité avant toute consommation. L’objet possède la matière ; la tâche ne la duplique pas.

Une interruption laisse l’objet et son avancement. Une facture liée attend **son auteur**, même si un autre colon et d’autres tissus sont disponibles. La reprise liée ignore les nouveaux filtres/rayon des ingrédients, mais exige toujours accès, poste et disponibilité. Supprimer la facture ou le poste détache la liaison sans effacer l’objet. Le même auteur peut reprendre un ouvrage non lié via une facture compatible, avec rayon et filtre appliqués. Un auteur décédé ne transfère pas sa compétence à un autre : l’annulation permet de récupérer la matière.

Le filtre **Ouvrages inachevés** permet leur transport/rangement. Identité, progression et auteur restent sur l’objet pendant portage, interruption ou reprise. Annuler un ouvrage au sol retire ses réservations actives/en file et rend 75 % de chaque pile incorporée avec arrondi stochastique si nécessaire ; la place et les compteurs sont vérifiés avant engagement du PRNG. Une pile incorporée de 60 rend exactement 45. L’objet actuellement porté doit d’abord être déposé. Le bilan `tailoring` conserve nombre de fabrications, annulations et tissu perdu ; le nombre de produits ne suffit plus à déduire leur matière : 60 pour une tenue tribale, 45 pour une chemise.

La fin de travail prévalide capacité et identité, puis consomme l’inachevé, tire une qualité et crée **un** vêtement porté en cargaison, avant dépôt/rangement physique. Une fin bloquée ne retire rien, ne relance pas le hasard et ne donne pas d’expérience supplémentaire. La facture X fois diminue à cette création.

## Compétence, qualité et apparence

Artisanat reçoit un point d’expérience de base par tick local réellement travaillé, puis applique passions, traits, saturation et oubli communs. Il agit sur la qualité de confection ; il n’accélère pas cette recette ni la taille de pierre. L’absence d’ancien profil signifie niveau 0/sans passion/0 XP, visible dans Biographie ; la première confection matérialise ce profil. C’est un défaut local annoncé, pas une génération de compétences Core. La distribution utilise le centre par niveau, une gaussienne asymétrique et la relance des chefs-d’œuvre du code daté. Six qualités peuvent sortir, de médiocre à chef-d’œuvre ; inspirations/légendaire non produits.

`cloth-tribalwear` : 100 PV, neuf ticks locaux pour enfiler/retirer, couche peau couvrant torse/jambes ; incompatible avec chemise, compatible avec gilet. Protection normale tranchante 7,2 %, contondante 0 %, chaleur 3,6 %, modulée par qualité. Les protections thermiques des vêtements ne sont pas une santé thermique déjà livrée.

Tenue, bras découverts et pans de tissu emploient le rig rigide GPU existant. Un attribut déjà présent sélectionne la tenue ; corps/cargaison/portrait lisent les mêmes objets. Marquage, ouvrage et vêtement au sol rejoignent les lots existants. Géométrie procédurale provisoire ; pas de mesh/squelette animé sur CPU par colon, pas de nouveau draw call par vêtement.

## Schéma et limites

Schéma **72** : V71 est validée strictement avant migration neutre. Aucun ouvrage, tissu, vêtement, compétence acquise ou filtre ajouté aux anciennes parties. Auteur, liaison unique, quantités, travail, propriété et file sont contrôlés au chargement. `unfinished.ts`, `tailoring-plan.ts`, `crafting-quality.ts`, `crafting-spot.ts` séparent ces responsabilités du moteur commun.

Restent notamment : arbre de recherche complet, fabrication des gilets, autres tissus/cuirs/recettes, politiques de tenue automatique, choix de comptage équipé/qualité/PV, sélection avancée des artisans, inspirations, usure quotidienne, détérioration extérieure, inventaire personnel et isolation thermique active. Le catalogue général de production n’est pas achevé. La cuisine et la taille de pierre ne gagnent pas artificiellement un ouvrage ou de l’XP Artisanat.
