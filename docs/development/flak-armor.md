# Gilet pare-balles fabriqué — V109

Le gilet pare-balles déjà portable peut désormais être fabriqué à l’atelier d’usinage. Cette tranche livre **un seul vêtement** : elle n’ajoute ni casque, ni armure de plaques physique, ni fabrication de composants. Les valeurs de référence viennent des XML Core 1.6.4871 rev590 vérifiés localement, détaillés dans [la recherche industrielle](../research/industry-reference-v108.md). L’annonce officielle [RimWorld 1.6](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/) confirme la couverture actuelle du gilet sans épaules ; les coûts précis proviennent du Core local.

## Déblocage et matière

« Armure de plaques » coûte 600 points après Forge **et** Vêtements complexes. Elle sert de préalable réel ; aucun objet d’armure de plaques n’est fabriquable dans Lisière. « Armure pare-balles » coûte ensuite 1 200 points après Usinage **et** Armure de plaques. Armurerie, qui débloque les deux armes V101, n’est pas requise. Un gilet déjà obtenu reste portable sans ces recherches ; seule la facture locale est verrouillée.

La facture de l’atelier d’usinage allumé (350 W) engage exactement **30 tissu, 60 acier et 1 composant**. Chaque matière conserve son filtre, son rayon et ses réservations. Un excès d’acier ne remplace pas le composant. Un colon doit avoir Artisanat 4 et le métier Craft actif. Le travail neutre vaut 900 ticks locaux, issu des 9 000 unités Core / 10 ; vitesse effective, lumière, pièce, température, alimentation du poste et santé suivent les règles de production existantes. Chaque tick de travail crédite l’expérience Artisanat. Les composants proviennent encore des sources physiques existantes, non d’une recette ajoutée ici.

## Ouvrage et produit

Après dépôt des trois quotas, les parts des piles sources deviennent un objet `unfinished-flak-vest`. Il conserve sa recette, son auteur, sa progression entière, ses parts par matière/pile et sa facture liée. Déplacement, coupure de courant, suspension et sauvegarde ne recréent pas les matières. L’auteur peut reprendre la même pièce ; une facture supprimée détache sa liaison. La commande d’annulation restitue environ 75 % de **chaque part** avec le même tirage borné que les autres ouvrages, seulement si toutes les places de dépôt sont disponibles. Un refus ne modifie ni objets, ni tâche, ni aléa.

À l’achèvement, un gilet physique neuf reçoit une identité, 200 PV et une qualité tirée une fois à partir de l’Artisanat de l’auteur. Le coût en tissu ne devient pas une variante `apparel.material` : le gilet historique n’en porte pas. Sa protection torse/cou, couche intermédiaire, malus de vitesse, usure, stockage, équipement et politique vestimentaire restent ceux de la pièce déjà jouable. Le mode « Jusqu’à X » compte également un gilet **porté**, afin qu’un atelier ne fabrique pas un remplacement pour celui que porte le colon.

## Sauvegarde et essai

Le schéma 109 valide strictement la partie 106 avant une migration neutre. Aucune recherche, facture, composant ou armure n’est accordée rétroactivement. Les archives plus anciennes refusent les nouveaux identifiants de recherche, de facture et d’ouvrage ; le nouveau schéma vérifie quotas 30/60/1, auteur, progression, facture et propriétaire. Les recherches restent des actions réelles, sauf dans la [démonstration V109 préparée](../../public/test-saves/v109/visages-armurerie.json) : elle reprend la scène d’usinage V101 sans la modifier, fournit les deux recherches manquantes et 30 tissus, puis laisse la facture produire réellement le gilet après chargement. Les cinq profils visuels y servent à examiner les silhouettes, cheveux, barbes et couleurs ; leurs détails sont préparés et ne prouvent pas une apparition naturelle de cinq colons.

La fidélité reste bornée au seul gilet et aux prérequis utiles. Core fabrique aussi d’autres armures ; le casque pare-balles exige notamment du plastacier, non disponible comme pile jouable ici. L’établi de fabrication et ses composants avancés ne sont pas remplacés par l’atelier d’usinage.
