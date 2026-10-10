# V299 — préparation commune des bâtiments

V299 est retenue : **121,47→130,25 images RAF/s (+7,23 %)** sur Les Aulnes intégrées, Chrome 1440p/dev. Le débit confirmé passe de **5,618→6,056×** sous la même vitesse demandée ×6 ; ce n'est donc pas une comparaison à débit strictement identique. Les deux candidats dépassent les deux références en FPS et maintiennent ×6. La moyenne des p95 d'intervalles passe de **22,4→18,3 ms**. **240 FPS et une fluidité constante restent à atteindre** ; aucun gain de temps GPU n'est établi.

Base produit exacte V296 `b6ac00bf`, HEAD documentaire V298 `6ee43b37`. Moteur, règles, qualité, cadence, schéma 218 et les 63 sauvegardes/66 fichiers publics sont conservés. Ce résultat local ne s'additionne pas aux gains précédents et ne remplace pas leurs mesures.

## Changement et contrat

Les [attributions V297](aulnes-performance-v297.md) et [V298](aulnes-performance-v298.md) justifient un retrait groupé de préparation MAIN. Les portes, la signature d'apparence des constructions et les effets de bâtiments parcouraient plusieurs fois les mêmes 2452 structures. Le rendu MAIN privé partage désormais leurs orientations et leurs listes utiles ; la signature recapture seulement les positions confirmées modifiées. Les effets conservent leur clé dynamique complète et évitent de refaire la géométrie sur un hit historique. Les misses paient encore le calcul historique complet, y compris une seconde clé.

Un journal structural indépendant du membership des ressources publie ses ordinals et cases de terrain **après toutes les gardes et l'engagement de la planète**. Ses copies de primitives sont immuables, limitées à 64 arêtes et 131072 indices ; aucun World, paquet ou bâtiment n'est retenu dans ses records. La composition A→C lit les feuilles finales de C, même si D est déjà décodé. La construction d'une Map d'ordinals pendant la reconstruction reste un coût réel, inclus dans le banc complet.

Ajout, retrait, ordre explicite, paquet complet, checkpoint, changement de domaine, éviction ou témoin absent imposent le chemin complet. Un refus, stale ou throw ne publie rien. Resource peut changer de membership sans invalider un suffixe structural valable. Les coordonnées/types modifiés, les jobs de murs/portes et les changements de terrain invalident les orientations appropriées ; les clés de jobs sont relues à chaque application. Animations, état EMP/panne, activité des travailleurs, tirs, feux et ondes restent évalués à la cadence historique. Les portes gardent leur seconde mise à jour lors d'une reconstruction de mobilier.

L'autorité vient du **renderer MAIN non exporté et de ses lecteurs fixes**, avec accès DEV cloné. Le journal, un booléen readonly ou l'identité d'un World n'accordent aucune autorité sur une API RAW. Core et ColonyRenderer publics gardent leur préparation historique ; le nouveau hook protégé est inactif par défaut. Les consommateurs natifs reçoivent les feuilles courantes, jamais une ancienne structure. La projection invalide sa base avant les lectures pouvant échouer ; reset, setter sur un autre World et disposal gardent leurs replis. Les ACK floraux, collisions de signatures et anciennes vues sont contrôlés. Aucun shader, matériau, ordre de dessin, qualité, horloge ou protocole réseau n'est changé.

## Coût complet contrôlé

Preuves privées sous `tmp/performance-v299/`. Gel `controls-reprise/freeze-Z2m7tc/manifest.json`, SHA **4E465AFC** ; rapport `controls-reprise/run-3TGsWd/report.json`, SHA **A2CEE0AE**, **PASS28,580s**. Source réelle 8434→8498, 64 ticks ordinaires, huit de chauffe puis 56 mesurés, quatre consommateurs A/B/B/A frais. Une seule simulation/encodeur fournit les mêmes paquets à chaque étape.

Le span inclut clone, classe MAIN extraite littéralement avec son owner V295, adoption et nouveau journal, package, projection, orientations, portes, signature, seconde mise à jour des portes/ACK si requis et effets. **Il ne représente pas tout Core** : transport navigateur, autres couches inchangées, dessin et GPU sont exclus. Les oracles sont exécutés hors fenêtres, après les quatre spans.

| Mesure | Référence | Candidat |
| --- | ---: | ---: |
| Moyenne, 112 spans par côté | 16,333 ms | 14,854 ms |
| p95 | 22,359 ms | 20,406 ms |
| Maximum | 47,137 ms | 33,525 ms |

Gain de **1,480 ms, soit −9,06 %**. Moyennes A1/B1/B2/A2 : 16,847/14,927/14,780/15,820 ms ; les deux B sont inférieurs aux deux A. B utilise un suffixe dans 56/56 applications mesurées, K25–29 sur 2452 structures. p95/max agrégés favorables, mais ceux de B1 dépassent ceux d'A2 : pas amélioration universelle des pointes.

Le froid est dispersé, sans gain attribué. Les checkpoints sont **plus chers** : B146,59/142,08 ms contre A128,77/122,15 ms. Les replis complets sont également mixtes. Ces coûts ne sont pas cachés dans une moyenne ordinaire. 276 comparaisons de World et 207 comparaisons de consommateurs passent : graphes, F32, versions requises, bornes, clés et plans floraux. Anciennes vues intactes ; sauvegarde/recharge au tick 8498 puis vrai tick 8499 exact. Aucun pixel physique ou upload GPU n'est certifié par ces oracles CPU.

## Jeu Chrome original

Gel `game-structure/freeze-BXZTHM/manifest.json`, SHA **D18E3155** ; rapport `game-structure/abba-VHKUwq/report.json`, SHA **BD56828C**, **PASS241,264s**. Neuf modules A/B mappés, clients non instrumentés, quatre Chrome/Vite frais successifs sur le port 5339. Même source8434, caméra129/122/zoom1, 2560×1440/DPR1/dev, qualité identique, chauffe3s puis fenêtre14s. Aucun timer CPU ni profil dans le GAME.

| Cohorte | RAF/s | Débit confirmé | p95 | Pire intervalle | Recharge exacte |
| --- | ---: | ---: | ---: | ---: | ---: |
| A1 | 122,11 | 5,338× | 22,7 ms | 50,5 ms | 8983 |
| B1 | 130,08 | 6,045× | 17,9 ms | 37,3 ms | 9051 |
| B2 | 130,42 | 6,067× | 18,7 ms | 38,1 ms | 9047 |
| A2 | 120,82 | 5,899× | 22,1 ms | 43,1 ms | 9039 |

Agrégation pondérée121,4657→130,2461RAF/s, débit5,6185→6,0560×. La référence ne tient pas uniformément ×6 dans ce cycle, particulièrement A1 ; aucune cause de sa variation n'est inventée. Le candidat améliore ici à la fois FPS et débit. Les quatre recharges, sources/publics, mappings et fermetures passent, erreurs vides. L'adaptateur matériel AMD RDNA1 est disponible ; ce témoin requestAdapter est distinct du GPUDevice réellement utilisé par le renderer. Ce banc n'établit ni écran240Hz, ni temps GPU, ni résultat pour toutes les caméras/parties.

## Validation

- Typage produit **PASS6,651s** ; 55 cas/11 fichiers acquis par groupe et reprise de l'ordre attendu des exports. Aucun code produit corrigé pour ce rouge de fixture.
- Banc/types de contrôles **PASS2,980s** après trois assertions de mutabilité TypeScript dans une copie distincte ; corps JavaScript inchangé. Original rouge conservé.
- **13 cas permanents/4 fichiers PASS9,694s** : journal confirmé, refus/éviction/composition, projection, portes/effets et ACK floraux. Les neuf corps consommateurs réemploient les cas privés avec seuls imports relocalisés ; le journal permanent ne recopie pas un ancien Decoder. Lancement `npx` ENOENT conservé, reprise Node sans changement de test.
- Corpus `public-controls/public-context-check-KjPAgL/report.json`, SHA **3BB80E27**, **PASS81,451s** :63 références/66 fichiers, checkpoints/deltas RAW contre classe MAIN actuelle littérale, un vrai tick par référence, anciennes vues et sauvegarde/recharge exacts. Ce n'est pas une campagne longue.
- Build avec types **PASS9,408s** ; build Pages avec typage final des tests permanents **PASS8,233s**.
- Documentation reprise **PASS0,880s**, 907 documents/8589 liens, 25 domaines et cinq familles de validation.

Premier coût `controls/freeze-NS55Xo` rouge avant toute mesure : égalité du corps MAIN échouée sur CRLF/LF. Reprise distincte normalise seulement les fins de lignes de cette assertion, conserve les hashes bruts et n'altère aucun corps testé. Tous les rouges/gels initiaux demeurent intacts. Aucun fichier produit modifié après les gels de coût/GAME. Les tests permanents et les documents sont ajoutés ensuite.

Le premier contrôle documentaire signale deux en-têtes sans mention analysable du schéma ; ils sont corrigés sans modifier le produit. Revues indépendantes : `final-integration-review.md` (BDE97113), `cost-result-review.md` et `next-priority-review.md`.

## Publication et suite

Commit/push par lot maintenus ; une seule publication Cloudflare est regroupée pour cette série V297–V299, selon la [procédure Pages](cloudflare-pages.md). La relance planifiée reste en pause. La suite doit cibler les coûts actuels de préparation/soumission des objets Three, avec nombres d'objets et visibilité réellement observés, avant de modifier batching ou culling. Aucun ancien candidat audio, agenda, Worker ou freeze inchangé n'est relancé ; aucune accélération WASM présumée.

Produit commité/poussé en `c4f4f8ce`, puis publication regroupée `39a1cdf9` : déploiement **PASS13,654s**, HTTPS **PASS0,863s**, sept fichiers exacts. Les66fichiers publics de sauvegarde/catalogue restent identiques dans le build. Aucun FPS supplémentaire n'est attribué à l'hébergement.
