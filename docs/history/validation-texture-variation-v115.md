# Variation des pigments V115 — 26 septembre 2026

Les ressources statiques (notamment troncs, canopées et roches) reçoivent, lors de la construction de leur chunk, une fenêtre UV déterminée par leur identité. Les coordonnées restent dans l'atlas existant, occupent exactement le même buffer UV et survivent aux reconstructions indépendamment de l'ordre des ressources. Aucune texture ou matière supplémentaire n'est créée. Les planches de mur et de rive ainsi que les boîtes instanciées (meubles, machines, etc.) décalent leurs UV selon l'indice d'instance, calculé au sommet puis interpolé : une seule lecture de texture par fragment, aucun nouveau buffer ni appel de dessin. Les matériaux unis du réglage « Textures 3D stylisées » restent sans lecture de pigment.

La variation par indice des planches et boîtes peut se redistribuer si le lot est reconstruit après un ajout ou un retrait ; ce n'est pas une identité sauvegardée. L'identité visuelle des ressources statiques est, elle, liée à leur identifiant. Le changement ne touche ni le schéma des sauvegardes ni la simulation.

`npm run build` et 11 tests ciblés réussissent. Le parcours WebGPU de la pièce V114 (29 murs en bois, trois portes, huit vues de toiture/découpe et textures activées/désactivées, plus dix vues de détail) n'a relevé aucune erreur JS/GPU. Le nombre d'appels de rendu de la pièce reste 26 ou 28 selon la vue, comme le témoin V114.

Mesure successive sur la même colonie `public/test-saves/v98/mixed-100.json`, Chromium matériel AMD RDNA 1, 1920×1080, zoom 0,23 sans LOD lointain, textures activées, trois secondes après une seconde de chauffe par phase. [Variation V115](../../artifacts/performance-texture-variation-v115-vertex.json) et [source V114 `0e7c0c4` archivée](../../artifacts/performance-texture-variation-v114-after.json) :

| Source | Pause FPS moyens | Pause GPU p50 | ×6 FPS moyens | ×6 GPU p50 | Dessins / triangles encodés |
|---|---:|---:|---:|---:|---:|
| V115 | 232,4 | 2,097 ms | 113,1 | 3,473 ms | 141 / 2 163 075 |
| V114 | 231,4 | 2,163 ms | 106,5 | 3,539 ms | 141 / 2 163 075 |

Cette paire ne montre pas de régression mesurable, mais les passages courts varient fortement (les autres relevés exploratoires V115 et V114 allaient de 169 à 193 FPS en pause). Elle ne prouve ni coût mathématiquement nul ni garantie générale de FPS. Les appels et triangles sont les compteurs de dessins encodés de Three ; les commandes conservées peuvent être rejouées sans apparaître dans ces nombres. Le débit de simulation à ×6 reste nettement inférieur à la vitesse demandée dans cette grande colonie, indépendamment de la variation graphique.
