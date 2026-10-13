# V342 — secours réel interrompu par une blessure du médecin

13 octobre 2026. **Qualification partielle : portage acquis, dépôt médical et premier soin non acquis.** L’unique contrôle Chrome/WebGPU reste rouge : **51,977 s**, dont **45,871 s** dans le corps du pilote, erreurs `[]`. Iris prend réellement Gaël à terre et le transporte ; une blessure nouvelle d’Iris déclenche l’arrêt prévu. Aucun rétablissement, soin réussi ou défaut moteur n’est déduit de cette tentative exposée.

## Branche et conservation

Entrée littérale de la [branche contact V340](second-colony-food-v340.md) : `tmp/early-access-v340/native-contact-ui/second-colony-danger-v340--940cf-exact-civilian-continuation/failure-continuation.json`, **tick 66431**, SHA256 **8477b29fec55f7dbe657ec3df05bb4a4047b3fde123ca4b1f91bc9fb5a6f0560**. Son carnet V340 porte la même empreinte et conserve l’origine **39073 / e6eea52468ce91196a2a3b816b1df488e09acf47a498bfddb6891bb810a21925**. La branche alternative au fusil V340 demeure distincte ; elle ne remplace pas ce blessé par un état favorable.

Carte réelle **250 × 250**, graine locale **3398550437**, mêmes originaux **Iris 18530, Gaël 18532, Léonie 18534**. Le carnet privé V342 conserve intégralement l’héritage V340 dans un champ séparé. Ses observations, événements et checkpoints nouveaux ne recréditent aucune récolte, cuisson, ingestion ou récupération ancienne.

Le **schéma de sauvegarde 232** est conservé. Ce lot ajoute seulement un pilote opt-in et cette note ; aucun moteur, bridge, rendu ou public n’est changé. Aucun World, besoin, PRNG, aliment ou passage du temps n’est forcé. L’adoption des exports utilise les commandes ordinaires de bibliothèque, puis une comparaison complète des états rechargés.

## Geste et témoins acquis

Par l’UI, Iris est démobilisée avant l’ordre prioritaire de secours ; sa priorité Médecin **1**, déjà présente, est conservée. Léonie reste mobilisée au refuge. Le couchage médical **19081**, à **(124,112)**, est la destination réelle proposée ; aucune attente d’extinction assurée de la gazelle n’est imposée.

Trois exports sont **rechargés exactement** dans ce passage :

| Témoin | Tick | SHA256 |
| --- | --- | --- |
| Ordre accepté, simple intention | 66431 | `7b70862cff7b7164faad49350aa29e12544c7f7767603cb0875b707ca14a541f` |
| Approche physique, Iris en (122,112) | 66432 | `74673a75ed42f55f80f1a08dc5b8d8a9e9c118190e7165ea228bf7f11946b6ee` |
| Portage, Iris en (125,114) | 66462 | `08f5d2925800ba05b13e99dbad5a6a887d02112b89c0bef33e20c0a4ed0c98ee` |

Le dernier témoin exige la phase `rescue/carry`, les mêmes identités, et l’égalité des positions, mouvements et cooldowns du patient et de sa porteuse dans le World confirmé. Un ordre accepté ne vaut ni arrivée, ni admission médicale. Cette preuve de possession physique ne constitue pas une qualification générale des poses GPU.

Au **66474**, Iris reçoit une **contusion de jambe gauche, sévérité 5195**, soit **5,195 PV**. Elle porte encore Gaël en **(124,114)**. La gazelle **18565**, toujours active en **(126,115)**, cible Iris. La porte **18648** demeure présente et ouverte, avec `closeAt=66485` ; cette échéance enregistrée ne prouve pas une fermeture ultérieure observée. Gaël reste à terre. Sa perte de sang confirmée passe de **1744596** au checkpoint d’ordre à **3449754** à l’arrêt ; aucune projection statique ne qualifie un délai avant décès.

## Arrêt et portée

L’export rouge **66474**, SHA256 **4cb33f349ab2dc64d5e4107f7fe02129cff9a6c8ae50ba8091266ca6d89029a4**, est conservé sans recharge finale créditée. Aucun dépôt en (124,112), cargo de médicament ou première plaie soignée n’est acquis. ROOT a inspecté les captures de portage et d’arrêt.

ROOT seul a exécuté : **typage PASS 17,316 s**, un natif rouge et **gel 2864 exact**. Le pilote reste borné à 180 s, test 240 s, vitesse ×1 et lectures de 150 ms. Première blessure du médecin, incapacité d’un autre original, décès du patient ou disparition de la porte arrêtent la tentative. Ces gardes ne sont pas relâchées pour obtenir un PASS ; les pertes possibles sous menace active restent des issues ordinaires.

Piste suivante **V343** : examiner des **soins tactiques de terrain sur un patient identifié au sol**, à partir de références primaires confirmées, avec conditions d’accès, médecin capable et transport de médicaments explicites. Cette piste ne promet ni sécurité face à la gazelle, ni guérison, ni réussite d’une campagne entière.
Clôture documentaire ROOT : gel2864exact et **documentation PASS1,816s** (`v342-docs-2026-10-13T20-01-38.768Z-11096`), diff sans erreur d’espacement. Aucun nouveau build ou déploiement pour ce lot QA-only ; production V341 conservée.
