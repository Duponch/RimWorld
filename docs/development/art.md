# Sculpture et décoration — V104

**Complément V105 :** le commerce des sculptures minifiées est maintenant livré dans le [contrat économie](colony-economy.md). Les mentions d’absence V104 ci-dessous décrivent sa frontière historique ; les autres meubles, récits et formats monumentaux restent hors périmètre.

Le poste **Atelier de sculpture** ouvre deux factures : **Petite sculpture** (50 unités) et **Grande sculpture** (100 unités). Le poste manuel mesure 3×1, coûte 75 bois + 50 acier ou 125 acier ; il n’exige aucune recherche. Les sculptures mesurent 1×1 et sont fabriquées, puis installées. Elles ne se construisent pas directement dans Architecte.

## Matières, travail et propriété

Une œuvre utilise une seule matière : bois, acier ou blocs de granite, calcaire, marbre, grès ou ardoise. Une grande œuvre rassemble plusieurs piles sans dépasser 75 par pile. Les matières sont apportées physiquement et deviennent un ouvrage individuel lié à son auteur et à sa facture. Sa progression et sa composition persistent ; un autre artiste ne termine pas cet ouvrage. Supprimer la facture détache le lien sans supprimer l’objet. L’annulation au sol prévalide tous les dépôts puis restitue environ 75 % de chaque pile incorporée, avec arrondi aléatoire déterministe ; un refus laisse état et PRNG intacts.

**Art** est un métier distinct d’Artisanat. **Artistique** apprend au geste et détermine la qualité à la finition ; son niveau n’accélère pas directement la sculpture. Le temps utilise WorkToMake (18 000/30 000 ticks Core), les facteurs propres à la matière, puis les facteurs de travail du poste et du corps. Les coefficients de construction ne remplacent pas ceux de sculpture. [Référence vérifiée Core 1.6.4871](../research/art-reference-v104.md).

La finition consomme l’ouvrage une fois et produit un meuble emballé avec identité, matière, qualité et attribution `authorId/createdAt`. Il est porté, déposé ou rangé dans une réserve acceptant Meubles, puis installé par un véritable travail. Retrait et réinstallation gardent la même identité. La facture « jusqu’à » compte les sculptures de cette famille installées et emballées, au sol ou portées. Les filtres d’ingrédients ne deviennent pas des filtres de qualité du produit.

## Décoration et présentation

Les petites et grandes sculptures ont 50/100 de beauté de base, modulée par matière et qualité. Seule leur installation contribue comme sculpture à la beauté, la richesse et l’impression d’une pièce, donc aux usages et souvenirs V103. Un paquet reste un objet encombrant. Les dommages réduisent les PV et la valeur, sans réécrire la qualité. Les deux formes 3D (buste et composition animale sur socle) utilisent les lots instanciés existants ; aucun mesh individuel ni calcul par image de leur valeur n’est ajouté.

La fiche affiche matière, qualité, beauté une fois posée et auteur. L’ouvrage affiche sa progression réelle et son annulation ; la barre au-dessus de l’artiste utilise le total propre à la matière. Les représentations 3D et l’attribution factuelle sont des adaptations : titres/récits procéduraux, sculpture majestueuse, matériaux supplémentaires et vente de meubles emballés ne sont pas livrés.

## Continuité et découverte

Schéma **104** : valider strictement 103 avant migration, ajouter seulement Art à **0**. Aucune compétence acquise, ressource, sculpture, facture ou recherche n’est inventée. L’absence d’Artistique signifie niveau 0 ; le premier geste crée son suivi. Les nouveaux habitants ont Art à 3. Les références publiques V98, V101 et V103 restent immuables.

**Charger une partie → Colonies de test → Atelier de sculpture · 1 colon** ouvre une scène préparée. Une grande sculpture de marbre y a réellement été fabriquée puis installée par le moteur ; 50 bois restent disponibles pour ajouter une facture de petite sculpture. C’est une démonstration, pas une progression naturelle. La salle V103 et l’atelier V101 sont également directement accessibles dans cette bibliothèque, sans téléchargement manuel.

[Validation regroupée](../history/validation-art-v104.md). G0 consolidé, G1–G4 partiels, G5 absent ; aucune parité globale revendiquée.
