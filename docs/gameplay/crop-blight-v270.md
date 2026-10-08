# V270 — Fléau des cultures

Un incident peut contaminer des cultures semées : riz, pommes de terre, maïs, coton et racine médicinale.
Les plantes sauvages ne participent pas à cette boucle ; les cultures hydroponiques restent vulnérables, même sous toit.
La plante malade cesse de pousser et ne donne aucun produit à la récolte. Elle reste présente et perd progressivement des PV.
Couper les plantes contaminées utilise le travail physique ordinaire ; retirer la plante retire son fléau.
Les cases libérées peuvent être ressemées suivant leur zone, l’alimentation du bac et les autres conditions habituelles.

## Règles et adaptations

L’incident choisit une plante admissible, puis touche la même culture dans la même pièce.
Le rayon nominal de 11 cases suit les points de menace existants : facteur 0,6 à 100 points, 1 à 500, 2 à 2 000.
La chance est de 100 % jusqu’à 8 cases multipliées par ce facteur, puis descend linéairement à 30 % au bord.
Sans économie adoptée, le budget minimal local est de 35 points, donc le facteur reste 0,6.
Le ticket de poids 0,3 suit celui du court-circuit dans l’enveloppe Misc inchangée de 16,9 ; ce poids n’est pas une probabilité quotidienne.
Un incident réussi impose trente jours avant le suivant. Le calendrier commence prospectivement au schéma 205, sans rejouer de tirages historiques.

Chaque fléau commence à une sévérité de 0,2 et gagne 1/30 toutes les 200 ticks locaux, jusqu’à 1.
À partir de 0,28, un passage peut contaminer une plante admissible parmi les plus proches à quatre cases au maximum.
Cette propagation peut atteindre une autre culture ou une autre pièce ; elle ne reprend pas les restrictions de l’incident initial.
Son intervalle moyen passe linéairement de 16,8 à 2,1 heures avec la sévérité ; la chance par passage vaut 0,8 divisé par cet intervalle.
Les dégâts de pourriture sont de 5 PV par jour, sans mort instantanée ni guérison lors d’une remise sous tension.
Le bouton de coupe désigne des travaux ; il ne supprime pas les plantes à distance et ne remplace pas les cultivateurs.
Une coupe achevée désigne aussi les plants malades contigus sans autre ordre, dans une chaîne limitée à cent cellules. La durée conserve le facteur de travail Core lié à la croissance ; aucune expérience de récolte n’est donnée pour cette coupe sans produit. L’infection annule les récoltes déjà assignées, sans effacer les coupes ou dégagements de chantier.
L’affichage utilise une teinte brune constante plutôt que le graphisme de parasite Core ; gravité et règles restent inspectables. Le ressemis suit toujours les compétences requises, notamment Plantes 8 pour la racine médicinale.

L’horloge conserve dix ticks Core par tick local. Les ordres de tableaux et les flux privés déterministes remplacent les listers et Rand de Core ; ils ne reproduisent pas sa graine.
Le tirage d’incident et les états de plantes préservent le RNG général du monde. Le budget de menace conserve les adaptations déjà présentes dans Lisière.

## Référence primaire

Installation locale Core **1.6.4871 rev590**, `E:/Steam/steamapps/common/RimWorld` ; assembly SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`.
Lecture ciblée ILSpyCmd 8.2 : `Blight`, `BlightUtility`, `IncidentWorker_CropBlight`, `Plant`, `PlantProperties`, `WorkGiver_PlantsCut`, `JobDriver_PlantWork`, `JobDriver_PlantCut`, `GenRadial`, `Rand`.
Defs : `Storyteller/Incidents_Map_Misc.xml`, `ThingDefs_Misc/Ethereal_Various.xml`, `ThingDefs_Plants/Plants_Cultivated_Farm.xml`.
Sorties privées et empreintes : `tmp/crop-blight-v270-reference/provenance.json`. Aucun code, XML ou graphisme propriétaire intégré au produit.

## Validation

ROOT a exécuté les contrôles regroupés sur les sources stabilisées : **127 cas passent dans 22 fichiers**, un benchmark historique ignoré, dont **41 nouveaux cas V270**. Couverture : échéances/progression, dégâts quotidiens, proximité et espèces/pièces, hydroponie, croissance et rendement, annulation de récolte possédée, vraie coupe/ressemis, chaîne, lecteurs fichiers/snapshots et anciennes vues, incident et présentation. Les **62 sauvegardes publiques** sont chargées et validées sans modification de leurs fichiers. Durée du groupe : 56,524 s ; journal privé `tmp/validation-runs/v270-grouped-2026-10-08T22-38-53.237Z-12280/output.log`.

Premier typage rouge sur des fixtures de versions et un champ de richesse readonly (6,152 s), corrigés sans assouplir le produit ; reprise verte (4,405 s). Build comprenant le typage final vert en 6,601 s. Les deux anciennes fixtures de prison utilisent désormais le schéma courant plutôt qu’une affectation littérale 204.

Parcours **Chromium/WebGPU matériel** vert en **19,648 s**, sorties privées `tmp/crop-blight-v270-native-4IpuPq` : cinq cultures malades préparées au tick1800, alerte/inspection et commande collective, sauvegarde/rechargement au même tick avec cinq vrais ordres, puis coupe des cinq originaux sans produit et quatre ressemis ordinaires jusqu’au tick1986. La racine médicinale n’est pas ressemée par le travailleur non qualifié ; le riz sain voisin survit. Captures inspectées, aucune erreur de page/console, navigateur et serveur5299 possédés fermés. Les suites numériques couvrent séparément gravité et propagation ; ce court parcours ne certifie ni fréquence naturelle, campagne longue, performances générales ou nouvelle reprise GPU.
