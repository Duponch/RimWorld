# Lecture des faces des climatiseurs — V158

Ce lot réduit un sous-coût CPU du [climatiseur V75](cold-store.md) sans changer ses règles, son schéma de sauvegarde ni sa présentation. La [recherche Core V75](../research/cold-store-reference.md) reste la source des faces, du thermostat et des blocages ; la [preuve V158](../history/validation-cooler-face-index-v158.md) borne la validation et la mesure.

`advanceCoolers` lit les structures solides une fois par appel et construit un index local de leurs cellules d'empreinte. Il teste les faces froide et chaude dans leur ordre antérieur, avec les mêmes refus hors carte et sur terrain rocheux. Les plans de construction ne participent pas à cette lecture de fonctionnement : ils restent contrôlés par `coolerFaceBlocked(world, cell, true)` lors de la désignation. La fonction scalaire est conservée comme oracle indépendant.

L'index n'est ni persisté ni conservé au-delà de l'appel. Il reflète donc toute construction, destruction, rotation ou modification de structure survenue avant le prochain calcul thermique. L'intégration de l'énergie, les températures des régions, l'état `cooler.high`, l'alimentation et l'ordre des appareils restent ceux de V75. Il n'y a ni consommation de PRNG, ni nouvel état autoritaire, ni migration. Une scène sans climatiseur actif n'a pas besoin d'index.

Le contrôle compare les blocages à l'oracle sur les faces, puis les états thermiques et le World sérialisé sur une continuation identique. Le microbanc inclut la construction de l'index, alterne ancien et nouveau sur la même scène 250², et ne vaut pas preuve de gain du tick complet, du worker, du GPU ou des FPS.
