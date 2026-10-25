# Interface carton : densité et usages V477

L’audit ultérieur demandé sur le coût de l’UI en partie est consigné dans [Coût de l’interface 3D en partie](native-ui-cost-audit-v477.md). Il identifie notamment le surcoût des survols animés et les allocations graphiques supplémentaires ; les présentes vérifications de disposition ne constituent pas une preuve de coût identique à l’ancien DOM.

## Demande et périmètre

Suite aux captures humaines du 25 octobre : conserver les véritables objets Three.js découpés et peints de V476, mais retrouver la densité, les informations et les interactions du jeu. Les grandes feuilles vides, l’agrandissement dépendant de la hauteur d’écran, les priorités en sous-page et les regroupements Ordres/Zones/Vue ne conviennent pas.

Cette reprise concerne la présentation et les commandes existantes. Aucun changement de World, de schéma, de simulation, de sauvegarde ou des règles de performance V475. Aucune publication en production dans ce lot.

## Charte appliquée

`src/ui3d/native-layout.ts` centralise des tailles en pixels CSS indépendantes de la caméra et du DPR : corps 13 px, texte secondaire 11,5–12 px, titres 17 px, interligne 17 px, marge 12 px, espacement 5–6 px, boutons 26 px et onglets 28 px. Les textures sont dessinées à double résolution et les largeurs de texte sont réellement mesurées. Les dimensions des objets et les raycasts restent natifs.

Les cartes peintes servent aux commandes et dossiers. Ressources et indication de survol emploient des plans d’encre transparents, sans carton, tranche ni ombre. Le texte clair avec contour sombre reste lisible sur la carte. Les couleurs sauge, ocre, terre cuite et crème reprennent le prototype ; les jauges ont des bords dessinés à main levée, une valeur réelle et, pour les compétences, une seconde jauge d’expérience et la passion.

Les fenêtres ajustent leur hauteur au contenu sous une limite explicite ; elles restent ancrées en bas à gauche, ou centrées pour l’accueil. Bio utilise deux colonnes. Besoins sépare besoins et humeur, Santé sépare capacités et lésions, avec les sous-onglets Vue d’ensemble/Opérations. Les tableaux Travail, Planning, Assignations et Animaux utilisent des cellules compactes. Les boutons ordinaires passent sur plusieurs rangées lorsque nécessaire. Le texte intégral, les raisons d’indisponibilité et les explications restent dans les tooltips.

Les tooltips courts sont mesurés au texte ; une explication dépassant la hauteur de l’écran propose un défilement à la molette. Les listes longues gardent les lignes partiellement visibles et possèdent une piste et un curseur de défilement utilisables par clic, glisser ou molette. Les parties rognées ne reçoivent aucun clic.

## Structure et interactions

- Travail : dropdown local 0–4, compétences et passions sous la priorité, activité réelle à droite ; commandes existantes et gardes conservées.
- Planning : vingt-quatre heures, pinceaux, glisser sur plusieurs heures, Copier/Coller ; Échap annule le tracé.
- Dossier de colon : onglets et actions existants, réaction hostile en dropdown, file d’ordres, vêtements du portrait, jauges et tooltips spécialisés.
- Ordres et Zones : palettes indépendantes ; Architecte conserve les constructions et leurs matériaux/orientations.
- Murs, toits, végétation, zones, recentrage et caméra : commandes directement sur la carte.
- Barre du bas : cartes réduites, rail fin relevé derrière leur partie supérieure. Suppression de la grande étiquette de pagination sous les portraits ; les petits contrôles de liste restent disponibles lorsqu’ils sont utiles.
- Notifications : largeur et hauteur mesurées, détail et texte complet conservés. Options persistantes indépendantes pour escamoter la barre du bas et les notifications ; les bords bas/droit les font ressortir. Les animations convergent au repos et le cache V476 demeure utilisé.
- Recherche : catalogue compact de quatre projets par rangée, conditions/progrès/détail conservés et retour au dossier sur sélection. Il s’agit d’un catalogue, pas d’une reproduction de l’ancien arbre graphique.

## Qualification ciblée

Le lot V476 reste la preuve des sauvegardes entières, de la création géographique et de la récupération graphique ; ces campagnes n’ont pas été rejouées pour cette reprise de disposition. La suite complète du dépôt n’est pas exécutée.

Premier groupe ciblé : 42 cas passent, un nouveau cas attendait à tort que le message d’un ancien propriétaire survive au changement de carte. Le modèle invalide correctement cet éditeur et revient au nouvel objet. L’oracle vérifie désormais l’absence de commande et la fermeture de l’ancien éditeur. Reprise : **45 cas sur sept fichiers passent en 47,067 s** (`tmp/validation-runs/ui3d-density-contracts-r2-2026-10-25T19-08-25.709Z-31020/`). Typage précédent acquis en 35,994 s ; le build final vérifie aussi le typage des dernières sources.

Le banc natif réel passe en **15,237 s** : `tmp/ui3d-density-v477/fixture-2026-10-25T18-59-53.087Z/`. Il contrôle les dimensions projetées aux deux résolutions, l’alpha du survol, les petits tooltips, la scrollbar, le rognage des clics, les dropdowns souris/clavier/Échap, la peinture et son annulation, l’édition/Tab/refus, l’escamotage et la stabilité du cache au repos. Une première attente d’alpha sous 50 % était trop restrictive pour deux lignes de glyphes entourés ; les quatre coins transparents et l’absence de remplissage sont conservés, avec 50,879 % de pixels d’encre réellement observés. Cette première capture a également permis de supprimer un chevauchement du survol avec Ordres/Zones.

Le premier parcours complet sur Éclaircies a acquis les trois anciennes captures, les nouvelles fenêtres, la commande réelle de priorité, la peinture de cinq heures, les palettes, les commandes directes de vue, les deux options enregistrées et leurs animations. Il atteint son budget global de 240 s pendant la recharge finale ; ce résultat reste un **échec de parcours**, conservé sous `tmp/ui3d-density-v477/game-2026-10-25T19-00-25.812Z/`. La reprise ne recharge que le candidat natif, en réutilisant le témoin déjà acquis et les mêmes octets de sauvegarde.

| Dossier, viewport 1440 × 1000 | Ancien ensemble dossier/onglets/actions | Nouveau panneau complet |
| --- | --- | --- |
| Bio | 720 × 686,17 px | 514 × 489 px |
| Besoins | 720 × 717,17 px | 580 × 437 px |
| Santé | 720 × 627,17 px | 630 × 430 px |

Les dimensions de l’ancien ensemble incluent les zones transparentes entre ses cartes ; elles ne représentent pas une mesure des seuls pixels opaques. Les douze jauges de Bio sont visibles dès l’ouverture. La reprise resserre encore son activité avec le vrai libellé du HUD et restaure les compétences Chasse/Artisanat/Recherche en Travail. À 2557 × 1440, le dossier garde sa largeur en pixels.

La reprise native complète passe en **138,336 s**, sans erreur navigateur : `tmp/ui3d-density-v477/game-2026-10-25T19-10-10.777Z/`. Priorité et planning passent par les vrais contrôles et sont retrouvés dans le World confirmé. L’escamotage des deux groupes et la persistance après recharge sont acquis. La sélection d’hostilité et les trois compétences rétablies ont trois cas supplémentaires : deux passent d’abord, puis une attente de message périmé échoue pour la même raison d’invalidation de propriétaire ; le dernier contrôle exige un sélecteur neuf et aucune commande sur l’ancien propriétaire. Les **trois cas passent en 35,865 s**, quatorze autres explicitement filtrés (`ui3d-density-last-interactions-2026-10-25T19-16-52.055Z-28828`). Total : **48 cas distincts acquis par reprises**.

La dernière inspection ciblée passe en **125,088 s** (`tmp/ui3d-density-v477/game-2026-10-25T19-19-17.242Z/`) après réduction des redondances d’en-tête, resserrement des jauges de capacités et placement des politiques médicales dans la seconde colonne. La vue Santé ordinaire complète ne demande plus de défilement ; Bio garde ses douze compétences visibles. Historique/Animaux/Menu sont bornés à 548/738/328 px. Les empreintes `tmp/ui3d-density-v477/final-source-hashes.json` confirment les sources UI inchangées pendant ce parcours.

Les mesures W/C/W V476 sont conservées, sans leur attribuer un gain dû à cette reprise. Le nouveau banc vérifie l’arrêt des animations et la réutilisation du cache ; il ne constitue pas une nouvelle comparaison FPS/CPU globale.

Build final, typage inclus : **50,517 s**, acquis sous `tmp/validation-runs/ui3d-density-final-build-2026-10-25T19-21-37.796Z-20740/`. Les sources finales correspondent aux empreintes de la dernière qualification native. Aperçu privé 5196 conservé pour la revue humaine ; V475 reste seule production.
