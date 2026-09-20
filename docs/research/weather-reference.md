# Météo de surface, vent et exposition — référence V87

Recherche du 20 septembre 2026 ; lot V87 livré dans son périmètre, preuves dans [la validation commune](../history/validation-environment-v87.md). Domaine du corpus : chapitres 10/22, SYS127 énergie, SYS129 incendie, SYS131 météo, TEST126/127/129 et familles correspondantes. Les jalons restent dans ROADMAP. Cette fiche ferme les inconnues de la [préparation énergie/climat](wind-energy-bundle-reference.md).

## Sources et degré de certitude

Référence primaire numérique : installation Core locale **1.6.4871 rev590**, `Assembly-CSharp.dll` SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`, consultée en lecture seule. Fichiers `WeatherDefs/Weathers.xml`, `BiomeDefs/Biomes_Temperate.xml` ; classes `WeatherDef`, `WeatherManager`, `WeatherDecider`, `WeatherWorker`, `WeatherEventMaker`, `WeatherEvent_LightningStrike`, `FireWatcher`, `Pawn.TicksPerMove`, `ShotReport`, `SimpleCurve`. Aucun extrait propriétaire n'est publié.

La recherche Internet fraîche confronte [l'annonce officielle des saisons, chauffage et éoliennes](https://ludeon.com/blog/2014/12/alpha-8-winter-is-coming-released/) (10 décembre 2014, historique, pas source des coefficients 1.6), [l'annonce officielle 1.6/Odyssey](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/) et [l'aperçu officiel des nouveaux biomes/météos Odyssey](https://ludeon.com/blog/2025/06/odyssey-preview-1-map-features-landmarks-and-biomes/) (juin 2025). La page communautaire [Environment/Weather](https://rimworldwiki.com/wiki/Weather) est un contrôle secondaire ; elle ne remplace pas les classes locales. La récupération fraîche de la page Heater a expiré ; ses constantes sont confirmées localement. Aucune référence ancienne ne certifie une version ultérieure.

## Huit météos Core

Les poids suivants sont ceux de la forêt tempérée, avant conditions. Le profil de site explicite fournit ses précipitations annuelles ; il ne prétend pas représenter une carte moyenne.

| Météo | Poids | Température admissible °C | Vent × / minimum | Pluie / neige | Vitesse / précision |
|---|---:|---|---|---|---|
| Clair | 18 | −999..999 | 1 / 0 | 0 / 0 | 1 / 1 |
| Brouillard | 1 | −999..999 | 0,5 / 0 | 0 / 0 | 1 / 0,5 |
| Pluie | 2 | 0..100 | 1,5 / 0 | 1 / 0 | 0,9 / 0,8 |
| Orage sec | 1 | 0..999 | 1,5 / 1,25 | 0 / 0 | 1 / 1 |
| Orage pluvieux | 1 | 0..999 | 1,5 / 1,25 | 1 / 0 | 0,8 / 0,8 |
| Pluie et brouillard | 1 | 0..999 | 1,5 / 0 | 1 / 0 | 0,9 / 0,5 |
| Neige légère | 4 | −999..−0,5 | 1,5 / 0 | 1 / 0,8 | 1 / 0,8 |
| Neige forte | 4 | −999..−0,5 | 1,5 / 0 | 1 / 1,2 | 0,8 / 0,8 |

Les coefficients Pluie/Neige sont des intensités logiques, pas des millimètres d'eau au sol. La neige possède aussi `rainRate=1` : l'extinction n'exclut donc pas les flocons. L'épaisseur de neige, son déblayage et son coût supplémentaire de transit restent distincts.

Facteurs de précipitations annuelles : brouillard et pluie brumeuse suivent 0 mm → 0 et 1 300 mm → 1 ; pluie ajoute 4 000 mm → 3 ; orage pluvieux 4 000 mm → 2 ; neige suit 0 mm → 0, 300 mm → 0,5, 1 300 mm → 1. Clair et orage sec n'ont pas ce facteur. Interpolation linéaire, bornes extrêmes maintenues (`SimpleCurve` local). Deux météos non répétables identiques ne s'enchaînent pas ; Clair est répétable. Une température incompatible donne poids zéro. Les deux orages sont exclus avant huit jours écoulés depuis l'établissement, sans accélération pour un pilote.

Premier temps clair : 10 000 ticks Core. Durées suivantes : 16 000..160 000 Core ; orages 15 000..40 000 Core. Transition en 4 000 Core, interpolation séparée des coefficients précédent/courant. Le nom perçu bascule à 18 % lorsque la nouvelle météo est plus marquante, 82 % lorsqu'elle l'est moins, 50 % sinon. Tous ces nombres sont des ticks Core ; 10 Core = 1 tick local.

## Feu, orages et persistance

Le témoin de feu capture tous les 426 Core la somme `0.5 + taille` de chaque feu. Danger strictement supérieur à 90 : durée courante ×0,25 et poids des météos à pluie >0,1 multipliés par 15. Une météo devenue incompatible avec la température réduit également sa durée ×0,25. Le seuil d'âge de changement est strict (`âge > durée`). Ce n'est pas une pluie instantanée à chaque incendie.

Chaque orage possède un éclair visuel et une frappe physique distincts, chacun à intervalle moyen de 1 200 Core. Le décideur tire chaque Core avec probabilité `intensitéDeTransition / 1200`, également pour la météo sortante tant qu'elle contribue. Lisière simule la frappe physique ; les éclairs purement décoratifs ne modifient pas son PRNG. La frappe choisit une cellule admissible non couverte ; le noyau feu applique sa petite explosion Flame de rayon 1,9. L'état persiste PRNG propre, origine d'adoption, horloge Core, météo courante/précédente, âge/durée, capture du danger, nombre et dernière position/date d'émission. La reprise restitue ce futur déterministe ; elle ne reproduit pas le PRNG global Unity.

## Autres effets vérifiés

`Pawn.TicksPerMove` applique le coefficient météo à la vitesse depuis la cellule de départ uniquement si celle-ci est sans toit ; le facteur entre dans l'arête persistée. Un changement de pluie ou de toit n'altère pas le trajet déjà engagé. Le ralentissement concerne aussi la faune. Les plafonds de mouvement antérieurs de Lisière ne sont pas réécrits dans ce lot.

`ShotReport` applique la précision météo lorsque le tireur **ou** la cible n'a pas de toit. Deux extrémités couvertes annulent cette pénalité, même si la ligne passe dehors. Aucun seuil de portée supplémentaire pour ces huit définitions. Le facteur entre une seule fois dans le rapport de tir existant, avant sa borne minimale de visée.

Ces huit météos ont toutes `maxGlow=1` : leur teinte artistique n'est pas un malus solaire à inventer. La production photovoltaïque suit la vraie lumière annuelle du profil et ses cellules couvertes. Overcast, Strong winds, les garanties de vent des Grasslands et les météos Odyssey restent exclus, ainsi que GrayPall d'Anomaly. Pluie empêchée par condition mondiale, tempête forcée, inondations, gaz et neige accumulée ne sont pas revendiqués.
