# Déplacements V492 — état vérifié au 28 octobre 2026 au soir

## Accord humain postérieur au contrôle — intégration autorisée avec dette

**L’utilisateur accepte provisoirement le déficit mesuré de 9,98 à 11,28 % de débit à ×6 et demande d’intégrer Source12 testée puis de committer.** Cet accord remplace la décision précédente de garder tout le code privé ; il ne transforme pas le déficit en gain ni en condition « sans recul » réussie. La dette de coût global et la réactivité complète restent ouvertes.

L’intégration locale porte sur le schéma 297 et les sources authentiques Source12, en conservant les anciennes durées et sauvegardes. Le plan réel comprend282 contenus, dont24 ajouts/258 remplacements ;195 écarts de seules fins de lignes restent côté produit, et trois feuilles victoire dormantes restent hors commit. Les tests canoniques et leur isolation ont été revus ; les contrôles locaux après intégration sont consignés ci-dessous. Le commit du lot est distinct de tout déploiement.

**Cloudflare reste V491/source435f04a2, Production7c8f5074, schéma 296**, jusqu’à une publication distincte. La demande courante autorise le commit, sans inférer un nouveau déploiement. ×1/×3 tiennent leurs rythmes dans les fenêtres acquises (1,021 et 3,017) ; ×4 n’est pas mesuré et aucun coût CPU nul n’est affirmé. La visibilité reste non acquise et la portée foreground des huit ordres n’est pas élargie. L’objectif général, le heartbeat et les six ensembles restent pausés.


## Intégration locale vérifiée après accord

Source12 est intégrée au projet local sous schéma 297 :282 contenus,24 ajouts/258 remplacements,195 différences de seules fins de lignes conservées et trois feuilles victoire dormantes exclues du commit. La carte source sélective après copie comprend2082 entrées, SHA-256 `d0999a15d2267f77cf0b66a212bfa9cdb2c3df8ff37fc76f84aac362fe8b9704`. Aucun essai de navigation, garde Schema1 ou copie rejetée n'est ajouté.

Le typage intégré passe en16,204 s. Le premier typage a détecté trois problèmes propres aux tests canoniques, corrigés uniquement côté tests : assertion que la fixture possède sa carte, déclaration de la query de fixture Phase et type d'un objet NUM. Aucun export de test n'est ajouté dans src.

Les49 suites durables donnent360 cas réussis, trois échecs historiques et un ignoré, en195,731 s. Les deux suites voisines de réception et chemin confirmé donnent18 cas réussis en20,225 s : **378 cas ciblés réussis au total**, sans annoncer une suite globale verte. Les trois échecs Drafting ont les mêmes cas, assertions et raisons que les reproductions V486 et V491 (horloge/propriétaire de détérioration, registre historique invalide) ; les différences de valeurs diagnostiques restent conservées. [Preuve de correspondance](../../tmp/movement-parity-v492/drafting-known-red-identity-console-v1/identity.md). Le test ignoré est explicitement remplacé par les contrats de progression payée ; l'ancien oracle Runtime6Hz est conservé byteexact dans `tests/responsive-controls-runtime-v488.historical.ts`, avec contrats courants297 distincts.

La compilation Pages passe en5,377 s dans un nouveau dossier C, sans déploiement. Les contrôles natifs Source12 acquis auparavant restent la preuve des gestes et des mesures ; aucun benchmark n'est rejoué après l'accord. Les reçus et préimages de copie sont conservés sous `product-integration-v492-2026-10-28T21-10-36.235Z-25256` sur C. Les contrôles de copie ont prouvé l'identité des contenus sélectionnés avec la source privée mesurée. Lors de la préparation Git, deux sources et le helper de tests ont seulement perdu des espaces ou lignes vides après leur dernière accolade. Tous les octets du programme jusqu’à cette accolade restent identiques ; les préimages et empreintes sont conservées dans le reçu C v492-final-eof-formatting.

## Problème ouvert PERF-V492-X6

**Statut : ouvert, accepté provisoirement par l'utilisateur pour cette intégration.** En vitesse demandée ×6, le débit mesuré est4,687 contre5,207 et5,283 pour V491, soit9,98–11,28 % de moins. Il s'agit du débit de simulation, pas d'une perte de FPS de cette valeur. ×1 et×3 tiennent leurs rythmes dans les fenêtres observées ; cela ne démontre pas une consommation CPU identique ni la même marge sur une grande colonie. ×4 n'a pas été mesuré.

À traiter ultérieurement : supprimer ce recul en conservant les règles de déplacement, les états réellement joués, la précision des commandes et la qualité du rendu. Les pics et la réactivité complète restent également des réserves de mesure. La résolution devra être démontrée par une comparaison adaptée ; l'accord actuel ne ferme pas le problème et n'est pas un PASS d'absence de recul. Aucun nouveau lot d'optimisation n'est lancé pour retarder ce commit.

Les mesures et décisions antérieures ci-dessous sont conservées comme historique daté du contrôle, avant cet accord ; elles ne retirent pas l’autorisation nouvelle.

**V492 n'est pas terminée ni livrée. Le produit reste V491.** Le comportement candidat fonctionne sur les parcours acquis, mais sa dernière comparaison confirme un débit de simulation inférieur de **9,98 à 11,28 % à ×6**. Les corrections de rendu réduisent les pointes sans fermer ce recul. Aucun fichier `src` ou test produit V492 n'a été intégré, committé ou publié.

La demande de livraison porte sur les règles de déplacement de RimWorld 1.6 et sur une bonne réactivité, sans dégradation significative. Le contrôle fonctionnel et le contrôle de coût sont deux conditions distinctes. Enregistrer ce rapport ne livre pas la nouvelle mécanique.

## Ce qui a été implémenté en privé

La référence primaire étudiée est l'installation locale RimWorld **1.6.4871 rev590**, DLL SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Le [rapport de comparaison](../gameplay/deplacement-et-redirection-20261027.md) et les [notes de référence](../../tmp/action-latency-v491/movement-urgency-tweener-primary-console-v491.md) conservent les distinctions entre occupation logique, segment payé et interpolation visuelle. Aucun code ou asset propriétaire n'a été incorporé.

Le candidat privé sépare les pas physiques nominaux à 60 Hz des systèmes de besoins, travail et nature maintenus à 6 Hz. Le schéma privé 297 conserve la phase physique. Il calibre notamment la base humaine de 4,6 cases/s, les coûts flottants, la diagonale et les règles de redirection. Un reclic ordinaire conserve normalement le segment déjà engagé puis suit la nouvelle route ; il ne devient pas un demi-tour arbitraire au milieu de ce segment. Les segments historiques chargés gardent leurs coûts capturés.

Les acteurs et leurs chemins sont présentés à partir d'états confirmés, sans World dont on aurait fabriqué le tick ni réponse anticipée. Ces travaux et les tests ciblés ne démontrent pas une identité totale avec tous les cas du jeu de référence.

## Dernière version privée réellement mesurée

La Source12 est figée par [son autorité](../../tmp/movement-parity-v492/candidate-native-authority.v12.json), SHA-256 `dc4a0807875e14174993ebc16614232c4a6c01062fe2eaf41ea9322511265ecd`, et [son reçu](../../tmp/movement-parity-v492/candidate-native-source-seal-receipt.v12.json), SHA-256 `5831deda3b3e80228e1bd8d53333c121f8df01b816876e3f3dbce588aa85632f`.

- 2 079 entrées privées ; les 2 058 entrées produit de référence sont restées exactes.
- Trois modifications de capture de données depuis Source10, puis quatre modifications Main/Client/Queue/Scene depuis Source11.
- 23 contrats de capture acquis ; 15 nouveaux contrats de répartition du rendu et 13 voisins de pause acquis ensemble ; types réels post-installation réussis en 19,696 s pour Source12.
- 37 modules HTTP réellement relevés puis relus exactement, y compris l'import réel de PresentationQueue. Aucun retarget dans le relevé final.
- Les sources rejetées Navigation/Schema et les variantes de copie écartées sont absentes de Source12.

Le premier contrôle de modules après installation a détecté un ancien corps servi par Vite : le seul serveur privé 5198 a été identifié puis redémarré à froid avant les captures finales. Les refus et préimages sont conservés. Les corrections des métadonnées de contrôle n'ont changé aucun code du jeu ni assertion métier.

## Comparaison finale de débit et de rendu

La même colonie publique Les Éclaircies, la même vue, les mêmes réglages et trois fenêtres de huit secondes à ×1, ×3 et ×6 ont été utilisés. L'ordre est témoin V491, candidat Source12, témoin V491. Les parcours ont duré respectivement 165,750 / 164,938 / 156,028 s, avec export réel et recharge propre de chaque état final, sans égalité fictive entre versions jouées.

| Mesure à ×6 | Témoin 1 | Source12 | Témoin 2 |
| --- | ---: | ---: | ---: |
| Vitesse effective de simulation, en multiple de ×1 | 5,207 | 4,687 | 5,283 |
| p99 des intervalles entre callbacks MAIN, ms | 40,0 | 36,1 | 36,3 |
| Plus grand intervalle MAIN, ms | 72,4 | 79,6 | 55,4 |
| Intervalles MAIN > 50 ms | 4 | 5 | 2 |
| Intervalles MAIN > 100 ms | 0 | 0 | 0 |
| Full effectivement délivrés | 63 | 47 | 66 |
| Phases effectivement délivrées | 0 | 135 | 0 |

Le débit candidat est inférieur de 9,98 % au premier témoin et de 11,28 % au second. Les témoins varient entre eux d'environ 1,47 %. Le problème ne peut donc pas être déclaré résolu par la seule variation de charge. Le dernier inventaire avant les mesures ne trouvait pas League/Riot ; aucune absence générale de charge, notamment vidéo Brave, n'est affirmée.

Source12 tient les cibles nominales ×1 et ×3 dans ces fenêtres (mesures 1,021 et 3,017). Cela ne prouve ni absence de tout recul ni coût nul. Les bornes Worker avant/après ont leur propre intervalle ; elles ne sont pas remplacées par une sauvegarde après Pause. Les compteurs Full/phases comptent les retours réussis des vraies frontières de réception. La cadence CPU soumise n'est pas une mesure des FPS physiques ni du temps GPU.

Les trois rapports complets, RAW et reçus sont conservés sur C dans le dossier de visualisations du chat. Empreintes des rapports :

- W1 : `ec8f9cc9bec17b14d0eb5cbf16f1c4b1edd53aaf64dac0be33361dae199c7266` ; dossier `native-cadence-baseline-v11-publication-counters-current-v491-baseline-2026-10-28T20-13-58.765Z-5268`.
- C12 : `0bfc1f7ce7f9ac79d78f0f36df0171761b895bf5bcbbe8070def77b2164f8ef0` ; dossier `native-cadence-candidate297-v12-publication-counters-isolated297-candidate-2026-10-28T20-18-17.905Z-2016`.
- W2 : `569a79d694a79d54271287fab955470fd13c8358cabf13a78d2163f8e62599c5` ; dossier `native-cadence-baseline-v11-publication-counters-current-v491-baseline-2026-10-28T20-21-20.123Z-4936`.

## Correction des pointes et réactivité

Source11 associait ses 46 transitions Full reçue et rendue à la même image à 16 dépassements synchrones de 50 ms, dont un de 100 ms. L'analyse est une corrélation de cadres, pas une attribution causale à une seule fonction. Source12 ajoute une éligibilité au RAF suivant pour les seules mises à jour complètes calmes ; commandes avec requête réellement en attente, pause, remplacement et reprises gardent leur voie immédiate selon l'ancien algorithme confirmé. Les phases futures sont conservées jusqu'au Full correspondant, y compris à Core égal et nouvelle révision.

Sur les fenêtres acquises, les pointes de Source12 sont réduites par rapport à Source11 (p99 MAIN de 53,8 à 36,1 ms ; maximum de 124,2 à 79,6 ms ; 16 à 5 intervalles > 50 ms). Les fenêtres sont distinctes : ce constat n'est pas une mesure causale de gain, et le recul de débit reste présent. Une consolidation hors ligne des neuf traces, sans nouveau jeu ni modification des RAW, a réussi en 0,283 s. À ×6, les 47 transitions Full reçues et les 47 transitions rendues du candidat sont dans des cadres distincts (aucun cadre D+R), ce qui confirme cette séparation dans la fenêtre observée sans qualifier le coût global. [Classifieur et pins](../../tmp/movement-parity-v492/native-frame-transition-classifier-v12-private-v1/freeze.json).

Le parcours Source12 de huit vrais ordres a réussi en 76,602 s : départ, reclics en plein segment, retour, pause/reprise, quatre ordres rapprochés puis pause, conservation du dernier ordre et stabilité pendant 350 ms. L'export final T1765/Core17650 est rechargé exactement ; les enveloppes de mesure sont retirées et les sources inchangées.

La première pause cohérente de ce parcours est soumise 60,8 ms après le relâchement observé du clic ; après la rafale, le premier dessin de pause est à 115,5 ms. Les marks postérieurs et les instants de simple adoption ne sont pas utilisés comme premiers rendus.

Les quatre bleus isolés de ce parcours apparaissent 65,6 / 151,7 / 181,0 / 121,9 ms après l'observation du relâchement du clic, ou 85,8 / 157,1 / 205,2 / 125,9 ms depuis son eventTimeStamp. Le dessin intervient 2,9 / 4,3 / 2,6 / 3,0 ms après adoption. Le délai complet n'est donc pas instantané et ce parcours isolé ne prouve pas une amélioration générale par rapport à V491. Ne pas confondre ces nouvelles mesures avec le mark tardif de 205,2 ms d'un ancien parcours Source10.

Rapport fonctionnel SHA-256 `4356cc0e51e8cd17a0b418e11a277f4839410e0f23c6612087e4d4ccaa4b52d2`, dossier `native-functional-candidate297-v12-FOREGROUND-ONLY-2026-10-28T20-28-28.102Z-15400` sur C. RAW final `24748e2fc181a3ad5b6852f527ce65bb80f73a77a57860006f5eab4cda147a6e`, gzip `14677a4cf2a476fc447628b627e2ebe2677a934f34364dbd7ab0688f9cbcfb97`.

La portée reste **FOREGROUND-ONLY**. La visibilité native n'a pas été acquise : zéro événement dans les essais conservés, cause inconnue, sans attribuer cet échec au headless. Aucun nouveau probe automatique n'a été lancé. Le statut global de ces parcours reste `NOT_QUALIFIED_VISIBILITY_NOT_ACQUIRED`.

## Dernière piste isolée : décision de rejet

Le lot Navigation3+Schema1 précédent était défavorable sans permettre d'attribuer le coût à chacun. Une seule isolation du Nav3 exact, sans Schema1, a donc été exécutée sur Source12 : mêmes 300 Core réels, 42 réveils contrôlés, une copie par paquet, oracles Whole/RNG/paquets et propres LOAD/SAVE exacts dans les trois processus. Aucun de ces fichiers n'a été installé.

| Travail mesuré | W1 | Navigation seule | W2 |
| --- | ---: | ---: | ---: |
| CPU processus, ms | 2 093 | 2 406 | 2 313 |
| Temps écoulé dans la section, ms | 1 459,867 | 1 366,048 | 1 459,250 |

La section est plus courte d'environ 6,4 % en temps écoulé, mais consomme 14,95 % et 4,02 % de CPU de plus que les témoins. Cette divergence, avec JIT/GC compris, ne démontre aucun gain dans le jeu. **Piste écartée, aucune Source13 créée et aucun nouvel essai Native de navigation.** Le banc complet a terminé en 267,884 s ; ce temps inclut les imports, migrations et contrôles hors de la section chronométrée. [Gel](../../tmp/movement-parity-v492/runtime-navigation-only-source12-cpu-private-v1/freeze.json).

## Décision historique avant le nouvel accord humain

La copie candidate, les sources et les preuves restent préservées. Le jeu local produit et la version Cloudflare restent V491/source435f04a2, Production7c8f5074, schéma296. Il n'y a pas de déploiement V492. Les sauvegardes personnelles, références et récents sont intacts ; la vraie campagne exclusive94de/T3328 n'a jamais servi de QA.

Le travail a dépassé son périmètre initial : passage à une horloge physique, nouveau schéma, transport et présentation séparés, puis qualifications successives et essais rejetés. Cela explique une partie de la durée, sans justifier de prolonger automatiquement les séries d'essais. Après la demande humaine de délai, le contrôle en cours est clos et sa décision enregistrée. **Aucune nouvelle série n'est lancée dans ce bilan.**

La condition réellement inachevée reste le coût global et la réactivité complète du candidat. Elle n'est remplacée ni par le succès de tests ciblés ni par une date de livraison inventée. La préparation sélective de 282 sources et des tests reste non installée, avec ses conditions d'intégration non acquises. Les six ensembles, l'objectif général et le heartbeat restent en pause. Le [checkpoint privé](../../tmp/movement-parity-v492/progress.md) fait foi pour une reprise technique ; le [bilan de la nuit](bilan-nuit-20261027.md) distingue les travaux déjà livrés.
