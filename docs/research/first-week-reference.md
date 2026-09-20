# Première semaine — alimentation et pression du départ

**Préparation suspendue, non livrée.** L'utilisateur a remplacé le périmètre temporel ci-dessous par la [référence du déroulement Core](core-reference-baseline.md). Conserver les calculs et questions utiles ; ne pas utiliser « sept jours » comme obligation de raid, canicule ou production. Le premier essai a échoué et reste consigné dans le [diagnostic](../history/reference-audit-2026-09-20.md). Les contrôles du pilote et les corrections proposées sont conservés hors des suites actives en attendant leur intégration au parcours recalibré ; aucune passe complète verte n'est revendiquée.

Recherche renouvelée le **20 septembre 2026**, après V81. Périmètre : éprouver une semaine du véritable départ **Trois survivants**, graines 42, 93 et 2048, avec sa dotation intacte, des aliments renouvelables effectivement produits puis ingérés, un incident hostile du calendrier et ses suites. Ce document prépare la calibration et les observations ; **il ne constitue pas une validation du parcours ni une certification de difficulté RimWorld**. Le [départ V80](scenario-start-reference.md), les [règles agricoles](farming-reference.md), les [repas](cooking-reference.md) et les [raids](raid-reference.md) gardent leurs recherches de domaine.

## Corpus et provenance

Lecture via [reference-adoption](reference-adoption.md) : chapitres 11–12 (production, agriculture, alimentation), 14 (besoins), 24 (narration) et 32 (validation). Les entrées du classeur servent à éprouver une chaîne existante, pas à ouvrir une fonctionnalité pour chaque ligne.

| Entrées | Décision pour ce parcours |
| --- | --- |
| SYS/TEST-062..064 | Adopter les ingrédients physiques, la facture et la conservation des produits ; distinguer production et ingestion. |
| SYS/TEST-070..072, 075 ; UI-021 | Adopter admissibilité, croissance intégrée, maturité et fertilité ; mesurer le sol réellement sélectionné. |
| SYS/TEST-076..078 | Conserver besoins, politiques, accès et préférence ; une réserve ou un repas réservé ne satisfait pas encore la faim. |
| SYS/TEST-132..135 | Séparer calendrier, admissibilité, budget, composition et notification ; le narrateur complet reste différé. |

Sources publiques relues : pages communautaires du riz et des repas ; classes [Core épinglées au 20 mai 2026](https://github.com/Chillu1/RimWorldDecompiled/tree/2d508035082e7cb0c8e29e230d26bda6e546928f) ; [XML historique du 7 septembre 2018](https://github.com/RimWorld-zh/RimWorld-Core/tree/85954e64ea75334f51e33e27a4128809191e430e). Les classes portent une étiquette d'assemblage, pas une preuve de concordance avec le correctif commercial actuel. Le [correctif officiel 1.6.4850 du 8 juin 2026](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) est postérieur au miroir. L'ancien XML corrobore des constantes et la séparation des narrateurs ; il ne certifie pas leurs réglages actuels. Copies de travail dans `tmp/first-week-reference`, sans dépendance du jeu.

## Riz : production biologique et date de récolte sont distinctes

Le [riz](https://rimworldwiki.com/wiki/Rice_plant) annonce 3 jours de croissance idéale, 6 unités par récolte, une sensibilité à la fertilité de 100 % et un minimum de 70 %. Le wiki estime 5,54 jours calendaires sur sol à 100 %, 7,91 à 70 % ; ces durées supposent ses conditions favorables. Version consultée : `oldid=181593`. Les valeurs de rendement et de durée biologique sont également présentes dans l'[XML ancien](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/ThingDefs_Plants/Plants_Cultivated_Farm.xml), sans extrapoler toutes ses autres valeurs à la version actuelle.

Les classes [Plant](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/Plant.cs) et [PlantUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/PlantUtility.cs) confirment que le temps favorable est intégré : repos hors de la fenêtre 25–80 % de la journée, puis facteurs de lumière, fertilité et température. Trois jours biologiques ne promettent donc pas une récolte au troisième soir. La croissance lumineuse n'est pas simplement une constante diurne ; [GenCelestial](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/GenCelestial.cs) dépend de la géométrie solaire.

Relecture locale de `plants.ts` et `environment.ts` : mêmes durée et rendement de base, mais un profil explicite à 45° de latitude et équinoxe, sans saison. L'intégrale d'une journée fournit **2 572,192 ticks locaux favorables** sur 6 000. À température idéale, une croissance complète équivaut à **environ 7,00 jours à fertilité 1**, ou **10,00 jours à 0,7**, avant temps de semis, récolte et cuisson. Ce calcul analytique utilise `growingLightIntegral(6000)` ; ce n'est pas une mesure de parcours. Le très petit avancement initial du plant ne change pas cet ordre de grandeur.

Cet écart avec l'estimation du wiki n'établit pas, seul, un défaut de la formule : les conditions exactes de son estimation ne sont pas suffisamment décrites pour certifier la même latitude, date et lumière. **La calibration solaire locale reste à confronter à une observation Core équivalente** ; il ne faut ni annoncer une parité de calendrier ni accélérer les plants pour satisfaire une date de test.

| Champ effectivement planté | Récolte mûre brute | Repas simples possibles | Débit théorique local sur fertilité 1 |
| --- | ---: | ---: | ---: |
| 20 cases de riz | 120 riz | 12 | 1,7 repas/jour |
| 60 cases de riz | 360 riz | 36 | 5,1 repas/jour |

Ces plafonds ignorent interruptions, trajet, délai de ressemis, sol moins fertile et incidents. `grass` vaut localement 1, `soil` 0,7 : un rectangle accepté partiellement par la sélection n'est pas nécessairement 60 plants ni 60 bons sols. La canicule locale peut encore ralentir la croissance au-delà de 42 °C ; refroidir le dortoir ne refroidit pas le champ.

Trois adultes représentent nominalement **4,8 unités de nutrition par jour**, avant modificateurs. Un repas de 0,9 peut perdre une partie de sa valeur lorsqu'il remplit une jauge déjà partiellement pleine ; le besoin réel en repas entiers dépend des instants d'ingestion. **60 cases constituent un premier potager plausible pour observer une filière, pas une preuve d'autonomie alimentaire.** Viser six repas produits puis ingérés est raisonnable avec des ingrédients obtenus par cueillette ou chasse pendant que le champ pousse. Si l'on exige spécifiquement le riz mûr, poursuivre jusqu'à sa récolte réelle et annoncer cette durée supplémentaire.

## Repas : la préférence actuelle n'exige pas de régime artificiel

Les [repas simples](https://rimworldwiki.com/wiki/Simple_meal) et [repas emballés](https://rimworldwiki.com/wiki/Packaged_survival_meal) apportent chacun 0,9 nutrition. Le simple utilise 0,5 nutrition d'ingrédients, soit dix unités ordinaires de riz, baies ou viande ; son travail nominal est 300 ticks Core, doublé au feu. L'emballé ne pourrit pas ; il peut néanmoins se détériorer exposé dans Core, mécanisme matériel encore distinct localement. Versions consultées : `oldid=181966` et `182913`.

La classe [FoodUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/FoodUtility.cs) combine distance de Manhattan, effets de pensée, offset de définition et urgence de pourriture. Les [données de définitions publiées par le wiki](https://rimworldwiki.com/wiki/Module:DefInfo/Data) indiquent **+16 pour le simple**, **−5 pour l'emballé**. Ces deux repas partagent la catégorie de préférence `MealSimple` ; cela ne signifie pas qu'ils ont le même score final. Le miroir confirme également le bonus **+12** lorsqu'une pile risque de pourrir en moins de 30 000 ticks Core, hors recherche pour l'inventaire. La version exacte de l'export wiki n'est pas certifiée.

La sélection locale correspond à ces offsets pour l'adulte neutre : simple `16 − distance`, emballé `−5 − distance`, avec accès et régime vérifiés puis urgence de pourriture. **À distance comparable, les simples doivent donc être mangés avant les rations**. Un simple plus de 21 cases de Manhattan plus loin peut perdre cet avantage, sans que la sélection soit défectueuse. Les branches Core de traits, gènes et inventaire complet ne sont pas toutes présentes.

Recommandation : garder la politique ordinaire, installer cuisine et réserve à portée utile, puis observer l'ingestion effective. Ne pas retirer, interdire artificiellement ou remplacer les 50 rations pour forcer la démonstration. Le stock initial de 45 nutrition donnerait 9,375 jours pour trois adultes à 1,6/jour **sans aucune perte de remplissage** : c'est une borne arithmétique idéale, pas une autonomie promise. Mesurer consommations, arrivants éventuels, pertes et quantités restantes.

## Première menace : reconnaître notre profil sans le confondre avec Cassandra

Dans [StorytellerComp_ClassicIntro](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/StorytellerComp_ClassicIntro.cs), les événements portent sur la première carte d'habitation et dépendent des conditions de difficulté. Le code épinglé programme un visiteur à 150 000 ticks Core, une petite menace à 204 000, un événement divers à 264 000 et un raid à **324 000 ticks Core, soit 5,4 jours écoulés**. Ce raid vaut **40 points** et utilise notamment `raidForceOneDowned` et `raidNeverFleeIndividual`. Ces branches ne sont pas un calendrier universel applicable à tous les narrateurs.

L'[XML historique des narrateurs](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/Storyteller/Storytellers.xml) associe cet introducteur à Cassandra et Phoebe, pas à Randy. Les cycles ultérieurs sont distincts ; [OnOffCycle](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/StorytellerComp_OnOffCycle.cs) combine calendrier, admissibilité et progression. Les pages actuelles Cassandra/AI Storytellers n'ont pas été récupérables durant ce lot ; les réglages XML de 2018 ne sont donc **pas** adoptés comme chiffres actuels. La [présentation officielle](https://rimworldgame.com/) confirme le rôle du narrateur, sans certifier cette séquence numérique.

Le calendrier local existant est différent et annoncé comme provisoire : première attaque après **3,5–4 jours**, un assaillant sans arme, puis autres compositions ; nouvelles attaques 6–8 jours après clôture. Ni richesse, budget de points, choix de narrateur, ni les garanties spécifiques de `ClassicIntro` ne déterminent ce groupe. **Conserver ce calendrier réel pour le parcours présent**, plutôt qu'injecter un raid à une heure choisie ou changer silencieusement la difficulté. Une calibration Core ultérieure devra traiter ensemble scénario, richesse, points, composition et comportement.

Les autres pressions locales restent indépendantes : première offre d'accueil vers 1,5–2 jours et première canicule vers 6–7 jours. Un refus explicite peut être cohérent faute de couchage, avec son coût d'humeur conservé ; le parcours n'a pas à imposer un quatrième colon. La protection thermique réutilise les équipements existants. Ces échéances ne certifient pas un rythme Core équivalent.

## Observations nécessaires et limites de conclusion

- Partir de l'usine applicative et conserver dotation, connaissances, besoins et calendriers. Les commandes peuvent affecter les métiers, construire, cultiver, chasser et refuser une offre ; elles ne modifient pas directement les réserves ni les tirages.
- Comptabiliser séparément rations initiales, produits récoltés/chassés, ingrédients consommés, repas finis, repas ingérés, consommation animale, pertes et stocks finaux. Six repas fabriqués ne prouvent pas six repas mangés ; les repas apportés par le scénario ne sont pas renouvelables.
- Relever plants semés, fertilité, maturité et températures pour expliquer une absence de récolte. Garder des résultats distincts pour chaque graine, plutôt qu'ajuster le soleil ou le terrain à une date cible.
- Constater le raid issu de son calendrier, son issue, les besoins de soins et la reprise des travaux. Une infection n'est pas obligatoire sur chaque graine ; une victime ne disparaît pas pour faciliter le bilan. Les préconditions et la sortie de l'incident font partie de la boucle.
- Conserver les checkpoints des échecs et des continuations. Une semaine stable sur trois graines ne prouve ni autonomie durable ni difficulté équivalente à RimWorld.

Les compétences agricoles, les saisons et dangers complets des cultures, l'ensemble des plantes/aliments, la détérioration matérielle extérieure, les politiques d'inventaire et le narrateur complet restent des facteurs ouverts d'équilibrage. Leurs absences doivent figurer dans l'état du projet ; elles ne justifient pas de les développer toutes avant de constater et corriger les blocages du parcours actuel.
