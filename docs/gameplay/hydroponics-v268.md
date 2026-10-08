# V268 — Hydroponie et cultures de serre

La recherche **Hydroponie** coûte 700 points ; l’électricité est déjà connue au départ.
Construire un bac orientable de **1 × 4 cases**, avec **100 acier et 1 composant**, demande Construction 4.
Il possède 180 PV, consomme **70 W continus**, même la nuit, et fournit **280 % de fertilité** indépendamment du sol sous-jacent.
La propreté du bâtiment est de −3 ; l’entretien et la propreté de la pièce restent les mécanismes ordinaires.
Son support doit rester constructible ; il ne remplace ni le chauffage ni la lumière.

## Boucle jouable

Placer et alimenter le bac, puis choisir sa culture dans l’inspection existante : **riz, pommes de terre, coton ou racine médicinale**.
Le maïs reste réservé au sol. La racine médicinale exige toujours Plantes 8 pour commencer son semis.
Les quatre cases du bac forment une zone liée ; semis, récolte et transport utilisent les plantes et travaux physiques ordinaires.
Sous toit, couvrir les cultures par une lampe horticole ; garder une température adaptée et du courant pour les pompes pendant la nuit.
Les plantes suivent leur croissance et repos habituels ; la fertilité élevée n’est pas un rendement multiplicateur identique pour toutes les espèces.

## Coupure et récupération

Sans alimentation, aucun nouveau semis n’est autorisé et chaque plante du bac perd **1 PV toutes les 25 ticks locaux**, selon la phase stable du bac.
La coupure ne tue pas instantanément et ne met pas la fertilité à zéro ; les plantes présentes conservent leurs autres règles de croissance et de dégâts.
Rétablir le courant arrête les futurs dégâts de pompe, sans effacer ceux déjà subis. Une plante détruite ne donne aucune récolte.
Retirer ou détruire le bac détruit ses plantes : elles ne deviennent pas automatiquement des cultures de sol.
L’inspection du bac et des plantes distingue alimentation, fertilité, semis suspendus et dépérissement ; le modèle bas porte les plantes réelles à 0,30 m.

## Référence Core et adaptations

Source primaire locale : Core **1.6.4871 rev590**, définitions `Buildings_Production.xml/HydroponicsBasin`, `ResearchProjects_2_Electricity.xml/Hydroponics` et tags `Hydroponic` des plantes cultivées.
Lecture ILSpy ciblée de `Building_PlantGrower`, `FertilityGrid`, `TickList`, `DamageWorker` et `WorkGiver_GrowerSow` ; aucun code ou graphisme propriétaire copié.
Core applique 1 PV Rotting par `TickRare` de 250 ticks, bloque les semis sans courant, garde la fertilité de l’édifice et détruit ses plantes au retrait hors remplacement explicite.
L’horloge locale adapte cette cadence à 25 ticks et ses IDs à une phase stable ; les cultures existantes, le maillage de zones et le rendu procédural sont les adaptations locales.
La [serre électrique V189](../development/greenhouse-v189.md) reste le socle commun pour lumière, chauffage et cultures sous toit.

## Validation

94 cas uniques dans 20 fichiers passent par reprises ciblées, dont 41 nouveaux cas : construction avec livraison réelle, semis sur sol pavé, récolte déposée hors bac, quatre rotations, courant/lumière/température, interruption conservative, destruction et déconstruction, refus atomiques et sauvegarde/reprise exacte. Les 62 sauvegardes publiques sont décompressées, migrées et validées ; aucun fichier public modifié.

Le parcours WebGPU privé passe en 20,124 s : inspection et choix pomme de terre puis riz au tick 2000, récolte physique de quatre riz explicitement préparés mûrs pour 24 unités au tick 2104, quatre nouveaux semis puis sauvegarde/rechargement exacts au tick 2187. Aucune erreur navigateur ; port 5297 et navigateur possédés fermés. Captures et rapport : `tmp/hydroponics-v268-native-YyFPDd`. La construction est jouée par les tests de simulation ; le parcours graphique prépare le bâtiment, la recherche et la maturité initiale. Il ne démontre ni saison complète, ni campagne, ni gain FPS.

Typage final et build passent, ainsi que les liens documentaires. Les premiers rouges de typage et de fixtures restent dans `tmp/validation-runs`. Le contrôle de destruction a aussi corrigé un défaut commun : ne plus enregistrer une perte de composant nulle lorsque la récupération rend son unique unité, ce qui produisait un registre refusé au rechargement. Les reprises ciblées conservent ce cas sans modifier les règles de restitution.
