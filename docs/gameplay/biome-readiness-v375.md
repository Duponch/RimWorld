# V375 — trois biomes, départs et reprises courts

15 octobre 2026, schéma 238 conservé. **Qualification initiale acquise par reprises**, sans changement produit. Les six cas automatiques et les trois parcours UI sont terminés ; cela ne certifie pas une année de survie, tout le catalogue Core, ni les performances générales. Dernier produit publié : V365.

## Résultat

Deux graines fixes (271828 et 314159), trois biomes, six cartes64² : génération répétée identique, climat de la vraie tuile, espèces autorisées, dotation/capsules et identités conservées, sauvegarde puis continuation exacte. Au plus102ticks par monde, sans campagne de42000ticks ni nouveaux ledgers.

Dans Chrome natif/WebGPU, trois cartes250² choisies dans le vrai parcours scénario/conteur/globe/équipe, graine271828 :

| Biome | Tuile | Plantes / animaux initiaux | Arrivée observée et recharge |
| --- | --- | --- | --- |
| Forêt tempérée | 4 | 13870 / 9 | tick28, exacte |
| Forêt boréale | 9 | 11122 / 14 | tick28, exacte |
| Broussailles arides | 14 | 4841 / 13 | tick28, exacte |

Trois captures inspectées ROOT : végétation, palettes, dotation et HUD cohérents avec le biome affiché. Aucune chaîne alimentaire ou construction n'est créditée par ces départs. La campagne98038 reste conservée et partielle ; elle n'a pas été relancée.

## Contrôles et incidents conservés

- Six cas ciblés PASS13,348s ; sept anciens cas du fichier non rejoués.
- Typage global interrompu deux fois par une erreur d'allocation Windows1455, même après limitation de concurrence/mémoire. Aucun diagnostic TypeScript métier obtenu dans ces tentatives. Périmètre ciblé comprenant toutes les sources et les trois tests concernés : PASS16,323s avec GOMAXPROCS2/GOMEMLIMIT768MiB.
- Natif01 RED15,920s : serveur5412 indisponible avant toute partie ; serveur restauré en arrière-plan, sans fermer de session humaine.
- Natif02 RED193,741s : les deux forêts et leurs exports/recharges sont acquis ; navigation vers le troisième cas arrêtée à la borne180s, avant sa création. Le groupe entier n'est pas déclaré vert.
- Attente de navigation bornée au DOM et filtre facultatif strict du biome ajouté au pilote. Seul le cas manquant aride est exécuté dans un nouveau contexte : natif03 PASS30,600s. Trois recharges cumulées exactes, erreurs applicatives relevées vides. Aucun changement de graine favorable.
- 2992 sources/tests/assets/configurations figés avant/après les natifs. Aucun build, corpus historique, benchmark ou déploiement pour ce lot QA.

Sorties : `tmp/biome-readiness-v375/native-01`, `native-02`, `native-03` et `tmp/validation-runs/v375-*`. SHA des exports : tempéré865c3ba4c307015d5c27e78593c5c660bbd829d8a8564e72f1a004b589fcdc77 ; boréal e152d12244f359cd19ad378e6ac3972627ae695d6d9a8fbbe1022106b1ee7f71 ; aride86e36ef5cb5ab50f3a9a072aae54bf240cf3e6e539df582ffabe22633e0bd585. Le dernier ajustement purement pilote est couvert par le natif03 ; aucune règle du produit n'a changé.

## Comparaison RimWorld et décisions

La [présentation officielle](https://rimworldgame.com/) décrit les biomes par climat, terrains, végétation, animaux et risques. Nos trois profils possèdent déjà ces différences ; les sources ne justifient pas une réécriture globale. L'annonce officielle [Winter is Coming](https://ludeon.com/blog/2014/12/alpha-8-winter-is-coming-released/) confirme historiquement neige accumulée, fonte et ralentissement, sans fournir les constantes actuelles.

Les coefficients sont issus de l'installation Core1.6.4871rev590 déjà auditée, pas d'une affirmation sur le dernier build mondial. Sources locales et synthèses privées : `tmp/early-access-expansions/tundra-reference` et `tundra-reference-complement`. Aucun code ou asset propriétaire importé dans le jeu.

Deux images de la [galerie officielle Steam du jeu de base](https://store.steampowered.com/app/294100/RimWorld/) ont été réellement regardées : [paysage enneigé](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/294100/a6158c5cef23ac8157b37dd3eb17f3c2d2649e93/ss_a6158c5cef23ac8157b37dd3eb17f3c2d2649e93.1920x1080.jpg?t=1782756789) et [colonie/caverne](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/294100/cccfece4c643fd32d438642fbea1b980bc519a48/ss_cccfece4c643fd32d438642fbea1b980bc519a48.1920x1080.jpg?t=1782756789). Couverture neigeuse extérieure variable, arbres enneigés et intérieur dégagé sont visibles dans la première. Ces captures n'ont pas le HUD et ne prouvent pas les interactions des menus ; leur build/DLC ne sont pas précisés par la galerie. Une référence d'interface dédiée restera nécessaire aux prochains changements d'UI.

Écarts établis : absence de profondeur neigeuse physique ; globe original à seuils simplifiés ; relief partagé sans rivières ni marais/sols de lichen ; catalogue d'espèces partiel dont les parts manquantes ne sont pas redistribuées. L'article officiel [Odyssey](https://ludeon.com/blog/2025/06/odyssey-preview-1-map-features-landmarks-and-biomes/) concerne un DLC et n'est pas assimilé au Vanilla.

**Suite :** neige persistante à coût borné puis toundra reliée au climat, aux espèces, à la sélection du site et au décor ; géographie future versionnée pour conserver les anciennes parties. Pas de nouvelle campagne longue comme condition automatique de ces lots.
