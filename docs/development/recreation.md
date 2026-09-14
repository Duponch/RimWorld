# Loisirs — contrat V15

[Sources, version et écarts](../research/recreation-reference.md) : corpus chapitre 14, SYS-080/TEST-080, STAT-060/061, CAT-050. Le système livré couvre deux activités et leurs interactions ; le catalogue et les attentes complètes restent partiels.

## État et transitions

`Pawn.recreation` conserve niveau 0–100, tolérance et drapeau de lassitude pour `solitary`/`dexterity`, puis une tâche facultative. `recreation-rules.ts` contient les taux, seuils et types ; `recreation-space.ts` distingue place, visibilité et source ; `recreation.ts` sélectionne et exécute. La simulation n'importe ni Three, ni DOM, ni horloge réelle.

La tâche indique activité, source éventuelle, cible, phase `travel`/`active` et durée effective. Elle est exclusive avec travail, portage, cuisine et les autres besoins. Le trajet partage les huit recherches par tick et les arêtes euclidiennes existantes. Chaque décision construit un petit index des obstacles réutilisé pour ses candidats ; les obstacles de végétation conservés concernent seulement les sites de ciel proposés. Aucun cache ne survit à la décision : le colon suivant voit les travaux terminés et les objets modifiés. Arrivée obligatoire, site revérifié avant chaque action, gain uniquement sur place. Une perte d'accès annule l'activité ; une simple réservation ne remplit jamais la jauge. Fatigue/repas passent par les interruptions conservatrices existantes. Les loisirs attendent la fin d'un travail engagé ; changer l'horaire ne téléporte pas.

Libre démarre sous 35, Loisirs sous 95. La tranche Sommeil ne cherche un loisir qu'après le travail disponible et lorsque le sommeil ne prend pas la main. Travail interrompt l'activité à sa prochaine action ; un trajet en cours termine d'abord son arête. Le délai de début de partie est 500 ticks locaux. Une activité terminée repasse par la cadence de besoin de vingt ticks.

L'activité dure au plus 400 ticks effectifs et gagne nominalement 0,144 point/tick, pondéré par `1 - tolérance/100`. La satisfaction est plafonnée avant de calculer les 0,65 point de lassitude par point réellement gagné. Le franchissement strict de 50 marque la famille comme lassante ; seul le passage strict sous 30 efface ce drapeau. Entre ces bornes, le drapeau sauvegardé fait autorité. La lassitude perd 18/6 000 par tick éveillé dans le profil provisoire de camp.

La baisse ordinaire est 60/6 000 point/tick, facteur 0,7 de 15 à moins de 30, 0,4 de 1 à moins de 15, et 1 sous 1. Aucune baisse en sommeil ou pendant l'activité effective. L'intégration se fait au tick local ; les durées/arrondis ne prétendent pas reproduire les intervalles du moteur Core. La satisfaction apporte −20/−10/−5/0/+5/+10 selon les seuils 1/15/30/70/85 à l'agrégat d'humeur encore provisoire.

## Places et propriétés

`horseshoes` est une construction de dix bois, sept ticks de travail, empreinte 1×1 non solide. Trois utilisateurs au maximum, douze places potentielles à cinq cellules : chaque place est réservée via `serviceCell`, comme une place de repas ou de cuisine. Un passant civil ne prend aucun droit d'utilisation. Une famille dextérité reste unique quel que soit le nombre de piquets. L'aperçu jaune/rouge indique seulement emplacement praticable et visibilité ; il ne promet pas un chemin depuis chaque colon.

Observer le ciel ne réserve aucun bâtiment. Les cases portant un décor/ouvrage sont écartées, puis le trajet vérifie l'accès. Le voisinage échantillonné reste une adaptation provisoire ; pièces, toits et météo ne sont pas simulés par ce filtre. À reconsidérer lors de G2 et de l'extension des loisirs sans bâtiment.

Les modèles sont inclus dans le lot de mobilier existant. Les poses utilisent les attributs GPU actuels : allongé face au ciel, bras de lancer et orientation vers le piquet. Pas de squelette CPU par acteur, ni nouveau travail par image pour simuler le besoin. La trajectoire visible du fer reste absente. L'inspection ajoute satisfaction, effet d'humeur et lassitude par famille ; Horaires et Architecte conservent leur organisation.

## Sauvegardes et preuves

V14 est validé avant migration. Chaque colon reçoit 55 de satisfaction, zéro lassitude et aucune activité rétroactive, sans modifier tâche courante, trajet, RNG, stocks ni horaires. Les nouvelles parties commencent entre 50 et 60 via un échantillon déterministe distinct de la génération de terrain. Les parties chargées adoptent le nouveau besoin aux ticks suivants ; aucune identité future avec V14 n'est promise.

V15 valide bornes, cohérence de lassitude, phase/position/durée, existence du piquet, trois participants et exclusivité des places/services. Une route devenue obstruée reste sauvegardable et sera réévaluée avant tout gain ; une sauvegarde corrompue ne remplace pas l'état en cours. Le besoin et la tâche transitent dans les snapshots comme le reste du colon.

Trois scénarios profonds couvrent calibration/seuils, construction et participation physique concurrente, interruptions/visibilité/rejeu, observation du ciel et migration. Le pilote de colonie construit le piquet et réserve 19–21 h aux loisirs tout en nourrissant/couchant la colonie. Le test UI propre aux loisirs vérifie migration, construction, horaire, inspection et reprise ; la partie de trois jours exerce la progression. Voir [preuves et mesures courantes](validation.md). Les tests établissent notre cohérence, pas une couverture exhaustive de RimWorld.
