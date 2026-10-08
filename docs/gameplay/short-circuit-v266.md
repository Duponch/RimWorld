# V266 — Zzztt… court-circuit du réseau

Livré au schéma 201 ; adoption au premier pas joué, sans incident ajouté au chargement des anciennes parties.
La [référence Core locale 1.6.4871 rev590](../research/rain-electric-core-v194.md) distingue ce nouvel incident du court-circuit sous précipitations déjà livré.

## Décision et conséquences

Un conduit ordinaire relié à une source active peut subir un court-circuit, même sous un toit et sans pluie.
L’occasion appartient au calendrier Misc ; le délai minimal de huit jours entre deux incidents n’est pas une périodicité garantie.
Le choix porte sur les conduits admissibles : un réseau plus étendu présente davantage de conduits candidats.

Si au moins une batterie du réseau dépasse strictement 20 W·j, toutes ses batteries perdent leur réserve restante.
Les batteries isolées sur d’autres réseaux ne sont pas débitées par cette décharge.
L’énergie retirée détermine le rayon incendiaire : `clamp(sqrt(W·j) × 0,05 ; 1,5 ; 14,9)`.
Au-delà de 3,5 cases de rayon incendiaire, une onde de souffle supplémentaire atteint 30 % de ce rayon.
Ces ondes peuvent provoquer incendies, blessures et dégâts physiques ; elles ne créent pas une panne mécanique arbitraire.

Si aucune batterie ne dépasse individuellement 20 W·j, l’incident tente seulement un petit feu local, sans vidange imposée.
L’allumage peut échouer ; la lettre distingue un feu effectivement créé d’une tentative sans feu.
La somme de plusieurs batteries à 20 W·j ne suffit pas à déclencher la décharge.

## Jouer la reprise

Éloigner les personnes exposées, éteindre au contact, soigner les blessés et refroidir les pièces surchauffées.
Réparer ou reconstruire les éléments endommagés, vérifier production et combustible, puis laisser les batteries se recharger réellement.
Un interrupteur physiquement ouvert peut isoler une réserve ; une commande encore en attente ne coupe pas la liaison.
Aucune durée fixe de blackout n’est ajoutée : le courant dépend du réseau survivant, de ses sources et de ses réserves.
Le passage des ondes ou la fermeture de la lettre ne soigne rien et ne répare aucun dégât.

## Core et adaptations locales

Le [producteur](../../src/sim/short-circuit.ts) reprend seuil individuel, vidange du seul réseau, rayons et petit feu ; la sélection stable et le PRNG local adaptent les collections et tirages Core.
Les [ondes persistées](../../src/sim/bomb-system.ts) réutilisent les dégâts et échéances physiques du moteur local ; aucune identité de simulation Unity n’est revendiquée.
La [lettre](../../src/ui/short-circuit.ts) décrit le dernier incident confirmé, sa localisation, l’énergie retirée et les rayons enregistrés, sans déclencheur de debug.

## Validation

100 cas ciblés dans 14 fichiers passent par reprises regroupées : sélection, seuil individuel et demi-quanta, isolation du réseau, refus avant débit, géométrie et protection des conduits, chaleur, dégâts, reprises exactes et refus atomiques du lecteur de snapshots. Les contrôles communs gardent batteries, pluie, anciennes explosions de tourelles et incidents climatiques compatibles.
Les 62 sauvegardes publiques sont décompressées, migrées et validées ; aucun fichier public n’est modifié. Typage et build passent.
Un parcours WebGPU charge deux ondes encore intactes au tick 30100, sauvegarde/recharge leurs états exacts puis joue jusqu’au tick 30114 : conduit détruit, six allumages, perte de 5 400 W·j et lettre persistante ; aucune erreur navigateur. Cette scène préparée ne mesure ni fréquence naturelle, ni performance ou parité Unity exhaustive.
Les premiers échecs de fixtures et de typage restent dans les journaux privés `tmp/validation-runs/v266-*` ; leurs reprises sont distinctes. Une protection incorrecte du conduit sous un mur a été corrigée en respectant son altitude logique spécifique, sans changer les anciennes ondes.
