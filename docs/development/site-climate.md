# Climat du site et vie végétale — V87

**Validé dans le périmètre V87.** Ce contrat relie calendrier, lumière, température, croissance et survie des cultures. La [recherche](../research/seasons-crops-bundle-reference.md) distingue les valeurs lues dans Core 1.6.4871, les observations de la colonie historique B et les adaptations retenues. Les saisons ne fixent aucune échéance de raid, récolte ou catastrophe.

## Profil et temps

Le profil actuel reprend une forêt tempérée observée : **16,2 °C de moyenne annuelle, 900 mm de précipitations, latitude 22,21° N et longitude 18,23° O**. Température et pluie ont été relues dans deux états de la même tuile, sauvegardés en 1.6.4633 ; coordonnées rapportées par l’utilisateur avec réserve. C’est un témoin choisi, pas la moyenne ni un site automatiquement choisi par RimWorld.

Un jour conserve 6 000 ticks locaux, une année 60 jours et un quadrum 15 jours. `World.tick` reste le temps écoulé. `calendarTick` ajoute la provenance civile sans vieillir les personnes, événements, aliments ou travaux. L’heure de départ des nouveaux profils demeure 06 h. Le calendrier Auto choisit le début de la première plage chaude de cinq jours, moyenne au moins 12 °C, avec repli d’été si aucune plage n’existe. Pour ce profil, il s’agit du premier douzième.

La température extérieure partage la moyenne du site, un cosinus annuel de l’amplitude dérivée de sa latitude et le cycle journalier d’amplitude 7 °C. La composante du site est renouvelée tous six ticks locaux depuis l’adoption, correspondant aux 60 ticks Core du cache de référence. Les incidents thermiques gardent leur contribution distincte. **La variation irrégulière Perlin de température n’est pas implémentée** : hors incidents, ce cycle se répète d’une année à l’autre.

La lumière naturelle utilise latitude, jour et heure, avec les corrections de lumière de Core. Croissance, inspection lumineuse et panneaux solaires lisent la même fonction. La direction du soleil dans le rendu suit ce calendrier ; l’éclairage artistique et la lune restent une présentation sans effet de gameplay. Météo/vent et incendies possèdent leurs propres états ; le climat annuel n’utilise pas leurs tirages.

## Croître, récolter, survivre

Les cultures gardent leurs durées, sensibilités à la fertilité, quantités et coûts de semis. La température de la cellule vaut zéro croissance aux bornes 0/58 °C, optimum de 6 à 42 °C et interpolation entre ces bornes. La lumière doit dépasser 51 %, et le repos végétal demeure avant 06 h et après 19 h 12. Un froid temporaire peut empêcher les nouveaux semis ; les travaux déjà acceptés conservent leur contrat d’interruption. La récolte d’une plante mûre reste possible quand la croissance s’arrête.

Les cinq plantes modélisées — riz, pomme de terre, maïs, coton et baies — suivent désormais une vie biologique. Un contrôle décalé par identité intervient tous 200 ticks locaux. Les valeurs sauvages de naissance sont inconnues : les plantes présentes à l’adoption commencent une observation prospective ; seuls les semis effectivement réalisés portent une date de naissance connue.

| Cause | Règle appliquée |
|---|---|
| Froid extérieur | Température strictement sous un seuil individuel stable entre −18 et −10 °C, dans une cellule utilisant l’air extérieur. Les quatre cultures meurent. Le buisson de baies perd ses feuilles pendant au moins un jour depuis le dernier froid déclencheur. |
| Intérieur froid | Cette branche de gel extérieur ne s’applique pas. La croissance peut s’arrêter ; obscurité et vieillissement continuent. Un toit isolé ne constitue pas nécessairement une pièce intérieure. |
| Obscurité | Plus de 7,5 jours sans lumière suffisante : 10 PV de dégâts par contrôle. La lumière suffisante remet l’exposition à zéro, indépendamment du repos nocturne. |
| Vieillissement | Après une durée strictement supérieure à huit fois la croissance biologique : 10 PV par contrôle. Riz 24 j, pomme de terre 46,4 j, maïs 90,4 j, coton 64 j, baies 48 j. |
| Causes simultanées | Obscurité et vieillissement retiennent le maximum commun, pas leur somme. Le gel destructeur est immédiat au contrôle. |

PV initiaux des plantes : 85 pour riz/pomme de terre/coton, 150 pour maïs et 120 pour baies. Les dégâts sont partagés avec le feu. La première tranche d’observation avance seulement du temps réellement connu depuis création/adoption ; les suivantes avancent de 200 ticks. C’est une adaptation du premier contrôle Core, explicitement distincte de sa tranche entière de 2 000 ticks Core. La croissance reste notre intégration continue, sans accélération.

Une plante détruite ne produit rien. Le retrait annule les travaux et réservations qui la visaient par la frontière conservative commune aux dégâts. Les piles déjà récoltées ne sont pas décomptées ; les aliments portés gardent leur identité. Récolter un buisson persistant réduit sa croissance, sans remettre son âge à zéro. Son absence de feuilles ne retire pas la maturité requise pour récolter. L’ingestion de la plante vivante applique sa restriction distincte.

## Migration et continuation

Le format V86 est validé avant migration. Une ancienne carte garde son climat et sa phase historique ; aucun âge, hiver, dégât ou météo passés ne sont inventés. La commande **Activer les saisons** ouvre une période douce à l’heure actuelle, conserve l’année écoulée et ancre la croissance acquise avant le changement. Cette transition explicite commence aussi le suivi prospectif des plantes présentes.

`World.climate` conserve révision, profil, tick d’adoption et origine civile. `Resource.plantLife` conserve début d’observation, éventuelle naissance connue, âge observé, obscurité, date de perte des feuilles et contrôle suivant. `Resource.damage` conserve l’usure physique. Tout état futur, phase impossible, âge incohérent, champ inconnu ou présence anticipée dans un ancien schéma est refusé. Un climat actif impose la vie biologique des cinq plantes ; retirer ce champ ne peut pas neutraliser leur survie à la restauration.

Les indices de contrôle végétal sont dérivés des ressources et reconstruits après remplacement de leur collection. L’intégrale annuelle partagée utilise environ 2,9 Mo, avec des requêtes d’intervalle en temps constant. La topologie thermique courante est passée une fois au contrôle, sans exploration de carte par plante. Ce sont des choix d’implémentation ; les mesures de charge restent une preuve séparée.

## Validation et limites

`tests/climate-plants.test.ts` regroupe quatre scénarios : ancien climat/adoption/Auto et borne des six ticks ; intervalle lumineux comparé à une somme indépendante, changement d’année, solaire et rendu ; gel contrôlé de cultures/baies/intérieur ; obscurité/âge, nouveau semis, continuation et refus des états incohérents. Le gel contrôlé ne constitue pas un événement revendiqué dans la colonie témoin.

La campagne commune part des octets publiés de la véritable colonie V86, à J76,283. Son carnet construit deux chauffages, raccorde une éolienne, entretient son passage de vent, prépare un champ supplémentaire et commande le générateur de secours selon la batterie réellement stockée. Le dortoir reste ouvert par deux murs détruits ; leurs anciennes cellules sont occupées par des corps humains, dont le transport n'est pas livré. Le carnet annule ces plans impossibles et fait construire une fermeture autour des corps conservés, puis couvre l'extension. Il contourne aussi les cellules de câble sans voisin de travail disponible. Aucune pièce ni connexion n'est créée directement dans le checkpoint.

Le préflight d’adoption, placements et continuation passe ; les quatre scénarios climat passent également. Le parcours long est activé séparément par `ENVIRONMENT_JOURNEY=1`. Il conserve un checkpoint quotidien et aux jalons, reprend via `ENVIRONMENT_CHECKPOINT`, et admet un diagnostic de deux jours au maximum via `ENVIRONMENT_UNTIL`. Son plafond de 65 jours sert à observer l’hiver doux puis les premières récoltes du printemps ; ce n’est pas une échéance du gameplay. Il conserve les quatre personnes initiales et les bilans de nourriture, bois et métaux, avec pertes du feu distinctes, dont le rendement potentiel des arbres détruits.

La campagne est réussie de J76,283 à J136,073 (ticks 457698 à 816438), par continuations conservées après les diagnostics, et non par une nouvelle passe monolithique. La reprise finale J88→J136,073 dure 1 630,684 s dans le pilote. Le [rapport](../../artifacts/environment-colony-v87.json) conserve les observations, commandes, bilans et empreintes ; la [preuve centrale](../history/validation-environment-v87.md) distingue parcours, frontières et inspections natives.

| Résultat observé | Valeur |
|---|---|
| Hiver, croissance ralentie et chauffage hivernal | Tick 724500, J120,75 |
| Retour du printemps / première récolte suivante | Ticks 814500 / 816438 ; 6 riz récoltés |
| Température extérieure minimale / maximale | −2,211 / 34,607 °C |
| Alimentation depuis adoption | 7 163 produits récoltés, 483 repas cuisinés ; 120 ingestions pendant l’hiver |
| Population et réserves finales | Les quatre habitants initiaux vivants ; 12 repas, 1 593 riz et 172 maïs |
| Chauffage et énergie finale | Deux pièces à 21 °C ; éolienne à 1 255 W sans obstruction ; décharge nocturne de batterie observée |

Un raid a ouvert la petite chambre au début de l’hiver : son radiateur alimenté ne chauffait plus un volume fermé. Le pilote a fait reconstruire le mur par les commandes ordinaires ; les deux pièces étaient de nouveau à 21 °C à J125. Les pertes sont conservées : quatre bâtiments supplémentaires détruits dans le registre général, vingt bois perdus, et quinze arbres brûlés représentant 153 bois potentiels. Aucun bâtiment ni stock n’a brûlé dans ce parcours ; l’extinction par les colons et les destructions dangereuses gardent leurs scénarios contrôlés distincts.

Le [checkpoint final compressé](../../tests/fixtures/colony-v87.json.gz) contient uniquement la sauvegarde Lisière, sans transformation ni ressource ajoutée ; son empreinte non compressée figure dans le rapport. Il permet au prochain ensemble de reprendre cette colonie sans rejouer l’année. Ni mort par gel ni incendie rare ne sont exigés à une date donnée. Ce succès ne certifie pas un équilibrage Core global ni les performances des colonies denses ; la clôture globale du lot reste portée par la preuve centrale.

Restent absents : monde climatique paramétrable, bruit irrégulier de température, neige accumulée et profondeur, lampe horticole, maladies végétales, espèces biologiques d’arbres, renouvellement sauvage complet et migrations saisonnières animales. Le profil tempéré ne garantit pas un hiver sévère. Ses nuits froides peuvent interrompre la croissance sans atteindre le seuil de mort des cultures.
