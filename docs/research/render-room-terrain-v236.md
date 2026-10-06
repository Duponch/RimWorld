# V236 — topologie exacte et coût réellement utile

Expérience technique, aucune nouvelle règle RimWorld. [Contrat](../development/render-room-terrain-v236.md),
[preuves et décision](../history/validation-render-room-terrain-v236.md).

Sources primaires locales : RoomTopologyCache, EnvironmentLightField et
EnvironmentLighting historiques ; SnapshotDecoder et journaux V225/V233 ;
SceneRenderCore V230 et son mandat readonly natif ; Three 186 installé.
Les contrats [pièces](../development/rooms.md) et
[éclairage](../development/environment-lighting.md) demeurent ceux du produit.
Les références HTML et limites des horloges sont déjà
[vérifiées dans la recherche V235](direct-render-distribution-v235.md).

Une roche devenue rough-stone peut garder une surface pierreuse tout en ouvrant
une pièce. Le candidat doit donc lire les indices terrain bruts de A→C et C,
pas un filtre graphique de surfaces ou D déjà décodé. Les barrières superposées
et leur ordre font partie du masque ; supprimer leur capture changerait la règle.
Les IDs de pièces sont dérivés, pas des identités persistées de propriétaires.

L'attribution actuelle V233 donne Room.read 0,560 ms moyens dans un parent
EnvironmentLighting de 0,805 ms et applyWorld de 10,217 ms. Ces temps sont
inclusifs et instrumentés ; le recensement terrain n'a pas un budget exclusif
de 0,560 ms. Une amélioration de ce seul poste ne promet ni 240 FPS ni une
réduction équivalente de chaque image.

Le replay CPU ajoute son clone explicite, le vrai lecteur strict et tous les
consommateurs du sous-ensemble concerné. Source/encodage, livraison du corpus et
oracles lourds restent hors fenêtre. Ils ne deviennent pas une latence GAME ;
une DataTexture ou une version CPU ne certifie pas son upload GPU.

Le gain CPU du replay existe, mais la comparaison GAME ordinaire reste dans la
variation locale. Cette différence ne permet pas d'attribuer une cause V8/GPU
nouvelle ni de condamner le langage. Elle écarte ce candidat précis. La suite
retire un travail de matérialisation naturelle identifié statiquement ; son
coût propre et le gain du jeu complet restent à établir.
