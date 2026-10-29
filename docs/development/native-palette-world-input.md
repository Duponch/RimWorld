# Gestes du monde depuis les palettes Ordres et Zones

Le 29 octobre 2026, un glisser de zone du foyer a reproduit un défaut commun aux palettes Ordres et Zones : choisir un outil puis commencer un geste sur le terrain fermait la palette et annulait l’outil. Le geste était consommé avant d’atteindre le moteur de jeu.

## Correction

`NativeStage` conserve le chemin d’entrée du monde pour un appui gauche primaire dans une zone vide du terrain, hors de la palette. Les cartes de la palette, les autres éléments du HUD, les fenêtres ordinaires, les listes déroulantes et les écrans modaux gardent leur capture. Relâcher le geste sur un élément d’interface l’annule toujours.

Le correctif porte sur une seule source UI, dont la préimage était identique dans le produit et l’aperçu privé : `70e8f1e1…` devient `08c5f3bd…`. Il ne change ni les règles de simulation, ni le Worker, ni le schéma 297 du produit. La tranche de victoire en schéma 298 reste privée.

## Vérifications

Deux contrats de régression utilisent les vrais gestionnaires d’événements et les raycasts CPU de `NativeStage`, sans créer de moteur graphique. Ils couvrent Ordres et Zones aux échelles 100 % et 150 %, le passage du geste au-dessus d’une carte, son relâchement sur le terrain ou sur l’interface, et la capture des fenêtres, listes et boutons. L’ancienne source échoue sur le geste monde ; le correctif passe. Avec les contrôles voisins de caméra et de clics, les trois fichiers intégrés totalisent **12 cas réussis**. Le typage du produit a réussi en 15,836 s et sa compilation Pages en 4,63 s ; les sorties sont restées privées, sans déploiement.

Dans l’aperçu privé, un vrai glisser a ensuite émis une seule commande `area/home`, acceptée pour neuf cases. La zone du foyer est passée de 368 à 377 cases. Le Full adopté et un dessin réel de l’interface ont été observés en pause au même instant de simulation. L’export final a été conservé et rechargé exactement.

Ce lancement Native conserve toutefois son statut **FAILED** : son observateur tardif attendait trois relâchements de pointeur, alors que les deux clics UI sont consommés avant cet observateur. Le relâchement réel sur le monde est bien enregistré. Une qualification hors ligne distincte a vérifié les faits conservés et le World complet, sans rejouer la commande et sans convertir ce lancement en PASS rétroactif.

Seuls les neuf indices du foyer et l’événement normal de commande ont changé. Les personnes, leurs tâches, les objets et leurs propriétaires, les quantités, les interdictions des provisions, le Site IA, le RNG, l’allocateur d’identifiants et l’instant de simulation sont restés identiques. Dernier ACTUAL de cette QA : Raw `f31a35b112e2b291638f3487d15a260380b020ce80a0c1f1f247d42fab450cd0`, Core 17780. La campagne humaine indépendante T3328 n’a jamais servi à ces contrôles.

## Coût et limites

La nouvelle condition est bornée et s’exécute seulement au début d’un appui. Elle n’ajoute aucun travail par image, raycast, objet graphique, texture, écouteur, cache ou parcours du World. Aucune nouvelle mesure de FPS ou de GPU n’est revendiquée.

Le premier ordre Home observé a mis **2 089,7 ms** entre son appel et la fin de sa promesse. Cette limite de réactivité est conservée, sans attribution causale au correctif : l’ancienne UI n’émettait pas cet ordre dans la même séquence. Elle reste à diagnostiquer proportionnellement. La dette de débit à ×6 [PERF-V492-X6](movement-parity-v492-status.md) reste également ouverte ; ce correctif ne la résout pas.

La reprise des six ensembles et les empreintes des preuves sont conservées dans le [checkpoint courant](../../tmp/victory-resume-v493/progress.md). La prochaine étape de la chaîne IA est un devis pur depuis l’ACTUAL réellement modifié, puis une décision de départ conservant les mêmes personnes et biens. Aucun nouveau déploiement Cloudflare n’est impliqué par ce correctif.