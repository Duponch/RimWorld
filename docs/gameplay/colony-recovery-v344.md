# V344 — repli et premier soin sur la branche blessée

13 octobre 2026. **Repli physique et premier soin sec naturel acquis ; récupération durable non acquise.** Une tentative unique reprend l'export littéral V342 et les gestes livrés, dont le [soin mobilisé sec V343](drafted-tending-v343.md). Chrome/WebGPU passe en87,369s, corps82,075s, erreurs[], six checkpoints rechargés exactement et six captures inspectées ROOT. Le patient reste à terre, d'autres blessures persistent et la gazelle reste manhunter. DocumentationPASS1,141s et gel2869exact ; lot QA prêt au commit/push.

## Entrée et état conservé

Source de la [tentative V342](colony-rescue-v342.md) : `tmp/early-access-v342/native/colony-rescue-v342-V342-li-066c9-nd-first-ordinary-treatment/failure-outcome.json`, **tick66474**, schéma 232, SHA256 `4cb33f349ab2dc64d5e4107f7fe02129cff9a6c8ae50ba8091266ca6d89029a4`. La migration232→233 a été contrôlée neutre : strictement le même World, seul schemaVersion change. L'entrée native conserve personnes, blessures, possessions, besoins, PRNG et temps engagé.

Carte250×250, graine3398550437, mêmes originaux **Iris18530, Gaël18532 et Léonie18534**. Iris, déjà blessée à la jambe gauche (contusion5195), porte Gaël à terre vers le couchage médical19081. Au départ leurs cellules logiques sont(124,114), mais leur mouvement physique va encore de(125,114) à(124,114), fin66488,93813186813, cooldown14,93813186812622. Gaël conserve bloodLoss3449754. Interrompre la relation de portage ne termine pas cette arête et ne constitue pas un dépôt médical.

Léonie est mobilisée, sans mouvement actif en(123,111), compétence Médecine4 ; faim11,793333333331859 contre13,3066666666652 pour Iris. La porte18648 en(125,114) est ouverte, holdOpenfalse, forbiddenfalse, closeAt66485. La gazelle18565 reste manhunter en(126,115), cible Iris et conserve son coup engagé jusqu'au tempsCore664830. Les échéances initiales ne sont pas assimilées à une fermeture ou extinction observée.

## Gestes et séparation acquis

Par l'UI, Iris a été mobilisée pour interrompre le secours, sans clone ni correction du patient ; son retrait réel vers(124,111) et l'interdiction du passage de la porte18648 ont été adoptés. Le checkpoint draft-drop confirme la suppression du portage avec même mouvement/cooldown de Gaël. L'interdiction filtre les nouvelles entrées ; elle ne ferme pas instantanément le battant et n'annule aucun mouvement ni coup déjà engagé.

Avant le soin de Léonie, le pilote a exigé Iris réellement arrivée, mouvement terminé/cooldown0 ; Gaël vivant, à terre, non porté et immobile ; porte présente, openfalse et fraction physique doorOpenness0 ; gazelle hors de l'intérieur et sans arête active pénétrante. Le menu V343 a ensuite admis un vrai chevet cardinal accessible et libre pour une Léonie mobilisée/capable. Les gardes de blessure, identité et menace sont vérifiées à chaque checkpoint ; la séparation complète et l’immobilité sont exigées avant le soin et surveillées pendant son travail. Le checkpoint initial conserve encore le mouvement engagé.

Au final66636, Iris demeure stable en(124,111), contusion5195 conservée sans nouvelle blessure. Léonie travaille en(124,113), au contact de Gaël en(124,114). La porte est interdite, openfalse, fraction0, changement66499 et ses104PV complets conservés. La gazelle en(126,115) est idle, mais **manhunter toujours actif** ; elle n'est pas neutralisée. Une séparation physique acquise pendant ce passage ne certifie pas un refuge invulnérable.

## Premier résultat clinique et limites

La durée de travail capturée est1171 ; progression10 observée au66517. L'événement de soin au66634 correspond à la morsure29 de jambe gauche de Gaël, qualité119/1000. L'XP de Léonie passe de175000 à237500, dailyXP+62500. Le dernier export conserve le mode drafted et un nouveau travail sec en cours, progression29 : aucune fin de tous les soins n'est créditée.

Gaël reste downed. Sa perte de sang passe de3449754 à10026792 ; les autres blessures restent présentes. Le traitement d'une plaie n'atteste ni cessation de toutes les hémorragies, ni guérison, ni survie durable. Faim finaleIris11,573 et Léonie10,713 ; nourriture et26médicaments à l'extérieur ne sont pas qualifiés accessibles ou sûrs. Aucun déplacement forcé, besoin, médicament, sommeil ou nouveau couchage n'a été créé pour obtenir ce résultat.

## Conservation et contrôles ROOT

Seuls les checkpoints propres à V344 sont comptés ici ; les preuves héritées V342/V340 restent conservées séparément.

| Témoin rechargé exactement | Tick | SHA256 |
| --- | --- | --- |
| Interruption du portage — draft-drop |66474| `7b3b2bf610882197381c902235395a6eb018181053fbd04221b9f8cfafe633aa` |
| Retrait et séparation — isolated-retreat |66505| `9568716fb08a7fa4467c44c1d15182a2c32dbbb8c2a6c6856a06b30ffa2b54a3` |
| Ordre accepté |66506| `90701bfd6dbdf523554e6c0730e3b71ee311756c69643e2369a982ad635bffbd` |
| Approche physique |66508| `b452a001fb34aee84623c359c056b9e52ccaa6757dc517bb649460bd6b2afa7c` |
| Travail au contact |66519| `be31964cc06e244c0727a69b6e13f1b232fe908882c1e8ce89af3cf9a7c0c9da` |
| Premier soin, travail suivant en cours |66636| `160aa93d82c776944ef7fbae3a95bca69d6251c432a46e8582956784ff16f997` |

| Contrôle ROOT | Résultat |
| --- | --- |
| Typage | **PASS18,737s**, label `v344-typecheck-2026-10-13T21-05-03.454Z-17224` |
| Chrome/WebGPU | **PASS87,369s**, corps82,075s, erreurs[], label `v344-native-2026-10-13T21-06-16.382Z-10324` |
| Conservation native et revue visuelle | Six recharges exactes, sixPNG inspectés ROOT |
| Gel2869 | Entrée+sidecar inclus,2868anciens fichiers V343 identiques octet pour octet |
| Documentation | **PASS1,141s**, `v344-docs-2026-10-13T21-15-38.984Z-12104` ; gel2869exact |
| Commit/push QA | Préparés après ces contrôles |

Résumé, états, sidecars et captures : `tmp/early-access-v344/native/colony-recovery-v344-V344--4d6ec-d-first-dry-field-treatment/colony-recovery-summary.json`. Le pilote opt-in `tests/integration/colony-recovery-v344.spec.ts` reste borné à180s, vitesse×1, et conserve arrêts sur blessure nouvelle/aggravation de la porteuse ou du médecin, décès/nouvelle incapacité d'un original, entrée hostile ou arête vers l'intérieur, destruction de porte, incident ou perte des conditions requises. Ces gardes n'ont pas été relâchées pour obtenir le résultat.

La tentative rouge V342 et sa blessure réelle restent des preuves historiques, sans remplacement par ce PASS ultérieur. Ce lot QA n'a modifié aucun produit, public, moteur, bridge ou rendu ; aucun corpus/build/FPS/déploiement inchangé n'a été rejoué. V343 livré et publié reste inchangé. Aucun gainFPS, guérison, récupération durable, autonomie alimentaire, campagne entière ou early access100% acquis. Suite autonome ACTIVE après clôture/commit/push : protéger le premier besoin alimentaire et qualifier une réserve intérieure sûre, en conservant les événements naturels et la menace actuelle ; aucun résultat futur promis.
