# Validation des pannes mécaniques V144 — 28 septembre 2026

Le [relevé Core 1.6.4871](../research/breakdown-core-v144.md) identifie onze bâtiments déjà présents dans Lisière avec `CompBreakdownable`. La panne est indépendante des PV, utilise une attente moyenne de 13 680 000 ticks Core par appareil admissible et demande le remplacement physique d'un composant par un colon Construction. Le [contrat V144](../development/breakdown-v144.md) décrit les adaptations au temps et aux capacités locales.

## Comportement livré

Le calendrier confirmé contrôle les appareils tous les 1 041 ticks Core équivalents, avec un PRNG persisté séparé de celui du monde. Les consommateurs électriques ne sont admissibles que lorsqu'ils fonctionnent ; producteurs et batterie peuvent tomber en panne sans courant. Une panne coupe la fonction, l'énergie stockée d'une batterie est perdue et la porte automatique reste franchissable à vitesse manuelle. Le bâtiment conserve son identité, ses matériaux et ses PV.

Dans la zone Foyer, une tâche Construction distincte réserve un composant ordinaire, le livre et demande 100 ticks locaux de travail au contact. L'issue suit le niveau Construction et les capacités de Manipulation/Vue. La pièce est consommée même en cas d'échec ; une interruption avant résolution la conserve ou la restitue. Le retrait de la zone, la déconstruction, la destruction et la désinstallation retirent la tâche et ses réservations sans laisser de pile orpheline. La tâche n'est pas dessinée comme un chantier. Les fiches, le survol et un « ! » ambre dans le lot VFX résident distinguent clairement la panne du manque de courant et des dégâts.

Le schéma **144** valide strictement le contenu V143 avant une migration neutre : aucune ancienne machine n'est cassée, aucun composant ou travail n'est accordé, et seul un calendrier futur indépendant est créé. Les champs V144 injectés dans une ancienne sauvegarde sont rejetés.

## Contrôles exécutés et portée

- **84/84 tests sur 17 fichiers** passent dans la validation finale du noyau V144 et des systèmes voisins : les onze familles, l'éligibilité électrique, le seuil temporel exact, la batterie, la porte, la livraison et la consommation réelles, l'échec, l'interruption, Home/déconstruction, la reprise déterministe, les sauvegardes, réseau, énergie, construction, incendie, aires et présentation. Les fixtures d'anciens schémas retirent le calendrier futur avant migration ; le validateur de production reste strict. Un ancien oracle d'aire utilisant une ressource `rock` supprimée du jeu a été corrigé.
- **1/1 parcours Chromium/WebGPU** charge une machine en panne, inspecte son état, laisse le colon livrer et remplacer la pièce, confirme le retour du courant, puis sauvegarde et recharge les deux états sans erreur navigateur. Les captures de la panne et de la réparation ont été examinées.
- `npm run build` (dont `tsc --noEmit`) et `git diff --check` passent. Le build rappelle seulement que certains chunks sont déjà volumineux.
- Le rendu garde un seul lot d'indicateurs pour tous les appareils, deux instances supplémentaires par panne et aucun objet Three individuel. Le calendrier n'est évalué qu'au tick confirmé ; la réconciliation des travaux ordinaires est espacée, tandis que les commandes et la nouvelle panne prennent effet immédiatement.
- Une tentative de **suite historique complète** a été interrompue après plusieurs scénarios longs en échec. Le scénario Atterrissage, rejoué seul, refuse au tick 6 500 une commande `bill-update` construite par l'ancien joueur-test avec une liste de filtres qui omet des ingrédients ajoutés depuis ; son checkpoint ne contient aucune panne V144. Les scénarios Énergie, Survivants, Simulation et Raid ont également signalé des échecs durant la tentative, sans diagnostic isolé ici. Cette preuve ne revendique donc pas une suite exhaustive verte. Aucun chiffre de ce dossier ne garantit 240 FPS, un débit ×6 ni un coût GPU nul.

## Coût et limites

Le microbanc `scripts/breakdown-bench-v144.ts` isole 200 000 ticks du **seul calendrier** sur des mondes frais avec 0, 3, 30 et 100 appareils, sept répétitions par taille. Sur l'hôte Ryzen 5 3600, les médianes sont respectivement **1,375 ; 2,763 ; 3,314 et 9,227 ms** pour l'ensemble des 200 000 appels. Il exclut réseau, travaux, pathfinding, UI, GPU et rendu. Ces résultats ne sont pas une comparaison A/B de cadence générale. Les contrôles espacés parcourent les bâtiments admissibles et les trient par ID pour conserver l'ordre des décisions ; l'ajout a donc un coût CPU réel aux échéances et un coût de fragments pour les signes visibles. Le reste de la logique n'effectue aucun tirage de panne par image.

Les appareils Core non construits dans Lisière, les courts-circuits, l'EMP, les règles de faction/forbidden absentes du modèle local et la suite aléatoire Unity exacte restent ouverts. Le placement direct d'une porte automatique sur un mur existant relève d'un autre chantier.
