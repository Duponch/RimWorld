# Biomes et flore sauvage — référence V91

Recherche ciblée du 21 septembre 2026. Cette note remplace le cadrage préparatoire
[V90](biome-diversity-reference-v90.md) pour la partie flore effectivement retenue en V91. Elle ne décrit ni les animaux du lot, ni les matières issues de leur boucherie, documentées séparément dans [biome-products-reference-v91.md](biome-products-reference-v91.md).

## Sources et portée

La source déterminante est l'installation locale **RimWorld Core 1.6.4871 rev590**, lue sans écriture sous `E:/Steam/steamapps/common/RimWorld`. L'assembly contrôlé porte l'empreinte SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Les définitions résolues de trois biomes et des plantes ont été confrontées aux classes de génération, croissance et renouvellement au moyen d'ILSpyCmd 8.2.0.7535. Aucun XML, code décompilé ou état brut n'est reproduit ici.

Le témoin `Reference-Core-4871` est une sauvegarde Core seul, 1.6.4871 rev591, dont l'empreinte est `cb5fcd3513ab2d0ee5f4c2c711121d9f832ab320da004edcce3b20dc2a723ef1`. Les grilles lues comptent **119 904 tuiles de surface**. La tuile de départ 60125 donne le profil boréal ; la tuile 89 fournit un profil aride admissible du même globe. Le diagnostic de coordonnées est conservé localement dans `tmp/v91-tile-coordinates.json`, sans publier la sauvegarde ni les extractions propriétaires.

Les annonces officielles [Update 1.6](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/), [sortie de la mise à jour gratuite](https://ludeon.com/blog/2025/07/the-rimworld-odyssey-expansion-is-out-now/) et [correctif 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) fixent le contexte de version et la séparation entre mise à jour gratuite et extension. Elles ne donnent pas les coefficients ci-dessous ; ceux-ci viennent de l'installation locale courante.

Le corpus utilisateur relu couvre les chapitres 6/7/11/12 et les entrées **SYS/TEST-016..019, 062..064, 070..072, 075, 121..125 et 132..135**. V91 adopte l'identité plante/produit, la croissance conditionnelle, la récolte physique et les habitats distincts ; il adapte les unités, la projection spatiale et les flux aléatoires ; il diffère globe complet, humidité locale, succession végétale et reproduction. Cette lecture suit [reference-adoption.md](reference-adoption.md), [world-generation.md](../development/world-generation.md), [site-climate.md](../development/site-climate.md) et [testing.md](../development/testing.md).

## Profils retenus

Les densités sont des paramètres de génération Core, pas des pourcentages de cellules ni des quotas. Les poids sont relatifs. Les espèces Core non livrées gardent leur poids absent : V91 réduit la population projetée au lieu de redistribuer ce poids aux espèces présentes.

| Profil | Densité / repousse Core | Poids livrés / poids Core total | Climat explicite |
| --- | ---: | ---: | --- |
| Forêt tempérée | 0,65 / 20 j | 9,05 / 15,90 | 16,2 °C, 900 mm, 22,21° N, 18,23° O ; témoin historique déjà adopté en V87. |
| Forêt boréale | 0,40 / 25 j | 22,86 / 44,22 | 5,3 °C, 655 mm, 39,71° N, 13,47° E ; tuile 60125 du témoin actuel. |
| Broussailles arides | 0,24 / 27 j | 7,76 / 16,46 | 25,4 °C, 690 mm, 4,01° N, 27,74° E ; tuile 89 du même globe. |

Les amplitudes annuelles de Lisière restent l'adaptation V87 dérivée de la latitude : environ 11,41 °C, 18,37 °C et 3,70 °C. Les jours Auto calculés sont 0, 10 et 0. Ces deux valeurs ne sont pas lues comme des constantes de tuile Core. Chaque nouveau site choisit un profil entier ; aucune moyenne fictive ne mélange ces trois témoins.

## Catalogue résolu

Les poids ci-dessous sont ceux des tables de biome locales. Les durées, fertilités, sensibilités, rendements, nutrition, PV et inflammabilité sont les valeurs effectives des définitions Core résolues, sauf mention d'adaptation.

| Espèce | Biome et poids | Croissance ; fertilité/sensibilité | Produit à maturité | Nutrition ; PV ; inflammabilité |
| --- | --- | --- | --- | --- |
| Herbe | tempéré 5 ; boréal 9 ; aride 7 | 2,5 j ; 0,05 / 0,3 | aucun | 0,5 ; 85 ; 1,3 |
| Herbe haute | tempéré 2 | 3 j ; 0,7 / 0,7 | aucun | 0,5 ; 90 ; 1,3 |
| Ronces | tempéré 1 ; boréal 2 | 3 j ; 0,7 / 0,7 | aucun | 0,5 ; 100 ; 1 |
| Buisson de baies | tempéré 0,05 ; boréal 0,16 ; aride 0,1 | 6 j ; 0,5 / 0,5 | 10 baies, récolte dès croissance > 0,65 puis retour à 0,3 | 0,5 ; 120 ; 1 |
| Chêne | tempéré 0,5 | 30 j ; 0,7 / 0,5 | 46 bois, coupe dès croissance ≥ 0,4 | 2 ; 200 ; 0,8 |
| Peuplier | tempéré 0,5 ; boréal 1,2 | 15,05 j ; 0,7 / 0,5 | 27 bois, seuil 0,4 | 1,5 ; 200 ; 0,8 |
| Mousse | boréal 4 | 4 j ; 0,05 / 0 | aucun | 0,5 ; 120 ; 0,6 |
| Pin | boréal 5 | 20 j ; 0,7 / 0,5 | 27 bois, seuil 0,4 | 2 ; 200 ; 0,8 |
| Bouleau | boréal 1,5 | 20 j ; 0,7 / 0,5 | 27 bois, seuil 0,4 | 2 ; 200 ; 0,8 |
| Agave | aride 0,2 | 6 j ; 0,7 / 0,5 | 10 `agave-fruit`, récolte dès croissance > 0,65 | 0,2 ; 120 ; 1 |
| Saguaro | aride 0,26 | 5 j ; 0,05 / 0 | 15 bois, seuil 0,2 | 2 ; 130 ; 0,8 |
| Drago | aride 0,2 | 15 j ; 0,7 / 0,5 | 25 bois, seuil 0,4 | 2 ; 200 ; 0,8 |

Les plantes ordinaires utilisent la fenêtre thermique V87 0/6/42/58 °C. Les définitions locales d'herbe, herbe haute, agave, saguaro et drago portent une limite haute de 75 °C ; V91 conserve 0/6/42/75 pour elles. Les arbres vivent jusqu'à neuf fois leur durée de croissance, les autres plantes sauvages huit fois ; le saguaro conserve son multiplicateur explicite de quarante. Les espèces qui possèdent une représentation sans feuilles dans Core — herbe, ronces, baies, chêne, peuplier, mousse, bouleau et saguaro — utilisent le suivi V87. Herbe haute, pin, agave et drago restent visuellement feuillus : V91 ne leur invente ni disparition graphique ni mort instantanée de culture. L'effet biologique complet de dormance Core pour une plante sans graphisme alternatif reste différé.

Deux remplissages de tir sont des valeurs explicites : agave 0,20 et saguaro 0,35. Les arbres ordinaires conservent 0,25 et les buissons de baies 0,20. Les autres plantes basses utilisent zéro ; une grande image de ronces ne devient pas automatiquement un couvert balistique.

## Adaptations de génération et de renouvellement

Lisière génère d'abord terrain, filons et fragments. Sur une cellule libre, la chance projetée vaut `densité × fertilité² × champ de bosquet × part de poids livrée`, bornée à un. Le tirage d'espèce utilise ensuite les proportions des seules espèces livrées ; une espèce tirée sur un sol sous sa fertilité minimale est absente sans second tirage. Ce carré de fertilité et ce champ de bosquet sont l'adaptation locale héritée de V83, pas une reproduction de la pose Core cellule par cellule.

La génération crée croissance, instant d'observation et vie biologique pour chaque plante. Le bois utilise le produit commun parce que l'espèce a déjà modifié durée, maturité et quantité. L'agave garde un objet alimentaire distinct jusqu'au stockage, à la recette, à l'ingestion et à la pourriture.

Le renouvellement V91 est prospectif. Un état écologique privé conserve biome, PRNG, prochain contrôle, adoption et capacité initiale. Tous les 60 ticks locaux, l'espérance de tentative vaut `manquants / (jours de repousse × 100 contrôles par jour)`, avec arrondissement aléatoire par ce flux privé. Une tentative peut échouer sur roche, eau, sol infertile, sol construit, toit, zone de culture, ressource, pile au sol, meuble emballé, structure ou empreinte de chantier ; elle n'est pas déplacée ailleurs. La population approche donc son plafond sans restauration instantanée d'une plante précise.

Cette règle traduit `wildPlantRegrowDays` sans prétendre reproduire la succession, la proximité d'espèces, le voisinage humide ou tous les contrôles de `WildPlantSpawner`. La génération graine 42 sur 32², utilisée seulement comme contrôle déterministe, produit 267 plantes tempérée, 160 boréales et 89 arides ; ces nombres ne deviennent pas des objectifs d'équilibrage pour 250².

## Conservation, tests et limites

Une option de biome absente résout toujours le site révision 1 et garde exactement terrain, ressources et fragments historiques. Un biome explicite crée seul un site révision 2 et `World.flora`. Les mondes antérieurs ne reçoivent ni biome, espèce, climat, âge, croissance ni repousse à la migration. Toute espèce sous un schéma antérieur à 91, espèce inconnue, couple espèce/type incohérent, croissance impossible, état écologique sans site révision 2 ou capacité au-delà de la carte est refusé.

Le contrôle ciblé `tests/biomes-flora.test.ts` fixe l'empreinte du paysage révision 1, génère les trois profils deux fois, couvre les douze espèces, les climats, croissance/broutage/feu, dégagement de chantier, commandes réelles de récolte et coupe, reprise exacte, exclusions de renouvellement, saturation et invalidation des index par remplacement du tableau de ressources. Il reste distinct de la validation centrale, du pilote UI, de la campagne commune et des mesures CPU/rendu.

Restent absents : humidité par cellule, plantes aquatiques, neige accumulée, maladies végétales, semis sauvages par les animaux, reproduction, succession écologique, marais/jungle/désert extrême/toundra, et catalogue Core complet. Le profil aride est une broussaille à 690 mm issue d'une vraie tuile admissible ; il ne prétend pas modéliser un désert terrestre.
