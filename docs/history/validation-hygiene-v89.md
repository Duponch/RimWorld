# Validation V89 — entretien, dépouilles et habitat

Livraison du 21 septembre 2026, depuis V88 `f06dd61`, sur `main`, mode jour. Ce lot réunit [dépouilles et tombes](../development/burial.md), [sols et nettoyage](../development/cleanliness.md), [hygiène alimentaire et intoxication](../development/food-poisoning.md), avec optimisation générale. Il ne livre ni tous les objets d'habitation, ni tous les biomes, ni tout le système médical. Les [estimations par domaine](../ROADMAP.md#estimation-davancement) restent fonctionnelles et incertaines, sans conversion en temps restant.

## Références et périmètre

Corpus et identifiants ont été relus puis confrontés au Core local **1.6.4871 rev590**, à ses définitions/classes en lecture seule et à des sources publiques datées. Les [recherches dépouilles](../research/human-burial-reference-v89.md), [sols/propreté](../research/cleanliness-floors-reference-v89.md) et [intoxication](../research/food-poisoning-reference-v89.md) conservent divergences et arbitrages. Aucun XML propriétaire, code décompilé ou sauvegarde personnelle brute n'est publié.

Contenu obtenable : tombe creusée avec filtres/attribution, plancher de bois, dalles de cinq pierres et sol d'acier. Six traces relient circulation, saignement, combustion, décomposition et vomissement à un travail physique. Taille de pierre et Forge sont ajoutées à la recherche ; seul le nouveau Crashlanded révision 4 connaît déjà Taille de pierre, conformément à sa référence de départ. Les anciennes parties ne reçoivent aucune technologie, dalle, tombe, contamination ou maladie.

V88 est strictement validée avant migration V89. Nettoyage est initialisé à 3 pour les personnes ordinaires, 0 pour les visiteurs ; aucune trace passée n'est inventée. Les morts historiques gardent leurs identités et causes : la première simulation V89 commence prospectivement l'observation de leurs corps, sans leur attribuer l'âge de décomposition des mois précédents.

## Contrats regroupés

La campagne centrale réunit **135 contrôles distincts dans 32 fichiers**, complétés par **44 contrôles dans dix autres fichiers**, soit **179 contrôles distincts dans 42 fichiers**. Ils couvrent transports exclusifs, tombe pleine/libération, feu, fraction alimentaire lors de fusion/division, véritable cuisson et ingestion, effets médicaux, maladie d'un jour, sauvegarde/reprise, rejets de champs futurs, sols/réservations/recherche, deltas worker et contrats transversaux. Les reprises ne sont pas comptées comme des tests nouveaux.

Les premiers passages ont révélé des fixtures anciennes sans priorité Nettoyage, un accès à `orders` sur les formats antérieurs à V17, des objets de préparation incomplets et des assertions historiques non actualisées. Les données futures des témoins anciens sont explicitement retirées ; le validateur de production n'est pas assoupli. La comparaison de dotation tient compte des ajouts V88 et de la connaissance V89. Une ancienne fixture de porte reçoit son matériau et son orientation 0. Les erreurs restent dans les journaux `hygiene-group-*`, `hygiene-transverse-*`, `hygiene-final-group-v89.log` et leurs reprises.

La campagne finale confirme **175/175** dans le [rapport groupé](../../artifacts/hygiene-tests-v89.json), puis **4/4** dans le [rapport des départs](../../artifacts/hygiene-scenario-tests-v89.json). Les fixtures pré-V84 retirent aussi le filtre argent et le plafond de pile de 500 introduits en V88 ; la capacité historique de 75 et les assertions métier sont conservées.

Deux défauts d'intégration sont corrigés : un mort déjà transporté ne maintient plus une porte ouverte à ses anciennes coordonnées ; pendant un vomissement, les ordres individuels et de groupe sont refusés atomiquement avant mutation, conformément à l'action non interruptible de la référence. Les politiques restent réglables. Les régressions conservent validation et continuation exacte.

La frontière clinique est préparée explicitement : le scénario produit vraiment un repas à partir de six riz et quatre pommes de terre, fait varier le tirage rare au dernier travail de cuisson, suit dilution/transport et ingestion, puis les trois phases, vomissements, besoins et récupération. Les médicaments restent intacts. Cela prouve les interactions et non une fréquence observée de maladie dans une colonie moyenne.

## Une continuation commune

Le parcours reprend la **colonie Lisière publiée V88**, au tick 956 959/J159,493 : quatre colons vivants, onze animaux et 36 identités ennemies mortes conservées. L'empreinte initiale et la provenance sont contrôlées. Pas de mort, contamination, pluie ou stock injectés ; les tombes, le foyer, le plancher, les murs/portes, les affectations et ordres passent par les commandes ordinaires.

Premier parcours : trois dépouilles inhumées puis nettoyage et production. Le plan de cuisine ferme cependant l'accès au réfrigérateur par un mur en (117,103), devant la porte (116,103). Noé, entré au tick 962 874, reste enfermé à environ −5 °C et meurt au tick 968 778. L'assertion de survie échoue ; le checkpoint est conservé. Le diagnostic établit une erreur du joueur automatique, pas un besoin de réduire les effets du froid.

Le plan corrigé préserve une seconde porte. La reprise à **J161/tick 966 000** ne réécrit pas le monde : elle ouvre d'abord par déconstruction le mur voisin accessible (117,104), puis retire le mur fautif et laisse agir les secours physiques. Une déconstruction directe initialement prévue n'avait aucun contact extérieur accessible ; ce diagnostic de commande est conservé. La reconstruction attend la libération du passage.

La continuation réussit au **tick 969 414/J161,569**, soit **2,076 jours supplémentaires par reprises documentées**. Quatre habitants survivent, trois identités précises restent dans trois tombes, neuf cases de bois sont construites, douze traces nettoyées, 375 unités alimentaires récoltées et douze repas produits, dont trois après la finition de la cuisine. La propreté finale de celle-ci vaut −0,556. **Aucune intoxication naturelle observée** : le parcours n'en revendique pas la fréquence ni une protection absolue.

Le [diagnostic compact de l'échec](../../artifacts/hygiene-pilot-diagnostic-v89.json) conserve l'assertion, la personne concernée et la réparation ; le checkpoint brut local reste disponible dans `tmp`. Aucun échec n'est transformé en succès par suppression d'une assertion.

Bilans nourriture/composants/argent, identités mortes, validation stricte et continuation exacte sur trente ticks sont vérifiés aux jours et transitions. Les 23,54 s du rapport final concernent seulement la reprise de 3 414 ticks et ses contrôles, pas la totalité des essais. [Rapport et commandes](../../artifacts/hygiene-colony-v89.json), [empreinte du checkpoint](../../artifacts/hygiene-colony-checkpoint-v89.json), [fixture propre à Lisière](../../tests/fixtures/colony-v89.json.gz).

## Interface et performance

Le premier parcours Chromium natif réussit en 36,5 s de test : santé/vomissement, choix et suspension de Forge, rectangle de plancher, creusement, foyer/nettoyage, filtres et attribution, transport du défunt, sauvegarde/reprise au portage, inhumation et retrait du sol. Des états cliniques et corps de fixture sont annoncés ; la préparation ne compte pas comme une partie naturelle. [Rapport UI](../../artifacts/hygiene-native-v89.json).

La relecture croisée détecte ensuite un défaut du proxy de sélection : le corps porté suivait correctement le porteur à l'écran, mais son ciblage consultait l'ancienne horloge du défunt. La projection emploie désormais le même segment que le rig. Le parcours complet enrichi et le chargement de la vraie colonie passent **2/2 en 46,9 s** : 136 images de portage au milieu des arêtes, erreur maximale proxy/GPU **0,000098 pixel** contre jusqu'à **23,26 pixels** avec l'ancien calcul sur les mêmes images. La première preuve UI reste conservée séparément.

Le chargement natif de `colony-v89.json.gz` vérifie son empreinte, poursuit **969 414→969 475**, conserve les quatre colons, sols et tombes, puis sauvegarde et recharge exactement. [Rapport de continuation native](../../artifacts/hygiene-colony-native-v89.json). Les sources étaient figées pendant ces deux parcours.

Charge séparée : 100 travailleurs, 100 lièvres, deux visiteurs et deux morts préparés ; tous les anciens oracles environnement/production/commerce sont conservés. CPU p95 **59,05 ms**, pic **105,59 ms** ; image native p95 **18 ms**, pic **84 ms** ; **4,734× pour 6× demandé**. Les règles ne sont pas accélérées. L'optimisation isolée des allocations de toiture économise environ **6–8 % de somme CPU** sur deux comparaisons courtes à état final identique ; pas de gain garanti sur chaque percentile. [Protocole et limites](../research/performance-v89.md).

## Limites et état global

Typage, build final et contrôle général de présentation passent. Ce dernier exerce minage, coupe et changements 1×/6×/1×/3×, sans saut, arrêt faute de données ni occupation solide ; images p95 **6,1 ms**, pics **24/18 ms** sur ce petit camp distinct de la charge mixte. [Rapport](../../artifacts/presentation-v89.json). Contrôle documentaire : **333 documents, 3 620 liens locaux**, 25 identifiants de domaine et cinq familles préservés ; trois sources originales byte-identiques. L'avertissement de bundle supérieur à 500 kB reste présent. Ces validations ne prétendent pas couvrir tous les bugs.

Pas de crémation, sarcophage, dépeçage humain, deuil complet, propreté psychologique générale ou hôpital exhaustif. Catalogue de meubles/décorations, ateliers/recettes, armures, espèces animales/végétales et biomes encore très incomplet. Cuisine, froid, cultures, chasse, artisanat limité, énergie, météo/feux, défense, prisonniers et commerce restent jouables dans leurs périmètres documentés. Monde/caravanes, quêtes et fin de partie ne sont pas livrés.

G0 en consolidation ; G1/G2/G3 partiels ; G4 progresse ; G5 absent. Aucun jalon global clos.
