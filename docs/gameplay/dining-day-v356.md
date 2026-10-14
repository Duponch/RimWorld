# Coin repas et journée naturelle V356

Le lot reprend la sortie [V355](medicine-day-v355.md) à 60031, schéma 236, SHA256 `94a322e69f6e80e3c4ee425a15eb40cac3c67d851d500f435468890c6991f2bd`. Iris 18530, Gaël 18532 et Léonie 18534 gardent leurs identités, biens, besoins et souvenirs. Cette campagne saine reste distincte des branches blessées V340–V344 ; aucune récupération de celles-ci n’est créditée.

## Construction réellement payée

Deux vrais plans UI sont placés sous le toit existant : table à121,111, orientation1, empreinte121,111/122,111 ; tabouret à123,111, adjacent. Les réserves, couchages, porte et cuisinière restent accessibles. Les plans sont adoptés avant le témoin sauvegardé à 60031, puis les travailleurs ordinaires livrent les matériaux et achèvent les meubles à 60577.

La table 19697, qualité médiocre, coûte28 bois ; le tabouret 19695, qualité désastreuse, coûte25 bois. Le bois passe exactement de 85 à 32 à ce checkpoint. Le calcul sépare tout éventuel ravitaillement de la cuisinière 18884 :600 unités par bois,16 unités brûlées par tick de cuisine. Le combustible10240 initial est une quantité comptable, pas10240 ticks de travail. La cuisson déjà engagée par Léonie est conservée et produit un nouveau repas ordinaire ; aucun matériau, travail ou besoin n’est fourni par le pilote.

Le choix de table reprend les [règles de repas existantes](../development/dining.md) et leur [référence](../research/dining-reference.md). Un tabouret accessible est nécessaire pour ce choix assis ; une table seule ne force pas un déplacement de tous les colons. Ce lot n’ajoute aucune règle Core ni nouveau mobilier.

## Premier parcours partiel

Chrome/WebGPU acquiert trois exports/recharges exacts : plans60031, mobilier60577, puis témoin d’ingestion60860. Deux captures inspectées ROOT montrent les meubles et Iris stationnaire sur le tabouret réel, tâche liée à19697/19695, cargo 19698 et progrès 5. La source simple19656/4 est observée au sol, son prélèvement laisse3unités et crée une portion tenue par Iris. Les anciens souvenirs sans table sont conservés avec leurs vraies expirations.

Le premier oracle exigeait un intervalle d’observation de2 ticks. Une lecture du snapshot250² prend suffisamment de temps pour dépasser cette borne même en vitesse1. Il invalide cette portion à 60863, puis d’autres portions ; leur chaîne complète n’est donc pas qualifiée par ce premier contrôle. Les événements de repas observés ne rétroqualifient pas une histoire rejetée. Aucune ingestion complète n’est créditée ici à ce stade.

Le parcours natif finit rouge382,172s/body372,026s. Dernière adoption observée64996 àelapsed171372ms, puis accès au navigateur indisponible ; aucun état66031 n’est acquis par cette tentative. Le `expect.poll` du pilote reprenait les exceptions de lecture jusqu’à sa borne et retardait aussi l’arrêt sur une garde : il est remplacé par une boucle explicite qui propage la première erreur. Le produit ne change pas.

Un événement Windows Application Error enregistre `chrome.exe`155.0.8059.40/KERNELBASE.dll/exceptione0000008 à20:46:38UTC, dans cette fenêtre. Le PID du navigateur de test n’était pas enregistré : association exacte et cause du crash non prouvées. Les erreurs de page enregistrées restent vides ; ce constat ne prouve ni manque de mémoire graphique ni faute du moteur.

Le dernier snapshot adopté64996 est conservé séparément, SHA256 `4ee2579e4d71aacf917629f3195441aa4de3afa5aa108f877ebcb4b0bc48572a`. Décodage strict, validation et aller-retour serialization passent exactement. C’est une observation adoptée, pas un export UI ou une pause qualifiée. Les trois originaux dorment ;26 médicaments restent intérieurs,15 rations/6 repas simples/1 riz sont présents et20 bois restent après les consommations légitimes de combustible. Reprise bornée de cette observation uniquement, sans rejouer les plans et constructions déjà acquis.

## Borne de qualification d’un repas

Pour la continuation, la fenêtre maximale est8 ticks. Le moteur actuel demande50 unités d’ingestion (`INGEST_TICKS`), progresse au plus1 unité par tick pour les humains admis, crée chaque nouvelle tâche à progrès0 et appelle l’ingestion une fois par tick. Un autre repas frais ne peut donc finir dans cette fenêtre. La borne est vérifiée par le pilote ; elle ne modifie ni cadence ni règles du jeu.

Les identités acteur/source/cargo, quantité, aliment et propriétaire restent strictes. La portion doit avoir une source au sol observée, un prélèvement cohérent, une ingestion stationnaire sur le vrai siège/table et une progression non réinitialisée. La fin exige un événement unique de libellé exact dans l’intervalle depuis le dernier ingest attesté, la disparition du cargo et une faim remontée. Un gap supérieur à8, une interruption ou un retour de phase invalide la trace. Aucun repas déjà commencé avant le nouvel input n’est qualifié sans cette provenance.

## Contrôles et portée

ROOT seul, contrôles séquentiels et sources/tests/pilotes figés. Premier typage rouge17,128s : accès nullable à dining corrigé ; audit statique de l’ancrage cuisinière126,116 distinct de son poste126,115. Reprise typage19,685s PASS ; gel2931exact après le premier parcours. Rapports et sorties conservés sous `tmp/early-access-v356/`, notamment `native/dining-day-v356-V356-paid--f6399-cally-qualified-seated-meal/dining-day-v356-summary.json`.

La continuation courte acquiert Chrome/WebGPU PASS 66,788s/body 61,707s : recharge initiale64996 puis finale66037 exactes, aucune erreur de page ni événement lifecycle. La capture finale est inspectée ROOT ; elle affiche06:08 du jour12. Le seuil66000 ne déclenche ici aucune menace constatée. Iris est disponible, faim36,267/repos97,641 ; Gaël et Léonie dorment encore, faim17,813/17,587 et repos95,908/96,182. Leurs alertes de faim sont présentes ; le sommeil ou cette alerte ne prouvent pas une impossibilité de s'alimenter. Aucune nouvelle portion assise ne s'engage dans cette courte reprise, donc aucun repas supplémentaire n'est qualifié. Le premier oracle rouge reste conservé.

Sortie66037 SHA256 `1fcd423d4371197f5e9d6f7c3da2185b9d9743cde33d32dd9c0bcdf22aeecfd9`, dans `tmp/early-access-v356/native-continuation/dining-day-v356-continuati-15b77-31-no-replayed-construction/continuation-final.json`. Réexport64996 SHA256 `a5b854a2fb46772471e1aa6bcf8521dccda71c51d9c2532afd69933fd8277e8b` : premier vrai export UI de cette observation, puis recharge exacte. Les faits initiaux n'ont pas été réparés ou remplacés. Cinq recharges exactes sont acquises sur les deux parcours, trois captures inspectées ; aucune prétention à un unique banc complet PASS.

Deux rouges de typage de continuation19,542s/17,915s révèlent une inférence cyclique de boucle TS7 puis son optionalité ; types Pawn explicites corrigés avant le natif. Dernier typage18,173s PASS, gel 2934 exact après contrôle. L'inventaire courant est également corrigé sur des acquis déjà livrés : lit doubleV313, EMPV273, étagèresV320, alimentation animaleV279, globe/groupeV216, nouvelle partie/arrivéeV333/V335 et remplacement du blueprint de murV348. Les limites de chaque catalogue restent explicites ; les notes historiques ne sont pas réécrites.

QA-only : aucun moteur, bridge, rendu, public ou schéma changé ; aucun build, corpus ou déploiement inchangé rejoué. ProduitV353 `8dc7bf70` et publication `f6ced911` conservés. Une journée locale, même achevée ensuite, ne certifie ni autonomie alimentaire durable, campagne entière, guérisonV344, framerate ou débit réel×6.

Lot utile prêt au commit/push après gate documentaire. Suite autonome préparée : première recherche guidée et constats d’attente, en réutilisant les règles et panneaux existants ; besoins et menace futurs de cette campagne restent des parcours à qualifier.
