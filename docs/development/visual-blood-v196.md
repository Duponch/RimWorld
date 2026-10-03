# Sang, dépouilles et douleur — V196

Le [correctif V200](needs-grass-clouds-v200.md) remplace la teinte par cellule décrite ci-dessous par un masque des racines effectivement sous les taches, et branche les nuances du terrain jusqu'ici différées. Les corps, dépouilles, voix et franchissements V196 restent inchangés ; ses anciennes mesures ne valident pas le nouveau rendu d'herbe.

Chantier utilisateur du 3 octobre 2026, repris à sa relance en mode jour.
Schéma **182 inchangé** : aucun champ clinique, commande, migration, ressource
ou mécanique nouvelle. [Recherche et adaptations](../research/visual-blood-core-web-v196.md),
[preuve ciblée](../history/validation-visual-blood-v196.md).

## Herbe et sang

La carte RGBA de couleur/couverture existante des brins reçoit le rouge brun
du sang présent dans leur cellule. L'épaisseur module le mélange de pigment.
Cette représentation colore les brins de **la cellule tachée**, sans reproduire
le contour exact de chaque goutte du décalque au sol. Nettoyage, pluie et retrait
du dépôt retirent la teinte au prochain snapshot confirmé ; le rendu ne dépose
ni ne nettoie lui-même le sang. Planchers, bâtiments et piles au sol conservent
leur masque d'absence d'herbe.

Le cache copie les primitives des dépôts pour reconnaître aussi les changements
au même tick. Seules les cellules dont l'épaisseur change deviennent sales.
Carte inchangée : aucun upload. Carte changée : transfert de la carte existante
(250 000 octets sur 250²), sans nouvelle texture ni prélèvement GPU. Le shader,
la géométrie de quatre sommets, la densité, le vent et le draw restent identiques.
L'adoption compare les dépôts sur CPU ; ce coût n'est pas nul.

**Différé selon la condition utilisateur :** suivre chaque nuance fine du dessin
peint du terrain. La carte d'herbe reste à un texel par cellule ; utiliser l'atlas
peint demanderait une lecture GPU ou une carte plus détaillée et davantage de
préparation/transfert. Aucun de ces coûts n'est ajouté pour cet effet. La forme
des brins modifiée par l'utilisateur reste intacte.

## Corps et dépouilles

Les blessures extérieures saignantes projettent un mot de pigment de six régions
sur les humains et les animaux. Les coordonnées du dessin sont celles du corps
avant animation : les traces suivent marche, flexion et sommeil. Plaies soignées
mais encore ouvertes gardent une marque ; guérison et cicatrices ne la créent pas.
Saignement interne seul et maladies sans plaie ne peignent pas la peau. Un membre
absent ou consommé reste caché ; une amputation fraîche peut marquer son parent.
Le dossier médical et son PRNG restent strictement inchangés.

Le pigment est calculé dans les matériaux existants, sans mesh de sang, texture
de sang par acteur ou draw supplémentaire. Il ajoute cependant du calcul fragment
et des données dérivées : humains +4 octets par capacité ; animaux +64 octets
par capacité et +12 octets de métadonnées par sommet. Les entrées effectivement
consommées sont regroupées pour respecter les limites WebGPU ; les alias CPU
ne sont pas des locations supplémentaires du shader.

Les sept espèces partagent le même modèle, pelage, palette et échelle biologique
pour vivant, sommeil, chute, mort, pile et portage. La pose latérale des morts est
celle du sommeil, avec yeux en croix ; les anciens proxies gris/aplatis/cubiques
sont retirés. Les étapes cliniques de décomposition et leurs usages restent
simulés, mais n'aplatissent ni ne recolorent ce modèle. L'anatomie consommée et
la propriété physique conservent leur autorité. Collecte/dépôt utilisent les
transitions de cargaison existantes et le rig du porteur.

Deux traits par œil sont résidents (+48 triangles par modèle) ; les pattes du
lièvre sont séparées sans changer leur silhouette (+48 triangles pour ses deux
variantes). Aucun nouveau lot par cadavre, squelette ou AnimationMixer. Les corps
rejoignent les sept lots globaux de faune : leur granularité de culling diffère
des anciens chunks de piles. La fidélité du modèle peut donc augmenter le coût
GPU, notamment hors champ ; ne pas annoncer un coût nul.
Les corps au sol sans porteur ni transfert sautent la préparation par image
si le snapshot reste identique. Une nouvelle adoption au même tick et un reset
réécrivent leurs attributs ; les dépôts animés restent traités jusqu’à leur fin.

## Douleur sonore

Trois prises masculines et trois féminines ElevenLabs choisies selon
`appearanceOf(pawn, seed).sex`, identique à l'apparence affichée. Deux prises de
douleur du renard complètent les familles animales existantes ; le lièvre des
neiges partage celle du lièvre. Aucun son de mort propre au renard n'est ajouté.
Manifest : 54 événements, 133 prises. [Son courant V175](audio-v175.md) conserve
spatialisation, gain, sélection de voix, variations et budgets.

Le compteur médical existant `nextInjuryId` détecte une nouvelle blessure
confirmée, y compris fusion ou membre perdu. Guérison compensant un nouveau coup
ne masque plus celui-ci. La première adoption/reprise est silencieuse ; identité
acteur/compteur, scheduler et lecteur évitent les doublons. Douleur nulle sous
anesthésie et décès sont exclus. Plusieurs contacts regroupés dans une publication
produisent une vocalise par acteur, sans inventer les contacts absents.

## Franchissement et scène de test

La hauteur du mobilier n'est plus appliquée aux extrémités du déplacement : les
colons traversent les meubles franchissables sur leur plan de marche. Les chaises
ordinaires n'étaient pas indexées ; la montée concernait notamment les tabourets,
tables, lits et établis. Navigation, coûts, arrêt, murs, portes et réservations
restent inchangés. L'assise réelle, le lit et les poses de travail utilisent
toujours leurs branches dédiées ; les piles restent sur leur vrai plateau.

La **46e colonie « Sang, dépouilles et douleur · 3 colons »** prépare sang,
blessures, six espèces vivantes/endormies et sept dépouilles. Le lièvre des neiges
est uniquement en dépouille pour respecter le biome. Repas assis, passage,
portage et nouveaux coups audibles restent à accomplir. Les profils masculin et
féminins sont explicitement préparés ; les plaies au chargement n'émettent pas de
nouveau râle. [Guide joueur](../gameplay/player-guide.md),
[scène](../../public/test-saves/v196/sang-depouilles-douleur.json),
[générateur](../../scripts/create-test-save-visual-blood-v196.ts).
