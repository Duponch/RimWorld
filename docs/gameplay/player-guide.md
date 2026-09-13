# Guide joueur — première tranche

## Commencer une colonie

Trois survivants, Ada, Noé et Mina, arrivent sur une carte de 64×64 cases par défaut. Menu → Nouvelle colonie permet de choisir 32, 64 ou 128 cases par côté et une graine. À taille et version de générateur identiques, la même graine redonne le même départ. Vous commencez avec 12 unités de bois et 18 de nourriture déposées près des colons. Les nombres à gauche additionnent les objets au sol et portés ; les matériaux déjà livrés aux chantiers sont comptés séparément.

Votre premier objectif libre est de récolter de la nourriture, couper quelques arbres et construire trois lits. Il n'y a encore ni scénario de victoire ni événement hostile. Une partie est un laboratoire de gameplay ; les règles ci-dessous décrivent ce qui existe réellement.

## Se repérer dans l'interface

Les portraits des colons sont en haut ; cliquer dessus centre la caméra et ouvre leur inspection en bas à gauche. Les stocks sont à gauche, les alertes à droite, l'heure et les vitesses en bas à droite. Les onglets de gestion occupent le bas de l'écran : Architecte pour les désignations et constructions, Travail pour les priorités de tous les colons, Historique pour les événements et Menu pour les sauvegardes. Un seul panneau de gestion est ouvert à la fois. Les onglets grisés correspondent aux domaines encore indisponibles.

Sur une fenêtre étroite, la barre des onglets se fait défiler horizontalement. Les panneaux occupent davantage de largeur, tout en conservant leur position dans l'interface.

## Donner des ordres

Ouvrir Architecte, choisir Ordres pour abattre/récolter/annuler, Zones pour le stockage, Structure pour le mur ou Meubles pour le lit, puis cliquer sur une case. L'abattage cible un arbre ; la récolte cible un buisson de baies. Une construction demande une empreinte libre et franchissable. Le lit occupe deux cases : Q/E ou le bouton Tourner change son orientation avant placement. Le fantôme indique un placement refusé. Les matériaux peuvent manquer au moment de poser un plan ; leur livraison précède le travail de construction.

| Action | Règle actuelle |
|---|---|
| Abattre | Le colon travaille à côté de l'arbre ; toute sa quantité devient une ou plusieurs piles de bois au sol. |
| Récolter | Le buisson est retiré et laisse sa nourriture au sol. Pas de repousse dans cette tranche. |
| Construire un mur | 5 bois, 70 ticks de travail ; bloque le passage dès le placement du plan. |
| Construire un lit | 8 bois livrés, 120 ticks de travail ; empreinte orientée 1×2 et repos accéléré à proximité. |
| Annuler | Retire l'ordre et libère ses engagements ; les matériaux restent localisés au sol. Ne détruit pas un bâtiment achevé. On peut cliquer sur chacune des cases de son empreinte. |

Un arbre prend 100 ticks de travail, un buisson 60, hors déplacement et interruptions. La simulation avance à 10 ticks/seconde à vitesse normale. Ces valeurs sont nos paramètres de prototype, pas des valeurs prétendument identiques à RimWorld.

## Travail autonome

Ouvrir Travail pour régler collecte, construction et transport. **1 est la priorité la plus forte, 4 la plus faible, 0 désactive la famille.** Le transport approvisionne les chantiers et les réserves. Désactiver Construction n'empêche donc pas un colon dont Transport reste actif d'apporter du bois à un plan. Une modification entre priorités actives s'applique lors du prochain choix de travail ; désactiver une famille interrompt son activité.

Un transporteur réserve une quantité de pile et de la place à destination, se déplace jusqu'à la source, prélève, porte et dépose. Sa cargaison est visible. Deux colons peuvent se partager une pile sans promettre les mêmes unités. Un constructeur commence seulement quand les matériaux nécessaires sont effectivement livrés. Une interruption conserve la progression et les matériaux déjà déposés ; une cargaison abandonnée devient une pile au sol.

Les chemins contournent eau, terrain rocheux, murs et autres colons ; un colon inactif peut céder une case de passage lorsqu'un travail l'exige. Inspecter un chantier indique notamment ses livraisons et ce qu'il attend. Les embouteillages complexes de plusieurs colons actifs restent une limite du déplacement actuel.

## Réserves et transport

Dans Architecte → Zones → Réserve, choisir les filtres Bois/Nourriture, une priorité et une capacité, puis cliquer sur les cases de stockage. Chaque case garde ses propres réglages. Une capacité de 75 unités et une priorité normale de 2 sont proposées. Pour les **réserves**, 4 est la priorité la plus forte : les transporteurs déplacent les objets vers un stockage de meilleure priorité, sans va-et-vient entre réserves équivalentes.

Fermer Architecte et inspecter une case de réserve pour modifier ses filtres, sa priorité ou sa capacité. Appliquer un nouveau filtre invalide les livraisons incompatibles ; les objets déjà présents restent physiques et peuvent être déplacés vers une autre réserve valable. Retirer une réserve supprime sa règle de stockage, sans effacer les objets. Une réserve pleine n'accepte plus de nouvelle quantité.

Les piles contiennent au plus 75 unités et le portage au plus 10 unités par trajet : ce sont des réglages du projet. Les réserves sont actuellement désignées case par case, sans zone rectangulaire à nom et réglages communs. Les livraisons aux chantiers peuvent prélever directement une pile au sol ; un passage préalable par une réserve n'est pas obligatoire.

## Nourriture, repos et humeur

Une valeur de nourriture élevée signifie que le colon est rassasié. Elle diminue avec les ticks. À 45 ou moins, une unité de nourriture disponible est consommée et ajoute 35 points. À 20 ou moins sans repas disponible, le colon abandonne les travaux non vitaux pour privilégier sa survie. La consommation prélève une vraie pile, mais le trajet et l'action de manger sont encore simplifiés : cette tranche ne livre pas la boucle complète des repas de RimWorld.

Le repos diminue pendant l'éveil. À 20, le colon interrompt sa tâche et dort sur place jusqu'à 85. Le repos revient plus vite si un lit est sur sa case ou sur une case voisine orthogonale. Il ne recherche pas encore un lit libre et ne se déplace pas automatiquement jusqu'à lui. L'humeur est pour l'instant un indicateur dérivé de la nourriture et du repos ; elle ne déclenche aucune crise mentale.

Un jour correspond à 6 000 ticks, soit dix minutes à vitesse normale. L'heure affichée est fonctionnelle, mais l'éclairage reste fixe. Les personnages provisoires possèdent une animation de marche, de travail et de sommeil calculée sur le GPU ; leur apparence sera remplacée par les futurs modèles animés.

## Commandes et sauvegarde

Les rivières forment des cours continus, les rochers pleins des massifs infranchissables et la végétation des groupes. Le départ possède un dégagement et des ressources de premier essai. La carte n'a pas encore de relief navigable, de ponts ou de minage.

La convention 3D est de 1 m par case, 1,75 m pour un humain et 2,80 m pour un mur. Les boutons près de l'horloge permettent de couper visuellement les murs ou de masquer le feuillage pour lire la scène. Ces options ne changent ni les obstacles ni les ordres. Le nouveau lit possède une empreinte 1×2 ; les lits d'une ancienne sauvegarde conservent leur emprise 1×1 pour éviter de recouvrir un voisin au chargement.

| Commande | Effet |
|---|---|
| Molette | Zoom |
| Bouton droit maintenu | Rotation de caméra |
| Bouton central maintenu | Déplacement de caméra |
| Flèches | Déplacement de caméra ; utiliser les flèches lorsque les lettres servent aux outils |
| Espace | Pause/reprise |
| 1 / 2 / 3 | Vitesses 1× / 3× / 6× |
| C / R / B / L / X | Abattre / récolter / mur / lit / annuler |
| S | Désigner une réserve |
| Q / E avec l'outil Lit | Tourner le lit |
| Tab / F1 | Ouvrir ou fermer Architecte / Travail |
| Échap | Fermer le panneau et revenir à l'inspection |
| Ctrl+S | Sauvegarder |

Menu → Sauvegarder conserve le monde, les travaux, les réservations, les trajets et les besoins. Elle occupe un emplacement local à ce navigateur. Recharger remplace la partie courante par la dernière sauvegarde ; une sauvegarde invalide est refusée. La vitesse et l'angle de caméra ne font pas partie de la sauvegarde. Il n'y a pas encore d'autosauvegarde ni d'export de fichier.

Avant de créer une nouvelle colonie, le jeu conserve aussi l'état courant dans un emplacement « Colonie précédente », distinct de la sauvegarde manuelle. Cette copie contient la dernière colonie remplacée, pas tout l'historique des colonies. La création est refusée si cette copie ne peut pas être enregistrée. Les anciennes sauvegardes gardent leur terrain original ; leur stock global est converti en piles et leurs matériaux réservés sont localisés aux chantiers. Les nouvelles sauvegardes conservent également les cargaisons et les réserves.

## Limites de cette version

Pas encore d'agriculture, cuisine, minage, déconstruction, emploi du temps, animaux, armes, combat, blessures, médecine, relations, traits, recherche, commerce, électricité, toit, température, incendie, météo dynamique, carte du monde ou storyteller. Les réserves à plusieurs cases partageant une politique, la sélection multiple et les ordres forcés contextuels restent à développer. Les modèles sont provisoires ; les règles de repas, sommeil et congestion sont encore simplifiées.

La suite est suivie dans [le plan de développement](../ROADMAP.md). Les détails de la référence et les futures interactions sont dans [la matrice des systèmes](systems-matrix.md).
