# Mémoire du débit confirmé après une rafale ou un retard — schéma 297

Le correctif est intégré et qualifié localement sur les contrats ciblés. Sa vérification dans une nouvelle continuation du jeu reste à effectuer ; la fluidité générale à ×6 n’est pas déclarée acquise.

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

Une nouvelle vérification Native doit reprendre exclusivement le dernier export réellement joué eb42e74a / gzip 0a2cd534 / Core 112340, avec les sources intégrées 070e03e8. Elle reste à qualifier. Aucun nouveau déploiement Cloudflare n’est attesté par ce lot.

Preuves privées : confirmed-supply-memory-validation-root-v1/integrated/report.json ; confirmed-supply-memory-review-v3/run-scalar-cost-v1/report.json. Carte source : 070e03e8a71fb59cfd385df5b3c4d8a7d1278d561d871e3768e9372283a0e276.
