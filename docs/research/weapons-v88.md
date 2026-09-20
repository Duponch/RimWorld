# Fusil à verrou et couteau en plastacier — V88

État : intégration V88 validée dans le périmètre des [preuves](../history/validation-trade-v88.md). Ces deux armes étendent l'équipement physique, la chasse, le tir et la mêlée existants. Elles ne livrent ni la fabrication des armes, ni tout le catalogue, ni une nouvelle composition de raids.

## Sources et décision

Corpus utilisateur, chapitres 20/21, **SYS/TEST-113..117**, complétés par l'anatomie et la santé des chapitres 8/9 et 15 ; lecture via [reference-adoption](reference-adoption.md). Adopter armes distinctes, portée, préparation/récupération, projectile indépendant, matière, qualité et conséquences anatomiques. Adapter représentation 3D, PRNG et choix des gestes sous la limite expliquée ci-dessous. Différer fabrication, munitions spéciales, autres matériaux et catalogue complet.

Lecture ciblée le 20 septembre 2026 de **Core 1.6.4871 rev590**, installé dans `E:/Steam/steamapps/common/RimWorld`, sans modification. Provenances : définitions `RangedIndustrial`, `MeleeNeolithic`, `Items_Resource_Stuff`, `Damages_MeleeWeapon`, `Hediffs_Local_Injuries` et classes installées `VerbProperties`, `DamageWorker_Cut`, `DamageWorker_Stab`, `Verb_MeleeAttackDamage`. Les coefficients ci-dessous sont des relevés de cette révision, sans publication des fichiers propriétaires.

La recherche publique fraîche recoupe les questions avec les pages [Bolt-action rifle](https://rimworldwiki.com/wiki/Bolt-action_rifle) et [Knife](https://rimworldwiki.com/wiki/Knife), puis revient aux définitions locales pour les valeurs retenues. Le DPS synthétique d'une fiche communautaire peut décrire un autre état du choix des gestes ; il n'est pas transplanté. La source primaire [Beta 19, Ludeon, 28 août 2018](https://ludeon.com/blog/2018/08/rimworld-beta-19-released/) décrit la pénétration, l'atténuation des dégâts tranchants et le pouvoir d'arrêt : elle fournit un historique, pas la preuve numérique du correctif 1.6.4871. Les [références du revolver](ranged-statistics-reference.md) et de la [mêlée](melee-reference.md) restent identifiées séparément.

## Fusil à verrou

Profil normal : **18 dégâts**, **27 % de pénétration**, portée **36,9 cases**, précision de l'arme **65/80/90/80 %** aux quatre points usuels, préparation **102 ticks Core**, récupération **90**, vitesse du projectile **0,7 case/Core**, pouvoir d'arrêt **1,5**. Ces précisions ne sont pas une probabilité finale de toucher : compétence, capacités, distance, couvert, météo et interception participent au résultat.

Qualité : mêmes facteurs de précision/dégâts/pénétration que les armes à feu déjà modélisées. Le fusil a **100 PV**. Ses trois gestes de mêlée partagent les dégâts de base **9** et la récupération **120 Core** du revolver. Il utilise les mêmes ordres d'équipement et de tir, les postes tactiques et la chasse ; aucun second algorithme de projectile ou stock de munitions fictif.

Le sous-pas reste dix ticks Core par tick local. La cadence sans interruption du fusil est 102, 294, 486… depuis l'origine, sans arrondir 10,2 ticks locaux à 11. Le projectile et la posture persistent leur profil ; une arme déplacée ou perdue après émission ne transforme pas le vol en balle de revolver. Les anciennes formes sans champ de profil continuent de désigner le revolver.

## Couteau et anatomie

Le couteau livré est explicitement **en plastacier** : **280 PV** (base 100 ×2,8), inflammabilité 0. Les outils normaux sont :

| Geste | Dégâts avant variation de frappe | Nature | Récupération Core | Pénétration |
| --- | ---: | --- | ---: | ---: |
| Manche | 8,1 | Contondant | 96 | 12,15 % |
| Lame | 13,2 | Coupure | 72 | 19,8 % |
| Pointe | 14,3 | Perforation | 96 | 21,45 % |

Les facteurs de plastacier sont ×0,9 contondant, ×1,1 tranchant et ×0,8 délai ; la qualité de mêlée multiplie ensuite les dégâts. Une lame ne tire pas et ne permet pas de lancer la chasse à distance. Elle conserve les mêmes engagements, arêtes, incapacités et récupération après annulation que la mêlée existante.

`Cut` peut répartir les dégâts entre parties anatomiques voisines, **pas entre plusieurs personnes**. Le nombre supplémentaire suit la courbe 0→0,0,6→1,0,9→2,1→3 avec arrondi probabiliste ; la répartition emploie le bonus 1,4. Sans partie supplémentaire, la préservation extérieure emploie l'intervalle d'excès 0..0,1. `Stab` choisit une partie extérieure puis peut forcer une partie interne avec probabilité 0,6, distincte des 0,4 de `Poke`. Sa propagation et sa préservation suivent le worker de perforation. Une protection qui convertit le tranchant change la lésion sans relancer un autre worker. Perforation, coupure et contusion restent distinguées ; soins, saignement et exposition infectieuse réutilisent le noyau médical.

**Limite héritée explicitée rétroactivement :** le classement des gestes de Lisière reste fondé sur dégâts, pénétration et délai, puis catégories 75/25/0. La classe locale actuelle `VerbProperties.AdjustedMeleeSelectionWeight` utilise notamment le carré des dégâts attendus et un facteur 0,3 pour les outils corporels. V88 ne remplace pas silencieusement tout le choix des gestes humains/animaux déjà joué. Elle applique les délais distincts du couteau au classement existant. Les outils et leurs effets sont modélisés, mais leur fréquence relative et donc le DPS moyen ne sont **pas déclarés identiques à Core**. Une correction générale éventuelle demande son propre audit des historiques.

## Conservation, argent et validation

Les objets restent des principales individuelles avec identité, qualité et PV ; aucune transformation en matière à l'équipement. V87 est validée avant migration additive V88 : les nouvelles armes et nouveaux profils de frappe/vol sont refusés dans un fichier prétendant être V87. Une ancienne arme, un tir en vol ou une récupération ne reçoit aucun nouveau profil implicite.

Le commerce utilise la [valeur des objets](trade-reference-v88.md). L'argent a `useHitPoints=false` explicitement dans sa définition et une inflammabilité propre 0 par défaut : le facteur de matière 0,4 ne concerne pas la pile de monnaie. Aucun 100 PV générique ne lui est inventé. Le petit visiteur peut traiter le fusil à verrou mais ne traite pas le couteau : sa sélection d'armes est limitée aux armes à distance.

`tests/weapons-v88.test.ts` rassemble profils et refus, tir réel au-delà de la portée du revolver, préparation/vol/récupération, bridge, continuation après dépôt, frontière 72 Core et résolution anatomique. Les résultats appartiennent à la campagne centrale V88 ; présence de ces assertions ne vaut pas réussite annoncée. Les parcours de commerce, dotation et équipement natif restent leurs scénarios distincts.
