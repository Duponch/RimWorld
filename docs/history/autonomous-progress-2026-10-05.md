# Développement autonome — 5 octobre 2026

Suivi de la consigne utilisateur : terminer les corrections vérifiées de l’audit, puis enchaîner des boucles prioritaires et des commits locaux jusqu’au retour annoncé ou à une pause. Aucun push. Ce suivi complète l’[appréciation du rapport externe](analysis-external-agent-2026-10-04.md) ; il ne transforme pas les jalons G0–G5 en pourcentages de parité.

## Travail livré

| Lot | Résultat concret | Commit local | Preuve et limites |
| --- | --- | --- | --- |
| V209 | Consolidation des transitions, réservations, archives, incidents worker, sauvegarde IndexedDB, ressources graphiques et contrôles. | `3ed9ce73` | [Consolidation](validation-consolidation-v209.md). Les gros points d’entrée, l’isolation des responsabilités, les campagnes longues et la performance globale restent ouverts. |
| V210 | Passé prospectif : enfance et activité adulte, compétences, passions et incapacités de travail appliquées aux producteurs existants. Aucune biographie inventée pour les anciens colons. | `bd27b279` | [Passé](validation-colonist-backgrounds-v210.md). Catalogue original borné ; famille et romance absentes. |
| V211 | Trois crises distinctes : destruction physique de bâtiments, fureur violente et colère meurtrière à victime stable, avec riposte, dommages et récupération. | `dc01f2fb` | [Crises](validation-mental-crises-v211.md). Catalogue, arrestation et abandon encore incomplets. |
| V212 | Défense automatisée : recherche, chantier, courant, acquisition et tirs, entretien physique en acier, mèche, explosion et refuge sauvegardables. | `012651a7` | [Défense](validation-mini-turret-v212.md). Trois parcours natifs et55nouveaux cas ; autres tourelles/mortiers/EMP, campagnes et performance générale encore ouverts. |
| V213 | Scyther : anatomie mécanique, préparation puis assaut, cibles et impacts physiques communs, carcasse entière puis acier récupéré au poste. | `5d235ce6` | [Menace mécanique](validation-scyther-v213.md). 41 nouveaux cas et trois parcours natifs ; autres mécanoïdes, EMP, fréquences de campagne et performance générale ouverts. |
| V214 | Proches annoncés, couples et ruptures adultes, opinions, chambre commune par lits réels, deuil familial et identités hors carte/archivées. | Commit du lot courant | [Proches et couples](validation-family-v214.md). 31 nouveaux cas, régression générale hors campagnes longues et un parcours matériel composé ; monde, mariage/lits doubles/enfants et performance générale restent ouverts. |

V212 passe dans le périmètre consigné :520fichiers/2370réussis/unignoré par reprises, trois parcours natifs, build et présentation. La55eentrée publique est préparée ; les54fiches antérieures et les empreintes de tous les contenus décodés sont vérifiées. La première menace mécanique est préparée en lecture seule pendant les contrôles ; aucun mécanoïde jouable n’est déduit de cette préparation. La poursuite autonome ouvre ensuite corps mécanique, défense et récupération.

Ces lots répondent aux piliers relevés par l’audit. Ils n’achèvent ni les relations familiales, ni la planète et les caravanes de groupe, ni le catalogue d’incidents. Les opinions, interactions sociales, conflits, deuil, reconnaissance et comptoir existaient avant cet audit : leur profondeur reste à compléter.

## Cadence et coût observable

Les commits V209, V210 et V211 sont respectivement datés de00:11:52,01:24:06 et03:02:27, heure de Paris. Les intervalles sont72min14s et98min21s. Ce sont des intervalles de livraison, pas une mesure de CPU, de rédaction ou de tokens/seconde.

V210 a enregistré environ10min51s de commandes parent ; V211 environ19min13s avant le dernier contrôle documentaire. Les contrôles, corrections de préparation, lectures, intégration et rédaction prennent du temps ; ces sommes ne fournissent pas une attribution exclusive. Aucune vitesse du modèle n’a été mesurée, et aucune promesse de « tout le jeu en quelques lots » n’en découle.

V212 totalise31commandes parent/18min16s au04:54:59Paris, avant la dernière reprise documentaire et le commit. Celui-ci est daté04:56:47Paris, soit114min20s après V211. Le délai depuis V211 dépasse112minutes : l'objectif indicatif90minutes n'est pas tenu. Le contenu regroupe cependant la chaîne de défense et le premier noyau Bomb réutilisable. Les reprises ont corrigé de vraies frontières de route/snapshot et des préparations obsolètes ; séparer ces causes aide à réduire les tentatives suivantes sans supprimer les oracles de conservation.

La méthode regroupe désormais une boucle et ses conséquences, réutilise les producteurs et références, répartit les fichiers entre trois agents et concentre les tests sur conservation, interruptions et reprise. Un défaut révélé par le navigateur est diagnostiqué depuis son état réel ; une préparation doit atteindre la transition attendue dans le producteur de simulation avant un nouvel essai natif long. Les suites générales sont réservées aux frontières transversales. Le rendement se juge aux décisions nouvelles du joueur et à la continuité, pas au nombre de versions ou d’assertions.

## Risques qui restent à traiter

Les gains CPU locaux ne prouvent pas une accélération du jeu complet. La grande carte avec beaucoup d’acteurs reste limitée notamment par faune, navigation/planification et publication. Les campagnes longues ne sont pas toutes validées ; elles doivent conserver un statut distinct des reprises ciblées. L’architecture a des responsabilités mieux isolées sur les nouvelles boucles, mais les gros modules historiques ne sont pas entièrement refondus. La fidélité Core demeure partielle, avec adaptations et contenu absent explicités dans chaque référence.

## V213 livré — Scyther et récupération

Sur `012651a7`, schéma193 vers194 par validation stricte puis numéro seul. Anatomie mécanique, acteur/contrôleur hostile, préparation de raid et récupération physique intégrés en parallèle. [Contrat](../development/scyther-v213.md), [recherche](../research/scyther-core-v213.md), [contrôles](validation-scyther-v213.md). 532 fichiers/2 411 réussis/un ignoré par reprises, trois parcours natifs réussis au premier lancement, build et présentation. La 56e scène est préparée ; 55 payloads et fiches historiques identiques, tous les hashes décodés et reprises vérifiés. Famille/romance et conséquences sur logement/deuil constituent la prochaine boucle préparée, sans résultat jouable déduit de cette préparation.

Au06:16:16Paris, V213 enregistre29commandes parent/13min25s ; le contrôle documentaire final et le commit suivent. La suite générale prend6min30, les trois natifs1min45 et la présentation1min56. La partie restante de l'intervalle de livraison comprend recherche, écriture, intégration, corrections et rédaction ; aucune attribution exclusive à la génération du modèle ni vitesse en tokens/seconde mesurée. La régression montre38% de temps suivi dans l'évaluation des imports contre59% dans les cas et2% dans les transformations, sur des temps cumulés de workers, distincts de la durée murale. Le précontrôle des producteurs a évité les longs essais natifs sur deux préparations invalides.

V213 est commité le5octobre à06:19:39Paris,82min52s après V212 ;30commandes parent/13min26s de durées enregistrées. Le lot V214 en cours relie proches annoncés, couples, opinions, logement et deuil. [Contrat](../development/family-v214.md). Aucun résultat familial jouable annoncé avant contrôles.

V214 est validé sur les sources finales : 537 fichiers, 2 442 réussis/un ignoré, build et un parcours natif composé au premier lancement. Catalogue 57 entrées, 56 historiques identiques. Le vrai défaut de projection offre+voyageur est corrigé ; les reprises de fixtures conservent tous les validateurs. La prochaine boucle est préparée en lecture seule : planète et groupe hors carte, physiologie, propriétaires et retour collectif.

V214 enregistre 11 commandes parent / 498.422s avant le dernier relevé documentaire et le commit. La régression générale représente 6min32s ; le parcours matériel39s. Le contrôle de présentation complet n’est pas répété : aucun nouveau mesh/shader, les deux caméras sont contrôlées dans le vrai parcours. Recherche, intégration, écriture des tests et rédaction restent hors attribution exclusive ; tokens/seconde non mesurés.
