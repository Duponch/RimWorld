# V267 — Libérer un prisonnier

Dans l’inspection du prisonnier, choisir **Libérer** à la place des soins seuls, de la réduction de résistance ou du recrutement.
La consigne peut être changée jusqu’à la libération effective, après le dépôt par le geôlier ; elle devient ensuite définitive.

Un colon disponible ayant **Basique ou Geôlier** actif prend en charge un prisonnier mobile, le porte jusqu’à une zone reliée au bord de carte, puis le laisse repartir seul.
Le prisonnier libéré suit un trajet physique et peut ouvrir les portes pour sortir ; un chemin bloqué ne provoque aucun départ à distance.
Une personne à terre attend de pouvoir se relever. Une blessure compatible avec la mobilité n’impose pas une guérison complète avant la libération.
Soins, nourriture, besoins et lésions continuent d’exister : libérer ne soigne pas et ne fournit aucun bonus diplomatique fictif.

L’inspection distingue consigne demandée, geôlier en approche, portage et départ autonome ; le sélecteur est verrouillé une fois la libération effective.
Le départ et les possessions conservées sont archivés par les systèmes existants, avec une raison distincte de l’évasion.

## Core et adaptation

La séquence locale reprend le portage Core vers une région touchant le bord, puis le départ autonome : `WorkGiver_Warden_ReleasePrisoner`, `JobDriver_ReleasePrisoner` et `Pawn_GuestTracker.Released`.
Les régions Core sont adaptées au graphe local : dépôt accessible le plus proche dans un espace touchant le bord, puis sortie accessible de ce même espace, sans tirage supplémentaire. La prise en charge utilise la même cellule que le secours existant. Les portes interdites restent interdites selon la règle locale. Personne, déplacement, accès et conséquences restent physiques.
La [référence prison](../research/prisoners-reference.md) décrit les systèmes communs de captivité, geôlier et soins.
L’[inspection](../../src/ui/prisoner-inspection.ts) réutilise le sélecteur existant, sans fenêtre ou commande de debug supplémentaire.

## Validation

83 cas uniques dans treize fichiers passent par contrôles groupés : boucle complète, travail Basique seul, interruption de portage, blessures, besoins, portes, vêtements, départ unique des captifs et raiders, lecteurs stricts et les 62 sauvegardes publiques. Typage, build et documentation passent. Les anciens fichiers publics restent inchangés.

Le parcours Chromium WebGPU joue la consigne par l’inspection, recharge une sauvegarde pendant le portage, vérifie le sélecteur verrouillé après dépôt et le départ unique au bord. Les captures et le rapport restent privés sous `tmp/prisoner-release-v267-native-*`. Le premier lancement a échoué avant ouverture du navigateur sur un import sans extension du helper de test ; la reprise autonome de l’observateur passe en 18,762 s, sans erreur du jeu. Ce contrôle ciblé ne prétend pas être une campagne prolongée ni mesurer les FPS.
