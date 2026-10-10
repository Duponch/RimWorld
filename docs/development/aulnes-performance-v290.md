# V290 — validations communes dans le client du jeu

V290 est retenue : sur Les Aulnes intégrées, Chrome matériel 1440p/dev, la comparaison avec le produit V288 donne **81,90→99,14 images RAF/s (+21,06 %)**, à débit réel **6,001→6,010×**. Le coût moyen d'adoption mesuré séparément baisse de **14,38 %**. Les deux candidats dépassent les deux références ; les 240 FPS et une fluidité constante restent à atteindre. Aucun gain GPU mesuré. Moteur, rendu, règles, schéma 218 et 63 sauvegardes publiques restent inchangés.

## Changement

Le client interne du jeu possède son décodeur et ses consommateurs fixes. Sa façade expose les commandes et notifications, sans instance, adoption ou callback recevant le World. Les APIs publiques conservent leurs callbacks mutables et lecteurs historiques. Cette fermeture repose sur les accès réellement présents dans main/UI/rendu/audio, sous les intrinsics ordinaires du programme ; elle ne donne aucune autorité à un booléen readonly, à un MessageEvent ou à un appel public du helper.

Pendant une seule adoption, les validations partagent les parents électriques et la géométrie. Une capture paresseuse des ressources sert leur présence et le nombre d'occurrences chevauchant les bacs hydroponiques. Ces domaines restent distincts : les coordonnées hydro utilisent les clés linéaires historiques, avec doublons et alias ; la présence compare x et z séparément. Un index des ancres des constructions sélectionne les occurrences candidates, conserve leur ordre, puis applique exactement `footprintContains`. Le domaine dense est borné à 1 048 576 cellules ; les données atypiques retrouvent le parcours historique.

Aucun résultat métier n'est conservé entre paquets. Quantités, propriétaires, capacités, réservations, terrain, travaux et horloges restent lus aux sites historiques ; tous les gardes conservent leur ordre et leurs refus. Une commande en attente peut utiliser la géométrie commune tout en relisant ses propres réservations. Le refus jette le contexte local. Aucun nouveau clone, freeze, Worker ou parcours intégral de découverte du graphe ; cadence et qualité conservées. Le changement concerne le chemin commun de toutes les parties, mais leur gain dépend de leur charge.

## Mesure Chrome

Base exacte `2c40114e` (produit V288), dix feuilles gelées sous `tmp/performance-v290/freeze-xZpXKm`, manifeste `ED292EEB`. Chrome matériel AMD/WebGPU, Vite dev, 2560×1440/DPR1, checkpoint 8434, caméra orthographique 129/122/zoom1, réglages identiques. Chauffe 3 s puis mesure 14 s. Chaque cohorte possède une fenêtre FPS originale et une seconde partie fraîche instrumentée pour l'adoption réelle du client MAIN. Son contexte et ses captures sont inclus ; clone/désérialisation navigateur, livraison, rendu et GPU sont exclus. Ces fenêtres ne sont pas additionnables, et le surcoût des chronomètres n'est pas soustrait.

| Cohorte | RAF/s | Vitesse réelle | p95 intervalles | Adoption moyenne, fenêtre séparée |
|---|---:|---:|---:|---:|
| V288 A1 |79,84|6,006×|27,7 ms|10,511 ms|
| V290 B1 |99,42|6,012×|22,1 ms|8,683 ms|
| V290 B2 |98,86|6,008×|23,6 ms|9,031 ms|
| V288 A2 |83,95|5,997×|25,9 ms|10,182 ms|

Agrégats : RAF 81,898→99,142/s ; vitesse 6,0011→6,0097× ; moyenne des p95 d'intervalles 26,80→22,85 ms. Les plus grands intervalles B restent 38,1/48,7 ms : aucune absence de saccade promise. Adoption instrumentée : 988/980 appels, moyenne 10,344→8,856 ms, p95 13,6→12,3 ms et coût cumulé 364,26→309,44 ms par seconde. Ce dernier chiffre ne mesure pas le CPU total du jeu. Les gains des lots antérieurs ne s'additionnent pas à ces pourcentages.

La comparaison comporte une interruption de parcours, explicitement tracée ci-dessous : quatre cohortes distinctes A/B/B/A, huit contextes, mais pas un second cycle indépendant ininterrompu. Le résultat headless local ne certifie ni écran 240 Hz, ni toutes les caméras/parties. Aucun nouveau noyau numérique dominant justifiant WASM n'est établi par ce lot.

## Validation

110 cas uniques dans onze fichiers, dont dix nouveaux, passent par reprises ciblées. Typage final 5,599 s et build 1,561 s. Géométrie de tout le catalogue/quatre rotations, doublons/alias/replis, quotas et réservations, refus/stale/remplacements/anciennes vues et contrats publics client/audio/codec sont vérifiés. Deux rouges de fixture sont conservés : `addGroundMaterial` retourne void, puis son placement normal évitait correctement la cellule réservée ; la fixture finale pose explicitement une pile pour exercer ce refus. Aucun produit réparé pour ces rouges.

Les 63 sauvegardes et 66 fichiers publics restent exacts. Le contrôle compare le décodeur RAW et une extraction littérale de la classe MAIN : checkpoint/delta, graphes entiers, vues retenues, sauvegarde canonique et un véritable tick sur deux mondes identiques. Treize références passent avant un oracle de fichier trop strict : JSON retire normalement `gatherId: undefined` dans `enclos-v119`. La reprise compare les octets sérialisés du roundtrip, conserve les comparaisons profondes RAW/contexte et poursuit les cinquante références restantes. Rapport `tmp/performance-v290/public-context-reprise-wODiso/report.json`, PASS 31,466 s ; rouge initial 31,265 s conservé. Ce corpus qualifie les requêtes, pas à lui seul la propriété native du client.

Le natif qualifie cette propriété réelle et huit sauvegardes/recharges exactes : A1 9056/9057, B1 9055/9055, B2 9056/9052, A2 9057/9055. L'arrêt complet B2 recharge exactement 9052 puis continue jusqu'à 9063, monde valide. Cette continuation n'est pas un oracle indépendant du premier tick. Erreurs natives vides, sources et publics exacts, navigateurs et serveur privé 5323 fermés.

### Provenance des reprises du banc

- Initial `native/abba-Eh9dcS`, FAIL 371,189 s : A1/B1 réussis ; après les mesures B2, le pilote tente le menu situé dans le shell volontairement inert après arrêt. Cet ancien B2 `3-b-0l6g9v` est entièrement exclu du résultat final.
- Reprise `native-reprise/freeze-m2EO7g`, gel `8B8984CE` : chemin réel `incident-colonies` → accueil → sauvegarde locale. B2 `3-b-ejGtj1` acquiert ses deux fenêtres et l'arrêt/reprise, mais son contrôle final échoue en 100,899 s : un sous-agent a modifié après gel le commentaire et deux textes du driver d'agrégation. Cette édition est une erreur ; le rapport reste rouge.
- Audit distinct `reprise-metadata-audit-u95lVB`, PASS 0,953 s : inverse des trois retouches restituant exactement le SHA initial du driver, seul fichier changé dans les empreintes, tous les autres scripts/client/recette/sources/publics exacts. Il qualifie les preuves B2 déjà acquises sans transformer rétroactivement le rouge en PASS. Script d'audit `7457F9B5`.
- A2 seul termine sous gel `58400657`, `native-reprise/4-a-final-SwyR19`, PASS 94,223 s. Aucun autre A1/B1/B2 rejoué. Assemblage final `final-qualification-RQKKQx/report.json`, SHA `FBEA792B`, PASS 0,086 s, avec chaque rapport et son statut d'origine.

Les gels, rouges, captures, revues et recettes restent sous `tmp/performance-v290` ; journaux sous `tmp/validation-runs/aulnes-v290-*`. Le contrôle commun de mouvement n'est pas répété : horloges, poses, cadence, encodeur et rendu sont identiques, et les contrats client/codec ainsi que le parcours natif sont contrôlés. Aucune campagne longue annoncée.

Contrôle documentaire PASS 0,870 s ; liens locaux et six en-têtes courants au schéma 218 vérifiés. Aucun serveur ni contrôle lourd encore actif à la clôture.

## Suite

Une attribution MAIN après cette livraison doit précéder la prochaine refonte : les poids V287 ne sont pas des budgets V290. L'étude `tmp/performance-v290/next-causal.md` propose de partager les faits de ressources pendant une adoption, aux emplacements historiques des gardes, sans cache métier durable. Elle est seulement étudiée, sans code ni gain acquis. Les anciennes pistes Workers/freeze et la comparaison électrique V289 restent écartées ; aucune relance inchangée justifiée.
