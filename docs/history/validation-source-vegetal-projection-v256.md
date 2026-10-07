# V256 — validation et rejet de la projection végétale couplée

**Candidat écarté avant GAME : aucun FPS ajouté.** Produit V242, schéma 198 et 62 références/65 fichiers publics exacts. La qualification Aulnes achevée est distincte des rapports natifs globaux rouges ; mixed reste non qualifié dans son intégralité. [Contrat](../development/source-vegetal-projection-v256.md), [recherche](../research/source-vegetal-projection-v256.md).

## Sources, composants et reprises

Le candidat privé part des 850 fichiers boundary V255, manifeste `1E71423A…`, puis applique Source→Native→Render avec ancrages stricts et inverses entiers. Ses 855 fichiers ont pour manifeste `791F0BBDC234E525E6031F8796502088C623CE1CD0D29B494F0BFF7607EC9737`. La source produit reste inchangée.

Les 20 cas composants passent après deux reprises de fixtures distinctes, sans modifier le runtime candidat : assertion de type sur la fixture négative de dimensions, puis comparaison du retour Nature matérialisé avec le vrai read public de référence. Les rouges initiaux restent conservés. Le typage du premier banc nécessite également une reprise de config, avant les contrôles natifs. Les [rapports composants](../../tmp/performance-orientation-v256/captures/run-component-return-reprise-components-2026-10-07T21-00-42.743Z-6cGKIH/report.json) et [typage repris](../../tmp/performance-orientation-v256/captures/run-component-return-reprise-types-2026-10-07T21-00-26.621Z-dipMys/report.json) passent sur GEL `66CDD9E9…`.

| Contrôle | Verdict conservé | Durée |
|---|---|---:|
| Typage et 20 composants repris | PASS, candidat inchangé | Voir journaux liés |
| Helper compact, six cas | PASS | 1,804 s |
| Typage du banc compact | PASS | 4,893 s |
| Audit hors ligne Aulnes achevées | PASS, périmètre Aulnes seulement | 8,742 s |
| Reprise mixed, plafond 384 MiB | FAIL après arrêt du navigateur possédé par ROOT | 413,799 s |
| Coût complet, huit cohortes ABBA | PASS, économie insuffisante | 69,056 s |

## Oracles : preuves achevées et rouges

Le [premier oracle](../../tmp/performance-orientation-v256/pipeline-controls-next/captures/run-oracles-2026-10-07T21-02-58.288Z-OJXx8m/report.json) reste FAIL : A échoue avant B dans `JSON.stringify(scene.state)` avec `RangeError: Invalid string length`. Aucun résultat A/B n'en est déduit.

La [reprise compacte](../../tmp/performance-orientation-v256/pipeline-capture-reprise-next/captures/run-oracles-2026-10-07T21-15-47.070Z-z2NRY1/report.json), GEL `942D806D…`/3 647 fichiers, représente les références et tous les octets des buffers, y compris capacité inactive, padding et bits NaN. Elle garde une ombre courante et des patches par capture ; ROOT compare exactement les artefacts A/B décompressés, sans verdict fondé sur le hash seul. C différé après adoption de D est capturé séparément avant application de D. Ce dispositif est absent du coût.

Les deux Aulnes terminent : 64 vrais ticks préparés, un tick de continuation, 75 publications/APPLIED chacune, 63 paires de scènes CPU exactes et 1 275 683 contrôles scalaires B. Paquets/World/RNG, anciennes vues World, sauvegardes, refus, resync/reload, révocation exotique monotone et clone natif discriminant passent dans ce périmètre. Les 70 publications projetées précèdent cinq publications de suffixe sans projection. Les anciennes Room prêtées ne sont pas certifiées par un compteur source nul.

Le run global échoue ensuite dans A mixed au plafond de 128 MiB de buffers uniques, avant comparaison mixed B. Deux erreurs console404 Aulnes sans URL restent présentes. Un [probe froid indépendant](../../tmp/performance-orientation-v256/favicon-probe-next/captures/run-cTkwSf/report.json) reproduit `/favicon.ico` 404 avec URL et modules 200 ; il rend cette origine plausible, sans attribuer rétrospectivement les messages historiques dépourvus d'URL.

L'[audit distinct](../../tmp/performance-orientation-v256/aulnes-capture-audit-design-next/captures/audit-kiMJX0/report.json), SHA `B16476B52DC2C625063F1F4530CBC0772657C167C690995322EB645F15C7AE9E`, vérifie les pins, GEL, corps et mappings servis, les contrôles achevés et 63 paires gzip, soit 1 454 849 730 octets décompressés comparés exactement. Il conserve `originalOracleStillFail`, `originalRootControlStillFail` et `globalOracleGreen:false`. Seules les Aulnes achevées sont qualifiées ; factory MAIN native, Core complet, GPU, FPS et mixed ne le sont pas.

Une [reprise mixed distincte](../../tmp/performance-orientation-v256/pipeline-mixed-reprise-next/captures/run-oracles-2026-10-07T21-29-23.983Z-uImT4U/report.json) relève les budgets d'observateur à 384 MiB, déclare un favicon vide et ne rejoue que mixed. Aucun filtre d'erreur ni changement candidat. Après 413,799 s sans première capture stockée, ROOT arrête son navigateur ; `page.evaluate` signale sa fermeture. Le lieu et la cause du blocage restent inconnus. Le plafond borne les octets du graphe, pas les temporaires totaux ; une étude de flux interne borné est conservée sans être implémentée ou exécutée.

## Coût complet sans observateur

[Rapport de coût](../../tmp/performance-orientation-v256/pipeline-mixed-reprise-next/captures/run-cost-2026-10-07T21-37-20.705Z-Kuc9K4/report.json), SHA `32AD874C1FC195D6840926F4F8B370AEEB8FE5FA8C87CD1CE72F399BAE1730AC`, GEL mixed `CE4FA386…`. Le [contrôleur](../../tmp/performance-orientation-v256/captures/run-pipeline-mixed-reprise-cost-2026-10-07T21-37-20.233Z-WDPAUN/report.json) confirme candidat, anciens rouges, sources et public inchangés.

Huit cohortes fraîches, A/B/B/A par corpus : 96 vrais ticks, 97 publications, chauffe de huit ticks et 88 mesures. Aulnes 6934→7030 et mixed 2000→2096, tous deux réellement 250×250. Le masque inchangé applique 81 scènes par cohorte. La dose dépasse 64 records, mais les fulls effectivement rencontrés restent payés : 11 fulls/97 paquets B Aulnes, 19/97 mixed. Les bytes de valeurs cumulés sont respectivement 6 784 560 et 4 710 408, hors autres champs du message.

| Moyenne des deux cohortes par variante | Aulnes A→B | Variation | mixed A→B | Variation |
|---|---:|---:|---:|---:|
| Request→fin callback | 36,940→37,060 ms | +0,33 % | 45,957→45,887 ms | −0,15 % |
| Request→reply | 37,018→37,136 ms | +0,32 % | 46,031→45,957 ms | −0,16 % |
| Callback MAIN inclusif | 6,610→6,650 ms | +0,61 % | 4,692→5,377 ms | +14,61 % |
| Adoption stricte MAIN | 3,650→3,661 ms | +0,28 % | 1,906→1,888 ms | −0,95 % |
| Source complète | 28,520→28,522 ms | +0,01 % | 37,680→36,998 ms | −1,81 % |

Source comprend step/Room, encode, projection et appel postMessage ; callback comprend adoption et sous-pipeline CPU. Ces parents se recouvrent et ne s'additionnent pas. Le corpus sériel forcé ne mesure ni débit naturel 6× ni FPS. Les états finaux/RNG coïncident dans les huit cohortes ; cela ne qualifie pas rétrospectivement tous les graphes intermédiaires mixed.

Les deux p95 Aulnes request→fin callback sont 53,30/52,39 ms en A, contre 73,59/74,92 en B ; callback 12,46/12,16 contre 19,48/20,25 ms. Le froid varie aussi : Aulnes A 1 278,61–1 397,39 ms, B 1 233,61–1 408,06 ; mixed A 3 586,41–3 634,85, B 3 560,67–3 704,17. Deux chargements par variante ne certifient aucun gain froid stable.

## Décision et conservation

**Rejet sans GAME, build, promotion, deuxième coût inchangé ou qualification mixed supplémentaire.** Le candidat n'apporte pas l'économie MAIN ni le gain complet recherchés. Le coût mixed est valide comme mesure du banc exécuté, avec sa limite d'équivalence complète non acquise. Les rapports rouges et l'audit partiel restent distincts ; aucune remise en vert globale.

Le banc emploie un strict lecteur MAIN et un sous-pipeline CPU, pas la factory MAIN native réelle, tous les layers Core, les interactions/audio GAME ou des dessins/pixels/pertes GPU. Aucun 240 FPS, moniteur 240 Hz, gain toutes parties ou plafond de langage n'est certifié.

Le coût final rapporte erreurs console/HTTP vides, aucun Worker restant et ports 5275/5276 fermés. Le probe indépendant ferme 5277 ; les runs rouges conservent leurs propres erreurs et cleanup. Sources, 62 références/65 fichiers publics, sessions utilisateur et references_UI restent conservés. Aucun push ni modification de règle, cadence, population, horloge ou qualité.

Documentation finale : PASS 1,604 s avec le Python du runtime configuré. Le premier lancement via l'alias Windows `python` reste une erreur d'environnement EACCES distincte, sans contrôle exécuté ; aucun résultat produit n'en est déduit. `git diff --check` passe ; seuls les documents canoniques et instructions de reprise sont committés.
