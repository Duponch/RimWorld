# Orage sec localisé — V184

Première extension du danger environnemental de Cassandra, schéma **173** après validation stricte de 172 et migration neutre. La [recherche Core](../research/flashstorm-core-v184.md) distingue cet incident `Flashstorm` des orages météo ordinaires. Le joueur protège le foyer par les zones, la priorité Extinction, les déplacements et les soins existants ; aucune nouvelle recette ni extinction à distance.

## Calendrier et conséquences

Le ticket **0,4** de Flashstorm devient jouable dans l'enveloppe Misc V180 de **16,9** : chaleur 1, Flashstorm 0,4, autres contenus **15,5 silencieux**. Les occasions, introduction, bornes et PRNG Misc restent ceux de V180 ; un refus ne transfère aucun poids. Ce dénominateur fixe est une adaptation locale, pas la distribution contextuelle Core. Atterrissage/Cassandra, météo adoptée, carte de plus de seize cases dans chaque dimension, aucune condition Flashstorm active et **quinze jours depuis le dernier début** sont requis. Aucun seuil saisonnier ; les profils de difficulté supplémentaires restent absents.

La durée est arrondie à **4 500–6 000 Core**, avec expiration strictement après la borne : `endCore` est persisté et la fin est servie à la première frontière locale supérieure, soit **451–601 ticks locaux**. Le dernier pas traite encore les Core admissibles avant cette fin. Centre dans la marge de huit cases, rayon **45 à 60 cases**, jusqu'à dix centres examinés pour trouver au moins la moitié du disque praticable et sans toit ; le dernier centre subsiste si tous échouent. Les arbres et rochers bloquent la cellule comme dans la foudre ordinaire. Le premier essai est au Core suivant l'activation ; après succès, échéance stockée à **320–800 Core**, nouvel essai strictement après, soit **321–801 Core** plus tard. Un essai invalide garde l'échéance et réessaie au Core suivant, sans téléportation vers une autre région ni recherche globale de repli.

Chaque frappe admissible réutilise `igniteLightning` : impact Flame de rayon 1,9, allumage conditionnel, dégâts et pertes physiques. Une frappe n'est pas une garantie d'incendie. Feux, pluie sortante, toiture, extinction au contact, blessés et réparations suivent leurs contrats existants. Les frappes de l'orage météo ordinaire continuent indépendamment.

## Pluie et présentation

Flashstorm n'impose **aucun type météo**. Pendant la condition, les futures sélections avec rainRate >0,1 sont écartées ; si la météo courante dépasse ce seuil à l'activation, elle sélectionne la suivante. La transition de 4 000 Core conserve sa pluie sortante et peut encore éteindre les feux. Après la fin servie à la frontière locale, le même filtre subsiste **3 000 ticks locaux**, sans effacer instantanément une météo existante ; cette desserte peut retarder la borne Core de neuf Core au plus.

Une lettre décrit la menace et les réponses ; fin de l'orage et fin des incendies sont distinctes. Les feux utilisent leur lot GPU existant et la dernière frappe confirmée la voie de tonnerre existante. Pas de flash ni de mesh d'éclair ajouté. Plusieurs frappes ordinaires entre captures peuvent toujours être agrégées en un son ; V184 ne prétend pas résoudre cette limite de présentation.

## État et validation

`World.flashstorm` est optionnel et n'apparaît qu'au premier incident futur. Compteur, dernier début/fin, PRNG privé et phase active (centre, rayon, borne `endCore`, horloge Core, échéance et frappes) sont persistés. Le seed de chaque incident vient d'un tirage Misc engagé seulement après admissibilité ; les choix internes ne prélèvent ni RNG du monde, ni RNG météo, ni RNG feu. Le changement de météo demandé utilise ensuite son propre RNG, et les conséquences physiques le RNG feu ordinaire. Migration 172→173 sans condition, tirage ou dommage rétroactif. Formes et liens sont contrôlés avant migration et avant adoption d'un snapshot/delta : frappes locales incluses dans le compteur météo, majorant météo augmenté uniquement de ces frappes réellement conservées, historique antérieur borné par les orages terminés. Le majorant de 172 reste strictement inchangé.

Dans un pas local de dix Core, le lot météo ordinaire est servi avant celui de la condition localisée. La coexistence est réelle, mais ce regroupement ne reproduit pas un entrelacement Core exact de leurs conséquences. Le registre de dernière frappe suit l'ordre de ces lots et peut agréger plusieurs sons ; il n'est pas un journal exhaustif de chaque éclair.

Pas de scan entre échéances ; une capture spatiale par lot synchrone d'essais, abandonnée après mutation. Le centre est recherché seulement au démarrage, les cellules seulement lorsqu'une frappe est due. Mesurer séparément attente, sélection et conséquences physiques sur 250² ; pas de coût GPU nul ou de gain de FPS promis.

Scène préparée « Orage sec et incendies » : occasion Misc réellement résolue après chargement, état initial prospectif sans frappe ni feu précréés. Contrôles de cooldown/borne, refus et tirages, pluie sortante et filtre après fin, toit/carte fermée, dégâts/bilans/extinction physique, reprise stricte et UI native. Campagnes longues et distribution exhaustive du narrateur restent hors preuve.
