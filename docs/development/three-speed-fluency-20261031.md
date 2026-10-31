# Fluidité : trois vitesses vérifiées le 31 octobre

**Historique :** les mesures ci-dessous précèdent les optimisations RPA et la correction de démarrage. Lire [l’état corrigé et sa nouvelle observation](startup-confirmed-supply297.md) pour la reprise actuelle ; les anciens ACTUAL ci-dessous ne sont plus des parents de continuation.

La priorité de fluidité reste **ouverte**. Les positions des trois humains observés sont continues après le démarrage, et les données du dormeur restent stables ; des intervalles trop longs entre soumissions visuelles persistent. Lors de cette mesure, aucun candidat de performance n'était installé. Le [correctif de reconstruction croissance](resident-growth-only297.md) a ensuite été intégré ; sa mesure en jeu reste distincte. Le produit conserve ses2 080sources, carte070e03e8, schéma297 et dernier codea8e02fd4. CloudflareV491 reste la dernière publication attestée.

## Observation sans League et sans profilage CPU

Après le signal humain de fermeture de League, une continuation unique a joué trois fenêtres de4secondes, à×1 puis×3 puis×6. Noé reçoit trois vrais ordres de déplacement par l'UI ; Sacha travaille et Ada dort. Les phases d'arrivée/idle sont conservées. Cette QA est distincte de la sauvegarde humaine Les Éclaircies. Le lecteur n'observe pas les géométries animales et ne qualifie donc pas des animaux en marche ; les preuves animales antérieures restent séparées.

| Vitesse | Soumissions | Avec Noé en mouvement | Paires de position figée avec marche active après200ms | Plus grand intervalle entre soumissions |
|---|---:|---:|---:|---:|
|×1|805|805|0|77,5ms|
|×3|709|289|0|58,1ms|
|×6|829|326|0|88,2ms|

Les attentes initiales ne sont pas effacées : une paire figée à×1 et quatorze à×6 restent dans les données, toutes avant200ms. Ada conserve Y=0,5 et aucun drapeau de marche dans les trois fenêtres. Aucun nombre non fini n'est observé dans les positions des trois rôles. Chaque pause300ms conserve exactement Whole, front et horloges, et chaque export se recharge à l'octet. Les horodatages concernent les entrées géométriques soumises ; ils ne mesurent ni la fin GPU ni les FPS globaux. Une absence de positions répétées ne supprime pas les grands intervalles de soumission.

Le polling du changement de vitesse prend75,8/69,1/92,8ms ; il ne fournit pas l'instant exact de résolution de la promesse du contrôle ni la latence complète de tous les clics. Aucun gain causal n'est déduit d'une comparaison avec les essais effectués sous une autre charge.

## Le saut à×6 est joint au traitement Full MAIN

Le saut en mouvement de88,2ms se situe à+1448,6ms, et non au démarrage. La même horloge MAIN permet de le joindre sans le large intervalle d'alignement des profils CPU :

- Full delivery38, epoch3/map0/revision9/Core115500 : **78,4ms** dans cet intervalle.
- Avant Timeline.adopt : **70,9ms** ; adoption : **0,1ms** ; après : **7,4ms**.
- Attente dans la FIFO avant ce traitement : **0,1ms**.
- Le Worker poste deux frontières pendant le traitement MAIN ; son propre envoi de la Full prend3,4ms et l'arrivée suit5,9ms plus tard.

Le traitement synchrone Full est donc la portion dominante observée de ce saut. Les9,7ms restants et les fonctions internes ne sont pas attribués artificiellement au CPU, au GPU ou à un autre processus. Ce cas ne prouve pas que toutes les autres attentes Worker ont disparu.

La suite cible la reconstruction des ressources et la décomposition des contrôles Full avant Timeline, sans diminuer les validations, la qualité, la vitesse physique ou les garanties d'ACK. Les six ensembles et la victoire restent suspendus.

## Optimisation écartée après contrôle

L'index spatial paresseux b241458f conserve les résultats et évite son Map quand aucune requête de cellule n'en a besoin. Trois nouveaux contrats passent, ainsi que six voisins ; quatre refus anciens du voisin v433 se reproduisent exactement sur témoin et candidat, noms et messages conservés. Il ne s'agit pas d'une suite globale verte.

Le petit chemin géométrique s'améliore, mais le contrôle Engine600 W/C/W ne démontre pas un bénéfice global : wall2470,6/2465,1/2361,4ms, CPU processus3469/3655/3157ms, CPU du fil2469/2453/2359ms. Le coût processus candidat dépasse les deux témoins. Les trois Whole finaux sont strictement identiques3611deb4, avec conservation/recharges exactes ; ce sont des **forks CPU diagnostiques**, jamais des continuations QA.

Le candidat n'est pas installé. Les autres propositions d'intentions auxiliaires6361 et de réutilisation de metadata restent privées et non livrées ; le profil n'établit pas leur bénéfice sur ce saut.

## Autorité et preuves

Le dernier ACTUAL est désormais RAW`ea793a77c961113a9455f2c0f4619762f5e6bd3953e53493e92639dbea1b3fbe`, gzip`d22c5edfc0978e551ae0647eccd97ae83160cd925c6c9f9860f17107761f1cd8`, Core116100/RNG700965858/nextId30015, recharge exacte. Il remplace5415 puisC326 ; aucun ancien parent ou latch consommé ne doit être rejoué. Les campagnes94de et d474 restent protégées.

Preuves privées sous le checkpoint WA :

- `final-current-product-native-author-v2/native-final-current-product-v2/report.json`, SHA6ecdc95d ; trois fenêtres, poses et propres sauvegardes.
- `three-speed-submission-analysis.json` dans ce même dossier, SHA13b860c1 ; classification et intervalles complets.
- `x6-final-hitch-join-offline-20261031/receipt.json`, SHA06b760f9 ; jointure commune MAIN.
- `structure-navigation-lazy-index-author-v1/root-verdict.json`, SHA362d5f93 ; décision de ne pas installer.
- `structure-navigation-engine600-author-v1/run/report.json` ; tous les témoins, forks et écarts conservés.

Stockage vérifié après le Native : C18,452Gio/E8,482Gio, valeurs ponctuelles à recontrôler. Aucun nettoyage supplémentaire ni application humaine fermée. Les sources et preuves uniques archivées dans E/tmp/relocated-private-chat-01a17357 restent protégées.
