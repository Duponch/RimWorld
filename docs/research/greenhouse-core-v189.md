# Serre électrique — recherche Core V189

Recherche du 3 octobre 2026, RimWorld Core **1.6.4871 rev590**. L'installation locale, ses XML Core et l'IL de `Assembly-CSharp.dll` attestent les chiffres ; SHA-256 de l'assemblage : `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Les miroirs publics ci-dessous ont été consultés ce jour : leur branche `master` facilite la lecture sans certifier cette version. Aucune partie Core ni extension n'est exécutée ou copiée.

Le [corpus utilisateur](reference-adoption.md), chapitres 12 et 22, SYS/TEST-070..072/075/127/128, relie cultures, milieu et alimentation. **Adopter** cette interaction, **adapter** son intégration à l'horloge locale, **différer** hydroponie, nouvelles espèces, éclairage coloré photométrique et catalogue exhaustif. Ces identifiants indiquent la provenance, pas une validation locale.

## Lampe et alimentation

`SunLamp` hérite de `LampBase` : une cellule, traversable, minifiable, prérequis Electricity. Son coût est **40 acier**, son travail **330 ticks Core**, ses PV **50**. Le travail neutre local vaut 33 ticks ; l'électricité de base existe déjà, sans nouveau projet accordé. Demande active **2 900 W**, rayon lumineux **14**, couleur logique **370/370/370**, surexposition **7**, aperçu XML de zone agricole **5,8**. La chaleur active vaut **3 unités par seconde Core**, intégrée dans le vrai air local selon le modèle thermique existant.

Les parents et la définition locale donnent aussi masse4,5, coût de passage14 Core (1,4 local), fill0,20, inflammabilité1, arrêt de restitution lors de destruction et blocage du vent. Elle ne possède pas `CompBreakdownable` : la panne d'un générateur peut interrompre son alimentation, mais aucune panne mécanique de lampe n'est ajoutée. `shortCircuitInRain=true` existe dans Core ; les courts-circuits sous pluie restent différés dans le réseau local, explicitement distincts des incendies et des pannes livrés.

L'horaire vérifié est strictement **0,25 < phase civile < 0,8** : arrêt automatique nocturne, distinct de l'interrupteur et du manque de courant. Core le recalcule dans `CompTickRare` ; Lisière utilise ses frontières de ticks confirmés et conserve les démarrages/délestages du réseau. [CompSchedule](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/CompSchedule.cs).

## Diffusion agricole

Le flood démarre à une distance entière **100**, ajoute **100** par cardinal et **141** par diagonale, limite le coût à rayon ×100. Une diagonale est refusée si ses deux voisins cardinaux sont opaques. Les canaux atténués sont tronqués. La surexposition exige une contribution non nulle et une distance alpha tronquée strictement inférieure à 7, donc **coût <700**. Sans obstacle, offset (5,0) reçoit 100 %, (6,0) reste ordinaire, (4,4) reçoit 100 %. Le rayon d'aperçu 5,8 ne constitue pas une règle de croissance. [ComputeGlowGridsJob](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/Verse.Glow/ComputeGlowGridsJob.cs), [GlowGrid](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/Verse/GlowGrid.cs).

Les cultures locales exigent plus de 51 % et atteignent leur taux lumineux plein à 100 %. Une lampe ordinaire plafonnée à 50 % reste insuffisante ; la lampe horticole permet la croissance sous toit seulement dans sa couverture effective, en gardant sol, température et repos. Le contrôle d'obscurité utilise un facteur lumineux >0,001, indépendamment du repos, et commence le dépérissement après 450 000 ticks Core, soit 45 000 locaux. [Plant](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/Plant.cs), [PlantUtility](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/PlantUtility.cs).

## Adaptations et limites

La croissance locale est une requête d'intégrale O(1), plutôt qu'un `TickLong` par plante. L'ancien intervalle `(growthTick,tick]` est soldé avec son régime enregistré, puis le nouvel état lumineux s'applique au futur. L'intégrale pleine garde les bornes inclusives de repos 06:00 et 19:12 de l'agriculture existante ; la commutation électrique garde ses bornes strictes. Cette convention peut déplacer une unité d'intégration par rapport au recalcul rare Core, sans croissance inventée après coupure ou reprise.

La représentation 3D conserve son champ graphique plafonné à 50 %, séparé du niveau métier 100 % ; aucun éclairage Three individuel ni photométrie nouvelle. Les murs, roches et portes gardent les obstacles lumineux locaux, y compris porte ouverte. La chaleur continue suit l'adaptation thermique locale et ne constitue pas une reproduction bit à bit de Unity. La serre est une pièce construite sur le sol agricole existant, sans bac hydroponique ni sol fertile créé.
