# V126 — activités et effets visibles : validation bornée

## Livré

Les gestes déjà décidés par le moteur animent maintenant les bras, le buste et la tête aux postes de cuisine, fabrication et recherche, ainsi que pendant la coupe, le minage, la construction et plusieurs soins/services. Les combattants se rapprochent visuellement par une translation bornée dans leur case, interpolée avec les poses existantes. Leurs décisions, portées, réservations et dégâts restent ceux du monde V125.

Le modèle résident des humains montre le clignement, les yeux fermés du dormeur et les croix du mort au sol. Les portraits HUD et Bio choisissent la même expression au changement d'état, via un cache et sans rendu par image. La bagarre produit un nuage et des étoiles ; les autres actions affichent des signes brefs au point de contact. Le métal travaillé rougit sur les postes actifs et alimentés, les appareils montrent leur état, la cuisine et les ateliers émettent vapeur/fumée, les feux disposent de flammes animées et de fumée. Ce dessin de bande dessinée est original ; aucune image de RimWorld n'est reprise.

Le lot d'acteurs réutilise les attributs GPU de déplacement et une horloge de présentation. Les pièces chaudes et voyants partagent un lot résident ; la fumée un second. Le feu conserve son lot existant. Les feux au sol ne fournissent au plus que 128 sources de fumée visibles proches de la caméra, choisies par chunks quand la vue ou l'état confirmé change. Aucun système de particules ne tourne sur le CPU par image. Les effets lointains ou vides se masquent ; aucun nouveau champ de sauvegarde, tirage métier ou pipeline de simulation n'est introduit.

## Contrôles

- Compilation TypeScript et build de production réussis.
- 24 tests ciblés réussis : classement des actions, expressions du modèle et des portraits, approche, lots physiques, métal alimenté, cuisson, batterie, feu de camp et plafond de fumée avec panoramique entre deux incendies.
- Trois parcours Chromium/WebGPU réussis : scène V125 de bagarre, sommeil réel, fabrication de composant après reprise d'une scène V123, batterie et feu V87 ; anciens parcours V112 des quatre travaux réels et V117 du contact/coup de coupe également réussis. Le parcours V126 constate les attributs de pose partagés, les états d'effet, le portrait HUD endormi, l'absence d'erreur console et le gel de l'horloge en pause. Les captures de chaque scène ont été inspectées visuellement.
- Le contrôle natif `npm run test:presentation` sur 250² mine/coupe réussit : p95 d'intervalle image 4,3 ms pour chaque action, zéro saut de présentation et zéro occupation de roche/solide. Il ne compare pas V125 et V126.

Ces parcours sont des situations préparées et des reprises courtes. Ils ne prouvent ni l'équilibre d'une colonie autonome ni la couverture de toutes les tâches. Le Z, les étincelles et la fumée sont symboliques ; la fumée n'est pas un fluide simulé. Un cadavre porté conserve encore ses yeux de repos parce que la pose de portage prime sur celle du mort.

## Performance et limites

Le nombre de dessins de VFX actifs est borné par type de lot, et le travail par image se limite aux uniformes temporels et à une décision de vue pour la fumée. L'index des feux n'est reconstruit qu'aux états confirmés, puis interrogé au mouvement significatif de la caméra.

Le [banc A/B/A natif](../../scripts/activity-vfx-bench-v126.mjs) et son [rapport](../../artifacts/activity-vfx-bench-v126.json) ont chargé une scène **synthétique et figée** 64² avec 100 acteurs visibles (60 aux postes, 40 endormis), 30 feux au sol et dix feux de camp. Chromium/WebGPU sur GPU AMD rdna-1 à 1440×1000, même caméra, 45 images de chauffe et 1,8 s par phase : effets visibles/masqués/visibles donnent 31/28/31 dessins, 973 549/968 589/973 549 triangles, p95 CPU d'image 1,7/1,4/1,5 ms et environ 240 FPS plafonnés dans les trois phases. Le coût observé de soumission CPU est faible dans ce cas, mais non nul. L'intervalle RAF ne mesure pas directement le temps GPU ; la pause et le plafond d'écran empêchent de conclure pour ×6, les cartes complètes ou tous les appareils. La validation n'établit ni coût GPU nul, ni 240 FPS constants, ni débit réel ×6 à cent colons.

Les prochains chantiers de gameplay restent ceux de la [roadmap](../ROADMAP.md) : traits et âges humains, relations/famille, quêtes et monde, nouveaux contenus/biomes et les frontières industrielles/animales ouvertes. V126 ne change pas les estimations de couverture fonctionnelle.
