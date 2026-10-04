# Validation V202 — éruption solaire et secours électriques

Contrôles du 4 octobre 2026, schéma 184. [Contrat](../development/solar-flare-v202.md), [recherche Core et adaptations](../research/solar-flare-core-v202.md). La condition relie le réseau existant au froid, à la lumière, aux cultures et aux ateliers ; aucun objet, recette, météo ou traitement graphique nouveau. Mode jour : commit local puis attente de relance.

## Contrôles ciblés et reprises

**138 tests réussis dans 28 fichiers uniques**, sans ignoré ni échec final : 120/24 dans `tmp/v202/targeted-final.json`, 4/1 de catalogue dans `transport-catalogue.json`, 14/3 de transport/publication dans `bridge-final.json`. Calendriers World/Misc/ThreatSmall, réseau/batteries/interrupteurs/solaire, serre, froid, environnement de travail, couture, portes, pluie électrique et pannes sont exercés. Ce n’est ni la régression quotidienne exhaustive ni une campagne naturelle longue.

L’agenda conserve J15 strict, tentative 1/900, tickets absents silencieux et cooldown depuis le début. Un ticket refusé ne tire pas sa durée. Migration strictement validée de 183 puis changement du seul numéro ; absence d’adoption en pause, au chargement ou au pas nul. Formes fermées, compteurs, dates et PRNG invalides refusés. Le champ futur propre à 183 est refusé même s’il vaut `undefined` dans un paquet structuré. Deltas au même tick et témoins immuables, refus atomique et retrait du champ sont contrôlés ; création/fin de condition déclenchent aussi la publication discrète.

Le réseau est exercé au vingt Core, avec arrondi pair et tirages avec remplacement, même en surplus sans batterie. Sources et combustible restent actifs, fuite normale des batteries placées/emballées et demi-quantum conservés ; aucun transfert ni démarrage pendant la condition. Une fin non multiple de dix Core reprend les échanges seulement après sa borne exacte, sans attendre un tick complet. Interrupteur réellement ouvert, carburant vide et panne restent distincts. Un consommateur délesté cesse d’être admissible au danger de pluie ; une batterie exposée encore au-dessus de 100 Wd ne devient pas immune.

Trois parcours `stepWorld` complets déclenchent et terminent réellement la condition après une occasion préparée : croissance sombre sans rattrapage, âge alimentaire monotone, réchauffement du froid et reprises exactes ; ouvrage de couture avec auteur/matière/progression conservés et vitesse manuelle 0,5 ; cuisine par quatre et recherche avancée interrompues puis reprises, avec quarante ingrédients réellement consommés et quatre produits. La saturation du dépôt et la phase de produit déjà achevé ne disposent pas d’un nouveau scénario solaire spécifique : leurs règles existantes sont conservées, sans prétendre à leur couverture exhaustive ici.

Trois anciens oracles ont été réparés après diagnostic : la rétro-fixture 168 gardait le nouveau calendrier World ; celle de porte 141 gardait les permissions alimentaires/vêtements du renard introduites après sa version ; l’oracle de fumée attendait huit bouffées de générateur au lieu du profil actuel de dix. Les assertions métier, refus de champs futurs et migrations restent stricts ; arrêt/réactivation de fumée vérifient aussi les mêmes buffers/matériaux résidents. Un littéral de schéma courant et l’inférence `never[]` d’une nouvelle fixture ont été corrigés pour le typage. Les premiers résultats rouges sont conservés sous `tmp/`.

Build/typage final passé, **696 modules**, avertissement existant sur les chunks de plus de 500 ko (`tmp/v202/build-final.log`). Les **48 payloads publics** passent hash du contenu décodé, validation stricte, sérialisation exacte et un tick réel de continuation comparée (`tmp/v202/payloads.json`). Les 47 fiches précédentes sont identiques et leurs fichiers historiques ne sont pas régénérés. La nouvelle scène déclare matériels/recherches/charge et horloge préparés ; quarante vrais ticks établissent son courant avant l’occasion future. Aucun passé naturel revendiqué.

## Chromium et présentation

Parcours public Chromium matériel WebGPU **1/1**, 40,1 secondes de test, 1440×1000, scène préparée 32². Chargement par le catalogue réel de 48 entrées ; début confirmé **90100**, consommateurs arrêtés **90108**, sauvegarde/reprise exacte **90108**, lampe et régime agricole revenus **91023**, après expiration réelle `endCore=910000`. Lettre, durée, inspection de lampe/batterie et deux caméras sont exercées ; captures relues. **76→76 pipelines**, aucune erreur console/GPU. Rapport et captures sous `tmp/test-runs/v202-native/artifacts/solar-flare-v202-*`.

Présentation minage/abattage 250², trois personnes, vitesses 1×/6×/1×/3× : `npm run test:presentation` passé. p95 RAF **4,3 ms** pour les deux actions, zéro saut, excès continu ou occupation solide. Rapport sous `tmp/test-runs/v202-presentation/artifacts/harvest-sync-verification.json`. Ce contrôle voisin confirme les phases/horloges, pas une simulation naturelle de plusieurs jours ni un gain général de cadence.

## Mesure CPU et limites

CPU, puis navigateur, puis présentation ont été exécutés successivement, sources produit gelées. `scripts/profile-solar-flare-v202.ts` mesure seulement `advancePower` préparé sur 250², Ryzen 5 3600, Node 24.11.1 : quatre sources bois actives, une batterie de 100 Wd, topologie réutilisée, remise des états hors chronométrage. 48 échauffements, 200 échantillons par bloc ordinaire/solaire/solaire/ordinaire. Rapport `tmp/v202/cpu-power.json` avec empreinte des sources.

| Consommateurs | Médianes ordinaires | Médianes condition active |
| --- | --- | --- |
| 3 | 0,0313–0,0323 ms | 0,0242–0,0258 ms |
| 30 | 0,0376–0,0401 ms | 0,0283–0,0309 ms |
| 100 | 0,0613–0,0776 ms | 0,0387–0,0396 ms |

Ce sont deux régimes physiques différents, **pas un avant/après ni un gain produit**. Génération, combustion, décisions d’acteurs, reste du tick, worker, RAF et GPU exclus. Les sources seules sans stockage gardent le chemin stable ; aucun scan graphique ou de forêt supplémentaire. Aucun nouveau shader/lot/lumière Three et pipelines stables observés ne prouvent pas un coût GPU nul. Pas de nouvelle mesure GPU chronométrée ni de performance générale de colonie établie.

Recherche/cadrage environ dix minutes, implémentation parallèle environ quinze minutes, validation et publication environ dix minutes ; estimations de travail, pas mesures de productivité. Le premier contrôle élargi a révélé les trois oracles historiques, le build initial les types de fixtures ; corrections bornées puis reprises ciblées. Une vérification de catalogue demandait deux noms de tests inexistants : seul le fichier effectivement joué est compté, puis les vrais tests bridge/publication ont été exécutés séparément. Un sous-processus Git de contrôle de payload a rencontré EPERM ; lecture Git via PowerShell puis contrôle sans ce sous-processus, sans toucher à C:.

Eclipse/Aurora, EMP/Zzztt, monde multicartes, narrateur mondial exhaustif et son solaire dédié restent absents. G0–G5 restent ouverts ; fréquence naturelle, toutes coexistences et campagnes longues non exercées.
