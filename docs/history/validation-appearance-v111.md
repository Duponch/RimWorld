# Validation V111 — longueurs de cheveux et jonction de frange

26 septembre 2026. La capture rapprochée de l'utilisateur montre deux écarts apparus après V110 : les cheveux courts descendent trop bas sur les côtés, et une bande de peau sépare des pièces de la frange. [Contrat d'apparence](../development/pawn-appearance.md). Cette capture établit une correction visuelle de Lisière ; elle ne sert pas à inférer une nouvelle règle de génération RimWorld.

## Résultat et frontières

- Les pièces latérales courtes (4/5) finissent maintenant à `y=1,215`, au-dessus de la base de nuque à `y=1,185`. Les coiffures longues et à queues utilisent des pièces latérales distinctes (8/9), jusqu'à `y=1,000`, et l'arrière long (6) jusqu'à `y=0,920`. La nuque commune assure la jointure avec le dessus. Les quinze pièces résidentes et l'unique lot instancié sont conservés.
- La couronne couvre le sommet du visage et chevauche en profondeur/hauteur les deux mèches frontales ; la pièce haute des coiffures bouclées rejoint la couronne. Les faces frontales des mèches restent devant celle de la peau. Le gros plan natif de Noé ne montre plus le trou de la capture utilisateur ; la peau sous la ligne de cheveux est le front attendu.
- Les portraits HUD/Bio continuent d'être projetés depuis le même maillage. Aucune modification de simulation, de schéma (**109**), de profils sauvegardés, de PRNG, de catalogue, de recherche ou de fixture. G0–G4 demeurent **partiels**, G5 **absent** ; aucune estimation fonctionnelle n'augmente pour cette présentation.

## Vérifications regroupées

[17/17 contrôles ciblés](../../artifacts/appearance-checks-v111.json) : jointure des pièces, base des tempes courtes au-dessus de la nuque, côtés et arrière des styles longs prolongés, quinze pièces au total, barbe/portraits/buffers/identités/sauvegarde et pont. Typage et build de production réussis, avec l'avertissement connu de taille de bundle.

[Parcours Chromium/WebGPU](../../scripts/appearance-ui-v111.mjs), [résultat](../../artifacts/appearance-ui-v111.json) : cinq profils préparés dans la vraie bibliothèque, vues éloignées et rapprochées de face, profil et dos, Bio et HUD, zéro erreur JS/WebGPU. Les captures locales `artifacts/appearance-v111-{front,side,back,close-front,close-side,close-back,bio}.png` sont régénérables et ignorées par Git. Une vue rapprochée de Noé confirme la jonction ; Ada montre côtés et arrière longs, Mina garde un chignon court. La création froide de cent portraits prend 28,6 ms et leur réutilisation 0,3 ms dans ce parcours ; ce coût ponctuel reste distinct du rendu par image.

## Charge native

[Comparaison et données](../../artifacts/appearance-load-v111.json) : même fixture mixte immuable de cent colons, même simulation, 1440×1000, carte entière à 375,553 cases, rendu humain du commit V110/V111/V111/V110. Fenêtres de six secondes après une seconde de stabilisation, pause puis ×6, sans source modifiée pendant l'essai. Le temps RAF n'est pas un chronomètre GPU ; le débit mesure la simulation réalisée, pas la vitesse demandée.

| Rendu | Image p95 pause | Image p95 ×6 / pic | CPU image p95 ×6 | Débit effectif pour 6× demandé |
|---|---:|---:|---:|---:|
| V110, passage 1 | 4,3 ms | 20,8 / 87,5 ms | 18,9 ms | 2,69× |
| V111, passage 1 | 4,3 ms | 24,9 / 91,7 ms | 21,1 ms | 2,24× |
| V111, passage 2 | 4,3 ms | 29,1 / 100,0 ms | 23,8 ms | 1,66× |
| V110, passage 2 | 4,3 ms | 25,0 / 95,9 ms | 22,5 ms | 2,27× |

Le p95 d'image en pause reste égal ; sous ×6, les deux passages V111 sont plus lents, surtout le second. Le nombre de sommets et d'appels de dessin humains ne change pas, mais la surface et le nombre de pièces visibles selon la coiffure changent. La séquence ne suffit pas à isoler une cause unique parmi rendu, ordonnancement et charge worker ; **aucune absence de régression n'est affirmée**. Cette limite de débit demeure ouverte dans ROADMAP ; ni les règles ni les pas simulés n'ont été simplifiés pour améliorer le chiffre.

## Publication

Commit et poussée Git consignés dans l'historique du dépôt. Le site Netlify reste sur V109 : le compte refuse les nouveaux déploiements avec HTTP 403 « Account credit usage exceeded » déjà diagnostiqué en [V110](validation-appearance-v110.md#publication). Aucun contrôle public V111 ni déploiement prêt n'est revendiqué.
