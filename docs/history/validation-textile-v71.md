# Preuves V71 — coton cultivé et tissu stocké

19 septembre 2026. [Contrat](../development/textiles.md), [recherche et limites](../research/textile-reference.md). Première tranche de l’étape 4 : matière première obtenable, confection et recherche encore absentes. G0 en consolidation, G1/G2/G3 partiels, G4 accueil/raid partiels, G5 absent ; aucun jalon global clôturé.

## Boucle et continuité

`tests/textile.test.ts` regroupe cinq scénarios : culture naturelle longue, lumière/fertilité/température/toit et rendement partiel, saturation avec refus sans perte ni avance du PRNG, changement d’espèce pendant semis, protection/coupe de l’ancienne espèce, portage interrompu/rejoué, stockage filtré, migration neutre V70 stricte et lots graphiques conservés. Tissu non alimentaire, sans pourriture ; quantité, type et propriété uniques contrôlés.

Le petit camp naturel construit lit/table/tabouret/piquet et sème six cotonniers par les commandes. Aucun âge ni produit injecté après départ ; les provisions initiales du scénario sont 140 bois et 50 rations. Le colon mange et dort pendant toute la croissance. Première récolte au tick **111448**, soit **18,57 jours écoulés** ; au tick111824, **60 tissus rangés** et six nouveaux plants d’identités distinctes. [Bilan quotidien](../../artifacts/cotton-colony-v71.json). Ce scénario ne prétend pas assurer son alimentation par production agricole : les trois pilotes communs portent cette preuve séparée.

Première passe ciblée : une nouvelle fixture omettait son état de toiture ; corrigée, puis **13/13 contrôles ciblés**, trois fichiers, 4,24 s. Passe globale : **349/351**, 80 fichiers, 153,24 s. Les deux attentes périmées étaient le nombre de champs du pilote (désormais deux) et un numéro de schéma 70 codé en dur dans le test des traits. Assertions actualisées sans retirer les contrôles métier ; **6/6 finaux**, deux fichiers, 169,17 s. Pas de seconde passe monolithique annoncée.

Le pilote commun plante un second champ de six cotonniers après nourriture et couchages ; il ne convertit pas le potager. Les trois parcours de cinq à huit jours passent avec bilans alimentaires, construction, sommeil et maintenance : [42](../../artifacts/colony-v71-42.json), [93](../../artifacts/colony-v71-93.json), [2048](../../artifacts/colony-v71-2048.json). Leur coton est encore immature. Le parcours de cinq jours avec accueil/raid passe également dans la régression globale et exige ce champ : [camp avec raid](../../artifacts/raid-colony-v71.json). Ni ces parcours courts ni une maturité contrôlée ne remplacent la croissance naturelle ci-dessus.

## UI et rendu

`tests/integration/textile.spec.ts`, Chromium WebGPU natif, **1× et 6×**, réussi en41,3 s : choisir Coton dans l’inspection du champ, semer six plants, accepter Textiles en réserve, sauvegarder/recharger, récolter, sauvegarder pendant le portage, reprendre puis ranger les60 tissus. **Maturité injectée dans cette fixture UI** pour exercer les transitions sans attendre dix-neuf jours. La croissance naturelle est testée séparément. Aucun aliment inventé ni erreur navigateur ; FPS visible, compteur Tissu et filtre inspectés. [Rapport](../../artifacts/textile-ui-v71.json). Captures coton et pile pliée inspectées à1440×1000.

Deux lots instanciés résidents, préchauffés vides, conservent géométries et buffers après naissance/retrait/rechargement. Les tests vérifient `StaticDrawUsage` ; les matrices/couleurs ne sont marquées que par l’actualisation des cultures. Réserve mémoire assumée à250² : environ9,5 Mio CPU et autant GPU pour les deux formes. Ne pas extrapoler cette politique à toutes les futures espèces sans revue.

Les dernières corrections de libellés rendent Semis/Semer génériques au lieu d’annoncer du riz pour le coton. Aucun comportement de simulation modifié par ces textes. Garde spécialisée minage/abattage V68 réutilisée : horloge, interpolation et poses inchangées ; nouvel audit CPU mixte et naissances/retraits graphiques mesurés ci-dessous. Pas de nouvelle UI monolithique trois jours ; ne pas la confondre avec les pilotes cœur ou ce parcours UI ciblé.

## Coûts observés

Mesures successives, sources gelées pendant la mesure native. Ryzen5 3600, Windows11 10.0.26200, Node24.11.1. Une passe par effectif, JIT/GC/ordonnanceur compris ; pas de gain attribué par comparaison à une charge historique différente.

`scripts/textile-bench.ts` : carte naturelle250², 600ticks, chauffe séparée100ticks, encodage tous les cinq ticks. Une moitié des acteurs récolte du coton mûr, ressème et transporte ; minage et abattage concurrents. La maturité est une fixture de charge explicite. La première disposition de réserve chevauchait un arbre de la fixture commune ; emplacement corrigé avant la mesure finale.

| Acteurs | Tick CPU p50 / p95 / p99 / max (ms), début inclus | Encodage p95 (ms) | Tissu produit et rangé |
|---|---|---|---|
|3|0,12 / 1,47 / 3,74 / 10,94|4,27|20|
|30|0,69 / 8,28 / 18,41 / 32,92|5,04|150|
|100|5,13 / 18,76 / 34,48 / 41,44|6,47|500|

Tous les mondes finaux passent la validation ; respectivement10/105/350 cases minées et aucun travail d’abattage restant. [Données CPU complètes](../../artifacts/textile-cpu-v71.json). À100 acteurs, ces pointes ne permettent pas de garantir6× ; ce banc ne mesure pas le worker et le rendu avec100 colons. Leur dernière preuve mixte demeure [V70](validation-social-v70.md), sans l’attribuer au nouveau coton.

`CROP_VARIANT=mixed VALIDATION_VERSION=v71 node scripts/farming-render-bench.mjs` : WebGPU matériel AMD RDNA1,250²,1440×1000, pause, lumière fixée à midi, même zone/caméra, **0 →1000 →0 plants** (riz/coton alternés). Après30 images de transition et90 de chauffe, au moins300 images et6 s mesurées par phase. Fixture de présentation, aucune prétention de débit de gameplay.

| Plants | Appels de dessin | Image p95 / max (ms), régime stable | CPU soumission p95 (ms) | `setWorld` (ms) | Pic image de transition (ms) |
|---|---|---|---|---|---|
|0|124|4,30 / 8,50|4,20|5,60|54,20|
|1000|126|4,30 / 4,40|3,80|6,10|54,30|
|0 après retrait|124|4,30 / 8,50|4,30|6,00|70,80|

Aucune compilation de pipeline pendant les trois phases ni erreur navigateur. Les pics lors du remplacement complet de scène sont conservés, leur attribution fine reste ouverte : ce protocole clone/remplace un World complet et ne représente pas la disparition d’un seul plant. Le coût CPU de soumission n’est pas le temps GPU. Ces résultats ne prouvent ni un coût nul ni une fluidité parfaite. [Données natives](../../artifacts/farming-render-benchmark-v71.json).

## Limites maintenues

Riz/coton seulement pour les cultures, rendement sain/neutre sans compétence Plantes ni PV/maladies ; pas de coût de passage végétal individualisé, autre textile/cuir, détérioration des piles, couture/ouvrage inachevé/qualité ou recherche. Le preset de lumière actuel donne une récolte plus tardive que l’hypothèse du wiki ; huit jours idéaux ne sont pas huit jours calendaires. La prochaine tranche doit transformer le tissu en équipement réellement utile, puis introduire un déblocage de recherche conforme au Core.

Compilation finale TypeScript/Vite réussie,329 modules ; avertissement connu du bundle graphique dépassant500 kB conservé. Contrôle documentaire :251 documents,2578 liens locaux,25 identifiants de domaine et5 familles ; trois sources originales byte-identiques. `git diff --check` propre.
