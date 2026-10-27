# État courant avant une commande Monde — V489

27octobre2026. **Correction locale qualifiée, non publiée à ce point.** Elle débloque les commandes de l'écran Monde après un export terminé. Schéma296 inchangé ; production [V488/1fa8b7c5](publication-v488.md). La [campagne V484](../gameplay/campaign-continuation-v484.md#formation-réelle-en-pause--27octobre) possède maintenant un vrai groupe en préparation, sans départ ni tick supplémentaire.

## Défaut et correction

Le [premier parcours réel](../../tmp/campaign-continuation-v484/native-form-paused-current-2026-10-27T03-03-57.719Z-27920/report.json) échoue92,781s : le bouton3D de formation est activé, puis refuse « Attendez la fin de l’opération courante. », alors que session, requêtes et actions sont libres. Le modèle retenu par `NativeWorld.send` était resté occupé pendant l'export. L'état entier effectivement conservé et rechargé reste D234/T2010, sans groupe. Il n'est pas remplacé par une tentative favorable antérieure.

Dans [native-world.ts](../../src/ui3d/native-world.ts), deux lignes font lire le lecteur courant existant une seule fois par tentative. Busy, fault et son message proviennent de cette même lecture. Sans lecteur, le modèle retenu reste le repli. Un vrai état occupé ou défaillant et une seconde activation pendant `pending` restent refusés ; commande, refus, exception, libération et rafraîchissement restent inchangés. Aucun brouillon, devis, mécanisme de groupe, API, Main, Core, Worker, rendu ou timer n'est modifié.

Les [huit contrats durables](../../tests/native-world-live-state-v489.test.ts) activent les vraies pages et un callback Core réel : export avec modèle occupé périmé, états actuels occupés/défaillants, défaut périmé, repli sans lecteur, double activation, refus et exceptions avec reprise. La version précédente donne7FAIL/1PASS15,662s ; le candidat passe les mêmes8cas16,269s. Les sept rouges ne sont pas sept défauts métier distincts : certains portent sur le compte de lectures nul. Après installation,21cas passent17,805s :8nouveaux,6voisins de brouillons UI et7contrats de propriétaires/ordre des pawns. Les huit privés ne s'additionnent pas à ce total. Typage15,924s et build Pages5,174s passent.

## Formation réelle et performances observées

Le [parcours corrigé](../../tmp/campaign-continuation-v484/native-form-paused-candidate-v489-2026-10-27T03-29-01.294Z-12080/report.json) passe74,226s. Il charge le dernier entier réellement sauvegardé après échec, reprend exactement le devis, puis exporte et clique depuis la même confirmation, sans rafraîchir ni rouvrir le panneau. La session est réellement occupée pendant l'export puis libre. Une activation aboutit au vrai groupe1, phasegathering, avec Eden8/Robin9, Gaël7au foyer et le manifeste6+6, toujours T2010. Son nouvel entier683e est sauvegardé puis rechargé exactement.

Les deux observations de trois secondes sur cette même confirmation donnent :

| Mesure locale en pause | Avant export | Après export |
|---|---:|---:|
| Soumissions CPU/s |168,20|167,92|
| Intervalle MAIN p99 |6,5ms|6,2ms|
| Intervalle MAIN maximal |6,7ms|6,5ms|
| Intervalles >16,7ms |0|0|
| Ticks livrés |0|0|

La trace courte conserve une pointe : gap380,7ms, tâche longue380ms, sur131frames/1244,6ms. Elle débute à03:30:02.810UTC, après l'adoption enregistrée à03:30:02.108, pendant la phase qui inclut la sauvegarde de contrôle. La fonction responsable n'est pas profilée ; aucun gain ou recul causal n'en est déduit. Cette trace n'est pas un benchmark stable. Les fenêtres de pause ne mesurent ni débit autoritatif en marche, ni GPU, ni FPS physique et ne prouvent pas l'absence de pointes rares.

La correction ne s'exécute qu'au clic : un appel supplémentaire du lecteur existant, aucun parcours par image, polling, texture ou passe graphique. La qualification globale0/1/3/6 de [V488](action-latency-v486.md#commandes-au-point-sûr--v488) reste séparée ; elle n'est pas réattribuée à ce garde. Le confort global et les six ensembles restent ouverts.

## Provenance et reprise

Le [contrôle final hors navigateur](../../tmp/native-world-live-guard-v489/native-final-evidence.json) passe1,594s :2080entrées exactes avant finition, gzip/RAW entier, groupe, cadence et extrêmes relus. La source réellement exécutée porte le SHA`e8e4deffa80522637bedc8b40412f102e04f8e1f400a9d1c443693b79a884c9c`. Après acquisition, une seule fin de ligneCRLF devientLF : source Git finale`53d6033edeea481112a2a48a9737469b867aec2ae051bfade9e56c3224bd03b5`. Le test reste byteexact`5ddce84f…`. Préimages et [preuve d'égalité du JavaScript transformé](../../tmp/native-world-live-guard-v489/git-line-ending-finish.json) sont conservées ; aucune autre modification après validation.

Reprendre exclusivement l'entier683e de formation, puis jouer les vraies prises et sorties par les commandes ordinaires. Le [Wiki RimWorld, caravanes](https://rimworldwiki.com/wiki/Caravan) décrit sélection, rassemblement, chargement puis sortie ; la formation acceptée seule n'acquiert pas ces étapes. La nourriture, les personnes, besoins et pertes réels font foi. Aucune nouvelle mécanique, parité exhaustive, campagne complète ou victoire n'est acquise par ce correctif.
