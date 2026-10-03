# Repères de besoins, herbe peinte et nuages — V200

Correctifs utilisateur du 3 octobre 2026, schéma **182 inchangé**, sans nouvelle mécanique, migration ou modification du World. [Référence et choix](../research/needs-grass-clouds-v200.md), [preuve ciblée](../history/validation-needs-grass-clouds-v200.md). Les contrats [UI V199](colonist-ui-v199.md), [sang V196](visual-blood-v196.md) et [nuages V185](visual-audio-v185.md) restent applicables hors des points remplacés ici.

## Jauges

Les cinq jauges ordinaires n'avaient aucun trait : les attributs HTML `low` ne dessinaient pas de repère. Les positions et le choix des traits sont vérifiés dans le Core humain 1.6.4871 rev590 : nourriture 12/24 %, sommeil 14/28 %, plaisir 15/30/70/85 %, beauté 15/35/65/85 %, confort 10/60/70/80/90 %. Les 17 traits occupent la moitié inférieure de chaque barre, sombres lorsque la réserve dépasse le seuil, atténués sinon. Les valeurs, labels accessibles et aides au survol restent ceux des besoins réels. Les seuils extrêmes volontairement non tracés dans Core restent décrits dans l'aide.

Le helper `need-gauge.ts` partage le dessin entre besoins ordinaires et plaisir. Les marqueurs décoratifs n'interceptent pas le pointeur ; leurs classes ne changent qu'en cas de franchissement. Aucun besoin Extérieur ni nouveau seuil de simulation n'est ajouté. Les égalités de Beauté restent celles de la simulation locale préexistante, différentes de Core aux valeurs exactes des bornes ; des positions identiques ne prouvent pas une parité exhaustive de calcul.

## Sang sur les brins

La teinte rouge de toute la cellule est remplacée par un pigment par **racine réelle** des 224 slots possibles de brins. Le masque est précalculé depuis les positions et proportions des décalques de sang et l'alpha de leur atlas existant. Les brins entre les taches restent verts, y compris dans une cellule contenant du sang ; une tache dépassant sa cellule peut atteindre des brins voisins. Le pigment suit tout le brin enraciné dans la tache : ce n'est pas une simulation de gouttelettes sur chaque point de sa surface.

Les valeurs sont quantifiées sur deux bits par slot, soit 14 mots de 32 bits par cellule. Le shader lit un seul mot supplémentaire au stade sommet, uniquement si les textures sont activées et la cellule porte des racines tachées. Aucun prélèvement de sang par fragment, nouveau draw, changement de densité ou animation par brin n'est ajouté. Sans sang, la branche est sautée. La couleur terrain reste dans la carte RGBA existante ; alpha 254 désigne une cellule tachée, 255 une cellule propre, 0 une absence d'herbe. La couverture géométrique reste binaire et identique.

Adoption, nettoyage, déplacement, changement d'épaisseur et reset doivent suivre le snapshot confirmé, y compris au même tick. Le cache copie les primitives ; les cellules touchées par anciennes et nouvelles empreintes sont recalculées. Un snapshot inchangé n'entraîne aucun upload. Le sol, les planchers, les bâtiments et les piles restent les autorités des masques d'absence. Le renderer ne produit ni ne retire le sang physique.

Sur 250², le nouveau champ dense représente **3 500 000 octets** de données CPU et autant de données GPU, hors objets/padding. Les 64 Kio d'alpha utiles sont extraits de l'atlas de saleté déjà produit pendant le chargement. Le premier bake et l'adoption des traces ont un coût ; un masque modifié peut nécessiter son transfert complet. Cela ne constitue pas un coût nul. La preuve borne le coût du shader et de l'adoption dans des scènes préparées, sans promesse générale de FPS.

## Pigments du terrain sur les brins

Chaque brin reprend le RGB de la texture peinte du terrain à sa racine, puis reçoit le sang éventuel. L'UV est `(racineXZ + 0,5) / dimensionsMonde`, sans inversion verticale ; Three convertit la texture sRGB en couleur linéaire. La lecture LOD0 au stade sommet conserve les nuances locales du dessin. Toute la surface du brin utilise cette couleur : il ne s'agit pas de plaquer un motif distinct sur sa longueur.

Le renderer prête son atlas existant à l'herbe : aucun nouvel atlas, bake CPU, transfert de couleur ou draw. Le sampler ajoute une lecture vertex lorsque les textures sont activées et le sol porte de l'herbe. La carte RGBA propre reste l'autorité de couverture ; l'alpha mousse de l'atlas terrain ne masque jamais les brins. Sans textures, seule la palette unie préexistante est employée et les lectures de pigments sont sautées.

La texture empruntée conserve son identité lors des rafraîchissements et patches du terrain. Le changement d'image, la désactivation et la réactivation passent par un uniforme de disponibilité ; l'herbe ne détruit jamais l'atlas prêté. Le branchement initial précède la compilation, y compris à la réactivation du lot d'herbe. La conservation de cette retouche est conditionnée aux mesures GPU de la preuve ; absence de nouvelle texture ne signifie pas absence de coût de prélèvement.

## Nuages

Le rayon entièrement transparent au centre passe de **27 à 31 % du petit côté de l'écran**, soit environ +15 % en rayon. La couronne de fondu reste de 8 points : opacité complète à 39 %. Le masque utilise la position de chaque fragment et reste circulaire dans les deux projections et toutes les proportions de viewport. Le fondu d'élévation, la hauteur, les modèles, les counts, le vent et l'absence d'écriture de profondeur restent inchangés. Seules les constantes du calcul existant changent.

## Validation

Contrôles ciblés des transitions de pensées, empreintes de sang, changements au même tick, masques d'absence, reset et absence d'uploads stables. Parcours natifs pour les traits visibles, les pixels des brins réellement couverts et non couverts, les nuances du terrain à plusieurs racines, l'option textures, le nettoyage et le trou central des nuages dans les deux projections. Les mesures CPU et GPU sont successives et les sources servies restent gelées. Suite exhaustive, campagnes longues et performance générale restent distinctes de ces preuves.
