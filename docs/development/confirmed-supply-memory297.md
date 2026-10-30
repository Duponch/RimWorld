# Mémoire du débit confirmé après une rafale ou un retard — schéma 297

Le correctif est intégré et qualifié localement sur les contrats ciblés. Une nouvelle continuation réelle à ×6 est vérifiée ci-dessous ; la fluidité générale sans aucun arrêt n’est pas déclarée acquise.

Dans la dernière continuation NativeV3, la source reçue à ×6 progressait d’environ 21,06 ticks locaux par seconde pour 36 nominaux. L’horloge de présentation atteignait régulièrement son dernier état reçu :80 échantillons tenus au front. Les plus longs intervalles entre réceptions atteignaient 129,3, 122,9 et 121,2 ms. Ces données décrivent les réceptions et l’affichage ; elles n’attribuent pas la cause à League et ne mesurent pas les FPS.

Deux comportements pouvaient relancer le taux nominal malgré une alimentation plus lente déjà observée : une courte rafale rétablissait immédiatement le témoin de compatibilité nominale ; une réception après 100 ms de silence remettait l’estimation au nominal. La présentation pouvait alors épuiser l’historique confirmé puis attendre le suivant.

Trois expressions de MotionTimeline changent :

- Un débit incompatible est constaté immédiatement ; le retour au témoin nominal attend la fenêtre existante de 200 ms.
- La réception tardive contribue à la mesure du débit.
- Le raccord tardif conserve cette mesure pour choisir le taux de présentation.

La réserve de 36 ms et le raccord vers le dernier état reçu moins cette réserve restent identiques. Les seuils, l’amortissement et Main sont conservés. La physique, la vitesse des colons et animaux, les Cores joués, les commandes, les accusés de réception, la pause et le schéma 297 restent inchangés. La carte des 2 080 sources confirme un seul changement : MotionTimeline (2b76 → 62ad).

Les deux nouveaux contrats publics reproduisent une rafale de 50 ms puis un trou de 129,3 ms. Ils passent par adopt/advance sans injecter d’état privé. La baseline produit reproduit deux refus. Les 23 cas acquis au premier passage candidat, puis les 6 cas intégrés dont 5 déjà acquis, donnent **24 finalités distinctes**. Les voisins couvrent cadence nominale, sous-débit/reprise, changements de vitesse, doublons, pause, remplacement d’historique, conservation et recharge réelles dans Runtime.

Le premier passage de 24 cas reste conservé avec 23 PASS/1 FAIL. L’ancienne attente imposait précisément le retour nominal après le silence ; elle a été remplacée par une progression positive, confirmée et inférieure au nominal pour cette séquence. Aucune valeur observée n’a été copiée comme oracle. Le premier oracle de rafale, mesuré pendant un rattrapage nominal légitime, ainsi que les deux erreurs de découverte du harnais restent aussi conservés. Le dérivé mesure après ce rattrapage, sans élargir les bornes.

Les 6 contrats intégrés passent en 1,357 s ; le typage complet passe en 32,489 s et le build Pages CODE en 7,013 s, avec public résolu sans recopie. La qualification ne relance pas les 54 contrôles rig/FX déjà acquis.

Le coût scalaire emploie les quatre vrais modules, une seule séquence W/C/W de 300 000 frames numériques par bras, sans échauffement masqué :

| Bras | Temps écoulé (ms) | CPU du fil (ms) | CPU du processus (ms) |
| --- | ---: | ---: | ---: |
| W1 | 31,439 | 31 | 78 |
| Candidat | 34,531 | 31 | 79 |
| W2 | 22,190 | 31 | 78 |

Le candidat ajoute 3,092 ms face au premier témoin et 12,341 ms face au second sur ce petit chemin. Les écarts adverses et la variation entre témoins sont conservés. Cela ne démontre ni coût nul, ni absence de régression globale, ni gain causal sous League. Les pauses de chaque cycle se fixent exactement au front confirmé ; ce contrôle scalaire n’est pas une simulation de campagne.

La limite demeure : après 100 ms sans progression, le repli existant termine seulement l’historique déjà reçu. De véritables trous de source peuvent encore provoquer une attente. Le correctif ne crée aucun Core futur et n’augmente pas la réserve. La dette de performances à ×6 reste ouverte.

Le Native a repris exclusivement eb42e74a / gzip 0a2cd534 / Core 112340 avec les sources intégrées 070e03e8. Le dernier état réellement joué est désormais 16458800 / gzip fb43fc35 / Core 113150 : ne plus repartir d’eb42. Aucun nouveau déploiement Cloudflare n’est attesté par ce lot.

Preuves privées : confirmed-supply-memory-validation-root-v1/integrated/report.json ; confirmed-supply-memory-review-v3/run-scalar-cost-v1/report.json. Carte source : 070e03e8a71fb59cfd385df5b3c4d8a7d1278d561d871e3768e9372283a0e276.

## Observation en jeu après le correctif

Une seule fenêtre de quatre secondes à ×6 a produit 832 soumissions et 912 enregistrements d’horloge. Le même Noé mobilisé a reçu un ordre réel vers104/108 ; Sacha travaillait et Ada dormait. Le protocole, la pause de300ms, les sources exactes et la sauvegarde/recharge entière passent. Le lecteur hors ligne confirme l’intégrité des données. League était actif : aucune attribution causale ni comparaison de performances globales avec le précédent essai.

Noé possède716 paires consécutives dans l’état moving. Parmi elles,21 ont une position identique avec la pose de locomotion active :20 pendant l’attente initiale des premières données, entre11,3 et157,4ms, puis une à303,3ms au front reçu. Ce dernier petit arrêt reste conservé comme défaut de réception à diagnostiquer ; l’attente initiale n’est pas retirée du bilan. Aucune autre paire de marche active immobile n’est observée après cet instant dans cette courte fenêtre.

Les40 autres positions identiques se produisent sans pose de marche, alors que l’horloge progresse :36 au point126/112 devant le passage126/111, après la fin de l’arête physique précédente, puis4 à destination104/108 avant l’état idle. Elles ne démontrent pas un défaut d’interpolation. Les cinq autres holds tardifs de l’horloge surviennent lorsque Noé est déjà idle. Ada garde Y=0,5 sur les832 soumissions, sans pose de marche ni variation de hauteur.

La source observée progresse à19,63 ticks locaux/s pour36 nominaux, avec cinq intervalles de réception supérieurs à100ms. Les callbacks MAIN continuent pendant les trous observés ; l’instant de publication du Worker et le délai de file ne sont pas mesurés. Le prochain diagnostic doit suivre une même livraison, de sa production à son admission, pour distinguer calcul et acheminement. Il ne faut pas supposer que le CPU Worker, le GPU ou League en est la cause. Le lissage corrigé ne remplace pas une donnée future absente.

Les sorties, caches et fichiers temporaires de ce Native totalisent22,4Mo ; C est passé de8,034 à2,052Gio libres pendant l’essai, sans attribution de toute cette variation au test. Prévoir davantage de marge avant un autre Native, notamment sous League ; ne pas refaire un nettoyage global. L’état final conservé et rechargé exactement est RAW16458800d8ae6bcda1732e104bb61772c3c94d35a49a01bf8b8f32cdae8ce14f / gzipfb43fc3511277a56249280bdb36d2e8255d6a780e8ce1839801439c86f960057, Core113150/RNG1875334416/id29622.

Preuves privées supplémentaires : confirmed-supply-memory-native-author-v1/native-confirmed-supply-memory-v1/report.json ; confirmed-supply-memory-offline-author-v1/result/analysis.json et remaining-root.json. Deux avertissements aTo absents ont une couture statique préexistante possible sur le masque de cargo partiel ; aucune attribution runtime au corps n’est établie. Cette dette est distincte du défaut d’horloge.
