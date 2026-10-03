# Référence et adaptations visuelles/sonores — V196

Relevé du 3 octobre 2026. Core local **1.6.4871 rev590**, installation en lecture
seule `E:/Steam/steamapps/common/RimWorld`. Les originaux restent hors du dépôt.

## Mobilier : résultat précis

Assembly-CSharp.dll SHA-256
`5CF1B5BE399D5B1C9C56CA72C9D35B4ECF307FEACF5859D04AC5A1AA5926356A`.
Lecture ponctuelle de `PawnTweener.TweenedPosRoot`, `PathGrid.CalculatedCostAt`
et `Traversability` avec l'outil existant, sorties privées sous `tmp/v196-core`.
Le tweener interpole la position des cellules, avec un offset de siège lorsque
le pion est immobile ; il ne lit pas une hauteur volumique de table/chaise/lit
pour escalader un meuble. Les définitions Furniture donnent des coûts distincts
du dessin : sièges 30, table/lit 42 avec passage sans arrêt ordinaire. Ces nombres
de référence ne sont pas des modifications de notre navigation.

La [page officielle](https://rimworldgame.com/) et le
[correctif officiel 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/)
ont été consultés. Ils ne définissent pas la hauteur de franchissement ; cette
conclusion vient du code local de la version précise. Les discussions historiques
et leurs règles contradictoires ne servent pas d'oracle actuel. Corpus : chapitres
5, 21 et 29, SYS/TEST-020..022 et 113..117, séparation occupation/passage/arrêt et
réservation adoptée ; représentation 3D du transit au sol adaptée à la demande.

## Douleur : adaptation explicitée

Les SoundDefs Core incluent des familles animales dans
`Defs/SoundDefs/Pawn_Animal_Misc_Vox.xml`. La base Fox dans
`Defs/ThingDefs_Races/Races_Animal_WildCanines.xml` contient le commentaire
`no sounds` (base vers ligne 387, Fox_Red vers ligne 473). La douleur enregistrée
du renard est donc une adaptation utilisateur, et non une parité Core.
Aucune définition Core de râle humain de blessure identifiée dans ce relevé ;
cela ne prouve pas l'absence universelle de toute vocalise. La voix humaine
masculine/féminine est la demande du joueur, pas une règle de référence déduite.

Empreintes des deux sources principales :
`Pawn_Animal_Misc_Vox.xml` =
`48965d119e3195cd3380b0be11a2cadf5d9cb946acbe89fbee064cbdd0898dc6` ;
`Races_Animal_WildCanines.xml` =
`6a83d49664394302661b9c2a40f1607cb0cebd1597d2128e35434c3f1b74e101`.
La recherche de voix porte sur 35 XML SoundDefs de cette installation précise.

Les nouvelles prises sont générées, pas extraites de RimWorld. Prompts complets,
IDs, SHA, crédits et traitements sont dans les journaux audio. Huit prises
publiées coûtent 20⅓ crédits annoncés. Quatre prises neutres lancées avant la
précision du sexe, exclues du manifeste, coûtent 10⅔ crédits et restent sous tmp.
PCM et routage ne valent pas une écoute humaine du timbre ou de la sortie casque.

## Rendu : contrats primaires et décisions

[NodeMaterial r186](https://raw.githubusercontent.com/mrdoob/three.js/r186/src/materials/nodes/NodeMaterial.js)
décrit couleur et position comme nœuds distincts. Les pigments sont calculés
dans le matériau existant ; cela évite un passage de peinture supplémentaire,
sans supprimer le coût du calcul. Les
[buffers instanciés entrelacés](https://threejs.org/docs/pages/InstancedInterleavedBuffer.html)
permettent de partager le stockage de plusieurs attributs ; compter les entrées
réellement utilisées reste nécessaire. Le
[PannerNode](https://developer.mozilla.org/en-US/docs/Web/API/PannerNode)
garde le son spatial : la voix choisie ne change pas la distance de la caméra.

Adopter la clinique/anatomie et la propriété confirmées existantes ; adapter
les six régions de pigment, le sang par cellule d'herbe et les yeux en croix
au style du jeu. Différer les gouttes qui reproduiraient précisément leur
empreinte sur chaque brin et les nuances fines du terrain : le second effet
était expressément conditionné à l'absence de surcoût. Ni le code Core 2D,
le corpus ni une scène préparée ne prouvent un coût GPU nul de ces choix 3D.
