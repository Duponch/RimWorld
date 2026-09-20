# Première pression climatique — V74

**Référence du 20 septembre :** le [Core 1.6.4871 inspecté](../research/colony-pacing-reference.md) sélectionne les canicules parmi les incidents admissibles, sans rendez-vous garanti à la première semaine. Le calendrier prototype ci-dessous reste livré pour les camps historiques. Le profil Cassandra d'Atterrissage forcé ne l'active pas et ne propose pas son bouton d'activation ; l'intégration de cet incident au narrateur reste distincte des effets thermiques déjà présents.

**V87 validée** prolonge l'air extérieur par le [climat annuel du site](site-climate.md), la [météo et le chauffage](wind-heater.md), et la chaleur des [incendies](fires.md). Ces systèmes utilisent le même air local sans ajouter une canicule obligatoire au narrateur. Leur [campagne commune](../history/validation-environment-v87.md) ne remplace pas les preuves V74.

[Recherche et écarts](../research/heatwave-reference.md), [température](temperature.md), [habillement](armor.md), [santé](health.md), [preuves](../history/validation-heatwave-v74.md).

## Boucle livrée

Un nouveau camp pédagogique historique reçoit une canicule après 6–7 jours. Lettre et température expliquent l’événement ; préparer un local fermé/couvert, un refroidisseur passif ravitaillé, un lit médical et des tenues tribales permet d’y répondre avec la production existante. Les anciennes parties sans profil de narrateur ni calendrier ne reçoivent pas d’incident au chargement : bouton explicite d’activation. La condition dure 1,5–3,5 jours et atteint +17 °C en 1 200 ticks locaux, puis redescend ; la prochaine est espacée de 30–40 jours après sa fin. Cadence de camp conservée, pas rythme du nouveau profil Cassandra ni narrateur Core complet.

Le même air alimente croissance, semis, production, conservation et exposition humaine. Au-delà de 42 °C, la croissance actuelle ralentit. La pourriture est déjà au taux maximal au-dessus de 10 °C : une canicule ne lui ajoute pas un coefficient fictif. Le refroidisseur vise 17 °C et ne livre toujours pas la réfrigération.

L’isolation portée modifie la plage confortable ; qualité oui, PV non. Tenue tribale normale en tissu : maximum 35,9 °C ; chemise seule : 27,8 °C ; nu : 26 °C. Seuil d’aggravation strict à maximum +10 ; récupération strictement sous maximum, intervalle neutre entre les deux. Santé expose air, plage, stade et sévérité visible dès 4 %. L’effet peut limiter conscience et mobilité, causer douleur, incapacité puis mort ; il est indépendant des blessures et des soins de plaie.

À partir de 35 %, un civil libre cherche un lieu confortable accessible, avec vrai trajet puis attente. Une destination devenue chaude ou bloquée est réévaluée. Les services déjà réservés sont exclus ; une pièce inaccessible ne cache pas une autre solution. Ordres directs/mobilisation, combat et crise sont prioritaires. Aucun bénéfice thermique n’est donné pendant le trajet. Le patient à terre garde les règles de secours/portage ; un lit ne refroidit pas à distance. Le choix thermique complet des lits est encore limité : consulter le guide et la recherche.

## État et frontières

- `heatwave.ts` : calendrier sparse `World.heatwaves`, PRNG privé, intervalle et événements uniques début/fin. `outdoorTemperature(world)` inclut la condition ; l’appel historique avec un nombre conserve uniquement le cycle de base pour les oracles.
- `heat-rules.ts` : isolation, seuils et modificateurs purs. `MedicalRecord.heatstroke?` conserve des milliardièmes de sévérité ; zéro s’efface. Mise à jour une fois tous les six ticks locaux par phase d’identité, sans PRNG. `heat-exposure.ts` termine d’abord l’ancien intervalle médical, modifie l’exposition puis réconcilie les capacités/interruptions/décès.
- `heat-refuge.ts` : intention `Pawn.heatRefuge` avec destination et échéance. Au plus 500 ticks de trajet, puis attente renouvelable de 50 ticks ; navigation/réservations communes. Une cargaison doit pouvoir être déposée avant libération normale : un sol saturé peut retarder ce refuge, sans perte de matière. Combat/crise/incapacité utilisent les interruptions déjà conservatrices.
- `heat-save.ts` : formes, nombres, calendrier et exclusivité des activités. Une destination peut se réchauffer après capture : elle est contrôlée à l’exécution, pas rejetée arbitrairement lors d’une sauvegarde.
- UI sans nouvelle géométrie, diffusion graphique ni calcul médical par frame. Les états passent par le worker et les snapshots existants. Le cache thermique reste partagé ; pas de calcul de pièces par colon. `NaturalResourcePresentation` limite les mises à jour de forêt aux scalaires visibles ; les ancres thermiques n’invalident plus leurs lots. Maturation temporelle et restauration restent contrôlées.

**Migration : V73 strictement validée avant V74**, sans exposition, refuge ni calendrier inventés. Une ancienne version portant ces champs est refusée. Toute reprise conserve sévérité, phase d’identité, trajet capturé, ressources et calendrier. La vérification d’incapacité inclut maintenant explicitement la session de recherche, omission rétroactive corrigée.

## Limites courantes et validation historique V74

La canicule donne une pression réelle avec une réponse obtenable. La tranche V74 ne livrait pas saisons, mortalité des cultures ou autres météos ; leur ajout relève de V87. V75 a ajouté hypothermie et chaîne du froid. Maladies générales, gelures localisées, sélection mondiale du site et catalogue complet d'incidents restent absents ou partiels. ROADMAP porte seule le calendrier ; le numéro de cette tranche historique ne vaut pas état courant d'un jalon.

Contrôles : six scénarios regroupés (seuils/isolation, calendrier/migration, incapacité/récupération, refuge/accès/ordres/reprise, secours, expédition), UI depuis un vrai checkpoint et charge mixte 3/30/100. Le camp d’expédition utilise des provisions initiales déclarées, construit/ravitaille son abri par commandes et traverse huit jours sans injection ultérieure. Il complète les pilotes naturels ; il ne prouve pas une colonie autosuffisante face à tous les climats.
