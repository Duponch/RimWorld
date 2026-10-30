# Particules d’action continues au niveau moyen — 297

Le niveau moyen retenait à 12 Hz les positions et les fondus déjà calculés des particules d’action. L’horloge confirmée progressait entre deux publications, mais les signes de sommeil et les marques de travail restaient immobiles puis changeaient ensemble. À ×6 régulier, une période de publication pouvait couvrir 0,825 cycle de travail.

Une seule source de rendu, `ActionVfxLayer`, conserve maintenant les ancres, directions de contact, tailles de base et coefficients de rotation. Le GPU calcule le centre, la taille et le fondu à partir du même temps confirmé. La projection Sprite de Three, les huit quads par acteur, les 25 cellules de palette, l’appartenance aux effets, le retrait confirmé et les seuils de détail sont conservés. Le détail proche garde ses équations analytiques ; les effets lointains restent retirés. Aucune cadence, publication de simulation, règle, commande, sauvegarde ou horloge physique ne change dans ce lot.

## Preuve du composant

ROOT a dessiné le vrai matériau WebGPU sur un petit jeu d’entrées de présentation : un acteur au travail et un acteur endormi, avec la sélection réelle `update/actionFxForPawn`. Il s’agit d’une projection de rendu déclarée, pas d’un World/RAW sauvegardable ni d’une partie jouée. L’original analytique sert de référence séparée.

Le témoin présente sept refus fonctionnels, dont les quatre contrôles de progression entre échéances. Le candidat satisfait les 45 contrôles du même contrat : images à 0/20/40 ms avant la prochaine échéance, pause, retrait et naissance au cycle courant, boucle de 200 secondes, proximité et éloignement, sources et palettes inchangées entre échéances, un dessin pour le batch actif et zéro à distance. Chaque bras conserve ses 19 images. Aucun échec de validation GPU ni erreur de page/console n’a été relevé. Les 2 080 sources produit sont restées exactes avant et après les deux bras.

Reçus privés : `A/action-middle-author-v1/gpu-baseline-v1/report.json` SHA `c74132d6fd8cdc40a4ef5ae99d76a6ed37ce34017202e69a818e75c828303167`, statut `EXPECTED_BASELINE_PIXEL_RED_ACQUIRED`, résultat fonctionnel rouge conservé ; `gpu-candidate-v1/report.json` SHA `e4ab5ace132e19bc4cf28cb4aa8800ecb5e2896566ad501839a4a130aacb2304`, statut `PASS_GPU_CONTRACT`. La préimage source est `fe5f9918…`, le candidat exact `11a503d5…` ; les neuf spans sont inversibles. La sélection de quatre voisins dans trois fichiers exacts, puis les contrôles d’intégration et d’enregistrement, sont consignés séparément au checkpoint ROOT.

## Coût et limites

Le nombre de captures CPU et de cellules écrites par capture reste identique. Les calculs CPU de cycles et de fondus disparaissent du bake ; les cosinus/sinus de direction sont réutilisés. Une action fixe peut garder des métadonnées identiques entre échéances, donc éviter de salir sa palette. C’est une propriété du code, pas un gain mesuré : le téléversement reste collectif dès qu’un autre émetteur du batch change. Aucun nouveau hash, tri, recherche ou calcul de normale par image n’est ajouté.

Le GPU effectue davantage d’arithmétique au niveau moyen et peut lire davantage de valeurs de palette ; le sommeil ajoute son oscillation de centre. Aucune mesure de temps GPU, de FPS ou de coût global n’est déduite de ces dessins. Les contacts, les rotations et les ancres d’acteur restent échantillonnés : ce lot ne garantit pas une translation continue de toute ancre mobile ni la disparition de toute variation angulaire. La tolérance de centroïde de 0,75 pixel prend notamment en compte la rotation retenue du signe de sommeil. L’épuisement d’une source temporelle confirmée à ×6 est un problème distinct, traité séparément ; ce correctif n’invente aucune progression manquante.

Ce lot poursuit la correction des [ancres et projectiles](continuous-anchors-projectiles297.md). La fluidité générale reste un chantier ouvert.

Intégration commune horloge/Action :31PASS0FAIL15filtrés, types et PagesCODE acquis, détails et limite Native dans [la preuve de présentation](confirmed-playout297.md). Les rigs moyens restent un défaut distinct à corriger avant clôture générale.
