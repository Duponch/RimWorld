# Référence incendies, climat et survie du camp

Recherche et relecture du **20 septembre 2026**, Core local **1.6.4871 rev590**, sans extension ni mod. La préparation menée pendant V86 a été transformée en sous-ensemble V87 **livré et validé dans son périmètre**. Le comportement courant est défini dans le [contrat incendies](../development/fires.md). Le calendrier demeure exclusivement dans [ROADMAP](../ROADMAP.md).

## Corpus, sources et niveau de preuve

Le corpus utilisateur a été relu via [reference-adoption](reference-adoption.md) : chapitre 22, frontières des chapitres 7 (météo), 9 (travail), 10 (construction), 13 (santé), 21 (navigation) et 23 (simulation/sauvegarde). **SYS-129 / TEST-129** demandent combustion, propagation, chaleur, dégâts et extinction indépendamment des particules. **STAT-165** distingue inflammabilité de définition et d'instance ; SYS/TEST-127–128 concernent énergie et combustible. CAT-001 n'est pas une table exhaustive de résistances. Les références Odyssey de SYS/TEST-131 ne sont pas transférées automatiquement au Core retenu.

Source primaire déterminante : Defs et classes de l'installation locale, lues sans modification avec ILSpy 8.2.0.7535. DLL `Assembly-CSharp.dll`, SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Les extractions de travail restent dans `tmp/fire-reference/` ; aucun XML propriétaire, code décompilé ou sauvegarde personnelle brute n'est publié.

La recherche Internet précise a confronté les branches locales aux sources suivantes :

- [Fire, wiki](https://rimworldwiki.com/wiki/Fire) et [Flammability, wiki](https://rimworldwiki.com/wiki/Flammability) : leurs avertissements demandent encore une relecture après **1.5.4062**. Ils ne prouvent pas seuls les coefficients ni les appelants de 1.6.4871.
- [Correctif officiel 1.6.4528](https://ludeon.com/blog/2025/07/update-1-6-4528-released/) : correction de l'extinction diagonale de feux sur les murs. Cette frontière a été conservée dans le contact physique.
- [Miroir public Fire.cs](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/RimWorld/Fire.cs) : corroboration de structure seulement ; sa branche `master` ne certifie pas le correctif local.

Les nombres ci-dessous sont arbitrés sur le Core **local daté**, pas sur une assimilation du miroir à la dernière version. Ces lectures ne remplacent pas une observation visuelle exhaustive dans RimWorld. Les inconnues résiduelles sont annoncées comme limites, sans faire passer notre rendu 3D pour la preuve d'une fidélité complète.

## Feu, propagation et auto-inflammation

Sources locales ciblées : `Fire`, `FireUtility`, `Spark`, `GenRadial`, `SteadyEnvironmentEffects`, `PathGrid`, `Thing`. Les temps sont en **ticks Core**, 60 par seconde ; Lisière en avance dix par tick local.

| Règle locale | Valeur vérifiée et décision V87 |
|---|---|
| Taille | Minimum d'une flamme au sol 0,1 ; maximum 1,75. Un attachement à 20 % d'un feu juste supérieur à 0,4 peut être inférieur à 0,1 à sa création. |
| Avancement | Pulse 15 Core ; calcul complexe au hash intervalle 150 Core. Lisière garde ces durées mais phase le cycle complexe depuis la naissance persistée. |
| Croissance | `0,00055 × inflammabilitéMax ×150` par calcul complexe, plafonnée à 1,75 ; absence de combustible à moins de 0,01. |
| Propagation | Taille strictement supérieure à 1 ; intervalle `max(75,150−(taille−1)×40)` ; phase initiale aléatoire, compteur remis à zéro après tentative. Aucun multiplicateur de vent trouvé dans cette branche. |
| Voisins | 80 % sur les huit voisins ; 20 % sur les indices **10…20** du motif manuel. L'index 9, **(+2,0)**, est réellement exclu. V87 préserve cette asymétrie au lieu d'un disque uniforme inventé. |
| Motif lointain | (−2,0), (0,2), (0,−2), (2,1), (2,−1), (−2,1), (−2,−1), (−1,2), (1,2), (−1,−2), (1,−2). Ligne de vue puis braise. |
| Braise | Vitesse 1,5 case/seconde ; échéance `ceil(distance/1,5×60)` ; feu 0,1 à l'impact si le contenu reste compatible. |
| Allumage | Le producteur tire la probabilité ; `TryStartFireIn` vérifie ensuite qu'elle est positive. Pas de second tirage artificiel à l'intérieur du helper. |
| Protection | Un édifice plein peut protéger terrain/contenu sous-jacent ; ce statut n'est pas simplement une inflammabilité nulle. V87 le représente pour murs, portes et climatiseurs, y compris la couche de conduit. |
| Sol construit | Combustion d'un sol inflammable après 7 500 Core dans la classe locale. Différée : nos sols construits ne possèdent pas ce gameplay. |
| Auto-inflammation | `SteadyEnvironmentEffects` vérifie une température **strictement supérieure à 240 °C**, dans une région qui n'utilise pas la température extérieure. Ce résultat corrige l'indication approximative « 235 °C » de la préparation. |
| Échantillonnage chaud | `ceil(aireCarte×0,0006)` cellules par Core ; tirage `inverseLerp(240,1000,temp)×0,7`, puis inflammabilité. Lisière utilise une permutation déterministe de période complète dérivée du tick et de la graine. Aucune recherche de cellules tant qu'aucune région ne dépasse 240 °C. |
| Navigation | Un feu au sol ajoute **1000 Core** de coût perçu sur sa case et **150** sur chacune des huit voisines, cumulatifs. Conversion à l'échelle pondérée de Lisière ; la vitesse physique et l'arête capturée ne changent pas. |

L'ordre exact des permutations et la phase hash de RimWorld ne sont pas reproduits. Notre PRNG privé, les phases, les braises et les pertes sont sauvegardés : contrairement à la remise à zéro de certains compteurs Core au chargement, une restauration Lisière doit poursuivre strictement le même monde.

## Dégâts, chaleur, pluie et batterie

Sources locales : `Fire.DoComplexCalcs`, `DamageWorker_Flame`, `DamageWorker_Extinguish`, `DamageWorker`, Defs Flame/Burn, `CompExplosive`, `CompPowerBattery` et code de batterie brûlante.

Le montant brut par calcul complexe vaut l'arrondi aléatoire de `clamp(0,0125+0,0036×taille,0,0125,0,05)×150`, minimum 1. La cible est choisie sur la cellule ; une flamme attachée vise son porteur. Le multiplicateur local des dégâts Flame aux bâtiments est **max(0,05,inflammabilité)**. Ce facteur n'est pas appliqué aux personnes et plantes par analogie.

Une personne reçoit une brûlure sur une partie extérieure, armure Heat, pénétration zéro. Un vêtement porté peut aussi subir des dégâts. Le Core local définit Burn sans saignement, douleur moyenne **0,01875/PV**, regroupement autorisé, cicatrice possible et infection **0,30**. La douleur moyenne d'une cicatrice reste **0,00625/PV** : notre noyau médical la représentait déjà, sans nouveau multiplicateur arbitraire. L'inflammabilité des humains et lièvres vaut **0,7**. Pour l'attachement, la courbe par seconde passe par (0;0), (0,1;0,07), (0,3;1), puis vaut 1 ; la probabilité sur une durée est `1−(1−p)^(Core/60)`. **La taille du feu n'est pas l'entrée de cette courbe** : elle décide séparément de l'attachement au-delà de 0,4.

Chaleur : **taille×160** par 150 Core, facteur **0,15** sur une porte. La répartition utilise notre topologie thermique. Précipitations : `RainRate>0,01`, feu vulnérable au toit, puis `Rand.Value<6` dans cette version, donc branche toujours vraie pour [0,1] ; Extinguish 10 retire 0,1. Le symbole ancien 0,04 ne justifie pas une chance de 4 % par calcul. Les SnowGentle/Hard locales ont aussi `rainRate=1` : ne pas soustraire leur neige. La couche physique de neige et sa fonte restent distinctes et absentes.

Batterie : sur dommage Flame, si elle survit, sans mèche active, tirage **<0,05** et énergie **>500 Wd**, elle amorce une mèche de **70 inclus à 150 exclus Core**. Le demi-quantum au-dessus de 500 Wd compte réellement. Extinction ou décharge ultérieure ne désamorcent pas cette mèche. Son terme provoque une explosion Flame sur une cellule aléatoire de l'emprise, rayon `Rand.Range(0,5;1)×3`, puis `DrawPower(400 Wd)` borné à l'énergie restante. V87 implémente cette cause avec un impact Flame borné et un registre d'énergie ; ce n'est pas un système général d'explosions ni le court-circuit de pluie.

## Profils retenus du catalogue Lisière

Lecture de l'héritage des Defs, stats de matière et `leaveResourcesWhenKilled`. Ce tableau couvre les objets existants, pas le catalogue entier du Core. Les ateliers gratuits au sol n'acquièrent pas des PV ou une inflammabilité fictifs.

| Famille | PV de définition | Inflammabilité de définition | Restes à la destruction |
|---|---:|---:|---|
| Mur / porte | 300 / 160 | 1 | Non |
| Lit | 140 | 1 | Oui |
| Table, tabouret, piquet | 75 | 1 | Oui |
| Feu de camp / refroidisseur passif | 80 | 0 / 1 | Non |
| Tables boucherie/pierre/couture, cuisinières bois/électrique | 180 | 1 | Oui |
| Bureau de recherche simple | 250 | 1 | Oui |
| Générateur à bois | 300 | 1 | Oui |
| Lampe | 50 | 1 | Non |
| Climatiseur / batterie | 100 | 0,7 / 1 | Oui |
| Conduit / interrupteur | 80 / 120 | 0,7 / 0,5 | Non |
| Panneau solaire | 300 | 0,7 | Oui |
| Radiateur / éolienne | 100 / 150 | 0,5 | Oui |

Le facteur matière s'applique aux bâtiments réellement fabriqués en matériau variable. Bois : PV×0,65, inflammabilité×1 ; acier : PV×1, inflammabilité×0,4 ; pierres : inflammabilité zéro, PV×1,7 granite, ×1,55 calcaire, ×1,2 marbre, ×1,4 grès, ×1,3 ardoise. Un appareil électrique à profil fixe n'hérite pas arbitrairement de l'inflammabilité « acier ».

Plantes : arbres **200 PV / 0,8**, baies **120 / 1**, riz/pommes de terre/coton **85 / 1**, maïs **150 / 1**. Les dégâts végétaux de gel/âge/obscurité partagent ces PV avec le feu, sans double perte ni récolte à la mort.

Piles : bois 150 PV/1, tissu 80/1,2, cuir léger 60/1, composants 70/0,6, matières alimentaires crues 60/1, repas 50/1, médicaments 60 (herbal 1,3, autres 0,7), armes 100/0,5. Les vêtements réutilisent leurs PV physiques ; le gilet pare-balles a une inflammabilité **0,6**, non 0,4. Un ouvrage inachevé a 50 PV et l'inflammabilité nulle par défaut, sans transmission inventée depuis ses ingrédients. `ThingDefGenerator_Corpses` copie les PV de la personne/espèce ; le profil de dépouille actuellement disponible est **100 PV / 0,7**. Acier/pierre non combustibles ne reçoivent pas de destruction incendiaire fictive.

Les piles entières sont détruites à zéro PV ; séparation copie les PV, fusion moyenne les PV restants par quantité avec arrondi au plafond. Aucune unité alimentaire fraîche ne remplace une pile endommagée.

**Restes : divergence décidée explicitement.** Lisière conserve la restitution transactionnelle existante d'un quart de recette en matières brutes, pour les familles qui laissent des ressources. Cela inclut de l'acier brut à la place des scories Core ; le lot n'ajoute pas de slag. Les autres matériaux perdus vont au registre net de destruction. La déconstruction reste une autre opération.

## Travail, panique et adaptations

Sources : WorkTypes/WorkGivers, `WorkGiver_FightFires`, `JobDriver_BeatFire`, `Verb_BeatFire`, `Pawn_NativeVerbs`, `VerbDefsHardcodedNative`, fournisseurs de menu, `BurningResponse`, `JobGiver_RunRandom`, `JobGiver_ExtinguishSelf` et `JobGiver_JumpInWater`.

Firefighter a la priorité naturelle **1400**, avant Patient **1350**. Ce sont des rangs Core de familles, pas les priorités manuelles 1…4. V87 le place avant Patient à priorité manuelle égale et compare les tâches disponibles/engagées, sans bloquer l'extinction à cause d'une profession plus prioritaire mais inactive.

Le travail autonome vise le foyer avec accès au contact et danger Deadly, sans eau prélevée ni XP. Le coup nominal 32 Extinguish retire **0,32** ; portée 1,42, échauffement zéro, cooldown **66 Core**, pas au tick de naissance. Lisière sert la fin de ce cooldown à la frontière suivante de dix Core : **70 Core effectifs minimum**. Cette différence est déclarée, sans modifier silencieusement tous les temps d'animation.

Le Core accepte plusieurs pompiers au contact mais limite les trajets redondants : au-delà de quinze cases si non réservable, et premier réservant proche de cinq cases hors ordre forcé. Il traite opportunément le feu de sa case et de la prochaine case du trajet. V87 conserve le contact partagé et évite les réservations lointaines redondantes ; la coopération fine et l'opportunisme de trajet restent partiels.

Le menu local actuel possède une voie directe dédiée, même si l'ancien WorkGiver n'est pas `directOrderable`. Elle peut sortir du foyer, traiter plusieurs cibles successives et borne le travail à 600 secondes. V87 propose un ordre physique sur **une cible**, civil ou mobilisé. Pour un humain allié/hébergé brûlant, le secours automatique hors foyer est limité à **15 cases Manhattan** ; le captif conserve son statut. Le mobilisé n'acquiert pas un parcours autonome lointain par le seul réflexe de contact.

Dans la réaction Core, l'utilisateur d'outils cherche d'abord de l'eau extinctrice ; sinon tirage 0,1 d'auto-extinction, ou course aléatoire. Auto-extinction **150 Core** ; décision après le trajet et l'attente courte, pas 10 % par tick de course. V87 préserve le temps d'auto-extinction et une réaction physique partagée humain/lièvre, avec route bornée rayon sept et attente de 5…10 Core servie aux frontières locales. Le choix exact des destinations et le scheduler général du ThinkTree ne sont pas reproduits. Le plongeon est différé puisque notre eau n'est pas praticable. L'incapacité prime ; un corps incapable ne gagne pas une auto-extinction instantanée.

## Météo et départ naturel

Sources : `WeatherDecider`, `FireWatcher`, `WeatherEvent_LightningStrike`, Defs de météo. Le propriétaire météo a intégré ses paramètres et ses transitions ; le feu consomme cette API, sans second calendrier.

FireWatcher réévalue tous les **426 Core** la somme `0,5+taille`. Si elle dépasse **90**, la météo considérée voit sa durée réduite au quart et le poids des météos `rainRate>0,1` multiplié par **15** ; restrictions et tirage restent présents. Il n'existe pas une pluie salvatrice garantie après un délai fixe.

Les météos défavorables sont écartées avant huit jours depuis l'installation. Les orages sec/pluvieux vérifiés admettent 0…999 °C, durée 15 000…40 000 Core, et leurs événements flash/frappe ont chacun un intervalle moyen de 1 200 Core **conditionnel à l'orage**. Cela ne décrit pas leur fréquence annuelle. La frappe choisit une case praticable sans toit et applique Flame de rayon 1,9, avec la condition locale de brouillard de guerre. Notre absence de brouillard constitue une limite distincte. Le timestamp d'émission est passé aux feux et mèches ; la réaction corporelle demeure engagée à la frontière locale, au plus neuf Core plus tard.

## Conservation, validation et limites restantes

Le registre des pertes sépare objets brûlés, nombres de plantes, combustible d'appareils retirés, énergie et pertes nettes de recette. **`woodPotentialLost`** compte uniquement `resource.amount` des arbres détruits par le feu : potentiel disparu, pas une pile produite. Les autres rendements futurs ne deviennent pas des stocks pour équilibrer artificiellement un bilan.

La destruction retire source/service/destination et libère les réservations concernées. Les cargaisons survivantes gardent leur identité et trouvent un dépôt physique ou restent portées. Les supports et captures thermiques sont invalidés après mutation. Schéma 86 strict avant migration neutre 87 ; phases, identités, PRNG, mèches, feu attaché et cooldown font partie de la continuation.

La validation commune distingue **traversée saisonnière naturelle depuis le camp V86 réel** et **branche d'incendie contrôlé** issue de sa copie. La première n'exige pas tous les événements rares ; la seconde garde checkpoint pré-feu, provenance et bilans propres. Les contrats courts regroupent extérieur/intérieur, matériaux, dégâts, pluie, contact, brûlure, batterie, sauvegarde et refus transactionnel. Les bancs mixtes CPU/worker/rendu sont successifs, après gel ; un résultat non encore mesuré n'est pas annoncé comme acquis.

Limites explicites : frames/plans sans dégâts, sols construits combustibles absents, cadavres humains retenus non détruits, extinction vétérinaire absente, aucune suffocation/fumée fonctionnelle, hygiène/cendres, mousse, pyromanie, armes incendiaires, gaz, court-circuit ou moteur général d'explosion. Les collisions de propagation et l'impact Flame borné sont des adaptations 3D ; ils ne prouvent pas tous les cas d'un moteur Core. Aucun plafond de temps de test ne justifie d'accélérer les saisons, la croissance, les décisions météo ou les incendies.
