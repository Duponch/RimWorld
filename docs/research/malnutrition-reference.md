# Pénurie alimentaire et malnutrition — enquête V84

20 septembre 2026. Corpus utilisateur relu, chapitres 14/15, SYS/TEST-077,089,091,094,096 : la jauge alimentaire et la condition médicale sont distinctes ; conserver l'accès, les régimes et l'ingestion physique. Ce document prépare et accompagne la chaîne alimentaire, sans introduire toutes les maladies.

## Sources et décisions

- Installation Core **1.6.4871 rev590**, consultée en lecture seule : `Hediffs_Global_Needs`, `Thoughts_Situation_Needs`, classes `Need_Food`, `HediffSet`, `ThoughtWorker_NeedFood`, `Pawn_HealthTracker`, `HealthAIUtility`. Empreinte de l'assemblage et distinction avec les sauvegardes : [base de référence](core-reference-baseline.md). Aucun extrait propriétaire publié.
- [Malnutrition, wiki](https://rimworldwiki.com/wiki/Malnutrition), consulté le 20 septembre, révision affichée 173358 : acquisition à nourriture nulle, récupération progressive et symptômes. Le tableau distingue cinq stades et l'histoire signale un changement numérique en 1.5.4062.
- [Classe publique Need_Food](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/Need_Food.cs), miroir daté distinct du binaire installé : concordance du taux de base et de sa variation individuelle, pas certification du dernier correctif. La source locale contemporaine tranche les deux divergences ci-dessous.

La référence locale ajoute/retire une sévérité de **0,0011325 × facteur individuel 0,8–1,2** par intervalle de 150 ticks Core. Le facteur est stable par identité ; la progression équivaut à 36,24–54,36 % par jour sans nourriture. La récupération utilise le même taux quand la nourriture est positive. Lisière adopte cet intervalle de 15 ticks locaux, avec sévérité entière en milliardièmes et hachage déterministe propre : distribution bornée comparable, aucun prétendu résultat aléatoire identique au jeu original.

Seuils locaux 0 / 0,2 / 0,4 / 0,6 / 0,8 : conscience −5/−10/−20/−30 points puis maximum 10 % ; besoin alimentaire ×1,5 au premier stade, ×1,6 ensuite. Sévérité 1 tue ; une perte de conscience combinée à d'autres maladies peut tuer avant. Le noyau anatomique partagé doit appliquer les modificateurs ensemble, pas substituer une jauge générale.

**Deux corrections de lecture du wiki :** le blocage de cicatrisation local vérifie la nourriture nulle, pas la présence de malnutrition résiduelle après un repas. La pensée de famine dépend elle aussi de la catégorie alimentaire : elle utilise le stade médical seulement quand la jauge est vide. Les offsets −20/−26/−32/−38/−44 ne persistent donc pas automatiquement jusqu'à récupération complète. Le modèle conserve ces deux conditions locales. Le repos médical volontaire ne se déclenche pas pour la seule malnutrition ; l'incapacité ouvre les secours et l'alimentation assistée existants.

Les bagarres sociales ont aussi des facteurs dans les Defs, mais leur boucle n'est pas implémentée. Aucun effet sans consommateur réel n'est annoncé. Soins vétérinaires, enfance, reproduction et extensions restent hors de ce lot.

## Frontières du lot alimentaire

La [recherche des cultures](food-crops-reference.md) vérifie aussi le risque fixe d'intoxication des légumes crus. L'intoxication, les salissures, le nettoyage et le transport de contaminants demandent ensemble une chaîne supplémentaire ; leur absence reste explicite. Elle ne justifie ni bonus fictif de propreté ni modification des rendements ou de la famine. Les ateliers, cultures, conservation, consommation et issue d'une pénurie constituent la chaîne livrable de V84.
