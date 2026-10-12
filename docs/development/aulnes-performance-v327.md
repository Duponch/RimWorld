# V327 — recherches d’étagères partagées dans MAIN

Lot du 12 octobre 2026, demandé pour améliorer le framerate des Aulnes avec chambre et diorama activés. ROOT seul exécute les contrôles successifs sur sources/tests/pilotes gelés. Les chemins de preuves abrégés ci-dessous partent de `tmp/performance-v327/`.

Le lot réemploie l’index géométrique déjà construit pendant une adoption MAIN pour les recherches d’étagères introduites en V320. Trois consommateurs l’empruntent désormais : refus d’une étagère pour le dépôt d’ingrédients, refus direct pendant la validation de cuisine et recherche de stockage pour la capacité au sol. Cinq feuilles changent : `owned-validation-geometry`, `staging-validation`, `cooking-bills`, `cooking-save` et `ground-placement`. Aucun nouveau registre persistant ni cache entre adoptions ; schéma 229 conservé, règles, qualité et cadences conservées.

Les occurrences gardent leur ordre original : première étagère admissible, doublons compris, puis IDs durables dans l’ordre réel de ses cellules tournées. Politiques, quantités, réservations, terrain, travaux et horloge restent lus au moment de leurs décisions. RAW et staging ordinaire gardent les helpers littéraux, également repris pour les formes atypiques. Une réponse `undefined` admise n’entraîne pas de second parcours. Priorité du lecteur explicite de capacité et rescan historique des stockpiles dans `cellCapacity` conservés : une étagère malformée peut faire manquer sa cellule avant le contrôle de forme, et remplacer ce `undefined` par `null` perdrait une réservation.

L’audit des captures V326 retrouve les huit feuilles concernées exactes au manifeste. Les descendants distincts des recherches d’étagères représentent 222,275 / 271,640 ms proches/larges, soit 2,38 % / 3,16 % des spans complets : coûts échantillonnés, pas économie promise ni durée par image. Le premier appel peut avancer une capture auparavant évitée par un refus précoce ; comparaison complète et froid doivent la payer. Proposition, revue indépendante et lecture finale du code/tests dans `cpu-proposal.md` et `cpu-review.md` ; aucun blocage source restant identifié.

## Herbe : attribution terminée, piste abandonnée

Le diagnostic natif `attribution-Imu10v/report.json` passe ; durée du contrôle ROOT 255,771 s, 2 790 entrées gelées exactes avant/après, quatre sauvegardes/recharges ordinaires du World 8434 exactement identiques. Chrome WebGPU 2560×1440/DPR1, Les Aulnes 250², chambre/carton activés, qualité actuelle conservée. A/T/T/A porte sur le même World en pause ; seule T masque expérimentalement le draw d’herbe, puis restaure son comportement natif.

Proche, retirer le draw entier de 114 975 brins supprime un draw et 229 950 triangles, mais le GPU complet ne passe que de 2,472 à 2,407 ms (environ −0,065 ms), MAIN de 2,165 à 2,089 ms (−0,076 ms). Deux T sont meilleurs que les deux A sur ces moyennes ; p95 GPU complet et MAIN défavorables. Large, l’herbe est naturellement hors rendu, compte zéro dans A et T : c’est un contrôle nul, pas un gain attribuable à l’herbe. GPU complet 2,214→2,223 ms, MAIN 1,826→1,827 ms.

Ces fenêtres en pause, instrumentées, attribuent le draw entier et ses effets de soumission/recouvrement, pas les instructions d’éclairage. GPU complet signifie somme des passes qualifiées, hors uploads/copies/attente/compositor ; les CPU imbriqués ne s’additionnent pas. La faible part récupérable écarte le déplacement des lectures locales au vertex : aucun shader candidat, test supplémentaire d’herbe ou changement de densité. `grass-proposal.md`, fondé sur le code et Three 0.186 installé, reste une étude non engagée.

Premier rouge `attribution-jpFtzN` conservé : readiness expirée / fetch refusé. ROOT a diagnostiqué le refus EACCES de loopback comme infrastructure ; aucune panne produit ni correction de shader n’en est déduite. La reprise possède son propre rapport. Les Chrome/Vite des quatre cohortes réussies sont fermés, erreurs produit vides.

## Contrôles terminés

- Unitaires ciblés : 98 cas / 8 fichiers passent en 15,641 s, dont 8 nouveaux. Première étagère, rotations/IDs, replis, capacités vivantes, réservation malformée 55 contre 75 avec un `null` incorrect et validations de production sont couverts.
- Corpus public : 63 références / 66 fichiers, 68,679 s, `public-controls/public-context-check-kOObp4/report.json` passé. Checkpoints, delta après un vrai tick, anciens Worlds et sauvegardes/recharges RAW/MAIN littéral exacts ; sources/publics conservés. Un tick par référence, aucune campagne longue ni autorité nouvelle pour getters/Proxy.
- Build Pages et typage passent en 11,980 s.

## GAME : gain proche acquis dans le périmètre mesuré

`abba-b4jQga/report.json` passe en 354,602 s, A/B/B/A sans timers/profiler/timestamps ni masque d’herbe. Même Chrome 2560×1440/DPR1, chambre/carton activés et qualité conservée ; ×6 demandé, débit mesuré par ticks confirmés. Les 2 791 entrées gelées restent exactes avant/après.

| Vue | RAF/s A→B | Écart | Débit réel A→B | p95 moyen ms A→B | Maximum ms A→B |
| --- | ---: | ---: | ---: | ---: | ---: |
| Proche iso | 85,766→96,838 | +12,91 % | 5,998→6,046× | 27,85→24,35 | 66,8→55,9 |
| Large perspective | 82,913→96,293 | +16,14 % | 6,059→5,794× | 27,15→24,90 | 62,5→57,5 |

Proche, les deux B dépassent les deux A en RAF/s, à débit réel voisin de ×6 dans les quatre cohortes : gain utile observé. Large, B2 n’atteint que 5,593× ; le gain RAF reste une observation à charge différente, pas une comparaison à débit égal. Quatre recharges de continuation 8978/8987/8962/8987 exactement identiques à leur propre état sauvegardé ; erreurs vides et Chrome/Vite fermés. Ces fenêtres ne prouvent ni 240 FPS en jeu, vrai ×6 constant, absence générale de régression, ni gain GPU produit.

## Coût CPU complet et reprises de pilote

Premier rouge CPU `adoption-cost/paired-pdzdRr`, 39,616 s : préparation de 64 vrais ticks acquise, puis premier enfant refusé avant toute mesure par `ERR_UNSUPPORTED_ESM_URL_SCHEME`. Le chemin Windows passé à `--import` devient une URL via `pathToFileURL` dans une reprise séparée. Les données préparées exactes sont réutilisées, sans répéter les ticks ni réutiliser des mesures.

Rouge CPU `adoption-cost-reprise/paired-6fZA5k` conservé, 59,309 s : premier enfant Node arrêté au délai de 45 s, sans rapport ni log enfant, phase inconnue et aucun échantillon de coût acquis. Gels, sources/runtime et entrées de ce rouge exacts ; la reprise distincte `adoption-cost-final` porte seulement cette borne à 180 s et ajoute des journaux de phase hors mesures. Aucune assertion métier retirée ; aucun résultat de coût déduit de ces arrêts.

La reprise finale utilise quatre processus Node A/B/B/A, le sous-type MAIN actuel extrait littéralement et 66 messages issus de 64 vrais ticks ordinaires des Aulnes : 8434→8497, sauvegarde/recharge exacte, puis tick 8498. Après 16 deltas de chauffe, 48 appels complets `adopt` sont mesurés par processus, cycle du propriétaire privé inclus. Construction et checkpoints sont séparés. Chaque sortie est comparée au World canonique attendu et au lecteur RAW, les anciens Worlds restent immuables. La préparation acquise du premier rouge est réutilisée, zéro tick producteur répété et zéro échantillon réutilisé.

Ce banc mesure l’admission isolée sous Node, pas le coût CPU total de Chrome. Clonage, sérialisation, gardes de sortie, moteur, Worker, dispatch et rendu sont exclus du chronométrage ; les contrôles intercalés perturbent symétriquement le contexte mémoire/JIT. Aucune économie GPU produit n’en est déduite.

`adoption-cost-final/paired-0PSznN/report.json` passe en 245,989 s sous Node 24.11.1 / Ryzen 5 3600. Moyennes A1/B1/B2/A2 : 9,697 / 8,788 / 8,481 / 9,545 ms. Moyenne des 96 deltas par côté : **9,621→8,635 ms, −10,25 %**, les deux B sont inférieurs aux deux A. p95 par cohorte A : 17,751 / 16,596 ms ; B : 15,612 / 15,606 ms. Maximum A 23,092 ms, B 19,447 ms.

Le froid ne gagne pas régulièrement : checkpoints initiaux A 75,654 / 74,386 ms, B 72,586 / 76,834 ms ; recharges A 20,752 / 20,769 ms, B 20,785 / 20,254 ms. Construction entre 0,214 et 0,251 ms. Les 66 sorties MAIN puis RAW et anciens Worlds sont exacts dans chaque processus, les 2 791 entrées gelées et toutes les entrées réutilisées restent exactes. Les journaux finaux montrent des processus d’environ 55–57 s, dont une grande partie est consacrée aux gardes hors chronométrage ; ils expliquent la nécessité d’une borne supérieure à 45 s sans prétendre identifier rétroactivement la phase du rouge.

## Livraison

La modification est retenue : économie CPU complète isolée et gain natif rapproché cohérents, sorties conservées. Les moyennes larges restent à débit différent. Les sources du rendu, `engine.ts`, du Worker et du bridge ne changent pas. Captures rapprochée et large du GAME inspectées ; aucune nouvelle campagne naturelle entière ni nouvelle certification de chronologie de travail.

Package Pages contrôlé en 2,007 s : 515 fichiers, 119 192 223 octets ; les 66 fichiers publics sont exacts, laboratoire et sources privés exclus. Rapport `tmp/elsewhere-pages/v327-package-jn7KTE/report.json`. Le build déjà validé sera publié une seule fois ; les contrôles HTTPS portent sur les octets publiés, pas sur une nouvelle mesure de FPS.

Commit/push et publication unique autorisés, identifiants consignés après leur exécution. `references_UI/` reste hors lot. L’étude `next-render-preparation.md` n’établit pas de groupe végétal récupérable plus important ; aucun autre candidat ni contrôle inchangé n’est engagé.

Le lot n’ajoute aucun gameplay. Gain CPU global non certifié ; relance planifiée toujours PAUSED.
