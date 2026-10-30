# Captures inutiles de simulation et continuité des précipitations — 297

Ce lot du 30 octobre réduit deux calculs redondants identifiés dans le profil du Worker et rend le centre des précipitations moyennes continu. Il ne clôt pas la fluidité générale : la politique de présentation, les autres effets retenus et la stabilité sous débit variable restent ouverts. La victoire et les six ensembles restent suspendus.

## Ce qui change

Dans `processAnimalRest`, le census des propriétaires physiques de lits ne sert qu’à évaluer une place animale. Il est désormais construit seulement si une structure `animal-sleeping-spot` existe. Les filtres, l’ordre, les classements, la recherche de chemin et les décisions de repos restent littéraux. Aucun appel de repos ni macro n’est supprimé. La fermeture de repos dans wildlife est identique à celle précédant f65 : la fréquence n’est pas modifiée par ce lot.

Cette capture avait aussi pour effet accessoire de rejeter certaines contradictions globales de propriétaires. Sur un World malformé sans place animale, ce contrôle accessoire n’a plus lieu pendant cette décision inutile. Les validateurs de sauvegarde et la capture explicite gardent leurs refus ; aucune égalité générale des exceptions de données invalides n’est revendiquée. Avec une place présente, le refus d’identité contradictoire reste testé.

Dans le propriétaire physique 297, `undefined` signifiait à la fois « pas encore examiné » et « aucun piège ». Le code rescannait donc les structures à chaque Core sans piège. `null` représente maintenant une absence connue. Les barrières macro, commande et impact révoquent cette absence ; la référence et la longueur des structures sont également surveillées. Un mouvement seul ne peut créer un piège. Un propriétaire de pièges présent garde sa file, son refresh, ses contacts et son ordre de tirage.

Ce n’est pas un cache général de World mutable. Un remplacement d’élément ou une conversion de kind à longueur et array constants, hors des barrières Engine, n’est pas un contrat couvert. Les auteurs futurs de mutations doivent respecter les invalidations existantes. Le retour d’un propriétaire externe impose une capture fraîche. Construction et installation aux suffixes macro, commandes et impacts ont été relus, avec revue indépendante conservée.

La primaire locale RimWorld Core1.6.4871rev590, DLL SHA `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`, a été relue pour `Building_Trap.Tick` et `CheckSpring`. Un piège présent traite ses contacts à chaque Tick ; une absence de pièges n’implique aucun Tick de ces objets. Le correctif conserve cette fréquence et ne change aucune probabilité. Aucun code propriétaire n’est intégré.

Enfin, la branche moyenne de `WeatherPrecipitationLayer` gardait centre et opacité à 12 Hz. Elle conserve ses bases billboard à cette cadence, mais calcule centre, recyclage et fade depuis les phases confirmées déjà fournies à chaque image. Les métadonnées statiques remplacent la translation retenue. Pas de nouvelle publication, boucle CPU, passe ou draw ; branches proche et lointaine conservées. Le petit calcul GPU supplémentaire est explicite : aucun coût GPU nul ni gain FPS n’est affirmé.

## Mesure de simulation et conservation

Le profil Worker de diagnostic attribue 87,18 % du poids propre aux modules SIM, contre 1,26 % à l’encodage/projection. Le front confirmé observé après départ y avance d’environ 20,11 ticks locaux/s pour une cible de 36. Ce profil instrumenté ne mesure pas les FPS globaux ni tous les scénarios.

Une seule comparaison W/C/W joue ensuite 600 vrais Core, en vingt blocs de trente, sur trois copies figées du même RAW `af9837a5…`. Il s’agit de branches diagnostiques ; elles ne remplacent jamais la continuation Native. Pas de chauffe invisible, premier bloc froid et tous les adverses conservés. Imports, sauvegardes et validations sont hors fenêtres mesurées.

| Mesure cumulée, ms | W1 | Candidat | W2 |
| --- | ---: | ---: | ---: |
| Wall | 2969,626 | 2190,347 | 2341,567 |
| CPU processus | 4172 | 3234 | 3360 |
| CPU fil | 2953 | 2172 | 2313 |

La réduction observée du candidat est de 6,46–26,24 % en wall, 3,75–22,48 % en CPU processus et 6,10–26,45 % sur le fil. La dérive W1→W2 est importante, environ −21 % en wall ; il serait incorrect d’en faire une estimation causale précise. Des blocs candidats défavorables au second témoin restent conservés, dont le bloc wall2. Aucun bloc n’est défavorable simultanément aux deux témoins sur les métriques relevées.

Les trois Whole finaux sont **strictement identiques à l’octet**, RAW SHA `8ab233c756d9e9519fc11507d4da0e4108c65a0536ad65a616d437e7514fa165`. Les frontières Core, RNG et nextId par bloc concordent, et chaque bras recharge exactement son propre export. Les sources et le stockage sont vérifiés avant et après. Aucun gain de rendu, latence de commande ou fermeture de la dette PERF-V492-X6 n’est déduit de cette comparaison CPU.

## Contrôles fonctionnels et graphiques

Deux redondances ont été reproduites avant correction : capture de lits appelée sans place ; quatorze scans de pièges là où trois barrières suffisent. Le premier compteur de pièges observait par erreur le root au lieu de son view local : cet échec de harnais est conservé. Le test corrigé observe la même autorité et carte physique, sans créer de view ni assouplir les bornes.

Sept contrats privés sont acquis par reprises : absence, présence et attribution de place, refus de données contradictoires avec place, stun valide jusqu’à45Core puis repos au macro50, absence de pièges, construction/retrait réels et contacts payés/RNG avec recharges. Un premier test de stun utilisait une durée invalide20Core et échouait avant Engine ; seule la fixture a été corrigée vers45, sans modification du validateur. Les six cas déjà acquis n’ont pas été rejoués dans cette reprise privée.

Pour la pluie et la neige, la reproduction graphique conserve ses quatorze refus et dix-neuf images. Le lancement original reste FAILED à cause de son transport HMR ; une qualification hors ligne distincte conserve ce statut. Le candidat réutilise exactement le même contrat et réussit les vrais dessins WebGPU : mouvement entre échéances, pause, boucles de chute et de phase, proche, lointain et retrait immédiat. Dix voisins privés sont acquis. Les bases retenues tolèrent une différence de projection subpixel déclarée ; aucune identité exhaustive de tous les rasters n’est promise.

L’intégration produit acquiert **17 PASS, 0 FAIL, 8 cas filtrés**, en 14,139 s ; typage17,315 s et construction Pages CODE3,550 s. Les résultats sont consignés dans `product-lazy-captures-weather-v2/report.json` au checkpoint privé courant. Le public est résolu sans recopie. Les sources produit sont limitées à deux modules SIM et au module de précipitations ; la Timeline privée n’est pas livrée par ce lot. Schéma297, horloges physiques, commandes, sauvegardes et RNG restent inchangés.

Le premier lancement intégré a été interrompu après constat d’un périmètre de collecte trop large, qui incluait les anciennes copies sous tmp. Son rapport reste FAILED et ne fournit aucun résultat utilisé. La reprise inclut quatre fichiers exacts, exclut tmp et impose une limite de durée ; les sources sont restées identiques.

Les reçus et gels se trouvent sous `action-fluency-20261030/whole-animation-audit-20261030` dans le scratch désigné par AGENTS.md : `engine-cost600-author-v1/run`, `engine-cost600-offline-v1`, `lazy-engine-gates-red-v1`, `lazy-trap-red-v2`, `lazy-engine-gates-green-v1`, `lazy-stun45-followup-v1` et les auteurs de chaque patch. Le coût initial ne sera pas rejoué pour sélectionner un résultat favorable.

L’autorité Native demeure **af9837a5…/fbd7c537…/Core110480**, pas le fork8ab233. Les campagnes humaines94de et QA d474 restent intactes. Aucun déploiement n’est effectué par ce commit ; la dernière publication Cloudflare attestée reste V491. Poursuivre exclusivement la fluidité et la stabilité générales.
