# Première dose médicale intérieure V354

La campagne reprend la [branche de réserve V347](colony-reserve-use-v347.md), distincte des blessés V344. Entrée littérale58168, schéma234, SHA256 `8d931f493fe03abaacd275b341fd994a56727f5f1836dc29ccd2c9b1a0c93a81` : tmp/early-access-v347/native/colony-reserve-use-v347-V3-11420-istinct-literal-V345-branch/consumed.json. Migration neutre236, mêmes Iris18530, Gaël18532 et Léonie18534. Aucun objet ou besoin reconstruit dans ce lot.

## Parcours acquis

Une vraie cellule de réserve est créée à123,114 sous roofing.constructed, configurée médecine seule/priorité3 dans l’UI. Iris est démobilisée par son bouton réel. Le transport forcé de la dose source18975, extérieure127,114, passe par la custody ordinaire : la source disparaît au pickup et le cargo19676 est alloué. Son task conserve source18975, pickupCell127,114 et destination stockpile19675. Le cargo est porté par Iris puis livré à123,114. Les25doses de18695 à129,114 restent exactement inchangées ; total26 conservé.

Ce transfert ne prouve ni administration de médicament, soin, protection durable ou récupération de V344. La réserve contient une seule dose à cette frontière. Médecine possède une pile maximale25 et une portion de transport limitée10 : la suite prépare une seconde cellule intérieure pour les25doses restantes, puis une continuation naturelle jusqu’au changement de jour. Aucun résultat futur acquis.

## Qualification et limites

ROOT seul, contrôle Chrome/WebGPU acquis par reprise PASS55,281s/body49,918s, erreurs[] et aucun danger sous les gardes du parcours. Cinq exports/recharges exacts : entrée58168, configuration58168, ordre58168, cargo58199, livraison58206. Trois captures de la reprise et une rouge inspectées ROOT ; le toit/la custody sont vérifiés dans le snapshot, la capture ne suffit pas à certifier tous les objets visibles.

Sortie58206 SHA256 `4ca356d81a0646f1aff0e721f237a3f8679f802cac5ba307e5f11879f755cb39` dans tmp/early-access-v354/native-reprise/medicine-reserve-v354-V354-5ea2a-rom-the-literal-V347-branch/delivered.json. Les autres SHA, événements et snapshots sont dans medicine-reserve-v354-summary.json au même endroit. Gel2928 exact. Typage avant reprise PASS17,015s ; typage final après helper PASS16,140s.

Le pilote privé a d’abord été corrigé sur lecture statique : World utilise roofing.constructed, la médecine reçoit un nouveau cargoID même pour une dose entière, et l’export d’un arrêt doit lire l’état de conservation sans rejouer la garde de progression. Les gardes originales d’arrêt restent actives pendant le jeu. Le typage rouge22,487s venait du paramètre queue requis omis dans order-haul ; queuefalse est désormais explicite.

Premier natif rouge45,768s/body39,597s à58168, avant transport : le helper demandait le bouton Inspecter supprimé à la demande humaine V348. Son chemin select utilise désormais les vrais Escape et vérifie qu’aucun outil n’est actif. Le produit conserve cette sélection native et ne réintroduit pas le bouton. Rapport/export d’arrêt, capture et reprise restent dans native/native-reprise. Le helper est exercé par la réelle sélection/configuration de réserve de la reprise ; aucune suite native exhaustive n’est prétendue.

Aucun moteur, bridge, rendu ou fichier public changé ; lot QA/pilote seulement, aucun nouveau build/corpus/déploiement requis. Produit V3538dc7bf70 et publication f6ced911 restent exacts. Aucun FPS, campagne entière, autonomie alimentaire, récupération V344 ou early access100% certifiés. Suite autonome : réserve médicale complète puis fin de journée avec les mêmes personnes et les règles ordinaires, sans forcer les ingestions.

LotQA commité/poussé en `7a0be77f`, documentationPASS1,350s ; [suite réserve complète et aube V355](medicine-day-v355.md).
