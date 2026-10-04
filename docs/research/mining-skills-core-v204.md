# Minage : compétence, cadence et rendement — cadrage V204

Relevé du **4 octobre 2026**, Core seul **1.6.4871 rev590**. Installation en lecture seule `E:/Steam/steamapps/common/RimWorld`, `Version.txt` relu ; SHA-256 `Assembly-CSharp.dll` : `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. ILSpyCmd8.2.0.7535 ; aucune source propriétaire incorporée.

Socle relu : [compétences](../development/skills.md), [minage](../development/mining.md), [acier](../development/steel.md), [lumière](../development/light-work.md), [recherche](mining-reference.md), [preuve V28](../history/validation-v28-mining-shadows.md), [industrie](industry-core-v123.md). Corpus HTML chap13/XLSX **SYS/TEST-085** : niveau, XP, passion et capacités distincts, interruption/revalidation ; chap10/11 **SYS/TEST-051..064** : matière, réservations, propriété. **Adopter** ces séparations ; **adapter** cadence/profils ; **différer** biographies. Aucun identifiant clos globalement.

## Statistiques Core vérifiées

`Stats_Pawns_WorkGeneral.xml`, `StatWorker`, `PawnCapacityFactor`, `SkillNeed_BaseBonus`. Adulte sans autre modificateur, niveau L, manipulation M, vue V, vitesse globale G :

- **MiningSpeed** = `max(.1, G × (.04 + .12L) × M × (.5 + .5min(1,V)))`. Manipulation n'est pas plafonnée à 1 ; vue l'est. À corps sain/G=1 : L0=.1 après plancher, L4=.52, L8=1, L20=2.44. Corps M=.5/V=.5, L8 : .375 ; dans le noir G=.8 : .3. Le plancher vient après G/capacités, donc L0 dans le noir reste .1.
- **MiningYield** = `clamp(0,1.25, Y[L] × (.7+.3min(1,M)) × (.8+.2min(1,V)))`. Les deux capacités sont plafonnées à 1, poids .3/.2 ; aucune lumière/vitesse globale dans ce rendement. M=.5/V=.5, L8 : .765. Capacités nulles seules ne donnent pas rendement zéro ; l'admissibilité à travailler est une autre règle.
- Tableau Y, niveaux **0 à 20** : `.60,.70,.80,.85,.90,.925,.95,.975,1,1.01,1.02,1.03,1.04,1.05,1.06,1.07,1.08,1.09,1.10,1.12,1.13`. Ne pas copier le tableau de récolte Plantes, différent.
- **WorkSpeedGlobal** : base1, minimum .3 ; composante lumineuse adulte Core .8 à zéro, interpolation vers1 à luminosité .30. Traits/états/autres facteurs peuvent intervenir. Le facteur lumineux local existant représente cette composante, pas tout G.

## Cadence et apprentissage

`JobDriver_Mine` réserve puis rejoint la cible en Touch. **100 ticks Core / MiningSpeed**, division float32 puis `Math.Round` vers l'entier pair ; vitesse NPC au moins .6 après calcul du stat. Le coup naturel vaut **80**, les autres cibles40. `RockBase.isNaturalRock=true` est hérité par **acier, machines compactées, or, plastacier** : leur coup80 actuel est exact, pas une adaptation de40. À L8 sain : acier/or1500PV =19 coups/1900Core ; machines2000=25/2500 ; plastacier8000=100/10000. Pas de `WorkToMine` trouvé dans les Defs locales : les PV et la cadence gouvernent ces durées.

L'action donne **.07 XP de base/tick Core** ×delta si faction cible≠acteur ou acteur sans faction ; les roches naturelles y satisfont. Premier tick : capture cadence **avant Learn**, puis XP, décrément/coup ; après coup non final : nouvelle cadence **après Learn/dégâts**. Rendement du coup après Learn. Aucune XP de trajet/réservation ; interruption conserve les gains. `Toils_General` ne produit pas cette XP ; aucun `Toils_Mine` dans l'assembly courant.

`SkillRecord` : passion .35/1/1.5, saturation strictement>4000XP puis ×.2, apprentissage global, niveaux0..20, réserve29999XP, dette−1000 avant descente et oubli. Réutiliser le système local.

## Rendement pondéré et tirages

`Mineable.yieldPct` est sauvegardé. Sur chaque coup minier humain d'une cible **wasteable**, il ajoute `min(dégâts,PV avant coup)/MaxPV × MiningYield(mineur)`. La finale prend exactement les PV restants, pas80 : acier1500 après18coups reste60. Deux opérateurs ou une capacité changée contribuent chacun à leur portion ; annulation ne remet pas ce cumul à zéro. Les dégâts externes ne doivent pas être crédités au mineur final.

`BuildingProperties` : défaut **mineableYieldWasteable=true**, **mineableDropChance=1**. `Buildings_Natural.xml` fixe acier/or/plastacier40 et machines2. `EffectiveMineableYield` arrondit vers l'entier pair `baseYield × difficulty.mineYieldFactor` ; **Récit d'aventure/Medium=1**. Ensuite : tirage de drop, base effective au moins1, si wasteable arrondi stochastique de `base × yieldPct`, produit final au moins1. Un rendement nul produit donc encore1 lorsqu'un drop est accepté. Machines à L0 sain :1 ou2, probabilité20% pour2 ; L20 :2 ou3, probabilité26% pour3 (calculs idéaux, hors écarts float32). Miner tout l'acier à L0 donne24 ; L8 donne40.

`Various_Stone.xml` : les cinq pierres héritent `UglyRockBase.mineableYieldWasteable=false`, drop.25 et base1. Elles donnent un fragment ou rien ; MiningYield n'augmente ni cette chance ni la quantité. Vitesse et XP miniers restent applicables.

Ordre RNG numérique Core : sur coup non final wasteable, `PreApplyDamage` appelle `RoundRandom(dégâts)` même pour80 entiers, puis contribution ; à la finale, contribution directe, puis drop `Rand.Value > chance` (égalité acceptée), puis `RoundRandom` wasteable. `RoundRandom(f)` = entier tronqué +1 si `Rand.Value < f%1` : **tirage même si fraction zéro**. Les effets graphiques/jobs peuvent aussi tirer : ce relevé ne prétend pas fournir le flux global Core complet.

## Adaptations V204 et frontières

**Adapter** dix Core par tick local, XP700 milli au contact. L'appel groupé passions/saturation n'équivaut pas à dix appels autour d'un seuil. Préserver coup capturé/reliquat ; incapable, trajet et attente sans travail ne produisent pas XP malgré le plancher stat.

Profil historique absent = lecture **8/sans passion/XP0**, créé seulement à la première pratique ; niveaux des nouveaux profils explicitement choisis, sans fausse biographie. **Valider strictement185 avant186** : rejeter ses champs futurs, conserver absence, routes, IDs, piles et PRNG. Pour minerai ancien déjà endommagé sans cumul, la portion passée vaut rendement neutre1 (`miningDamage/MaxPV`) ; cette interprétation ne fabrique ni XP ni tirage et n'exige pas d'insérer un champ au chargement.

Cumul prospectif facultatif sur la roche, indépendant du job : fraction finie positive bornée par `1.25 × miningDamage/MaxPV`, avec tolérance bornée. **Adapter** les float32 Core en doubles normalisés à15décimales ; avant arrondi du produit, stabiliser l'entier proche à moins de1e−12. Cela conserve le rendement neutre exact ; aucune identité numérique Core revendiquée. Valider type minerai/dégâts/plafond. Absence ne vaut pas zéro après dommages anciens. Retirer cumul/dégâts/ore ensemble à l'extraction.

**Adapter** le flux local : conserver l'unique tirage final historique, servant au drop fragment ou à l'arrondi minerai même entier ; précontrôle atomique avant engagement. Pas de tirages inutiles Core à chaque80 ni identité de flux Core annoncée. Refus conserve minerai/cumul/matière/IDs/RNG ; aucun second tirage après engagement. Snapshots confirmés, sans lecture métier par image.

**Différer** dégâts externes, lissage, forage, autres minerais, difficulté configurable, biographies, vitesse globale exhaustive, DLC/NPC mineurs. Aucun coût CPU/GPU ni campagne naturelle prouvé.

## Sources Internet relues

[Présentation officielle](https://rimworldgame.com/) : parcours/capacités, sans chiffres. [Note1.6.4566](https://ludeon.com/blog/2025/08/update-1-6-4566-improves-gravships-shuttles-and-more/) : charges minières, hors lot. [Traduction Ludeon](https://github.com/Ludeon/RimWorld-sk/blob/master/DefInjected/StatDef/Stats_Pawns_WorkGeneral.xml) : descriptions, pas facteurs. Recherche précise minage/vitesse/rendement1.6 : aucune page officielle trouvée ne certifie les chiffres courants ; XML/IL4871 priment sur wiki/miroirs historiques. Consultation4octobre2026.
