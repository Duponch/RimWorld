# Usinage et armurerie — V101

V101 rend fabricables le revolver et le fusil à verrou déjà utilisables dans Lisière. La tranche comprend un atelier d'usinage physique, les recherches Usinage et Armurerie, deux factures et un ouvrage d'arme conservé. [Valeurs Core 1.6.4871, corpus et divergences](../research/production-reference-v101.md). La [démonstration préparée](../../public/test-saves/v101/atelier.json) démarre après les recherches et la construction réelle du poste, avant toute facture ; ce n'est pas une progression naturelle.

## Déblocage et poste

Forge doit être connue avant Usinage (1 000 points) ; Usinage précède Armurerie (500 points). La base électrique des scénarios locaux reste un acquis distinct. Sans Usinage, on ne peut pas désigner l'atelier ; sans Armurerie, on ne peut pas ajouter ses factures. Les parties anciennes ne reçoivent ni recherche, ni points, ni atelier à la migration.

L'atelier demande **150 acier et 5 composants**, Construction 4 et 3 000 unités de travail Core, soit **300 ticks locaux neutres**. Il occupe 3 × 1 cases, est traversable avec surcoût de chemin, reçoit des objets sur sa surface et sert depuis sa cellule d'interaction. Il est désinstallable avec identité et factures conservées. Il possède 180 PV et une propreté de −2. Allumé, il demande **350 W**, même au repos, et émet une lumière bleutée de rayon 5. Sans courant, aucune fabrication n'avance ; le poste ne possède pas de mode manuel. Les ouvrages et produits déjà physiques restent conservés lors d'une coupure.

Le poste contribue au rôle de pièce Atelier ; un rôle intérieur différent donne ×0,8 au travail. Extérieur, lumière, température hors 9–35 °C et capacités physiques utilisent les facteurs communs. Sa vitesse de base est 1. Les armes Core emploient `GeneralLaborSpeed` et `Crafting` : le niveau Artisanat contrôle ici le seuil et la qualité, sans multiplicateur local de vitesse supplémentaire.

## Deux factures et conservation

| Facture | Seuil Artisanat | Matières exactes | Travail neutre |
| --- | ---: | ---: | ---: |
| Revolver | 3 | 30 acier + 2 composants | 400 ticks locaux |
| Fusil à verrou | 5 | 60 acier + 3 composants | 1 200 ticks locaux |

Les deux factures utilisent les modes X fois, Jusqu'à X et Toujours, la suspension, les filtres d'ingrédients, le rayon et la destination physique déjà appliqués aux autres postes. Les matériaux sont réservés par type et pile, puis portés par trajets limités à dix unités. Un excès d'acier ne remplace jamais un composant manquant. Le travail ne commence qu'après rassemblement complet et une place vérifiée pour l'ouvrage.

Au premier tick de fabrication, les ingrédients déposés deviennent **un objet `unfinished-gun`**. Cet objet conserve la recette, l'auteur, les parts d'acier et de composants, la facture liée et la progression entière ; l'ancienne matière n'existe plus séparément. Une interruption ou une coupure libère la tâche sans effacer l'objet. Une facture liée attend son auteur ; si la facture disparaît, la liaison est détachée et le même auteur peut reprendre via une facture admissible. Transporter ou ranger l'ouvrage ne change pas son identité ni son travail. Sa reprise n'engage pas une deuxième consommation de matières.

Annuler un ouvrage au sol rend **75 % de chaque part incorporée**, avec arrondi stochastique par part. Toutes les places de restitution sont vérifiées avant de retirer l'ouvrage et d'engager l'aléa ; faute de place, la commande échoue sans mutation. Les matériaux rendus restent physiquement séparés par type. L'ouvrage porté doit d'abord être déposé.

Le travail crédite un XP Artisanat de base par tick local réellement exécuté, puis applique les facteurs de passion, traits et saturation. À la fin, l'objet neuf reçoit son identité, ses PV propres et une qualité déterminée par l'artisan. La quantité « X fois » décroît à la création du produit, puis l'arme est déposée ou rangée selon la facture. La qualité suit ensuite l'objet lors du transport, de l'équipement et de la sauvegarde.

## Persistance et limites

Les schémas antérieurs refusent recherches, poste, facture et ouvrage V101. La reprise d'une partie V91 validée strictement vers V101 est neutre : aucun équipement, recherche, filtre ou travail n'est inventé. Les sauvegardes V101 valident la composition exacte 30 + 2 ou 60 + 3 des tâches actives/en attente, sauf une cargaison interrompue qui ne peut contenir qu'un fragment réel ; elles valident aussi l'auteur, la facture liée, la progression et les propriétaires physiques. Le poste emballé garde ses factures, mais sa connexion électrique n'est pas transportée.

La tranche ne fabrique pas le gilet pare-balles, les autres armes, les munitions, les armures ou le cabinet d'outils. Dans Core, le gilet se fabrique également à l'atelier d'usinage, mais sa recherche dépend d'une filière d'armures supplémentaire absente ici. Ni équilibre de progression complet, ni production militaire autonome ne sont déduits des deux recettes.
