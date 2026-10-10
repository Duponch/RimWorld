# Clic droit et curseurs des ordres — V302

Un clic droit bref quitte le mode ordre au relâchement. Un maintien, une rotation ou un déplacement de caméra conserve l'outil. Le clic droit pendant un rectangle tracé avec le bouton gauche annule toujours seulement le rectangle. Échap reste disponible.

Le clic bref est borné à moins de 250 ms et six pixels de déplacement ; tout déplacement observé dépassant cette tolérance empêche la sortie, même si le pointeur revient au point de départ. La durée utilise les horodatages des événements, afin de ne pas transformer un retard du thread principal en durée du geste. Changement d'outil, annulation, perte de capture et de focus nettoient l'état en attente.

Les curseurs d'outils proposent trois images : flèche, main ouverte et main fermée, avec la même icône d'outil. La flèche passe de 13 à 17 pixels de hauteur ; la main tient dans 20 pixels, avec un dessin de 18 pixels maximum. Les images de 44×44 sont composées et mises en cache lors de l'installation, jamais à chaque déplacement ou image. Les curseurs de l'interface restent disponibles. Le bouton droit conserve la rotation habituelle de la caméra ; le bouton central conserve son déplacement. La molette conserve l'outil.

Simulation, schéma 219, règles, qualité et sauvegardes restent inchangés. Ce correctif bénéficie à toutes les parties.

## Validation

Douze cas dans trois fichiers passent en 7,519 s : variantes, points actifs, cache, boutons combinés, maintien, restauration et cycle de vie. Build avec typage PASS 9,010 s ; le seul changement ultérieur du produit est la correction d'un commentaire « panning » en « camera navigation ». Typage du pilote final PASS 1,230 s.

Chrome matériel AMD/WebGPU en 2560×1440/DPR1 charge Les Aulnes depuis le menu public. Sept contrôles natifs PASS 30,384 s : maintien stationnaire 360 ms, clic bref, rotation et retour au point initial, annulation gauche/droit sans mouvement de caméra, bouton central/molette, Échap pendant le maintien et 24 images de curseurs pour huit ordres. Le monde en pause reste exactement celui du tick 8434 à chaque étape. Sources et 63 références/66 fichiers publics exacts ; erreurs vides, navigateur et port 5349 fermés.

Rapport `tmp/order-pan-v302/native-reprise/run-PuKGox/report.json` SHA `ACD98BF2`, gel `F2294426`. La planche `composed-cursors.png` a été inspectée : flèches, mains et icônes restent lisibles. Cette exportation des PNG ne capture pas le curseur du système d'exploitation ; le contrôle partiel de pixels complète cette inspection, sans certifier tous les pixels affichés. Le trajet aller-retour n'isole pas une durée inférieure à 250 ms. Aucun gain FPS, CPU ou GPU mesuré ni campagne de simulation annoncée.

Le premier pilote `native/run-ig9AKP` reste rouge 24,155 s après deux contrôles acquis : il attendait un changement de cible pour un geste droit qui tourne la caméra. La reprise distincte compare sa position ; aucun comportement produit n'a été changé pour cet oracle.

Commit et push par lot ; [publications Cloudflare](../development/cloudflare-pages.md) regroupées. V302 n'est pas déployé par ce lot. La relance planifiée reste en pause.
