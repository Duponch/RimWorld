# Relecture de la température des plantes — 15 septembre 2026

Corpus relu : chapitre 12 du HTML original, SYS/TEST-070, 071, 072, 075 du classeur. **Adopter** le temps réellement favorable, les stades et la distinction semis/récolte. Le corpus ne prouve pas que la croissance thermique soit déjà exécutée localement. **Adapter** les états et la cadence à notre simulation, **différer** autres espèces et survie végétale.

## Sources confrontées

- [Plants, wiki actuel](https://rimworldwiki.com/wiki/Plants#Temperature) : plage optimale 6–42 °C, arrêt aux bornes 0/58 °C, température locale et refus des semis hors plage ; exceptions d’espèce et gel distincts. Sa rubrique explique aussi les ouvertures de toit permettant lumière naturelle et rétention de chaleur.
- [Plant.cs, révision épinglée](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/Plant.cs) et [PlantUtility.cs](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/PlantUtility.cs) : défauts 0/6/42/58 et accès à la température de cellule ; `GrowthSeasonNow` exclut strictement les deux bornes. Le miroir est un indice direct du comportement de cette révision, de provenance communautaire ; aucune version commerciale précise n’est certifiée.
- [WorkGiver_GrowerSow.cs](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/WorkGiver_GrowerSow.cs) vérifie la saison de croissance avant de proposer le travail. [JobDriver_PlantSow.cs](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/JobDriver_PlantSow.cs) contrôle place/contact/réservation pendant l’opération sans réintroduire ce seuil thermique à chaque tick. **Adopter** cette distinction entre nouvelle sélection et travail accepté.
- [Ancienne page Fandom](https://rimworld.fandom.com/wiki/Plants) : seuil inférieur optimal de 10 °C. **Écarter ce nombre** pour la cible courante, car wiki actuel et révision de code consultée concordent sur 6 °C. Cette contradiction montre pourquoi une recherche générique ou une ancienne note ne suffisent pas.

## Décisions et réserves

Confiance élevée sur les plages et les comparaisons aux bornes pour les espèces ordinaires présentes ; moyenne sur la cadence exacte et les exceptions de toutes les versions. Les DLC et espèces spéciales ne sont pas importés par généralisation. Pas de copie de l’implémentation C#.

**Adapter** l’intégration sous facteur sauvegardé : conserver l’intervalle passé, appliquer le facteur local suivant, préserver lumière et fertilité. **Adopter** ralentissement, arrêt, réchauffement, reprise et refus des nouveaux semis ; **différer** dommages, mortalité, feuilles, maladies et neige. Le [contrat V39](../development/plant-temperature.md) décrit les limites observables. Un profil froid injecté dans un test ne représente pas un appareil déjà disponible au joueur.

Relecture rétroactive : la croissance sous toit était correctement arrêtée, mais l’inspection pouvait annoncer une croissance diurne sur une cellule couverte ; son explication est corrigée. `AdjacentSowBlocker` consulte huit voisins dans le miroir alors que notre préparation n’en contrôle que quatre : écart de placement explicite, à corriger dans ce domaine avant de clore les règles végétales.
